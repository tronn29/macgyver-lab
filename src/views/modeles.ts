/*
 * Page cachée #/modeles : aperçu des 4 modèles de contenu avec le vrai design de l'appli.
 * Accessible seulement par son adresse : absente des menus, de la recherche et des listes.
 *
 * Chaque modèle (public/content/fr/_modeles/*.json, embarqué via « virtual:modeles ») est converti
 * en contenu d'aperçu : les textes entre crochets restent visibles pour montrer où écrire, et les
 * valeurs techniques (catégorie, niveau, identifiants…) prennent une valeur d'exemple valide.
 * Les identifiants d'aperçu commencent par « _modele » : la progression les ignore.
 */
import modeles from 'virtual:modeles';
import { content } from '../core/content';
import { h } from '../core/dom';
import { t } from '../core/i18n';
import type { RouteContext, View } from '../core/router';
import { scoreMission } from '../core/scoring';
import type { CategorieId, Experience, Fiche, Fonction, Mission, MissionSolution, Objet } from '../core/types';
import { label, panel, segmented } from '../ui/components';
import { icon } from '../ui/icons';
import { ficheDetail } from './archives';
import { fonctionDetail } from './arsenal';
import { pageHeader } from './common';
import { experienceDetail } from './labo';
import { missionBriefing, missionField } from './operations';

type Obj = Record<string, unknown>;
type Onglet = 'fiche' | 'equivalence' | 'experience' | 'mission';

const CATEGORIES: CategorieId[] = ['electricite', 'magnetisme', 'chimie', 'mecanique', 'lumiere', 'thermique', 'pression', 'materiaux', 'fluides'];

/* ---------- Outils de conversion ---------- */

/** Un texte encore à remplacer (hors balises de glossaire [[…]]). */
export const isPlaceholder = (v: unknown): boolean => typeof v === 'string' && /[[\]]/.test(v.replace(/\[\[[^\]]*\]\]/g, ''));
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
/** « [ … ex. : papier-alu] » → « papier-alu » (l'exemple donné dans le texte indicatif). */
const exemple = (v: unknown): string | null => {
  const m = str(v).match(/ex\.\s*:\s*([a-z0-9-]+)/);
  return m ? m[1] : null;
};
/** Identifiant réel si le texte en est un, ou si son exemple existe ; sinon la valeur de repli. */
function realId<K extends keyof ReturnType<typeof content>['byId']>(kind: K, v: unknown, fallback: string): string {
  const map = content().byId[kind] as Map<string, unknown>;
  if (typeof v === 'string' && map.has(v)) return v;
  const ex = exemple(v);
  if (ex && map.has(ex)) return ex;
  return fallback;
}
const realIds = <K extends keyof ReturnType<typeof content>['byId']>(kind: K, v: unknown, fallbacks: string[]): string[] => {
  const out = arr(v).map((x, i) => realId(kind, x, fallbacks[i % fallbacks.length]));
  return [...new Set(out.length ? out : fallbacks)];
};

/* ---------- Conversion des 4 modèles ---------- */

function demoFiche(m: Obj): Fiche {
  const f = (arr<Obj>(m.theorie)[0] ?? {}) as Obj;
  const schema = (f.schema ?? {}) as Obj;
  const realite = (f.realite ?? {}) as Obj;
  const securite = (f.securite ?? {}) as Obj;
  const liens = (f.liens ?? {}) as Obj;
  const echelle = f.echelle as Obj | undefined;
  return {
    id: '_modele-fiche',
    titre: str(f.titre, '[Titre]'),
    sousTitre: str(f.sousTitre),
    categories: [pick(arr(f.categories)[0], CATEGORIES, 'thermique')],
    niveau: num(f.niveau, 2),
    schema: { fichier: 'modele-exemple.svg', alt: str(schema.alt, '[Description du schéma]'), legende: str(schema.legende) },
    texte: arr<string>(f.texte).map((p) => str(p)),
    enfant: str(f.enfant, '[Explication pour un enfant]'),
    realite: { verdict: pick(realite.verdict, ['vrai', 'partiel', 'faux'] as const, 'partiel'), nuance: str(realite.nuance) || undefined, explication: str(realite.explication) },
    securite: { niveau: pick(securite.niveau, ['vert', 'orange', 'rouge'] as const, 'orange'), note: str(securite.note, '[Note de sécurité]') },
    liens: {
      fiches: realIds('fiche', liens.fiches, ['choc-thermique', 'glace-seche']),
      equivalences: realIds('fonction', liens.equivalences, ['isoler-chaleur']),
      pratique: realIds('experience', liens.pratique, ['brouillard-glace-seche']),
    },
    quiz: arr<Obj>(f.quiz).map((q) => {
      const choix = arr<string>(q.choix).map((c) => str(c));
      const bonne = choix.findIndex((c) => /Bonne réponse/i.test(c));
      return { question: str(q.question), choix, reponse: num(q.reponse, bonne >= 0 ? bonne : 0), explication: str(q.explication) };
    }),
    motsCles: [],
    echelle: echelle
      ? {
          titre: str(echelle.titre) || undefined,
          intro: str(echelle.intro),
          niveaux: arr<Obj>(echelle.niveaux).map((n) => ({ valeur: str(n.valeur), dit: str(n.dit), description: str(n.description) })),
        }
      : undefined,
  };
}

/** Objet d'aperçu quand l'identifiant du modèle n'existe pas dans le catalogue. */
function demoObjet(id: string, texte: string): Objet {
  const nom = texte.replace(/^\[|\]$/g, '').split(/\s*[:;(]\s*/)[0] || 'objet';
  return { id, nom: nom.charAt(0).toUpperCase() + nom.slice(1), icone: 'other', proprietes: [] };
}

function demoFonction(m: Obj, objets: Map<string, Objet>): Fonction {
  const fn = (arr<Obj>(m.equivalences)[0] ?? {}) as Obj;
  const sec = fn.securite as Obj | undefined;
  return {
    id: '_modele-fonction',
    titre: str(fn.titre, '[Fonction]'),
    icone: isPlaceholder(fn.icone) ? 'multitool' : str(fn.icone, 'multitool'),
    categorie: pick(fn.categorie, CATEGORIES, 'thermique'),
    resume: str(fn.resume),
    principe: str(fn.principe),
    fiches: realIds('fiche', fn.fiches, ['isolation-thermique']),
    securite: sec ? { niveau: pick(sec.niveau, ['vert', 'orange', 'rouge'] as const, 'orange'), note: str(sec.note) } : undefined,
    objets: arr<Obj>(fn.objets).map((o, i) => {
      let id = realId('objet', o.objet, '');
      if (!id) {
        id = `_modele-objet-f${i}`;
        objets.set(id, demoObjet(id, str(o.objet)));
      }
      return { objet: id, comment: str(o.comment), pourquoi: str(o.pourquoi), efficacite: num(o.efficacite, [3, 2, 1][i % 3]) as 1 | 2 | 3, limite: str(o.limite) || undefined };
    }),
  };
}

function demoExperience(m: Obj): Experience {
  const e = (arr<Obj>(m.pratique)[0] ?? {}) as Obj;
  const schema = (e.schema ?? {}) as Obj;
  const sec = (e.securite ?? {}) as Obj;
  return {
    id: '_modele-experience',
    titre: str(e.titre, '[Titre]'),
    sousTitre: str(e.sousTitre),
    categories: [pick(arr(e.categories)[0], CATEGORIES, 'fluides')],
    duree: num(e.duree, 20),
    difficulte: num(e.difficulte, 1) as 1 | 2 | 3,
    adulte: e.adulte === true,
    securite: { niveau: pick(sec.niveau, ['vert', 'orange'] as const, 'vert'), note: str(sec.note) },
    schema: { fichier: 'modele-exemple.svg', alt: str(schema.alt, '[Description du montage]'), legende: str(schema.legende) },
    materiel: arr<Obj>(e.materiel).map((x) => ({ nom: str(x.nom), quantite: str(x.quantite) || undefined })),
    etapes: arr<string>(e.etapes).map((x) => str(x)),
    precautions: arr<string>(e.precautions).map((x) => str(x)),
    resultat: str(e.resultat),
    explication: arr<string>(e.explication).map((x) => str(x)),
    pourAllerPlusLoin: str(e.pourAllerPlusLoin) || undefined,
    fiches: realIds('fiche', e.fiches, ['siphon']),
  };
}

function demoMission(m: Obj, objets: Map<string, Objet>): Mission {
  const mi = (arr<Obj>(m.missions)[0] ?? {}) as Obj;
  const brief = (mi.briefing ?? {}) as Obj;
  const zones = arr<Obj>(mi.zones).map((z, i) => ({ id: exemple(z.id) ?? `zone-${i + 1}`, nom: (str(z.nom).match(/ex\.\s*:\s*([^\]]+)\]/)?.[1] ?? `Zone ${i + 1}`).trim() }));
  if (!zones.length) zones.push({ id: 'zone-1', nom: 'Zone 1' });
  // Objets de la pièce : l'exemple réel si possible, sinon un objet d'aperçu ; rôle d'après le texte indicatif
  const roles: Record<string, string[]> = { utile: [], cle: [], leurre: [] };
  const pieces = arr<Obj>(mi.objets).map((o, i) => {
    const texte = str(o.objet);
    let id = realId('objet', texte, '');
    if (!id || [...objets.keys(), ...roles.utile, ...roles.cle, ...roles.leurre].includes(id)) {
      id = `_modele-objet-m${i}`;
      objets.set(id, demoObjet(id, texte));
    }
    if (/^\[objet utile/i.test(texte)) roles.utile.push(id);
    else if (/^\[objet clé/i.test(texte)) roles.cle.push(id);
    else if (/^\[leurre/i.test(texte)) roles.leurre.push(id);
    const zone = zones.some((z) => z.id === o.zone) ? str(o.zone) : zones[i % zones.length].id;
    return { objet: id, zone, etat: str(o.etat) || undefined };
  });
  const utiles = roles.utile.length ? roles.utile : pieces.slice(0, 2).map((p) => p.objet);
  const solutions: MissionSolution[] = arr<Obj>(mi.solutions).map((s, i) => ({
    id: str(s.id, `s${i + 1}`),
    titre: str(s.titre),
    objets: i === 0 ? utiles.slice(0, 2) : [...utiles.slice(2), ...roles.cle].slice(0, 2),
    optionnels: [],
    principes: realIds('fiche', s.principes, ['levier']),
    motsCles: arr<string[]>(s.motsCles).map((g) => arr<string>(g).map((k) => str(k))),
    etapes: arr<string>(s.etapes).map((x) => str(x)),
    explication: str(s.explication),
  }));
  const piece = mi.pieceManquante as Obj | undefined;
  return {
    id: '_modele-mission',
    titre: str(mi.titre, '[Titre de mission]'),
    code: str(mi.code, 'OP-00'),
    difficulte: pick(mi.difficulte, ['facile', 'moyen', 'difficile'] as const, roles.cle.length ? 'difficile' : 'moyen'),
    categories: [pick(arr(mi.categories)[0], CATEGORIES, 'mecanique')],
    duree: num(mi.duree, 8),
    briefing: { lieu: str(brief.lieu), contexte: str(brief.contexte), objectif: str(brief.objectif), contraintes: arr<string>(brief.contraintes).map((x) => str(x)) },
    zones,
    objets: pieces,
    leurres: roles.leurre,
    objetCle: roles.cle[0],
    pieceManquante: piece ? { nom: str(piece.nom), remplacements: utiles.slice(0, 1), explication: str(piece.explication) } : undefined,
    solutions,
    indices: (arr<string>(mi.indices).map((x) => str(x)).concat(['', '', '']).slice(0, 3) as [string, string, string]),
    fiches: realIds('fiche', mi.fiches, ['levier']),
    equivalences: realIds('fonction', mi.equivalences, ['faire-levier']),
  };
}

/* ---------- Enregistrement de l'aperçu dans le contenu (cartes d'index seulement) ---------- */

let demos: { fiche: Fiche; fonction: Fonction; experience: Experience; mission: Mission } | null = null;

function ensureDemos() {
  if (demos) return demos;
  const c = content();
  const objets = new Map<string, Objet>();
  const fiche = demoFiche(modeles['modele-fiche-theorie'] ?? {});
  const fonction = demoFonction(modeles['modele-equivalence'] ?? {}, objets);
  const experience = demoExperience(modeles['modele-experience'] ?? {});
  const mission = demoMission(modeles['modele-mission'] ?? {}, objets);
  // Uniquement les tables d'accès par identifiant : rien n'apparaît dans les listes, la recherche ou les statistiques
  c.byId.fiche.set(fiche.id, fiche);
  c.byId.fonction.set(fonction.id, fonction);
  c.byId.experience.set(experience.id, experience);
  c.byId.mission.set(mission.id, mission);
  objets.forEach((o, id) => c.byId.objet.set(id, o));
  c.fichesParFiche.set(fiche.id, (fiche.liens.fiches ?? []).map((id) => c.byId.fiche.get(id)).filter((x): x is Fiche => Boolean(x)));
  c.experiencesParFiche.set(fiche.id, (fiche.liens.pratique ?? []).map((id) => c.byId.experience.get(id)).filter((x): x is Experience => Boolean(x)));
  demos = { fiche, fonction, experience, mission };
  return demos;
}

/* ---------- Mise en forme de l'aperçu ---------- */

/** Le titre de chaque aperçu devient un titre de niveau 2 (un seul h1 par page), sans changer son style. */
function asPreview(node: HTMLElement, inertSelectors: string[] = []): HTMLElement {
  node.classList.remove('view-enter');
  node.querySelectorAll('h1').forEach((el) => {
    el.setAttribute('role', 'heading');
    el.setAttribute('aria-level', '2');
    el.removeAttribute('tabindex');
  });
  node.querySelectorAll<HTMLElement>('.back-link, .pager').forEach((el) => (el.hidden = true));
  // Commandes qui écriraient dans la progression : visibles mais non interactives (estompées)
  for (const sel of ['.page-head__actions', '.read-box', '.notes', '.experience__done', '.briefing__launch'])
    node.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.inert = true;
      el.classList.add('is-preview-inert');
    });
  // Zones entières rendues non interactives sans changer leur apparence
  for (const sel of inertSelectors) node.querySelectorAll<HTMLElement>(sel).forEach((el) => (el.inert = true));
  return node;
}

const ctx = (id: string, query = ''): RouteContext => ({ path: '', params: { id }, query: new URLSearchParams(query) });

function previewMission(m: Mission): HTMLElement {
  const briefing = asPreview(missionBriefing(ctx(m.id)).node);
  const terrain = asPreview(missionField(ctx(m.id, 'chrono=0')).node, ['.field-ops__layout', '.ops-bar']);
  terrain.querySelector('.ops-bar')?.remove();
  // Le titre et les indices sont déjà montrés (briefing au-dessus, indices dépliés plus bas)
  terrain.querySelector('.page-head')?.remove();
  terrain.querySelector('.hints')?.closest('.panel')?.remove();
  // Solutions possibles et barème, avec le même habillage que le rapport de mission
  const exemple = scoreMission(m, { selection: m.solutions[0]?.objets ?? [], texte: (m.solutions[0]?.motsCles ?? []).map((g) => g[0]).join(' '), indices: [] });
  const solutions = h(
    'section',
    { class: 'page', 'aria-labelledby': 'modele-sol-t' },
    h('h2', { class: 'block-title block-title--spaced', id: 'modele-sol-t' }, icon('bulb', 20), t('operations.solutionsPossibles')),
    ...m.solutions.map((s, i) =>
      h(
        'details',
        { class: 'solution', open: i === 0 },
        h('summary', { class: 'solution__head' }, h('span', { class: 'solution__n' }, `S${i + 1}`), h('span', { class: 'solution__title' }, s.titre), icon('chevron-down', 18)),
        h(
          'div',
          { class: 'solution__body' },
          h('h3', { class: 'analysis__sub' }, t('modeles.motsCles')),
          h('div', { class: 'chips' }, ...s.motsCles.map((g) => h('span', { class: 'chip chip--muted' }, g.join(' · ')))),
          h('h3', { class: 'analysis__sub' }, t('operations.etapesSolution')),
          h('ol', { class: 'solution__steps' }, ...s.etapes.map((e) => h('li', null, e))),
          h('h3', { class: 'analysis__sub' }, t('operations.principeDerriere')),
          h('p', null, s.explication)
        )
      )
    ),
    h('h2', { class: 'block-title block-title--spaced' }, icon('hint', 20), t('operations.indices')),
    h('ol', { class: 'hints' }, ...m.indices.map((txt, i) => h('li', { class: 'hint is-open' }, h('div', { class: 'hint__head' }, h('span', { class: 'hint__n' }, t('operations.indiceN', { n: i + 1 })), h('span', { class: 'hint__type' }, t(`operations.indiceType${i + 1}`))), h('p', { class: 'hint__text' }, txt)))),
    panel(
      [
        h('h2', { class: 'block-title' }, icon('chart', 20), t('modeles.score')),
        h('p', { class: 'panel__text' }, str((modeles['modele-mission'] ?? {}).score).replace(/^\[|\]$/g, '')),
        h('p', { class: 'muted small' }, t('modeles.scoreExemple', { n: exemple.total })),
      ],
      { class: 'modeles__score' }
    )
  );
  return h('div', { class: 'modeles__mission' }, briefing, terrain, solutions);
}

function render(onglet: Onglet): HTMLElement {
  const d = ensureDemos();
  let node: HTMLElement;
  switch (onglet) {
    case 'fiche':
      node = asPreview(ficheDetail(ctx(d.fiche.id)).node);
      break;
    case 'equivalence':
      node = asPreview(fonctionDetail(ctx(d.fonction.id)).node);
      break;
    case 'experience':
      node = asPreview(experienceDetail(ctx(d.experience.id)).node);
      break;
    case 'mission':
      node = previewMission(d.mission);
      break;
  }
  const fichier: Record<Onglet, string> = { fiche: 'modele-fiche-theorie.json', equivalence: 'modele-equivalence.json', experience: 'modele-experience.json', mission: 'modele-mission.json' };
  return h(
    'div',
    { class: 'modeles__apercu' },
    h('p', { class: 'modeles__fichier' }, icon('dossier', 16), h('span', null, t('modeles.fichier')), h('code', { class: 'cmd' }, `public/content/fr/_modeles/${fichier[onglet]}`)),
    node
  );
}

export function modelesView(context: RouteContext): View {
  const ONGLETS: Onglet[] = ['fiche', 'equivalence', 'experience', 'mission'];
  let onglet: Onglet = ONGLETS.includes(context.query.get('modele') as Onglet) ? (context.query.get('modele') as Onglet) : 'fiche';
  const stage = h('div', { class: 'modeles__stage', 'aria-live': 'polite' });
  const paint = () => stage.replaceChildren(render(onglet));
  paint();

  const etapes = [t('modeles.etape1'), t('modeles.etape2'), t('modeles.etape3'), t('modeles.etape4')];
  return {
    title: t('modeles.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page modeles' },
      pageHeader({ kicker: t('modeles.kicker'), title: t('modeles.titre'), icon: 'dossier', intro: t('modeles.intro') }),
      h('p', { class: 'notice notice--info' }, icon('lock', 18), t('modeles.cachee')),
      panel(
        [
          h('h2', { class: 'block-title' }, icon('list', 20), t('modeles.comment')),
          h('ol', { class: 'modeles__etapes' }, ...etapes.map((e) => h('li', null, e))),
          h('p', { class: 'muted small' }, label(t('modeles.commandes')), ' ', h('code', { class: 'cmd' }, 'npm run modele:verifier -- <fichier>'), ' ', h('code', { class: 'cmd' }, 'npm run modele:ajouter -- <fichier>')),
        ],
        { class: 'modeles__guide', corners: true }
      ),
      h(
        'div',
        { class: 'toolbar modeles__onglets' },
        segmented<Onglet>(
          t('modeles.choisir'),
          [
            { value: 'fiche', label: t('modeles.ongletFiche'), icon: 'archive' },
            { value: 'equivalence', label: t('modeles.ongletEquivalence'), icon: 'multitool' },
            { value: 'experience', label: t('modeles.ongletExperience'), icon: 'flask' },
            { value: 'mission', label: t('modeles.ongletMission'), icon: 'target' },
          ],
          onglet,
          (v) => {
            onglet = v;
            history.replaceState(history.state, '', `#/modeles?modele=${v}`);
            paint();
          }
        )
      ),
      stage
    ),
  };
}
