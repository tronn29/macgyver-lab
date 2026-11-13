/* Poste de commandement : tableau de bord d'accueil. */
import { content } from '../core/content';
import { dayKey } from '../core/dates';
import { h } from '../core/dom';
import { fmtDate, fmtNumber, t, tList } from '../core/i18n';
import { currentStreak, dueFiches, levelFor, weakPoints, XP } from '../core/progress';
import { navigate } from '../core/router';
import { getProgress } from '../core/store';
import { label, linkBtn, panel, progressBar, ring } from '../ui/components';
import { icon } from '../ui/icons';
import { catName } from './common';
import { parcoursCard, parcoursProgress } from './train';

export function homeView() {
  const c = content();
  const p = getProgress();
  const today = dayKey();
  const lvl = levelFor(p.xp);
  const grade = tList('stats.grades')[lvl.niveau - 1] ?? '';
  const streak = currentStreak(p, today);
  const due = dueFiches(c, today);
  const defiFait = Boolean(p.defis[today]);
  const hour = new Date().getHours();

  const lues = c.fiches.filter((f) => p.lus[f.id]).length;
  const vues = c.fonctions.filter((f) => p.vuesFonctions[f.id]).length;
  const faites = c.experiences.filter((e) => p.experiences[e.id]).length;
  const reussies = c.missions.filter((m) => p.missions.some((r) => r.id === m.id && r.reussie)).length;

  const modules = [
    { href: '#/archives', icon: 'archive', code: 'MOD-01', name: t('nav.archives'), desc: t('home.archivesDesc'), a: lues, b: c.fiches.length, stat: t('home.lues', { a: lues, b: c.fiches.length }) },
    { href: '#/arsenal', icon: 'multitool', code: 'MOD-02', name: t('nav.arsenalLong'), desc: t('home.arsenalDesc'), a: vues, b: c.fonctions.length, stat: t('home.fonctionsVues', { a: vues, b: c.fonctions.length }) },
    { href: '#/labo', icon: 'flask', code: 'MOD-03', name: t('nav.laboLong'), desc: t('home.laboDesc'), a: faites, b: c.experiences.length, stat: t('home.faites', { a: faites, b: c.experiences.length }) },
    { href: '#/operations', icon: 'target', code: 'MOD-04', name: t('nav.operations'), desc: t('home.operationsDesc'), a: reussies, b: c.missions.length, stat: t('home.reussies', { a: reussies, b: c.missions.length }) },
  ];

  /* Point faible : catégorie la plus basse avec des données */
  const weak = weakPoints(c, p).find((w) => w.taux !== null && w.taux < 0.7);
  const weakFiche = weak ? c.fiches.find((f) => f.categories.includes(weak.categorie as never) && !p.lus[f.id]) ?? c.fiches.find((f) => f.categories.includes(weak.categorie as never)) : null;
  /* Suggestion : première fiche non lue */
  const nextFiche = c.fiches.find((f) => !p.lus[f.id]);

  const parcoursEnCours = c.parcours
    .map((pc) => ({ pc, pr: parcoursProgress(pc) }))
    .sort((a, b) => Number(b.pr.done > 0 && b.pr.done < b.pr.total) - Number(a.pr.done > 0 && a.pr.done < a.pr.total))
    .slice(0, 3);

  const search = h('form', { class: 'quick-search', role: 'search' });
  const input = h('input', { type: 'search', id: 'home-q', class: 'input', placeholder: t('home.rechercheRapide'), autocomplete: 'off', enterkeyhint: 'search' });
  search.append(
    h('label', { for: 'home-q', class: 'sr-only' }, t('nav.recherche')),
    h('div', { class: 'input-wrap' }, icon('search', 18), input),
    h('button', { type: 'submit', class: 'btn btn--primary', 'aria-label': t('nav.recherche') }, icon('arrow-right', 18))
  );
  search.addEventListener('submit', (e) => {
    e.preventDefault();
    navigate(`/recherche?q=${encodeURIComponent(input.value.trim())}`);
  });

  const node = h(
    'div',
    { class: 'page home' },
    h(
      'header',
      { class: 'home__hero' },
      h(
        'div',
        { class: 'home__hero-text' },
        label(`${t('home.kicker')} · ${fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}`),
        h('h1', { class: 'home__title', tabindex: '-1' }, hour >= 18 || hour < 5 ? t('home.bonsoir') : t('home.bonjour')),
        h('p', { class: 'home__slogan' }, t('app.slogan'))
      ),
      search
    ),
    h(
      'section',
      { class: 'status-row', 'aria-label': t('home.statut') },
      panel(
        [
          h('div', { class: 'stat-head' }, label(t('home.statut')), h('span', { class: 'stat-head__grade' }, grade)),
          h('div', { class: 'level' }, h('span', { class: 'level__n' }, t('home.niveau', { n: lvl.niveau })), h('span', { class: 'level__xp mono' }, t('commun.xp', { n: fmtNumber(p.xp) }))),
          progressBar(lvl.ratio, t('home.niveau', { n: lvl.niveau })),
          h('p', { class: 'muted small' }, lvl.max === null ? t('home.xpMax') : t('home.xpProchain', { n: fmtNumber(lvl.max - p.xp) })),
        ],
        { class: 'status-card', corners: true }
      ),
      panel(
        [
          h('div', { class: 'stat-head' }, label(t('home.serie')), h('span', { class: 'mono small muted' }, t('home.serieRecord', { n: p.serie.record }))),
          h('div', { class: ['streak', streak.enDanger && 'streak--danger', streak.faitAujourdhui && 'streak--ok'] }, icon('flame', 30), h('span', { class: 'streak__n' }, String(streak.jours)), h('span', { class: 'streak__label' }, t('home.serieJours', { n: streak.jours }))),
          h('p', { class: 'muted small' }, streak.faitAujourdhui ? t('home.serieOk') : t('home.serieDanger')),
        ],
        { class: 'status-card', corners: true }
      ),
      h(
        'a',
        { class: ['defi-card', defiFait && 'is-done'], href: '#/defi' },
        h('div', { class: 'defi-card__head' }, icon(defiFait ? 'check' : 'flame', 22), h('span', { class: 'hud-label hud-label--orange' }, t('home.defiTitre'))),
        h('p', { class: 'defi-card__text' }, defiFait ? t('home.defiFait') : t('home.defiDesc', { xp: XP.defi })),
        h('span', { class: 'defi-card__cta' }, defiFait ? t('home.defiRevoir') : t('home.defiLancer'), icon('arrow-right', 18))
      )
    ),
    h(
      'section',
      { class: 'modules', 'aria-labelledby': 'mod-t' },
      h('h2', { class: 'sr-only', id: 'mod-t' }, t('home.modules')),
      ...modules.map((m) =>
        h(
          'a',
          { class: 'module hud-corners', href: m.href },
          h('div', { class: 'module__top' }, h('span', { class: 'module__icon', 'aria-hidden': 'true' }, icon(m.icon, 28)), ring(m.b ? m.a / m.b : 0, 52, m.stat)),
          h('span', { class: 'module__code' }, m.code),
          h('h3', { class: 'module__name' }, m.name),
          h('p', { class: 'module__desc' }, m.desc),
          h('span', { class: 'module__stat' }, m.stat, icon('arrow-right', 16))
        )
      )
    ),
    h(
      'div',
      { class: 'home__grid' },
      panel(
        [
          h('h2', { class: 'block-title' }, icon('refresh', 20), t('home.revisionTitre')),
          h('p', { class: 'panel__text' }, Object.keys(p.srs).length ? t('home.revisionDue', { n: due.length }) : t('home.revisionVide')),
          due.length ? linkBtn(t('home.revisionLancer'), '#/revision', { variant: 'primary', icon: 'play' }) : null,
        ],
        { class: 'home-card' }
      ),
      p.dernier
        ? panel([h('h2', { class: 'block-title' }, icon('history', 20), t('home.reprendre')), h('p', { class: 'panel__text' }, p.dernier.titre), linkBtn(t('commun.continuer'), p.dernier.route, { variant: 'ghost', iconAfter: 'arrow-right' })], { class: 'home-card' })
        : null,
      weak && weakFiche
        ? panel(
            [
              h('h2', { class: 'block-title block-title--orange' }, icon('alert', 20), t('home.pointFaible', { cat: catName(weak.categorie) })),
              h('p', { class: 'panel__text' }, t('home.pointFaibleDesc', { pct: Math.round((weak.taux ?? 0) * 100) })),
              linkBtn(weakFiche.titre, `#/archives/${weakFiche.id}`, { variant: 'ghost', icon: 'archive' }),
            ],
            { class: 'home-card' }
          )
        : nextFiche
          ? panel([h('h2', { class: 'block-title' }, icon('spark', 20), t('home.suggestion')), h('p', { class: 'panel__text' }, nextFiche.sousTitre ?? ''), linkBtn(nextFiche.titre, `#/archives/${nextFiche.id}`, { variant: 'ghost', icon: 'archive' })], { class: 'home-card' })
          : null
    ),
    c.parcours.length
      ? h(
          'section',
          { class: 'home__parcours', 'aria-labelledby': 'parc-t' },
          h('div', { class: 'section-head' }, h('h2', { class: 'section-head__title', id: 'parc-t' }, icon('route', 20), t('home.parcoursTitre')), linkBtn(t('commun.voirTout'), '#/parcours', { variant: 'quiet', small: true, iconAfter: 'chevron-right' })),
          h('div', { class: 'card-grid card-grid--3' }, ...parcoursEnCours.map(({ pc }) => parcoursCard(pc)))
        )
      : null
  );

  return { title: t('nav.accueilLong'), section: 'accueil', node };
}
