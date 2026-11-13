/* Laboratoire (Pratique) : expériences sans danger, avec protocole à cocher. */
import { content } from '../core/content';
import { h, nextId } from '../core/dom';
import { t } from '../core/i18n';
import { setLast, toggleExperience, XP } from '../core/progress';
import type { RouteContext, View } from '../core/router';
import { setQuery } from '../core/router';
import { play } from '../core/sound';
import { getProgress } from '../core/store';
import type { CategorieId } from '../core/types';
import { chip, difficultyBadge, emptyState, panel, safetyBadge, toast } from '../ui/components';
import { icon } from '../ui/icons';
import { rich } from '../ui/richtext';
import { schemaFigure } from '../ui/schema';
import { notesPanel } from '../ui/notes';
import { catIcon, catName, categoryFilter, countByCategory, experienceCard, favButton, notFoundView, pageHeader, relatedLinks } from './common';

export function laboList(ctx: RouteContext): View {
  const c = content();
  let cat = ctx.query.get('cat');
  const grid = h('div', { class: 'card-grid', 'aria-live': 'polite' });
  const filters = h('div');
  const render = () => {
    const items = c.experiences.filter((e) => !cat || e.categories.includes(cat as CategorieId));
    grid.replaceChildren(...(items.length ? items.map(experienceCard) : [emptyState(t('labo.aucune'), '', { icon: 'flask' })]));
    filters.replaceChildren(
      categoryFilter(cat, countByCategory(c.experiences), (id) => {
        cat = id;
        setQuery({ cat: id });
        render();
      })
    );
  };
  render();
  const faites = Object.keys(getProgress().experiences).filter((id) => c.byId.experience.has(id)).length;
  return {
    title: t('labo.titre'),
    section: 'labo',
    keepScroll: true,
    node: h(
      'div',
      { class: 'page' },
      pageHeader({
        kicker: t('labo.kicker'),
        title: t('labo.titre'),
        icon: 'flask',
        intro: t('labo.intro'),
        meta: [h('span', { class: 'chip chip--accent' }, icon('check', 14), t('home.faites', { a: faites, b: c.experiences.length }))],
      }),
      h('div', { class: 'toolbar' }, filters),
      h('h2', { class: 'sr-only' }, t('commun.listeTitre')),
      grid
    ),
  };
}

export function experienceDetail(ctx: RouteContext): View {
  const c = content();
  const e = c.byId.experience.get(ctx.params.id);
  if (!e) return notFoundView(t('labo.introuvable'), { href: '#/labo', label: t('labo.titre') });
  const fiches = (e.fiches ?? []).map((id) => c.byId.fiche.get(id)).filter(Boolean);
  const done = () => Boolean(getProgress().experiences[e.id]);

  const doneBtn = h('button', { type: 'button', class: ['btn', done() ? 'btn--primary' : 'btn--action', 'btn--block'], 'aria-pressed': String(done()) });
  const paintDone = () => {
    const on = done();
    doneBtn.className = `btn ${on ? 'btn--primary' : 'btn--action'} btn--block`;
    doneBtn.setAttribute('aria-pressed', String(on));
    doneBtn.replaceChildren(icon(on ? 'check' : 'flask', 18), h('span', null, on ? t('labo.dejaFait') : t('labo.marquerFait')));
  };
  doneBtn.addEventListener('click', () => {
    const now = toggleExperience(e.id);
    paintDone();
    if (now) {
      play('success');
      toast(t('labo.faitXp', { xp: XP.experience }), { icon: 'flask', tone: 'success' });
    }
  });
  paintDone();

  const listId = nextId('steps');
  const steps = h(
    'ol',
    { class: 'steps', id: listId },
    ...e.etapes.map((step, i) => {
      const id = `${listId}-${i}`;
      return h(
        'li',
        { class: 'steps__item' },
        h('input', { type: 'checkbox', id, class: 'steps__check', 'aria-label': t('labo.cocherEtape', { n: i + 1 }) }),
        h('label', { for: id, class: 'steps__label' }, h('span', { class: 'steps__n', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')), h('span', null, step))
      );
    })
  );

  return {
    title: e.titre,
    section: 'labo',
    node: h(
      'article',
      { class: 'page experience' },
      pageHeader({
        kicker: `${t('labo.kicker')} · ${e.categories.map(catName).join(' · ')}`,
        title: e.titre,
        back: { href: '#/labo', label: t('labo.titre') },
        actions: [favButton('experience', e.id, e.titre)],
        meta: [
          difficultyBadge(e.difficulte),
          h('span', { class: 'chip chip--muted' }, icon('clock', 14), t('labo.lecture', { n: e.duree })),
          safetyBadge(e.securite.niveau),
          e.adulte ? chip(t('labo.adulte'), { icon: 'shield', tone: 'warning' }) : null,
        ],
        intro: e.sousTitre,
      }),
      h(
        'div',
        { class: 'fiche__layout' },
        h('div', { class: 'fiche__visual' }, schemaFigure({ ...e.schema, titre: e.titre }), h('div', { class: 'experience__done' }, doneBtn)),
        h(
          'div',
          { class: 'fiche__main' },
          panel(
            [h('h2', { class: 'block-title' }, icon('alert', 20), t('labo.precautions')), h('p', { class: 'panel__text' }, e.securite.note), h('ul', { class: 'bullets' }, ...e.precautions.map((p) => h('li', null, p)))],
            { class: `safety-panel safety-panel--${e.securite.niveau}` }
          ),
          h(
            'section',
            { 'aria-labelledby': 'mat-t' },
            h('h2', { class: 'block-title', id: 'mat-t' }, icon('box-tools', 20), t('labo.materiel')),
            h('ul', { class: 'materiel' }, ...e.materiel.map((m) => h('li', null, h('span', null, m.nom), m.quantite ? h('span', { class: 'materiel__qty' }, m.quantite) : null)))
          ),
          h('section', { 'aria-labelledby': 'steps-t' }, h('h2', { class: 'block-title', id: 'steps-t' }, icon('list', 20), t('labo.etapes')), steps),
          panel([h('h2', { class: 'block-title' }, icon('eye', 20), t('labo.resultat')), h('p', { class: 'panel__text' }, e.resultat)], { class: 'result-panel', corners: true }),
          h('section', { class: 'why', 'aria-labelledby': 'exp-t' }, h('h2', { class: 'block-title', id: 'exp-t' }, t('labo.explication')), ...e.explication.map((p) => rich(p, 'p'))),
          e.pourAllerPlusLoin ? panel([h('h2', { class: 'block-title' }, icon('spark', 20), t('labo.plusLoin')), rich(e.pourAllerPlusLoin, 'p', 'panel__text')]) : null,
          relatedLinks([{ title: t('archives.fichesLiees'), icon: 'archive', items: fiches.map((f) => ({ href: `#/archives/${f!.id}`, label: f!.titre, icon: catIcon(f!.categories[0]) })) }]),
          notesPanel(`experience:${e.id}`, e.titre, `#/labo/${e.id}`)
        )
      )
    ),
    onMount: () => setLast(`#/labo/${e.id}`, e.titre),
  };
}
