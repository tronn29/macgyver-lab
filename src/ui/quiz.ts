/* Questionnaire à choix multiples accessible (fieldset + radios), une question à la fois. */
import { h, nextId } from '../core/dom';
import { t } from '../core/i18n';
import { play, buzz } from '../core/sound';
import type { Fiche, Quiz } from '../core/types';
import { btn } from './components';
import { icon } from './icons';

export interface QuizItem {
  fiche: Fiche;
  quiz: Quiz;
}

export function quizRunner(
  items: QuizItem[],
  opts: {
    onAnswer?: (item: QuizItem, correct: boolean) => void;
    onDone?: (score: number, total: number) => void;
    showFicheLink?: boolean;
    doneLabel?: string;
  } = {}
): HTMLElement {
  const root = h('div', { class: 'quiz' });
  let index = 0;
  let score = 0;

  const render = () => {
    const item = items[index];
    const name = nextId('q');
    const legendId = `${name}-legend`;
    const feedback = h('div', { class: 'quiz__feedback', 'aria-live': 'polite' });
    const options = item.quiz.choix.map((choix, i) => {
      const id = `${name}-${i}`;
      return h(
        'div',
        { class: 'quiz__option' },
        h('input', { type: 'radio', name, id, value: String(i), class: 'quiz__radio' }),
        h('label', { for: id, class: 'quiz__label' }, h('span', { class: 'quiz__letter', 'aria-hidden': 'true' }, String.fromCharCode(65 + i)), h('span', null, choix))
      );
    });
    const validate = btn(t('quiz.valider'), { variant: 'primary', icon: 'check' });
    const form = h(
      'form',
      { class: 'quiz__form', novalidate: true },
      h(
        'fieldset',
        { class: 'quiz__fieldset', 'aria-describedby': legendId },
        h(
          'legend',
          { class: 'quiz__legend', id: legendId },
          h('span', { class: 'hud-label' }, t('quiz.question', { a: index + 1, b: items.length })),
          opts.showFicheLink ? h('span', { class: 'quiz__source' }, icon('archive', 14), item.fiche.titre) : null,
          h('span', { class: 'quiz__question' }, item.quiz.question)
        ),
        h('div', { class: 'quiz__options' }, ...options)
      ),
      feedback,
      h('div', { class: 'quiz__actions' }, validate)
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const checked = form.querySelector<HTMLInputElement>('input:checked');
      if (!checked) {
        feedback.replaceChildren(h('p', { class: 'quiz__hint' }, t('quiz.choisir')));
        form.querySelector<HTMLInputElement>('input')?.focus();
        return;
      }
      const choice = Number(checked.value);
      const correct = choice === item.quiz.reponse;
      if (correct) score += 1;
      play(correct ? 'success' : 'fail');
      buzz(correct ? 10 : 30);
      form.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
        inp.disabled = true;
        const opt = inp.closest('.quiz__option');
        const v = Number(inp.value);
        if (v === item.quiz.reponse) opt?.classList.add('is-correct');
        else if (v === choice) opt?.classList.add('is-wrong');
      });
      opts.onAnswer?.(item, correct);
      const last = index === items.length - 1;
      const next = btn(last ? opts.doneLabel ?? t('commun.terminer') : t('quiz.suivante'), {
        variant: 'primary',
        iconAfter: last ? 'check' : 'arrow-right',
        onClick: () => {
          if (last) opts.onDone?.(score, items.length);
          else {
            index += 1;
            render();
            root.querySelector<HTMLElement>('.quiz__legend')?.focus();
          }
        },
      });
      feedback.replaceChildren(
        h(
          'div',
          { class: ['quiz__result', correct ? 'is-correct' : 'is-wrong'] },
          h('p', { class: 'quiz__verdict' }, icon(correct ? 'check' : 'x', 18), correct ? t('quiz.bonne') : t('quiz.mauvaise')),
          !correct ? h('p', { class: 'quiz__answer' }, t('quiz.reponseEtait', { r: item.quiz.choix[item.quiz.reponse] })) : null,
          h('p', { class: 'quiz__explain' }, item.quiz.explication),
          opts.showFicheLink ? h('a', { class: 'quiz__link', href: `#/archives/${item.fiche.id}` }, icon('archive', 14), t('revision.ouvrirFiche')) : null
        )
      );
      validate.replaceWith(next);
      next.focus();
    });
    root.replaceChildren(form);
    const legend = root.querySelector<HTMLElement>('.quiz__legend');
    legend?.setAttribute('tabindex', '-1');
  };

  if (items.length) render();
  return root;
}
