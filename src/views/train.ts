/* Entraînement : révision espacée, défi du jour, parcours thématiques. */
import { content } from '../core/content';
import { dayKey, shuffle } from '../core/dates';
import { h } from '../core/dom';
import { t } from '../core/i18n';
import { answerQuiz, completeDaily, dailyChallenge, dueFiches, masteredCount, XP } from '../core/progress';
import type { RouteContext, View } from '../core/router';
import { INTERVALS, MASTERED_BOX } from '../core/srs';
import { getProgress } from '../core/store';
import type { EtapeType, Parcours } from '../core/types';
import { btn, emptyState, linkBtn, panel, progressBar, toast } from '../ui/components';
import { icon } from '../ui/icons';
import { quizRunner, type QuizItem } from '../ui/quiz';
import { notFoundView, pageHeader } from './common';

/* ===================== Révision ===================== */

export function revisionView(): View {
  const c = content();
  const p = getProgress();
  const stage = h('div', { class: 'train-stage' });
  const cards = Object.entries(p.srs).filter(([id]) => c.byId.fiche.has(id));

  const boxes = h(
    'div',
    { class: 'boxes', role: 'list', 'aria-label': t('revision.boites') },
    ...INTERVALS.map((days, i) => {
      const n = cards.filter(([, card]) => card.boite === i).length;
      return h('div', { class: ['box', i >= MASTERED_BOX && 'box--mastered'], role: 'listitem' }, h('span', { class: 'box__n' }, String(n)), h('span', { class: 'box__label' }, t('revision.boite', { n: i })), h('span', { class: 'box__days' }, `${days} j`));
    })
  );

  const start = (items: QuizItem[], srs: boolean) => {
    stage.replaceChildren(
      quizRunner(items, {
        showFicheLink: true,
        onAnswer: (item, correct) => answerQuiz(item.fiche.id, item.fiche.categories, correct, srs),
        onDone: (score, total) => {
          toast(t('quiz.score', { n: score, b: total }), { icon: 'brain', tone: 'success' });
          stage.replaceChildren(emptyState(t('revision.termine'), t('revision.termineDesc', { n: score, b: total }), { icon: 'brain', action: linkBtn(t('nav.accueilLong'), '#/', { variant: 'primary', icon: 'dashboard' }) }));
        },
      })
    );
    stage.querySelector<HTMLElement>('.quiz__legend')?.focus();
  };

  const due = dueFiches(c);
  const dueItems: QuizItem[] = due.slice(0, 12).map((f) => ({ fiche: f, quiz: f.quiz[Math.floor(Math.random() * f.quiz.length)] }));
  const freeItems = (): QuizItem[] =>
    shuffle(cards.map(([id]) => c.byId.fiche.get(id)!).filter(Boolean))
      .slice(0, 8)
      .map((f) => ({ fiche: f, quiz: f.quiz[Math.floor(Math.random() * f.quiz.length)] }));

  if (!cards.length) {
    stage.append(emptyState(t('revision.aucuneCarte'), t('revision.aucuneCarteDesc'), { icon: 'archive', action: linkBtn(t('archives.titre'), '#/archives', { variant: 'primary', icon: 'archive' }) }));
  } else if (dueItems.length) {
    stage.append(panel([h('p', { class: 'panel__text panel__text--lg' }, t('home.revisionDue', { n: due.length })), btn(t('revision.commencer', { n: dueItems.length }), { variant: 'action', icon: 'play', onClick: () => start(dueItems, true) })], { class: 'train-start', corners: true }));
  } else {
    stage.append(emptyState(t('revision.rien'), t('revision.rienDesc'), { icon: 'check' }));
  }
  const free = cards.length
    ? panel([h('h2', { class: 'block-title' }, icon('refresh', 20), t('revision.entrainementLibre')), h('p', { class: 'panel__text' }, t('revision.entrainementLibreDesc')), btn(t('commun.continuer'), { variant: 'ghost', icon: 'play', onClick: () => start(freeItems(), false) })])
    : null;

  return {
    title: t('revision.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page page--reading' },
      pageHeader({ kicker: t('revision.kicker'), title: t('revision.titre'), icon: 'refresh', intro: t('revision.intro'), meta: [h('span', { class: 'chip chip--success' }, icon('brain', 14), t('revision.maitrisees', { n: masteredCount(p) }))] }),
      boxes,
      stage,
      free
    ),
  };
}

/* ===================== Défi du jour ===================== */

export function defiView(): View {
  const c = content();
  const today = dayKey();
  const done = getProgress().defis[today];
  const stage = h('div', { class: 'train-stage' });
  const items = dailyChallenge(c, today);

  const showDone = (xp: number) =>
    stage.replaceChildren(emptyState(t('defi.dejaFait'), t('defi.dejaFaitDesc', { xp }), { icon: 'trophy', action: linkBtn(t('nav.accueilLong'), '#/', { variant: 'primary', icon: 'dashboard' }) }));

  if (done) showDone(done.xp);
  else
    stage.append(
      panel(
        [
          h('ol', { class: 'defi-preview' }, ...items.map((it, i) => h('li', null, h('span', { class: 'defi-preview__n' }, `Q${i + 1}`), it.fiche.titre))),
          btn(t('defi.commencer'), {
            variant: 'action',
            icon: 'flame',
            onClick: () => {
              stage.replaceChildren(
                quizRunner(items, {
                  showFicheLink: true,
                  onAnswer: (item, correct) => answerQuiz(item.fiche.id, item.fiche.categories, correct, false),
                  onDone: (score, total) => {
                    const xp = completeDaily(score, total, today);
                    toast(t('defi.termine', { xp }), { icon: 'trophy', tone: 'success' });
                    showDone(xp);
                  },
                })
              );
              stage.querySelector<HTMLElement>('.quiz__legend')?.focus();
            },
          }),
        ],
        { class: 'train-start defi-start', corners: true }
      )
    );

  return {
    title: t('defi.titre'),
    section: '',
    node: h('div', { class: 'page page--reading' }, pageHeader({ kicker: t('defi.kicker'), title: t('defi.titre'), icon: 'flame', intro: t('defi.intro'), meta: [h('span', { class: 'chip chip--orange' }, icon('spark', 14), t('home.defiDesc', { xp: XP.defi }))] }), stage),
  };
}

/* ===================== Parcours ===================== */

export function stepDone(type: EtapeType, id: string): boolean {
  const p = getProgress();
  switch (type) {
    case 'fiche':
      return Boolean(p.lus[id]);
    case 'equivalence':
      return Boolean(p.vuesFonctions[id]);
    case 'pratique':
      return Boolean(p.experiences[id]);
    case 'mission':
      return p.missions.some((m) => m.id === id && m.reussie);
  }
}

export function stepInfo(type: EtapeType, id: string): { href: string; titre: string; icon: string } | null {
  const c = content();
  switch (type) {
    case 'fiche': {
      const x = c.byId.fiche.get(id);
      return x ? { href: `#/archives/${id}`, titre: x.titre, icon: 'archive' } : null;
    }
    case 'equivalence': {
      const x = c.byId.fonction.get(id);
      return x ? { href: `#/arsenal/f/${id}`, titre: x.titre, icon: 'multitool' } : null;
    }
    case 'pratique': {
      const x = c.byId.experience.get(id);
      return x ? { href: `#/labo/${id}`, titre: x.titre, icon: 'flask' } : null;
    }
    case 'mission': {
      const x = c.byId.mission.get(id);
      return x ? { href: `#/operations/${id}`, titre: x.titre, icon: 'target' } : null;
    }
  }
}

export function parcoursProgress(pc: Parcours): { done: number; total: number; next: { href: string; titre: string; icon: string } | null } {
  let done = 0;
  let next: { href: string; titre: string; icon: string } | null = null;
  for (const e of pc.etapes) {
    if (stepDone(e.type, e.id)) done += 1;
    else if (!next) next = stepInfo(e.type, e.id);
  }
  return { done, total: pc.etapes.length, next };
}

export function parcoursCard(pc: Parcours): HTMLElement {
  const pr = parcoursProgress(pc);
  return h(
    'a',
    { class: ['card', 'card--parcours', pr.done === pr.total && 'is-read'], href: `#/parcours/${pc.id}` },
    h('div', { class: 'card__icon', 'aria-hidden': 'true' }, icon(pc.icone, 26)),
    h('h3', { class: 'card__title' }, pc.titre),
    h('p', { class: 'card__text' }, pc.description),
    progressBar(pr.done / pr.total, t('parcours.progression', { a: pr.done, b: pr.total })),
    h('div', { class: 'card__foot' }, h('span', { class: 'card__meta' }, icon('route', 14), t('parcours.progression', { a: pr.done, b: pr.total })))
  );
}

export function parcoursList(): View {
  const c = content();
  return {
    title: t('parcours.titre'),
    section: '',
    node: h('div', { class: 'page' }, pageHeader({ kicker: t('parcours.kicker'), title: t('parcours.titre'), icon: 'route', intro: t('parcours.intro') }), h('h2', { class: 'sr-only' }, t('commun.listeTitre')), h('div', { class: 'card-grid' }, ...c.parcours.map(parcoursCard))),
  };
}

export function parcoursDetail(ctx: RouteContext): View {
  const c = content();
  const pc = c.byId.parcours.get(ctx.params.id);
  if (!pc) return notFoundView(t('parcours.introuvable'), { href: '#/parcours', label: t('parcours.titre') });
  const pr = parcoursProgress(pc);
  return {
    title: pc.titre,
    section: '',
    node: h(
      'div',
      { class: 'page page--reading' },
      pageHeader({ kicker: t('parcours.kicker'), title: pc.titre, icon: pc.icone, back: { href: '#/parcours', label: t('parcours.titre') }, intro: pc.description }),
      h('div', { class: 'parcours-progress' }, progressBar(pr.done / pr.total, t('parcours.progression', { a: pr.done, b: pr.total })), h('span', { class: 'mono' }, t('parcours.progression', { a: pr.done, b: pr.total }))),
      pr.next ? linkBtn(`${t('parcours.prochaine')} : ${pr.next.titre}`, pr.next.href, { variant: 'action', icon: 'play', block: true }) : h('p', { class: 'notice notice--success' }, icon('trophy', 18), t('parcours.termine')),
      h(
        'ol',
        { class: 'timeline' },
        ...pc.etapes.map((e, i) => {
          const info = stepInfo(e.type, e.id);
          if (!info) return null;
          const ok = stepDone(e.type, e.id);
          return h(
            'li',
            { class: ['timeline__item', ok && 'is-done'] },
            h('span', { class: 'timeline__dot', 'aria-hidden': 'true' }, ok ? icon('check', 14) : String(i + 1)),
            h('a', { class: 'timeline__link', href: info.href }, h('span', { class: 'timeline__type' }, icon(info.icon, 14), t(`parcours.type.${e.type}`)), h('span', { class: 'timeline__title' }, info.titre), ok ? h('span', { class: 'sr-only' }, ` (${t('commun.lu')})`) : null)
          );
        })
      )
    ),
  };
}
