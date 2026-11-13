/* Archives (Théorie) : liste filtrable et fiche de révision. */
import { content } from '../core/content';
import { h } from '../core/dom';
import { t } from '../core/i18n';
import { answerQuiz, markRead, setLast, XP } from '../core/progress';
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
import { catIcon, catName, categoryFilter, countByCategory, favButton, ficheCard, notFoundView, pageHeader, relatedLinks } from './common';
import { openGlossaryForFiche } from './glossaire';

type Statut = 'toutes' | 'non-lues' | 'lues' | 'favoris';

export function archivesList(ctx: RouteContext): View {
  const c = content();
  let cat = ctx.query.get('cat');
  let statut = (ctx.query.get('statut') as Statut) || 'toutes';
  if (cat && !c.byId.categorie.has(cat)) cat = null;

  const grid = h('div', { class: 'card-grid', 'aria-live': 'polite' });
  const filterSlot = h('div');
  const countEl = h('p', { class: 'list-count' });

  const apply = () => {
    const p = getProgress();
    const items = c.fiches.filter((f) => {
      if (cat && !f.categories.includes(cat as Fiche['categories'][number])) return false;
      if (statut === 'lues' && !p.lus[f.id]) return false;
      if (statut === 'non-lues' && p.lus[f.id]) return false;
      if (statut === 'favoris' && !p.favoris[`fiche:${f.id}`]) return false;
      return true;
    });
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
      categoryFilter(cat, countByCategory(c.fiches), (id) => {
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

  const lus = Object.keys(getProgress().lus).filter((id) => c.byId.fiche.has(id)).length;
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
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--ghost btn--sm',
              title: t('archives.surpriseDesc'),
              onclick: () => {
                const p = getProgress();
                const pool = c.fiches.filter((f) => !p.lus[f.id]);
                const list = pool.length ? pool : c.fiches;
                navigate(`/archives/${list[Math.floor(Math.random() * list.length)].id}`);
              },
            },
            icon('spark', 18),
            h('span', null, t('archives.surprise'))
          ),
        ],
        meta: [h('span', { class: 'chip chip--accent' }, icon('check', 14), t('home.lues', { a: lus, b: c.fiches.length }))],
      }),
      h('div', { class: 'toolbar' }, filterSlot),
      countEl,
      h('h2', { class: 'sr-only' }, t('commun.listeTitre')),
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

  const list = orderedFiches();
  const idx = list.indexOf(f);
  const prev = list[idx - 1];
  const next = list[idx + 1];
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

  const sentinel = h('div', { class: 'read-sentinel', 'aria-hidden': 'true' });

  const main = h(
    'div',
    { class: 'fiche__main' },
    f.principeSeul
      ? h('div', { class: 'notice notice--danger', role: 'note' }, icon('shield', 20), h('p', null, t('securite.principeSeul')))
      : null,
    h('div', { class: 'fiche__tools' }, eliBtn, listenButton(f, () => eliBtn.getAttribute('aria-pressed') === 'true'), termIds.size ? btn(t('archives.glossaire'), { variant: 'ghost', small: true, icon: 'book', onClick: () => openGlossaryForFiche(f, [...termIds]) }) : null),
    enfantPanel,
    ...(long ? longBody(f, sentinel) : shortBody(f, sentinel)),
    !long && f.chiffres?.length
      ? h(
          'section',
          { class: 'figures', 'aria-labelledby': 'fig-t' },
          h('h2', { class: 'block-title', id: 'fig-t' }, t('archives.chiffres')),
          h('dl', { class: 'figures__grid' }, ...f.chiffres.map((ch) => h('div', { class: 'figures__item' }, h('dt', null, ch.label), h('dd', null, ch.valeur))))
        )
      : null,
    h(
      'section',
      { class: 'links-block', 'aria-labelledby': 'links-t' },
      h('h2', { class: 'block-title', id: 'links-t' }, t('archives.liens')),
      relatedLinks([
        { title: t('archives.fichesLiees'), icon: 'archive', items: fichesLiees.map((x) => ({ href: `#/archives/${x.id}`, label: x.titre, icon: catIcon(x.categories[0]), sub: catName(x.categories[0]) })) },
        { title: t('archives.equivalences'), icon: 'multitool', items: equivalences.map((x) => ({ href: `#/arsenal/f/${x!.id}`, label: x!.titre, icon: x!.icone, sub: t('commun.objets', { n: x!.objets.length }) })) },
        { title: t('archives.pratique'), icon: 'flask', items: f.principeSeul ? [] : pratiques.map((x) => ({ href: `#/labo/${x.id}`, label: x.titre, icon: 'flask', sub: t('commun.minutes', { n: x.duree }) })) },
      ]) ?? h('p', { class: 'muted' }, t('commun.aucun'))
    ),
    h(
      'section',
      { class: 'quiz-block panel', 'aria-labelledby': 'quiz-t' },
      h('h2', { class: 'block-title', id: 'quiz-t' }, icon('brain', 20), t('archives.quiz')),
      h('p', { class: 'muted' }, t('archives.quizIntro')),
      quizRunner(
        f.quiz.map((q) => ({ fiche: f, quiz: q })),
        {
          onAnswer: (item, correct) => answerQuiz(item.fiche.id, item.fiche.categories, correct, false),
          onDone: (score, total) => toast(t('quiz.score', { n: score, b: total }), { icon: 'brain', tone: score === total ? 'success' : 'accent' }),
        }
      )
    ),
    notesPanel(`fiche:${f.id}`, f.titre, `#/archives/${f.id}`),
    h(
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
      kicker: `${t('archives.fiche')} · ${f.categories.map(catName).join(' · ')}`,
      title: f.titre,
      back: { href: '#/archives', label: t('archives.titre') },
      actions: [favButton('fiche', f.id, f.titre), iconBtn('share', t('commun.partager'), () => void shareFiche(f))],
      meta: [
        h('span', { class: 'chip chip--muted' }, icon('clock', 14), t('archives.dureeLecture', { n: minutes })),
        verdictBadge(f.realite.verdict),
        safetyBadge(f.securite.niveau),
        getProgress().lus[f.id] ? h('span', { class: 'chip chip--success' }, icon('check', 14), t('archives.marqueLue')) : null,
      ],
    }),
    f.sousTitre ? h('p', { class: 'fiche__subtitle' }, f.sousTitre) : null,
    h('div', { class: ['fiche__layout', long && 'fiche__layout--long'] }, aside, main),
    schemaFab
  );
  let fabObserver: IntersectionObserver | null = null;

  let observer: IntersectionObserver | null = null;
  let timer: number | undefined;
  const doMark = () => {
    window.clearTimeout(timer);
    observer?.disconnect();
    if (markRead(f)) toast(t('archives.nouvelleLue', { xp: XP.ficheLue }), { icon: 'archive', tone: 'success' });
  };

  return {
    title: f.titre,
    section: 'archives',
    node,
    onMount: () => {
      setLast(`#/archives/${f.id}`, f.titre);
      if ('IntersectionObserver' in window) {
        fabObserver = new IntersectionObserver(([entry]) => {
          schemaFab.hidden = entry.isIntersecting || entry.boundingClientRect.top > 0;
        });
        fabObserver.observe(figure);
      }
      if (getProgress().lus[f.id]) {
        markRead(f); // compte l'activité du jour
        return;
      }
      timer = window.setTimeout(doMark, long ? Math.max(20000, minutes * 30000) : 8000);
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && doMark());
        observer.observe(sentinel);
      }
    },
    onLeave: () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      fabObserver?.disconnect();
      stopSpeech();
    },
  };
}


/* ---------- Corps de fiche : format long (v2) ---------- */
function longBody(f: Fiche & { texte: string[] }, sentinel: HTMLElement): HTMLElement[] {
  const paras = f.texte.map((p) => {
    if (isRetenir(p)) return h('div', { class: 'longread__retenir', role: 'note' }, rich(p, 'p'));
    if (isSerieRealite(p))
      return h(
        'div',
        { class: 'longread__serie' },
        h('div', { class: 'longread__serie-head' }, h('span', { class: 'hud-label hud-label--orange' }, t('verdict.titre')), verdictBadge(f.realite.verdict)),
        rich(p, 'p')
      );
    return rich(p, 'p');
  });
  // Repère de lecture placé juste avant « À retenir »
  const last = paras.length - 1;
  return [
    h('section', { class: 'longread', 'aria-labelledby': 'lr-t' }, h('h2', { class: 'sr-only', id: 'lr-t' }, t('archives.texte')), ...paras.slice(0, last), sentinel, paras[last]),
    panel(
      [h('h2', { class: 'block-title' }, t('securite.titre')), safetyBadge(f.securite.niveau), h('p', { class: 'panel__text' }, f.securite.note)],
      { class: `safety-panel safety-panel--${f.securite.niveau}` }
    ),
  ];
}

/* ---------- Corps de fiche : format court (v1), pour les fiches non migrées ---------- */
function shortBody(f: Fiche, sentinel: HTMLElement): HTMLElement[] {
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
      panel([h('h2', { class: 'block-title' }, t('verdict.titre')), verdictBadge(f.realite.verdict), h('p', { class: 'panel__text' }, f.realite.explication)], { class: `reality reality--${f.realite.verdict}` }),
      panel([h('h2', { class: 'block-title' }, t('securite.titre')), safetyBadge(f.securite.niveau), h('p', { class: 'panel__text' }, f.securite.note)], { class: `safety-panel safety-panel--${f.securite.niveau}` })
    ),
    h('section', { class: 'why', 'aria-labelledby': 'why-t' }, h('h2', { class: 'block-title', id: 'why-t' }, t('archives.pourquoi')), ...(f.pourquoi ?? []).map((p) => rich(p, 'p'))),
    sentinel,
  ];
}
