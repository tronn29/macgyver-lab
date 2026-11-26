/* Archives (Théorie) : liste filtrable et fiche de révision. */
import { content } from '../core/content';
import { h } from '../core/dom';
import { t } from '../core/i18n';
import { answerQuiz, isRead, recordFicheQuiz, setLast, setRead, XP } from '../core/progress';
import type { RouteContext, View } from '../core/router';
import { setQuery } from '../core/router';
import { getProgress, getSettings } from '../core/store';
import type { Fiche } from '../core/types';
import { btn, emptyState, iconBtn, panel, safetyBadge, segmented, toast, verdictBadge } from '../ui/components';
import { icon } from '../ui/icons';
import { quizRunner } from '../ui/quiz';
import { parseRich, rich } from '../ui/richtext';
import { openSchemaZoom, schemaFigure } from '../ui/schema';
import { ficheBody, isLongFormat, isRetenir, isSerieRealite, readingMinutes } from '../core/fiche';
import { shareFiche } from '../ui/share';
import { notesPanel } from '../ui/notes';
import { listenButton, stopSpeech } from '../ui/speech';
import { navigate } from '../core/router';
import { play } from '../core/sound';
import { catIcon, catName, categoryFilter, countByCategory, favButton, ficheCard, notFoundView, pageHeader, relatedLinks } from './common';
import { estPerso, isPerso, persoFiches, toutesFiches } from '../core/perso';
import { persoBar } from './perso-ui';
import { linkBtn } from '../ui/components';
import { openGlossaryForFiche } from './glossaire';

type Statut = 'toutes' | 'non-lues' | 'lues' | 'favoris';

export function archivesList(ctx: RouteContext): View {
  const c = content();
  let cat = ctx.query.get('cat');
  let statut = (ctx.query.get('statut') as Statut) || 'toutes';
  if (cat && !c.byId.categorie.has(cat)) cat = null;

  const grid = h('div', { class: 'card-grid', 'aria-live': 'polite' });
  // Mes fiches (écrites dans l'appli) : section à part, au-dessus des fiches officielles
  const persoGrid = h('div', { class: 'card-grid' });
  const persoCount = h('span', { class: 'chip chip--muted' });
  const persoSection = h(
    'section',
    { class: 'perso-section', 'aria-labelledby': 'mes-fiches-t' },
    h('div', { class: 'perso-section__head' }, h('h2', { class: 'block-title', id: 'mes-fiches-t' }, icon('pen', 20), t('perso.mesFiches')), persoCount),
    persoGrid
  );
  const officiellesTitre = h('h2', { class: 'sr-only' }, t('commun.listeTitre'));
  const filterSlot = h('div');
  const countEl = h('p', { class: 'list-count' });

  const apply = () => {
    const p = getProgress();
    const garde = (f: Fiche) => {
      if (cat && !f.categories.includes(cat as Fiche['categories'][number])) return false;
      if (statut === 'lues' && !p.lus[f.id]) return false;
      if (statut === 'non-lues' && p.lus[f.id]) return false;
      if (statut === 'favoris' && !p.favoris[`fiche:${f.id}`]) return false;
      return true;
    };
    const items = c.fiches.filter(garde);
    const perso = persoFiches().filter(garde);
    persoSection.hidden = !persoFiches().length;
    persoCount.textContent = t('commun.fiches', { n: perso.length });
    persoGrid.replaceChildren(...(perso.length ? perso.map((f) => ficheCard(f)) : [h('p', { class: 'muted' }, t('perso.aucuneFiltre'))]));
    // Titre visible seulement quand les deux sections coexistent
    officiellesTitre.className = persoFiches().length ? 'block-title block-title--spaced' : 'sr-only';
    officiellesTitre.textContent = persoFiches().length ? t('perso.fichesOfficielles') : t('commun.listeTitre');
    countEl.textContent = t('commun.fiches', { n: items.length });
    grid.replaceChildren(
      ...(items.length
        ? items.map((f) => ficheCard(f))
        : [
            emptyState(t('archives.aucune'), '', {
              icon: 'filter',
              action: btn(t('archives.reinitialiser'), {
                variant: 'ghost',
                icon: 'refresh',
                onClick: () => {
                  cat = null;
                  statut = 'toutes';
                  setQuery({ cat: null, statut: null });
                  renderFilters();
                  apply();
                },
              }),
            }),
          ])
    );
  };

  const renderFilters = () => {
    filterSlot.replaceChildren(
      categoryFilter(cat, countByCategory(toutesFiches(c)), (id) => {
        cat = id;
        setQuery({ cat: id });
        renderFilters();
        apply();
      }),
      segmented<Statut>(
        t('archives.filtreLecture'),
        [
          { value: 'toutes', label: t('commun.toutes') },
          { value: 'non-lues', label: t('archives.nonLues') },
          { value: 'lues', label: t('archives.lues') },
          { value: 'favoris', label: t('archives.favoris'), icon: 'star' },
        ],
        statut,
        (v) => {
          statut = v;
          setQuery({ statut: v === 'toutes' ? null : v });
          apply();
        },
        { hideLegend: true }
      )
    );
  };

  renderFilters();
  apply();

  const toutes = toutesFiches(c);
  const lus = toutes.filter((f) => getProgress().lus[f.id]).length;
  return {
    title: t('archives.titre'),
    section: 'archives',
    keepScroll: true,
    node: h(
      'div',
      { class: 'page' },
      pageHeader({
        kicker: t('archives.kicker'),
        title: t('archives.titre'),
        icon: 'archive',
        intro: t('archives.intro'),
        actions: [
          linkBtn(t('perso.creerFiche'), '#/archives/creer', { variant: 'primary', small: true, icon: 'plus' }),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--ghost btn--sm',
              title: t('archives.surpriseDesc'),
              onclick: () => {
                const p = getProgress();
                const pool = toutes.filter((f) => !p.lus[f.id]);
                const list = pool.length ? pool : toutes;
                navigate(`/archives/${list[Math.floor(Math.random() * list.length)].id}`);
              },
            },
            icon('spark', 18),
            h('span', null, t('archives.surprise'))
          ),
        ],
        meta: [h('span', { class: 'chip chip--accent' }, icon('check', 14), t('home.lues', { a: lus, b: toutes.length }))],
      }),
      h('div', { class: 'toolbar' }, filterSlot),
      persoSection,
      officiellesTitre,
      countEl,
      grid
    ),
  };
}

function orderedFiches(): Fiche[] {
  return content().fiches;
}

export function ficheDetail(ctx: RouteContext): View {
  const c = content();
  const f = c.byId.fiche.get(ctx.params.id);
  if (!f) return notFoundView(t('archives.introuvable'), { href: '#/archives', label: t('archives.titre') });

  // Fiche écrite dans l'appli (ou son aperçu dans l'éditeur) : pas de pager, commandes propres
  const perso = estPerso(f.id);
  const list = orderedFiches();
  const idx = list.indexOf(f);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 ? list[idx + 1] : undefined;
  const settings = getSettings();

  /* Mode enfant */
  const enfantPanel = h(
    'section',
    { class: 'eli5', id: `eli5-${f.id}`, hidden: !settings.modeEnfant, 'aria-labelledby': `eli5-t-${f.id}` },
    h('h2', { class: 'eli5__title', id: `eli5-t-${f.id}` }, icon('child', 20), t('archives.enfantTitre')),
    h('p', { class: 'eli5__text' }, f.enfant)
  );
  const eliBtn = h(
    'button',
    { type: 'button', class: ['btn', 'btn--ghost', 'btn--sm', 'eli5-toggle'], 'aria-pressed': String(settings.modeEnfant), 'aria-controls': enfantPanel.id },
    icon('child', 18),
    h('span', null, t('archives.enfant'))
  );
  eliBtn.addEventListener('click', () => {
    const on = eliBtn.getAttribute('aria-pressed') !== 'true';
    eliBtn.setAttribute('aria-pressed', String(on));
    enfantPanel.hidden = !on;
    if (on) enfantPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const long = isLongFormat(f);
  const minutes = readingMinutes(f);

  /* Glossaire de la fiche */
  const termIds = new Set<string>();
  for (const para of ficheBody(f)) parseRich(para.replace(/\*\*/g, '')).forEach((s) => s.type === 'term' && s.id && termIds.add(s.id));

  const fichesLiees = (c.fichesParFiche.get(f.id) ?? []).slice(0, 6);
  const equivalences = (f.liens.equivalences ?? []).map((id) => c.byId.fonction.get(id)).filter(Boolean);
  const pratiques = c.experiencesParFiche.get(f.id) ?? [];

  /* Case « Lu » : c'est toi qui décides quand une fiche est lue (jamais automatique) */
  const readChip = h('span', { class: 'chip chip--success', hidden: !isRead(f.id) }, icon('check', 14), t('archives.marqueLue'));
  const readBox = readControl(f, (lu) => (readChip.hidden = !lu));

  /* Score du quiz enregistré */
  const quizScore = h('p', { class: 'quiz-score', 'aria-live': 'polite' });
  const paintQuizScore = () => {
    const s = getProgress().quizFiches[f.id];
    quizScore.hidden = !s;
    if (s)
      quizScore.replaceChildren(
        icon('chart', 16),
        h('span', null, `${t('quiz.dernier', { a: s.dernier, b: s.total })} · ${t('quiz.meilleur', { a: s.meilleur, b: s.total })} · ${t('quiz.tentatives', { n: s.tentatives })}`)
      );
  };
  paintQuizScore();

  const main = h(
    'div',
    { class: 'fiche__main' },
    f.principeSeul
      ? h('div', { class: 'notice notice--danger', role: 'note' }, icon('shield', 20), h('p', null, t('securite.principeSeul')))
      : null,
    h('div', { class: 'fiche__tools' }, f.enfant ? eliBtn : null, listenButton(f, () => eliBtn.getAttribute('aria-pressed') === 'true'), termIds.size ? btn(t('archives.glossaire'), { variant: 'ghost', small: true, icon: 'book', onClick: () => openGlossaryForFiche(f, [...termIds]) }) : null),
    f.enfant ? enfantPanel : null,
    ...(long ? longBody(f) : shortBody(f)),
    f.echelle ? echelleBlock(f.echelle) : null,
    readBox,
    !long && f.chiffres?.length
      ? h(
          'section',
          { class: 'figures', 'aria-labelledby': 'fig-t' },
          h('h2', { class: 'block-title', id: 'fig-t' }, t('archives.chiffres')),
          h(
            'dl',
            { class: 'figures__grid' },
            ...f.chiffres.map((ch) =>
              h(
                'div',
                { class: 'figures__item' },
                h('dt', null, ch.label),
                h('dd', { class: 'figures__val' }, ch.valeur, ch.dit ? h('span', { class: 'figures__dit' }, ` (${ch.dit})`) : null),
                ch.concret ? h('dd', { class: 'figures__concret' }, ch.concret) : null
              )
            )
          )
        )
      : null,
    perso && !fichesLiees.length && !equivalences.length && !pratiques.length
      ? null
      : h(
      'section',
      { class: 'links-block', 'aria-labelledby': 'links-t' },
      h('h2', { class: 'block-title', id: 'links-t' }, t('archives.liens')),
      relatedLinks([
        { title: t('archives.fichesLiees'), icon: 'archive', items: fichesLiees.map((x) => ({ href: `#/archives/${x.id}`, label: x.titre, icon: catIcon(x.categories[0]), sub: catName(x.categories[0]) })) },
        { title: t('archives.equivalences'), icon: 'multitool', items: equivalences.map((x) => ({ href: `#/arsenal/f/${x!.id}`, label: x!.titre, icon: x!.icone, sub: t('commun.objets', { n: x!.objets.length }) })) },
        { title: t('archives.pratique'), icon: 'flask', items: f.principeSeul ? [] : pratiques.map((x) => ({ href: `#/labo/${x.id}`, label: x.titre, icon: 'flask', sub: t('commun.minutes', { n: x.duree }) })) },
      ]) ?? h('p', { class: 'muted' }, t('commun.aucun'))
    ),
    !f.quiz.length
      ? null
      : h(
      'section',
      { class: 'quiz-block panel', 'aria-labelledby': 'quiz-t' },
      h('h2', { class: 'block-title', id: 'quiz-t' }, icon('brain', 20), t('archives.quiz')),
      h('p', { class: 'muted' }, t('archives.quizIntro')),
      quizScore,
      quizRunner(
        f.quiz.map((q) => ({ fiche: f, quiz: q })),
        {
          restartable: true,
          onAnswer: (item, correct) => answerQuiz(item.fiche.id, item.fiche.categories, correct, false),
          onDone: (score, total) => {
            recordFicheQuiz(f.id, score, total);
            paintQuizScore();
            toast(t('quiz.enregistre', { a: score, b: total }), { icon: 'brain', tone: score === total ? 'success' : 'accent' });
          },
        }
      )
    ),
    notesPanel(`fiche:${f.id}`, f.titre, `#/archives/${f.id}`),
    perso
      ? null
      : h(
      'nav',
      { class: 'pager', 'aria-label': t('archives.fiche') },
      prev ? h('a', { class: 'pager__link pager__link--prev', href: `#/archives/${prev.id}` }, icon('chevron-left', 18), h('span', null, h('small', null, t('archives.fichePrecedente')), prev.titre)) : h('span'),
      next ? h('a', { class: 'pager__link pager__link--next', href: `#/archives/${next.id}` }, h('span', null, h('small', null, t('archives.ficheSuivante')), next.titre), icon('chevron-right', 18)) : h('span')
    )
  );

  const figure = schemaFigure({ ...f.schema, titre: f.titre });
  const aside = h('div', { class: 'fiche__visual' }, figure);

  /* Schéma toujours à portée sur téléphone : bouton flottant quand la figure est sortie de l'écran */
  const schemaFab = h(
    'button',
    { type: 'button', class: 'schema-fab', hidden: true, onclick: () => openSchemaZoom({ ...f.schema, titre: f.titre }) },
    icon('expand', 18),
    h('span', null, t('archives.voirSchema'))
  );

  const node = h(
    'article',
    { class: 'page fiche' },
    pageHeader({
      kicker: `${perso ? t('perso.maFiche') : t('archives.fiche')} · ${f.categories.map(catName).join(' · ')}`,
      title: f.titre,
      back: { href: '#/archives', label: t('archives.titre') },
      actions: [favButton('fiche', f.id, f.titre), iconBtn('share', t('commun.partager'), () => void shareFiche(f))],
      meta: [
        h('span', { class: 'chip chip--muted' }, icon('clock', 14), t('archives.dureeLecture', { n: minutes })),
        verdictBadge(f.realite.verdict),
        f.realite.nuance ? h('span', { class: 'verdict-nuance verdict-nuance--head' }, f.realite.nuance) : null,
        safetyBadge(f.securite.niveau),
        readChip,
      ],
    }),
    f.sousTitre ? h('p', { class: 'fiche__subtitle' }, f.sousTitre) : null,
    isPerso(f.id) ? persoBar('fiche', f) : null,
    h('div', { class: ['fiche__layout', long && 'fiche__layout--long'] }, aside, main),
    schemaFab
  );
  let updateFab: (() => void) | null = null;

  return {
    title: f.titre,
    section: 'archives',
    node,
    onMount: () => {
      setLast(`#/archives/${f.id}`, f.titre);
      // Visible seulement pendant la lecture du texte : figure passée au-dessus de l'écran,
      // case « Lu » pas encore atteinte. Calcul à chaque défilement (une fois par image).
      let frame = 0;
      updateFab = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const figureAbove = figure.getBoundingClientRect().bottom <= 0;
          const pastText = readBox.getBoundingClientRect().top < window.innerHeight;
          schemaFab.hidden = !figureAbove || pastText;
        });
      };
      window.addEventListener('scroll', updateFab, { passive: true });
      window.addEventListener('resize', updateFab, { passive: true });
      updateFab();
    },
    onLeave: () => {
      if (updateFab) {
        window.removeEventListener('scroll', updateFab);
        window.removeEventListener('resize', updateFab);
      }
      stopSpeech();
    },
  };
}


/* ---------- Corps de fiche : format long (v2) ---------- */
function longBody(f: Fiche & { texte: string[] }): HTMLElement[] {
  const paras = f.texte.map((p) => {
    if (isRetenir(p)) return h('div', { class: 'longread__retenir', role: 'note' }, rich(p, 'p'));
    if (isSerieRealite(p))
      return h(
        'div',
        { class: 'longread__serie' },
        h(
          'div',
          { class: 'longread__serie-head' },
          h('span', { class: 'hud-label hud-label--orange' }, t('verdict.titre')),
          verdictBadge(f.realite.verdict),
          f.realite.nuance ? h('span', { class: 'verdict-nuance' }, f.realite.nuance) : null
        ),
        rich(p, 'p')
      );
    return rich(p, 'p');
  });
  return [
    h('section', { class: 'longread', 'aria-labelledby': 'lr-t' }, h('h2', { class: 'sr-only', id: 'lr-t' }, t('archives.texte')), ...paras),
    panel(
      [h('h2', { class: 'block-title' }, t('securite.titre')), safetyBadge(f.securite.niveau)],
      { class: `safety-panel safety-panel--${f.securite.niveau}` }
    ),
  ];
}

/* ---------- Corps de fiche : format court (v1), pour les fiches non migrées ---------- */
function shortBody(f: Fiche): HTMLElement[] {
  return [
    h(
      'section',
      { class: 'principle', 'aria-labelledby': 'principe-t' },
      h('h2', { class: 'block-title', id: 'principe-t' }, t('archives.principe')),
      h('ol', { class: 'principle__list' }, ...(f.principe ?? []).map((line, i) => h('li', null, h('span', { class: 'principle__n', 'aria-hidden': 'true' }, `0${i + 1}`), h('span', null, line))))
    ),
    h(
      'div',
      { class: 'fiche__badges' },
      panel(
        [
          h('h2', { class: 'block-title' }, t('verdict.titre')),
          verdictBadge(f.realite.verdict),
          f.realite.nuance ? h('p', { class: 'verdict-nuance' }, f.realite.nuance) : null,
          h('p', { class: 'panel__text' }, f.realite.explication),
        ],
        { class: `reality reality--${f.realite.verdict}` }
      ),
      panel([h('h2', { class: 'block-title' }, t('securite.titre')), safetyBadge(f.securite.niveau)], { class: `safety-panel safety-panel--${f.securite.niveau}` })
    ),
    h('section', { class: 'why', 'aria-labelledby': 'why-t' }, h('h2', { class: 'block-title', id: 'why-t' }, t('archives.pourquoi')), ...(f.pourquoi ?? []).map((p) => rich(p, 'p'))),
  ];
}

/* ---------- Case « Lu » (vraie case à cocher, cochable et décochable) ---------- */
function readControl(f: Fiche, onChange: (lu: boolean) => void): HTMLElement {
  const id = `lu-${f.id}`;
  const input = h('input', { type: 'checkbox', id, class: 'read-box__input', checked: isRead(f.id), 'aria-describedby': `${id}-desc` });
  const box = h(
    'div',
    { class: ['read-box', isRead(f.id) && 'is-checked'] },
    input,
    h(
      'label',
      { for: id, class: 'read-box__label' },
      h('span', { class: 'read-box__mark', 'aria-hidden': 'true' }, icon('check', 18)),
      h('span', { class: 'read-box__text' }, h('strong', null, t('archives.caseLu')), h('small', { id: `${id}-desc` }, t('archives.caseLuDesc')))
    )
  );
  input.addEventListener('change', () => {
    const lu = input.checked;
    setRead(f, lu);
    box.classList.toggle('is-checked', lu);
    onChange(lu);
    if (lu) {
      play('success');
      toast(t('archives.marqueeLue', { xp: XP.ficheLue }), { icon: 'archive', tone: 'success' });
    } else toast(t('archives.marqueeNonLue'), { icon: 'archive' });
  });
  return box;
}

/* ---------- Échelle de repères (format court et long) ---------- */
function echelleBlock(e: NonNullable<Fiche['echelle']>): HTMLElement {
  return h(
    'section',
    { class: 'echelle panel', 'aria-labelledby': 'echelle-t' },
    h('h2', { class: 'block-title', id: 'echelle-t' }, icon('gauge', 20), e.titre ?? t('archives.echelle')),
    rich(e.intro, 'p', 'panel__text'),
    h(
      'ol',
      { class: 'echelle__list' },
      ...e.niveaux.map((n, i) =>
        h(
          'li',
          { class: 'echelle__item', style: `--niveau: ${(i / Math.max(1, e.niveaux.length - 1)).toFixed(2)}` },
          h('span', { class: 'echelle__val' }, n.valeur),
          h('span', { class: 'echelle__body' }, n.dit ? h('span', { class: 'echelle__dit' }, `(${n.dit})`) : null, rich(n.description, 'span', 'echelle__desc'))
        )
      )
    )
  );
}
