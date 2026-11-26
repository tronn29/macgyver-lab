/*
 * Éditeur de fiches et de fonctions personnelles : un formulaire simple (sans JSON ni commande),
 * un aperçu avec le vrai design de l'appli, un enregistrement sur l'appareil.
 *
 * - Le contenu officiel n'est jamais modifié : tout passe par core/perso.ts (clé locale séparée).
 * - Le formulaire en cours est gardé comme brouillon (sauvegarde automatique), y compris en modification.
 * - L'aperçu utilise un identifiant « _modele-apercu… » : il n'écrit rien dans la progression.
 * - Page chargée à la demande (absente du premier chargement de l'appli).
 */
import { content } from '../core/content';
import { debounce, h } from '../core/dom';
import { t } from '../core/i18n';
import { navigate, type RouteContext, type View } from '../core/router';
import {
  APERCU_FICHE,
  APERCU_FONCTION,
  CATEGORIES,
  SCHEMA_DEFAUT,
  assembleTexte,
  clean,
  clearBrouillon,
  explicationDepuis,
  fromTexte,
  getBrouillon,
  isPerso,
  loadPerso,
  newId,
  paragrapheVide,
  resolveObjet,
  saveFiche,
  saveFonction,
  setBrouillon,
  termeInterdit,
  type ParagrapheEdit,
  type TypeParagraphe,
} from '../core/perso';
import type { CategorieId, Fiche, Fonction, NiveauSecurite, Objet, Verdict } from '../core/types';
import { btn, linkBtn, segmented, toast } from '../ui/components';
import { icon } from '../ui/icons';
import { schemaFigure } from '../ui/schema';
import { asPreview } from './apercu';
import { ficheDetail } from './archives';
import { fonctionDetail } from './arsenal';
import { notFoundView, pageHeader } from './common';
import { resetSearchIndex } from './misc';

/* ---------- Outils de formulaire ---------- */

const nodes = (...list: (Node | null | undefined)[]): Node[] => list.filter((n): n is Node => Boolean(n));

interface Erreur {
  id: string; // identifiant du champ (focus depuis le résumé)
  message: string;
}

const MAX_QUESTIONS = 8;
const MAX_CHOIX = 4;
const MAX_NUANCE = 90;

/** Clé stable par élément de liste (identifiants de champs inchangés quand on déplace un paragraphe). */
const cles = new WeakMap<object, string>();
let compteur = 0;
const cle = (o: object): string => {
  let k = cles.get(o);
  if (!k) cles.set(o, (k = `e${++compteur}`));
  return k;
};

function field(opts: { id: string; label: string; control: HTMLElement; help?: string; optional?: boolean; foot?: HTMLElement | null }): HTMLElement {
  const helpId = opts.help ? `${opts.id}-aide` : '';
  opts.control.setAttribute('aria-describedby', [helpId, `${opts.id}-err`].filter(Boolean).join(' '));
  return h(
    'div',
    { class: 'field' },
    h('label', { for: opts.id, class: 'field__label' }, opts.label, opts.optional ? h('span', { class: 'field__opt' }, ` (${t('perso.facultatif')})`) : null),
    opts.help ? h('p', { class: 'field__help', id: helpId }, opts.help) : null,
    opts.control,
    h('p', { class: 'form-error', id: `${opts.id}-err` }),
    opts.foot ?? null
  );
}

function input(id: string, value: string, onInput: (v: string) => void, opts: { maxlength?: number; list?: string; autocomplete?: string } = {}): HTMLInputElement {
  const el = h('input', { type: 'text', id, class: 'input', maxlength: opts.maxlength, list: opts.list, autocomplete: opts.autocomplete ?? 'off', spellcheck: 'true' });
  el.value = value;
  el.addEventListener('input', () => onInput(el.value));
  return el;
}

function textarea(id: string, value: string, onInput: (v: string) => void, rows = 4): HTMLTextAreaElement {
  const el = h('textarea', { id, class: 'input textarea textarea--sm', rows, spellcheck: 'true' });
  el.value = value;
  el.addEventListener('input', () => onInput(el.value));
  return el;
}

function select(id: string, value: string, options: { value: string; label: string }[], onChange: (v: string) => void): HTMLSelectElement {
  const el = h('select', { id, class: 'input select' }, ...options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  el.value = value;
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

function counter(el: HTMLInputElement, max: number): HTMLElement {
  const out = h('span', { class: 'field__counter', 'aria-live': 'polite' });
  const paint = () => (out.textContent = t('perso.compteur', { n: el.value.length, max }));
  el.addEventListener('input', paint);
  paint();
  return h('div', { class: 'field__foot' }, out);
}

/** Affiche les erreurs : message sous chaque champ, résumé cliquable en haut (focus sur le champ). */
function showErrors(root: HTMLElement, summary: HTMLElement, errs: Erreur[]): void {
  root.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  root.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));
  if (!errs.length) {
    summary.hidden = true;
    return;
  }
  for (const e of errs) {
    root.querySelector(`#${e.id}`)?.setAttribute('aria-invalid', 'true');
    const p = root.querySelector(`#${e.id}-err`);
    if (p && !p.textContent) p.textContent = e.message;
  }
  summary.replaceChildren(
    h('h2', { class: 'error-summary__title', id: 'err-t', tabindex: '-1' }, icon('alert', 20), t('perso.erreursTitre', { n: errs.length })),
    h(
      'ul',
      { class: 'error-summary__list' },
      ...errs.map((e) =>
        h(
          'li',
          null,
          h(
            'button',
            {
              type: 'button',
              class: 'error-summary__link',
              onclick: () => {
                const el = root.querySelector<HTMLElement>(`#${e.id}`);
                el?.scrollIntoView({ block: 'center' });
                el?.focus({ preventScroll: true });
              },
            },
            e.message
          )
        )
      )
    )
  );
  summary.hidden = false;
  summary.scrollIntoView({ block: 'start' });
  summary.querySelector<HTMLElement>('#err-t')?.focus({ preventScroll: true });
}

/** Contrôle de la règle de contenu sur un champ. */
function regle(errs: Erreur[], id: string, texte: string): void {
  const terme = termeInterdit([texte]);
  if (terme) errs.push({ id, message: t('perso.erreurRegle', { terme }) });
}

/** Liste réordonnable : boutons Monter / Descendre / Supprimer d'un élément. */
function itemActions(opts: { key: string; nom: string; index: number; total: number; onMove: (delta: number) => void; onRemove: () => void; removable?: boolean }): HTMLElement {
  const up = btn(t('perso.monter'), { variant: 'quiet', small: true, icon: 'chevron-up', ariaLabel: t('perso.monterNom', { nom: opts.nom }), disabled: opts.index === 0, onClick: () => opts.onMove(-1) });
  const down = btn(t('perso.descendre'), { variant: 'quiet', small: true, icon: 'chevron-down', ariaLabel: t('perso.descendreNom', { nom: opts.nom }), disabled: opts.index === opts.total - 1, onClick: () => opts.onMove(1) });
  // Identifiants stables : le focus reste sur le bouton après un déplacement
  up.id = `${opts.key}-up`;
  down.id = `${opts.key}-down`;
  return h(
    'div',
    { class: 'editor-item__actions' },
    up,
    down,
    opts.removable === false ? null : btn(t('perso.supprimer'), { variant: 'quiet', small: true, icon: 'trash', ariaLabel: t('perso.supprimerNom', { nom: opts.nom }), onClick: opts.onRemove })
  );
}

/** Focus après un nouveau rendu de liste : le bouton demandé, ou le titre de l'élément s'il est désactivé. */
function focusIn(list: HTMLElement, focusId?: string): void {
  if (!focusId) return;
  const el = list.querySelector<HTMLButtonElement>(`#${focusId}`);
  (el && !el.disabled ? el : list.querySelector<HTMLElement>(`#${focusId.replace(/-(up|down)$/, '-titre')}`))?.focus();
}

const categorieOptions = () => [
  { value: '', label: t('perso.choisirCategorie') },
  ...CATEGORIES.map((id) => ({ value: id, label: content().byId.categorie.get(id)?.nom ?? id })),
];

/** Bascule formulaire / aperçu dans la même page (le formulaire reste en mémoire). */
function modes(form: HTMLElement, preview: HTMLElement): { show: (node: HTMLElement) => void; back: () => void } {
  let scroll = 0;
  return {
    show: (node) => {
      scroll = window.scrollY;
      preview.replaceChildren(node);
      form.hidden = true;
      preview.hidden = false;
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      preview.querySelector<HTMLElement>('.apercu-bar__title')?.focus({ preventScroll: true });
    },
    back: () => {
      preview.hidden = true;
      preview.replaceChildren();
      form.hidden = false;
      window.scrollTo({ top: scroll, behavior: 'instant' as ScrollBehavior });
      form.querySelector<HTMLElement>('.js-apercu')?.focus({ preventScroll: true });
    },
  };
}

function apercuBar(titre: string, onBack: () => void, onSave: () => void, texte = t('perso.apercuTexte')): HTMLElement {
  return h(
    'div',
    { class: 'apercu-bar' },
    h('h2', { class: 'apercu-bar__title', tabindex: '-1' }, icon('eye', 20), titre),
    h('p', { class: 'apercu-bar__text' }, texte),
    h('div', { class: 'btn-row' }, btn(t('perso.retourFormulaire'), { variant: 'ghost', icon: 'pen', onClick: onBack }), btn(t('perso.enregistrer'), { variant: 'primary', icon: 'check', onClick: onSave }))
  );
}

function brouillonNotice(onReset: () => void): HTMLElement {
  return h(
    'div',
    { class: 'notice notice--info editor__draft', role: 'status' },
    icon('history', 20),
    h('div', null, h('p', null, t('perso.brouillonRetrouve')), btn(t('perso.brouillonEffacer'), { variant: 'quiet', small: true, icon: 'refresh', onClick: onReset }))
  );
}

/* =====================================================================
 * Fiche
 * ===================================================================== */

interface QuestionEdit {
  question: string;
  choix: string[];
  reponse: number; // -1 : pas encore choisie
  explication: string;
}

interface FicheEtat {
  titre: string;
  sousTitre: string;
  categorie: CategorieId | '';
  securite: NiveauSecurite;
  verdict: Verdict;
  nuance: string;
  enfant: string;
  schema: string; // '' : image par défaut ; sinon fichier d'un schéma officiel
  paragraphes: ParagrapheEdit[];
  quiz: QuestionEdit[];
}

const questionVide = (): QuestionEdit => ({ question: '', choix: ['', '', ''], reponse: -1, explication: '' });

const ficheVide = (): FicheEtat => ({
  titre: '',
  sousTitre: '',
  categorie: '',
  securite: 'vert',
  verdict: 'partiel',
  nuance: '',
  enfant: '',
  schema: '',
  paragraphes: [paragrapheVide('accroche')],
  quiz: [],
});

function etatDepuisFiche(f: Fiche): FicheEtat {
  return {
    titre: f.titre,
    sousTitre: f.sousTitre ?? '',
    categorie: f.categories[0] ?? '',
    securite: f.securite.niveau,
    verdict: f.realite.verdict,
    nuance: f.realite.nuance ?? '',
    enfant: f.enfant,
    schema: f.schema.fichier === SCHEMA_DEFAUT ? '' : f.schema.fichier,
    paragraphes: (f.texte ?? []).map(fromTexte),
    quiz: f.quiz.map((q) => ({ question: q.question, choix: [...q.choix], reponse: q.reponse, explication: q.explication })),
  };
}

/** Brouillon relu avec prudence : chaque champ inattendu reprend sa valeur par défaut. */
function etatFicheDepuis(raw: unknown): FicheEtat | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<FicheEtat>;
  const base = ficheVide();
  const s = (v: unknown, def: string) => (typeof v === 'string' ? v : def);
  return {
    titre: s(d.titre, ''),
    sousTitre: s(d.sousTitre, ''),
    categorie: CATEGORIES.includes(d.categorie as CategorieId) ? (d.categorie as CategorieId) : '',
    securite: (['vert', 'orange', 'rouge'] as const).includes(d.securite as NiveauSecurite) ? (d.securite as NiveauSecurite) : 'vert',
    verdict: (['vrai', 'partiel', 'faux'] as const).includes(d.verdict as Verdict) ? (d.verdict as Verdict) : 'partiel',
    nuance: s(d.nuance, '').slice(0, MAX_NUANCE),
    enfant: s(d.enfant, ''),
    schema: s(d.schema, ''),
    paragraphes: Array.isArray(d.paragraphes) && d.paragraphes.length
      ? d.paragraphes.map((p) => ({ ...paragrapheVide((['simple', 'accroche', 'serie', 'retenir'] as const).includes(p?.type) ? p.type : 'simple'), phrase: s(p?.phrase, ''), texte: s(p?.texte, ''), serie: s(p?.serie, ''), realite: s(p?.realite, '') }))
      : base.paragraphes,
    quiz: Array.isArray(d.quiz)
      ? d.quiz.slice(0, MAX_QUESTIONS).map((q) => ({ question: s(q?.question, ''), choix: (Array.isArray(q?.choix) ? q.choix : ['', '']).slice(0, MAX_CHOIX).map((c) => s(c, '')), reponse: Number.isInteger(q?.reponse) ? q.reponse : -1, explication: s(q?.explication, '') }))
      : [],
  };
}

/** Fiche construite depuis le formulaire (pour l'aperçu et l'enregistrement). */
function buildFiche(s: FicheEtat, id: string, apercu = false): Fiche {
  const c = content();
  const officielle = s.schema ? c.fiches.find((f) => f.schema.fichier === s.schema) : null;
  let texte = assembleTexte(s.paragraphes);
  if (apercu && !texte.length) texte = [t('perso.apercuVide')];
  const quiz = s.quiz
    .map((q) => {
      const gardes = q.choix.map((c, i) => ({ c: clean(c), i })).filter((x) => x.c);
      return { question: clean(q.question), choix: gardes.map((x) => x.c), reponse: gardes.findIndex((x) => x.i === q.reponse), explication: clean(q.explication) };
    })
    .filter((q) => q.question && q.choix.length >= 2 && q.reponse >= 0);
  return {
    id,
    titre: clean(s.titre) || (apercu ? t('perso.sansTitre') : ''),
    sousTitre: clean(s.sousTitre) || undefined,
    categories: [s.categorie || 'mecanique'],
    schema: officielle ? { ...officielle.schema } : { fichier: SCHEMA_DEFAUT, alt: t('perso.schemaDefautAlt') },
    texte,
    enfant: clean(s.enfant),
    realite: { verdict: s.verdict, nuance: clean(s.nuance) || undefined, explication: explicationDepuis(s.paragraphes) },
    securite: { niveau: s.securite },
    liens: {},
    quiz,
    motsCles: [],
  };
}

function validateFiche(s: FicheEtat): Erreur[] {
  const errs: Erreur[] = [];
  if (!clean(s.titre)) errs.push({ id: 'f-titre', message: t('perso.erreurTitre') });
  if (!s.categorie) errs.push({ id: 'f-categorie', message: t('perso.erreurCategorie') });
  if (clean(s.nuance).length > MAX_NUANCE) errs.push({ id: 'f-nuance', message: t('perso.erreurNuance', { max: MAX_NUANCE }) });
  regle(errs, 'f-titre', s.titre);
  regle(errs, 'f-soustitre', s.sousTitre);
  regle(errs, 'f-nuance', s.nuance);
  regle(errs, 'f-enfant', s.enfant);

  if (!assembleTexte(s.paragraphes).length) errs.push({ id: `${cle(s.paragraphes[0] ?? {})}-texte`, message: t('perso.erreurTexte') });
  s.paragraphes.forEach((p, i) => {
    const k = cle(p);
    const n = i + 1;
    if (p.type === 'accroche' && clean(p.texte) && !clean(p.phrase)) errs.push({ id: `${k}-phrase`, message: t('perso.erreurAccroche', { n }) });
    if (p.type === 'serie') {
      if (clean(p.realite) && !clean(p.serie)) errs.push({ id: `${k}-serie`, message: t('perso.erreurSerie', { n }) });
      if (clean(p.serie) && !clean(p.realite)) errs.push({ id: `${k}-realite`, message: t('perso.erreurRealite', { n }) });
    }
    const champs: [string, string][] = p.type === 'serie' ? [[`${k}-serie`, p.serie], [`${k}-realite`, p.realite]] : p.type === 'accroche' ? [[`${k}-phrase`, p.phrase], [`${k}-texte`, p.texte]] : [[`${k}-texte`, p.texte]];
    for (const [id, txt] of champs) regle(errs, id, txt);
  });

  s.quiz.forEach((q, i) => {
    const k = cle(q);
    const n = i + 1;
    if (!clean(q.question)) errs.push({ id: `${k}-question`, message: t('perso.erreurQuestion', { n }) });
    const remplis = q.choix.filter((c) => clean(c)).length;
    if (remplis < 2) errs.push({ id: `${k}-choix-0`, message: t('perso.erreurChoix', { n }) });
    else if (q.reponse < 0 || !clean(q.choix[q.reponse] ?? '')) errs.push({ id: `${k}-bonne`, message: t('perso.erreurBonne', { n }) });
    regle(errs, `${k}-question`, q.question);
    q.choix.forEach((c, j) => regle(errs, `${k}-choix-${j}`, c));
    regle(errs, `${k}-explication`, q.explication);
  });
  return errs;
}

const TYPES: TypeParagraphe[] = ['accroche', 'simple', 'serie', 'retenir'];

export function ficheEditor(ctx: RouteContext): View {
  const c = content();
  const editId = ctx.params.id;
  const existante = editId ? c.byId.fiche.get(editId) : undefined;
  if (editId && (!existante || !isPerso(editId))) return notFoundView(t('perso.introuvable'), { href: '#/archives', label: t('archives.titre') });

  const cleBrouillon = `fiche:${editId ?? 'nouvelle'}`;
  const brouillon = etatFicheDepuis(getBrouillon(cleBrouillon));
  let s: FicheEtat = brouillon ?? (existante ? etatDepuisFiche(existante) : ficheVide());
  if (!s.paragraphes.length) s.paragraphes.push(paragrapheVide('accroche'));

  let termine = false; // fiche enregistrée : plus de brouillon (même pour une frappe encore en attente)
  const saveDraft = () => !termine && setBrouillon(cleBrouillon, s);
  const saveDraftSoon = debounce(saveDraft, 400);

  const formWrap = h('div', { class: 'editor__form' });
  const previewWrap = h('div', { class: 'editor__preview', hidden: true });
  const mode = modes(formWrap, previewWrap);

  const enregistrer = () => {
    const errs = validateFiche(s);
    if (errs.length) {
      if (!previewWrap.hidden) mode.back();
      showErrors(formWrap, formWrap.querySelector('.error-summary') as HTMLElement, errs);
      return;
    }
    const id = existante?.id ?? newId(s.titre, new Set(c.byId.fiche.keys()));
    try {
      saveFiche(c, buildFiche(s, id));
    } catch {
      toast(t('perso.erreurStockage'), { icon: 'alert', tone: 'danger', duration: 8000 });
      return;
    }
    termine = true;
    clearBrouillon(cleBrouillon);
    resetSearchIndex();
    toast(t(existante ? 'perso.ficheModifiee' : 'perso.ficheEnregistree'), { icon: 'check', tone: 'success' });
    navigate(`/archives/${id}`);
  };

  const apercu = () => {
    const f = buildFiche(s, APERCU_FICHE, true);
    c.byId.fiche.set(f.id, f);
    let node: HTMLElement;
    try {
      node = asPreview(ficheDetail({ path: '', params: { id: f.id }, query: new URLSearchParams() }).node);
    } finally {
      c.byId.fiche.delete(f.id);
    }
    mode.show(h('div', null, apercuBar(t('perso.apercuFiche'), mode.back, enregistrer), node, apercuBar(t('perso.apercuFin'), mode.back, enregistrer)));
  };

  /* --- Paragraphes --- */
  const parasList = h('ol', { class: 'editor-list', 'aria-label': t('perso.paragraphes') });
  const renderParas = (focusId?: string) => {
    parasList.replaceChildren(...s.paragraphes.map((p, i) => h('li', { class: 'editor-item' }, paragrapheCard(p, i))));
    focusIn(parasList, focusId);
  };

  const paragrapheCard = (p: ParagrapheEdit, i: number): HTMLElement => {
    const k = cle(p);
    const nom = t('perso.paragrapheN', { n: i + 1 });
    const body = h('div', { class: 'editor-item__body' });
    const paintBody = () => {
      const set = (champ: keyof ParagrapheEdit) => (v: string) => {
        (p[champ] as string) = v;
        saveDraftSoon();
      };
      const parts: HTMLElement[] = [];
      if (p.type === 'accroche') {
        parts.push(field({ id: `${k}-phrase`, label: t('perso.phraseAccroche'), help: t('perso.phraseAccrocheAide'), control: input(`${k}-phrase`, p.phrase, set('phrase'), { maxlength: 200 }) }));
        parts.push(field({ id: `${k}-texte`, label: t('perso.suiteParagraphe'), control: textarea(`${k}-texte`, p.texte, set('texte'), 5) }));
      } else if (p.type === 'serie') {
        parts.push(field({ id: `${k}-serie`, label: t('perso.dansLaSerie'), help: t('perso.dansLaSerieAide'), control: textarea(`${k}-serie`, p.serie, set('serie'), 3) }));
        parts.push(field({ id: `${k}-realite`, label: t('perso.dansLaRealite'), help: t('perso.dansLaRealiteAide'), control: textarea(`${k}-realite`, p.realite, set('realite'), 4) }));
      } else if (p.type === 'retenir') {
        parts.push(field({ id: `${k}-texte`, label: t('perso.aRetenir'), help: t('perso.aRetenirAide'), control: textarea(`${k}-texte`, p.texte, set('texte'), 3) }));
      } else {
        parts.push(field({ id: `${k}-texte`, label: t('perso.texteParagraphe'), control: textarea(`${k}-texte`, p.texte, set('texte'), 5) }));
      }
      body.replaceChildren(...parts);
    };
    paintBody();
    return h(
      'div',
      { class: 'editor-item__card' },
      h(
        'div',
        { class: 'editor-item__head' },
        h('h3', { class: 'editor-item__title', id: `${k}-titre`, tabindex: '-1' }, nom),
        field({
          id: `${k}-type`,
          label: t('perso.typeParagraphe'),
          control: select(`${k}-type`, p.type, TYPES.map((v) => ({ value: v, label: t(`perso.type.${v}`) })), (v) => {
            p.type = v as TypeParagraphe;
            paintBody();
            saveDraft();
          }),
        })
      ),
      body,
      itemActions({
        key: k,
        nom,
        index: i,
        total: s.paragraphes.length,
        removable: s.paragraphes.length > 1,
        onMove: (d) => {
          const j = i + d;
          [s.paragraphes[i], s.paragraphes[j]] = [s.paragraphes[j], s.paragraphes[i]];
          saveDraft();
          renderParas(`${k}-${d < 0 ? 'up' : 'down'}`);
        },
        onRemove: () => {
          const retire = s.paragraphes.splice(i, 1)[0];
          saveDraft();
          renderParas();
          const next = s.paragraphes[Math.min(i, s.paragraphes.length - 1)];
          parasList.querySelector<HTMLElement>(`#${cle(next)}-titre`)?.focus();
          toast(t('perso.paragrapheSupprime'), {
            icon: 'trash',
            action: {
              label: t('perso.annuler'),
              onClick: () => {
                s.paragraphes.splice(i, 0, retire);
                saveDraft();
                renderParas(`${k}-titre`);
              },
            },
          });
        },
      })
    );
  };
  /* --- Quiz --- */
  const quizList = h('ol', { class: 'editor-list', 'aria-label': t('perso.questions') });
  const addQuestionBtn = btn(t('perso.ajouterQuestion'), { variant: 'ghost', icon: 'plus', onClick: () => {
    const q = questionVide();
    s.quiz.push(q);
    saveDraft();
    renderQuiz();
    quizList.querySelector<HTMLElement>(`#${cle(q)}-question`)?.focus();
  } });
  const renderQuiz = () => {
    quizList.replaceChildren(...s.quiz.map((q, i) => h('li', { class: 'editor-item' }, questionCard(q, i))));
    quizList.hidden = !s.quiz.length;
    addQuestionBtn.hidden = s.quiz.length >= MAX_QUESTIONS;
  };
  const questionCard = (q: QuestionEdit, i: number): HTMLElement => {
    const k = cle(q);
    const nom = t('perso.questionN', { n: i + 1 });
    const choixBox = h('div', { class: 'editor-choices' });
    const paintChoix = (focusIndex?: number) => {
      choixBox.replaceChildren(
        ...nodes(
        ...q.choix.map((c, j) => {
          const radio = h('input', { type: 'radio', name: `${k}-bonne`, id: j === 0 ? `${k}-bonne` : `${k}-bonne-${j}`, class: 'editor-choice__radio', checked: q.reponse === j, value: String(j) });
          radio.addEventListener('change', () => {
            q.reponse = j;
            saveDraft();
          });
          const champ = input(`${k}-choix-${j}`, c, (v) => {
            q.choix[j] = v;
            saveDraftSoon();
          }, { maxlength: 160 });
          champ.setAttribute('aria-describedby', `${k}-choix-${j}-err`);
          return h(
            'div',
            { class: 'editor-choice' },
            h('label', { class: 'field__label', for: `${k}-choix-${j}` }, t('perso.reponseN', { n: j + 1 })),
            champ,
            h(
              'div',
              { class: 'editor-choice__foot' },
              h('div', { class: 'editor-choice__correct' }, radio, h('label', { for: radio.id }, t('perso.bonneReponse'), h('span', { class: 'sr-only' }, ` (${t('perso.reponseN', { n: j + 1 })})`))),
              q.choix.length > 2
                ? btn(t('perso.retirer'), { variant: 'quiet', small: true, icon: 'close', ariaLabel: t('perso.retirerReponse', { n: j + 1 }), onClick: () => {
                    q.choix.splice(j, 1);
                    if (q.reponse === j) q.reponse = -1;
                    else if (q.reponse > j) q.reponse -= 1;
                    saveDraft();
                    paintChoix(Math.max(0, j - 1));
                  } })
                : null
            ),
            h('p', { class: 'form-error', id: `${k}-choix-${j}-err` })
          );
        }),
        q.choix.length < MAX_CHOIX
          ? btn(t('perso.ajouterReponse'), { variant: 'quiet', small: true, icon: 'plus', onClick: () => {
              q.choix.push('');
              saveDraft();
              paintChoix(q.choix.length - 1);
            } })
          : null
        )
      );
      if (focusIndex !== undefined) choixBox.querySelector<HTMLElement>(`#${k}-choix-${focusIndex}`)?.focus();
    };
    paintChoix();
    return h(
      'div',
      { class: 'editor-item__card' },
      h('div', { class: 'editor-item__head' }, h('h3', { class: 'editor-item__title', id: `${k}-titre`, tabindex: '-1' }, nom)),
      field({ id: `${k}-question`, label: t('perso.question'), control: input(`${k}-question`, q.question, (v) => {
        q.question = v;
        saveDraftSoon();
      }, { maxlength: 240 }) }),
      h('fieldset', { class: 'editor-fieldset', 'aria-describedby': `${k}-bonne-err` }, h('legend', { class: 'field__label' }, t('perso.reponses')), h('p', { class: 'field__help' }, t('perso.reponsesAide')), choixBox, h('p', { class: 'form-error', id: `${k}-bonne-err` })),
      field({ id: `${k}-explication`, label: t('perso.explication'), optional: true, control: textarea(`${k}-explication`, q.explication, (v) => {
        q.explication = v;
        saveDraftSoon();
      }, 2) }),
      h(
        'div',
        { class: 'editor-item__actions' },
        btn(t('perso.supprimerQuestion'), { variant: 'quiet', small: true, icon: 'trash', ariaLabel: t('perso.supprimerNom', { nom }), onClick: () => {
          const retire = s.quiz.splice(i, 1)[0];
          saveDraft();
          renderQuiz();
          (quizList.querySelector<HTMLElement>(`#${cle(s.quiz[Math.min(i, s.quiz.length - 1)] ?? {})}-titre`) ?? addQuestionBtn).focus();
          toast(t('perso.questionSupprimee'), { icon: 'trash', action: { label: t('perso.annuler'), onClick: () => {
            s.quiz.splice(i, 0, retire);
            saveDraft();
            renderQuiz();
          } } });
        } })
      )
    );
  };

  /* --- Schéma --- */
  const schemaPreview = h('div', { class: 'editor-schema__preview' });
  const paintSchema = () => {
    const f = buildFiche(s, APERCU_FICHE, true);
    schemaPreview.replaceChildren(schemaFigure({ ...f.schema, legende: undefined, compact: true, zoomable: false }));
  };
  const schemas = c.fiches.map((f) => ({ value: f.schema.fichier, label: t('perso.schemaDe', { titre: f.titre }) }));

  /* --- Construction du formulaire --- */
  const build = () => {
    const nuanceInput = input('f-nuance', s.nuance, (v) => {
      s.nuance = v;
      saveDraftSoon();
    }, { maxlength: MAX_NUANCE });
    const form = h(
      'form',
      { class: 'editor', novalidate: true, 'aria-labelledby': 'editor-t' },
      h('div', { class: 'error-summary', role: 'alert', hidden: true }),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-essentiel' },
        h('h2', { class: 'block-title', id: 'sec-essentiel' }, icon('archive', 20), t('perso.essentiel')),
        field({ id: 'f-titre', label: t('perso.titre'), help: t('perso.titreAide'), control: input('f-titre', s.titre, (v) => { s.titre = v; saveDraftSoon(); }, { maxlength: 90 }) }),
        field({ id: 'f-soustitre', label: t('perso.sousTitre'), optional: true, help: t('perso.sousTitreAide'), control: input('f-soustitre', s.sousTitre, (v) => { s.sousTitre = v; saveDraftSoon(); }, { maxlength: 160 }) }),
        field({ id: 'f-categorie', label: t('perso.categorie'), control: select('f-categorie', s.categorie, categorieOptions(), (v) => { s.categorie = v as CategorieId; saveDraft(); }) })
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-serie' },
        h('h2', { class: 'block-title', id: 'sec-serie' }, icon('target', 20), t('verdict.titre')),
        segmented<Verdict>(t('perso.verdict'), (['vrai', 'partiel', 'faux'] as const).map((v) => ({ value: v, label: t(`verdict.${v}`) })), s.verdict, (v) => { s.verdict = v; saveDraft(); }),
        field({ id: 'f-nuance', label: t('perso.nuance'), optional: true, help: t('perso.nuanceAide'), control: nuanceInput, foot: counter(nuanceInput, MAX_NUANCE) })
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-securite' },
        h('h2', { class: 'block-title', id: 'sec-securite' }, icon('shield', 20), t('securite.titre')),
        segmented<NiveauSecurite>(t('perso.niveau'), (['vert', 'orange', 'rouge'] as const).map((v) => ({ value: v, label: t(`securite.${v}.court`) })), s.securite, (v) => { s.securite = v; saveDraft(); })
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-texte' },
        h('h2', { class: 'block-title', id: 'sec-texte' }, icon('text-size', 20), t('perso.texte')),
        h('p', { class: 'field__help' }, t('perso.texteAide')),
        parasList,
        btn(t('perso.ajouterParagraphe'), { variant: 'ghost', icon: 'plus', onClick: () => {
          const p = paragrapheVide(s.paragraphes.length ? 'simple' : 'accroche');
          // Le nouveau paragraphe se place avant « À retenir » s'il existe déjà
          const iRetenir = s.paragraphes.findIndex((x) => x.type === 'retenir');
          if (iRetenir >= 0) s.paragraphes.splice(iRetenir, 0, p);
          else s.paragraphes.push(p);
          saveDraft();
          renderParas();
          parasList.querySelector<HTMLElement>(`#${cle(p)}-type`)?.focus();
        } }),
        h('p', { class: 'notice notice--info editor__tip' }, icon('info', 18), h('span', null, t('perso.conseilTexte')))
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-quiz' },
        h('h2', { class: 'block-title', id: 'sec-quiz' }, icon('brain', 20), t('perso.quiz'), h('span', { class: 'field__opt' }, ` (${t('perso.facultatif')})`)),
        h('p', { class: 'field__help' }, t('perso.quizAide')),
        quizList,
        addQuestionBtn
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-schema' },
        h('h2', { class: 'block-title', id: 'sec-schema' }, icon('eye', 20), t('perso.schema'), h('span', { class: 'field__opt' }, ` (${t('perso.facultatif')})`)),
        h(
          'div',
          { class: 'editor-schema' },
          field({ id: 'f-schema', label: t('perso.schemaChoix'), help: t('perso.schemaAide'), control: select('f-schema', s.schema, [{ value: '', label: t('perso.schemaDefaut') }, ...schemas], (v) => { s.schema = v; saveDraft(); paintSchema(); }) }),
          schemaPreview
        )
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-enfant' },
        h('h2', { class: 'block-title', id: 'sec-enfant' }, icon('child', 20), t('archives.enfantTitre'), h('span', { class: 'field__opt' }, ` (${t('perso.facultatif')})`)),
        field({ id: 'f-enfant', label: t('perso.enfant'), help: t('perso.enfantAide'), control: textarea('f-enfant', s.enfant, (v) => { s.enfant = v; saveDraftSoon(); }, 3) })
      ),
      h(
        'div',
        { class: 'editor__actions' },
        btn(t('perso.apercu'), { variant: 'ghost', icon: 'eye', onClick: apercu }),
        btn(t('perso.enregistrer'), { variant: 'primary', icon: 'check', type: 'submit' }),
        linkBtn(t('commun.annuler'), existante ? `#/archives/${existante.id}` : '#/archives', { variant: 'quiet' })
      )
    );
    form.querySelector('.editor__actions .btn--ghost')?.classList.add('js-apercu');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      enregistrer();
    });
    formWrap.replaceChildren(
      ...nodes(
      brouillon && getBrouillon(cleBrouillon) ? brouillonNotice(() => {
        clearBrouillon(cleBrouillon);
        s = existante ? etatDepuisFiche(existante) : ficheVide();
        build();
        formWrap.querySelector<HTMLElement>('#f-titre')?.focus();
        toast(t('perso.brouillonEfface'), { icon: 'refresh' });
      }) : null,
      form
      )
    );
    renderParas();
    renderQuiz();
    paintSchema();
  };
  build();

  const titre = existante ? t('perso.modifierFiche') : t('perso.creerFiche');
  return {
    title: titre,
    section: 'archives',
    node: h(
      'article',
      { class: 'page page--reading editor-page' },
      h('div', { id: 'editor-t', hidden: true }, titre),
      pageHeader({
        kicker: `${t('archives.titre')} · ${t('perso.mesFiches')}`,
        title: titre,
        icon: 'pen',
        back: existante ? { href: `#/archives/${existante.id}`, label: existante.titre } : { href: '#/archives', label: t('archives.titre') },
        intro: t('perso.introFiche'),
      }),
      formWrap,
      previewWrap
    ),
    onLeave: () => {
      // Dernières frappes conservées dans le brouillon (sauf si la fiche vient d'être enregistrée)
      if (!termine && getBrouillon(cleBrouillon)) saveDraft();
    },
  };
}

/* =====================================================================
 * Fonction (Équivalences)
 * ===================================================================== */

interface ObjetEdit {
  nom: string;
  pourquoi: string;
  comment: string;
  efficacite: 1 | 2 | 3;
}
interface FonctionEtat {
  titre: string;
  categorie: CategorieId | '';
  resume: string;
  principe: string;
  objets: ObjetEdit[];
}

const objetVide = (): ObjetEdit => ({ nom: '', pourquoi: '', comment: '', efficacite: 2 });
const fonctionVide = (): FonctionEtat => ({ titre: '', categorie: '', resume: '', principe: '', objets: [objetVide()] });

function etatDepuisFonction(f: Fonction): FonctionEtat {
  const c = content();
  return {
    titre: f.titre,
    categorie: f.categorie,
    resume: f.resume,
    principe: f.principe,
    objets: f.objets.map((o) => ({ nom: c.byId.objet.get(o.objet)?.nom ?? o.objet, pourquoi: o.pourquoi, comment: o.comment, efficacite: o.efficacite })),
  };
}

function etatFonctionDepuis(raw: unknown): FonctionEtat | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<FonctionEtat>;
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  const objets = Array.isArray(d.objets) ? d.objets.map((o) => ({ nom: s(o?.nom), pourquoi: s(o?.pourquoi), comment: s(o?.comment), efficacite: ([1, 2, 3].includes(o?.efficacite) ? o.efficacite : 2) as 1 | 2 | 3 })) : [];
  return { titre: s(d.titre), categorie: CATEGORIES.includes(d.categorie as CategorieId) ? (d.categorie as CategorieId) : '', resume: s(d.resume), principe: s(d.principe), objets: objets.length ? objets : [objetVide()] };
}

/** Fonction construite depuis le formulaire, avec les objets perso à créer. */
function buildFonction(s: FonctionEtat, id: string, apercu = false): { fonction: Fonction; nouveaux: Objet[] } {
  const c = content();
  const connus: Objet[] = [...loadPerso().objets];
  const nouveaux: Objet[] = [];
  const objets: Fonction['objets'] = [];
  for (const o of s.objets) {
    if (!clean(o.nom)) continue;
    const r = resolveObjet(c, clean(o.nom), [...connus, ...nouveaux]);
    if (r.nouveau) nouveaux.push(r.nouveau);
    if (objets.some((x) => x.objet === r.id)) continue;
    objets.push({ objet: r.id, comment: clean(o.comment), pourquoi: clean(o.pourquoi), efficacite: o.efficacite });
  }
  return {
    fonction: {
      id,
      titre: clean(s.titre) || (apercu ? t('perso.sansTitre') : ''),
      icone: 'multitool',
      categorie: s.categorie || 'mecanique',
      resume: clean(s.resume),
      principe: clean(s.principe),
      fiches: [],
      objets,
    },
    nouveaux,
  };
}

function validateFonction(s: FonctionEtat): Erreur[] {
  const c = content();
  const errs: Erreur[] = [];
  if (!clean(s.titre)) errs.push({ id: 'fn-titre', message: t('perso.erreurTitreFonction') });
  if (!s.categorie) errs.push({ id: 'fn-categorie', message: t('perso.erreurCategorie') });
  regle(errs, 'fn-titre', s.titre);
  regle(errs, 'fn-resume', s.resume);
  regle(errs, 'fn-principe', s.principe);
  const remplis = s.objets.filter((o) => clean(o.nom) || clean(o.pourquoi) || clean(o.comment));
  if (!remplis.length) errs.push({ id: `${cle(s.objets[0] ?? {})}-nom`, message: t('perso.erreurObjets') });
  const vus = new Map<string, number>();
  s.objets.forEach((o, i) => {
    const k = cle(o);
    const n = i + 1;
    const rempli = clean(o.nom) || clean(o.pourquoi) || clean(o.comment);
    if (!rempli) return;
    if (!clean(o.nom)) errs.push({ id: `${k}-nom`, message: t('perso.erreurObjetNom', { n }) });
    if (!clean(o.pourquoi)) errs.push({ id: `${k}-pourquoi`, message: t('perso.erreurObjetPrincipe', { n }) });
    if (clean(o.nom)) {
      const id = resolveObjet(c, clean(o.nom), loadPerso().objets).id;
      const deja = vus.get(id);
      if (deja) errs.push({ id: `${k}-nom`, message: t('perso.erreurObjetDouble', { n, m: deja }) });
      else vus.set(id, n);
    }
    regle(errs, `${k}-nom`, o.nom);
    regle(errs, `${k}-pourquoi`, o.pourquoi);
    regle(errs, `${k}-comment`, o.comment);
  });
  return errs;
}

export function fonctionEditor(ctx: RouteContext): View {
  const c = content();
  const editId = ctx.params.id;
  const existante = editId ? c.byId.fonction.get(editId) : undefined;
  if (editId && (!existante || !isPerso(editId))) return notFoundView(t('perso.introuvableFonction'), { href: '#/arsenal', label: t('arsenal.titre') });

  const cleBrouillon = `fonction:${editId ?? 'nouvelle'}`;
  const brouillon = etatFonctionDepuis(getBrouillon(cleBrouillon));
  let s: FonctionEtat = brouillon ?? (existante ? etatDepuisFonction(existante) : fonctionVide());
  let termine = false;
  const saveDraft = () => !termine && setBrouillon(cleBrouillon, s);
  const saveDraftSoon = debounce(saveDraft, 400);

  const formWrap = h('div', { class: 'editor__form' });
  const previewWrap = h('div', { class: 'editor__preview', hidden: true });
  const mode = modes(formWrap, previewWrap);

  const enregistrer = () => {
    const errs = validateFonction(s);
    if (errs.length) {
      if (!previewWrap.hidden) mode.back();
      showErrors(formWrap, formWrap.querySelector('.error-summary') as HTMLElement, errs);
      return;
    }
    const id = existante?.id ?? newId(s.titre, new Set(c.byId.fonction.keys()));
    try {
      const { fonction, nouveaux } = buildFonction(s, id);
      saveFonction(c, fonction, nouveaux);
    } catch {
      toast(t('perso.erreurStockage'), { icon: 'alert', tone: 'danger', duration: 8000 });
      return;
    }
    termine = true;
    clearBrouillon(cleBrouillon);
    resetSearchIndex();
    toast(t(existante ? 'perso.fonctionModifiee' : 'perso.fonctionEnregistree'), { icon: 'check', tone: 'success' });
    navigate(`/arsenal/f/${id}`);
  };

  const apercu = () => {
    const { fonction, nouveaux } = buildFonction(s, APERCU_FONCTION, true);
    c.byId.fonction.set(fonction.id, fonction);
    nouveaux.forEach((o) => c.byId.objet.set(o.id, o));
    let node: HTMLElement;
    try {
      node = asPreview(fonctionDetail({ path: '', params: { id: fonction.id }, query: new URLSearchParams() }).node, ['.equiv__obj']);
    } finally {
      c.byId.fonction.delete(fonction.id);
      nouveaux.forEach((o) => c.byId.objet.delete(o.id));
    }
    mode.show(h('div', null, apercuBar(t('perso.apercuFonction'), mode.back, enregistrer, t('perso.apercuTexteFonction')), node, apercuBar(t('perso.apercuFin'), mode.back, enregistrer, t('perso.apercuTexteFonction'))));
  };

  // Suggestions : objets du catalogue et objets perso déjà créés
  const datalist = h('datalist', { id: 'catalogue-objets' }, ...[...c.objets, ...loadPerso().objets].map((o) => h('option', { value: o.nom })).sort((a, b) => a.value.localeCompare(b.value, 'fr')));

  const list = h('ol', { class: 'editor-list', 'aria-label': t('perso.objets') });
  const render = (focusId?: string) => {
    list.replaceChildren(...s.objets.map((o, i) => h('li', { class: 'editor-item' }, objetCard(o, i))));
    focusIn(list, focusId);
  };
  const objetCard = (o: ObjetEdit, i: number): HTMLElement => {
    const k = cle(o);
    const nom = t('perso.objetN', { n: i + 1 });
    const set = (champ: 'nom' | 'pourquoi' | 'comment') => (v: string) => {
      o[champ] = v;
      saveDraftSoon();
    };
    const actions = itemActions({
      key: k,
      nom,
      index: i,
      total: s.objets.length,
      removable: s.objets.length > 1,
      onMove: (d) => {
        const j = i + d;
        [s.objets[i], s.objets[j]] = [s.objets[j], s.objets[i]];
        saveDraft();
        render(`${k}-${d < 0 ? 'up' : 'down'}`);
      },
      onRemove: () => {
        const retire = s.objets.splice(i, 1)[0];
        saveDraft();
        render();
        list.querySelector<HTMLElement>(`#${cle(s.objets[Math.min(i, s.objets.length - 1)])}-titre`)?.focus();
        toast(t('perso.objetSupprime'), { icon: 'trash', action: { label: t('perso.annuler'), onClick: () => {
          s.objets.splice(i, 0, retire);
          saveDraft();
          render(`${k}-titre`);
        } } });
      },
    });
    return h(
      'div',
      { class: 'editor-item__card' },
      h('div', { class: 'editor-item__head' }, h('h3', { class: 'editor-item__title', id: `${k}-titre`, tabindex: '-1' }, nom)),
      field({ id: `${k}-nom`, label: t('perso.objetNom'), help: t('perso.objetNomAide'), control: input(`${k}-nom`, o.nom, set('nom'), { maxlength: 60, list: 'catalogue-objets' }) }),
      field({ id: `${k}-pourquoi`, label: t('perso.objetPrincipe'), help: t('perso.objetPrincipeAide'), control: textarea(`${k}-pourquoi`, o.pourquoi, set('pourquoi'), 3) }),
      field({ id: `${k}-comment`, label: t('perso.objetComment'), optional: true, control: textarea(`${k}-comment`, o.comment, set('comment'), 2) }),
      segmented<1 | 2 | 3>(t('arsenal.efficacite'), ([3, 2, 1] as const).map((v) => ({ value: v, label: t(`arsenal.eff${v}`) })), o.efficacite, (v) => {
        o.efficacite = v;
        saveDraft();
      }),
      actions
    );
  };

  const build = () => {
    const form = h(
      'form',
      { class: 'editor', novalidate: true, 'aria-labelledby': 'editor-t' },
      h('div', { class: 'error-summary', role: 'alert', hidden: true }),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-fn' },
        h('h2', { class: 'block-title', id: 'sec-fn' }, icon('multitool', 20), t('perso.laFonction')),
        field({ id: 'fn-titre', label: t('perso.fonctionTitre'), help: t('perso.fonctionTitreAide'), control: input('fn-titre', s.titre, (v) => { s.titre = v; saveDraftSoon(); }, { maxlength: 80 }) }),
        field({ id: 'fn-categorie', label: t('perso.categorie'), control: select('fn-categorie', s.categorie, categorieOptions(), (v) => { s.categorie = v as CategorieId; saveDraft(); }) }),
        field({ id: 'fn-resume', label: t('perso.resume'), optional: true, help: t('perso.resumeAide'), control: input('fn-resume', s.resume, (v) => { s.resume = v; saveDraftSoon(); }, { maxlength: 160 }) }),
        field({ id: 'fn-principe', label: t('perso.principeCommun'), optional: true, help: t('perso.principeCommunAide'), control: textarea('fn-principe', s.principe, (v) => { s.principe = v; saveDraftSoon(); }, 3) })
      ),
      h(
        'section',
        { class: 'panel editor__section', 'aria-labelledby': 'sec-objets' },
        h('h2', { class: 'block-title', id: 'sec-objets' }, icon('box-tools', 20), t('perso.objets')),
        h('p', { class: 'field__help' }, t('perso.objetsAide')),
        datalist,
        list,
        btn(t('perso.ajouterObjet'), { variant: 'ghost', icon: 'plus', onClick: () => {
          const o = objetVide();
          s.objets.push(o);
          saveDraft();
          render();
          list.querySelector<HTMLElement>(`#${cle(o)}-nom`)?.focus();
        } })
      ),
      h(
        'div',
        { class: 'editor__actions' },
        btn(t('perso.apercu'), { variant: 'ghost', icon: 'eye', onClick: apercu }),
        btn(t('perso.enregistrer'), { variant: 'primary', icon: 'check', type: 'submit' }),
        linkBtn(t('commun.annuler'), existante ? `#/arsenal/f/${existante.id}` : '#/arsenal', { variant: 'quiet' })
      )
    );
    form.querySelector('.editor__actions .btn--ghost')?.classList.add('js-apercu');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      enregistrer();
    });
    formWrap.replaceChildren(
      ...nodes(
      brouillon && getBrouillon(cleBrouillon) ? brouillonNotice(() => {
        clearBrouillon(cleBrouillon);
        s = existante ? etatDepuisFonction(existante) : fonctionVide();
        build();
        formWrap.querySelector<HTMLElement>('#fn-titre')?.focus();
        toast(t('perso.brouillonEfface'), { icon: 'refresh' });
      }) : null,
      form
      )
    );
    render();
  };
  build();

  const titre = existante ? t('perso.modifierFonction') : t('perso.creerFonction');
  return {
    title: titre,
    section: 'arsenal',
    node: h(
      'article',
      { class: 'page page--reading editor-page' },
      h('div', { id: 'editor-t', hidden: true }, titre),
      pageHeader({
        kicker: `${t('arsenal.titre')} · ${t('perso.mesFonctions')}`,
        title: titre,
        icon: 'pen',
        back: existante ? { href: `#/arsenal/f/${existante.id}`, label: existante.titre } : { href: '#/arsenal', label: t('arsenal.titre') },
        intro: t('perso.introFonction'),
      }),
      formWrap,
      previewWrap
    ),
    onLeave: () => {
      if (!termine && getBrouillon(cleBrouillon)) saveDraft();
    },
  };
}

