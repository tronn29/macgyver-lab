/* Progression : XP, série, activité, points faibles, insignes, historique des opérations. */
import { content } from '../core/content';
import { parseDay } from '../core/dates';
import { h } from '../core/dom';
import { fmtDate, fmtNumber, t, tList } from '../core/i18n';
import { activityDays, BADGES, currentStreak, levelFor, masteredCount, weakPoints } from '../core/progress';
import { getProgress } from '../core/store';
import { label, linkBtn, panel, progressBar } from '../ui/components';
import { icon } from '../ui/icons';
import { catIcon, catName, pageHeader } from './common';
import { runRow } from './operations';

export function statsView() {
  const c = content();
  const p = getProgress();
  const lvl = levelFor(p.xp);
  const grade = tList('stats.grades')[lvl.niveau - 1] ?? '';
  const streak = currentStreak(p);
  const reussies = c.missions.filter((m) => p.missions.some((r) => r.id === m.id && r.reussie)).length;
  const indices = p.missions.reduce((s, r) => s + r.details.indices.length, 0);

  const kpis: [string, string, string][] = [
    ['archive', t('stats.fichesLues'), `${c.fiches.filter((f) => p.lus[f.id]).length}/${c.fiches.length}`],
    ['brain', t('stats.maitrisees'), String(masteredCount(p))],
    ['flask', t('stats.experiences'), `${c.experiences.filter((e) => p.experiences[e.id]).length}/${c.experiences.length}`],
    ['target', t('stats.missionsReussies'), `${reussies}/${c.missions.length}`],
    ['flame', t('stats.serieActuelle'), t('commun.jours', { n: streak.jours })],
    ['trophy', t('stats.record'), t('commun.jours', { n: p.serie.record })],
    ['hint', t('stats.indicesUtilises'), String(indices)],
  ];

  /* Activité : 28 jours, barres */
  const days = activityDays(p, 28);
  const maxA = Math.max(1, ...days.map((d) => d.actions));
  const activity = h(
    'div',
    { class: 'activity', role: 'list', 'aria-label': t('stats.activite') },
    ...days.map((d) => {
      const lbl = t('stats.activiteJour', { d: fmtDate(parseDay(d.jour), { day: 'numeric', month: 'short' }), n: d.actions });
      return h('div', { class: ['activity__day', d.actions > 0 && 'is-active'], role: 'listitem', title: lbl, 'aria-label': lbl }, h('span', { class: 'activity__bar', style: { height: `${Math.max(6, (d.actions / maxA) * 100)}%` } }));
    })
  );

  const weak = weakPoints(c, p).filter((w) => w.taux !== null);
  const weakTable = weak.length
    ? h(
        'table',
        { class: 'table' },
        h('caption', { class: 'sr-only' }, t('stats.pointsFaibles')),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('stats.categorie')), h('th', { scope: 'col' }, t('stats.taux')))),
        h(
          'tbody',
          null,
          ...weak.map((w) => {
            const pct = Math.round((w.taux ?? 0) * 100);
            return h(
              'tr',
              { class: pct < 60 ? 'is-weak' : '' },
              h('th', { scope: 'row' }, h('a', { href: `#/archives?cat=${w.categorie}` }, icon(catIcon(w.categorie), 16), catName(w.categorie))),
              h('td', null, h('div', { class: 'table__bar' }, progressBar(w.taux ?? 0, catName(w.categorie), { tone: pct < 60 ? 'orange' : 'accent' }), h('span', { class: 'mono' }, `${pct} %`)))
            );
          })
        )
      )
    : h('p', { class: 'muted' }, t('stats.pasAssez'));

  const badges = h(
    'ul',
    { class: 'badges' },
    ...BADGES.map((b) => {
      const got = p.badges[b.id];
      return h(
        'li',
        { class: ['badge', got && 'is-got'] },
        h('span', { class: 'badge__icon', 'aria-hidden': 'true' }, icon(got ? b.icone : 'lock', 22)),
        h('span', { class: 'badge__text' }, h('strong', null, t(`badges.${b.id}.nom`)), h('small', null, t(`badges.${b.id}.desc`)), !got ? h('span', { class: 'sr-only' }, ` (${t('badges.verrouille')})`) : null)
      );
    })
  );

  const runs = [...p.missions].reverse().slice(0, 30);

  return {
    title: t('stats.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page' },
      pageHeader({ kicker: t('stats.kicker'), title: t('stats.titre'), icon: 'chart' }),
      panel(
        [
          h('div', { class: 'stat-head' }, label(t('stats.niveau')), h('span', { class: 'stat-head__grade' }, grade)),
          h('div', { class: 'level' }, h('span', { class: 'level__n' }, t('home.niveau', { n: lvl.niveau })), h('span', { class: 'level__xp mono' }, t('commun.xp', { n: fmtNumber(p.xp) }))),
          progressBar(lvl.ratio, t('stats.xpTotal')),
        ],
        { class: 'status-card', corners: true }
      ),
      h('dl', { class: 'kpis' }, ...kpis.map(([ic, k, v]) => h('div', { class: 'kpi' }, h('dt', null, icon(ic, 16), k), h('dd', null, v)))),
      h('section', { 'aria-labelledby': 'act-t' }, h('h2', { class: 'block-title block-title--spaced', id: 'act-t' }, icon('chart', 20), t('stats.activite')), activity),
      h('section', { 'aria-labelledby': 'weak-t' }, h('h2', { class: 'block-title block-title--spaced', id: 'weak-t' }, icon('alert', 20), t('stats.pointsFaibles')), h('p', { class: 'muted small' }, t('stats.pointsFaiblesDesc')), weakTable),
      h('section', { 'aria-labelledby': 'badges-t' }, h('h2', { class: 'block-title block-title--spaced', id: 'badges-t' }, icon('trophy', 20), t('stats.badges')), badges),
      h(
        'section',
        { 'aria-labelledby': 'hist-t' },
        h('h2', { class: 'block-title block-title--spaced', id: 'hist-t' }, icon('history', 20), t('stats.historique')),
        runs.length ? h('ul', { class: 'run-list' }, ...runs.map((r) => h('li', { class: 'run-wrap' }, h('a', { href: `#/operations/${r.id}`, class: 'run-link' }, runRow(r, c.byId.mission.get(r.id)))))) : h('div', null, h('p', { class: 'muted' }, t('operations.historiqueVide')), linkBtn(t('nav.operations'), '#/operations', { variant: 'ghost', icon: 'target' }))
      )
    ),
  };
}
