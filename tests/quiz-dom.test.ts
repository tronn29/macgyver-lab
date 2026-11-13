// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { quizRunner } from '../src/ui/quiz';
import { loadAll } from './helpers';

const c = loadAll();
const f = c.byId.fiche.get('siphon')!;
const items = f.quiz.map((quiz) => ({ fiche: f, quiz }));

const flush = () => new Promise((r) => setTimeout(r, 0));
const click = (el: Element | null) => (el as HTMLElement).click();
const validerBtn = (root: HTMLElement) => [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Valider')) as HTMLButtonElement;

describe('quiz dans le DOM (clics réels sur les boutons)', () => {
  it('le bouton « Valider » soumet le formulaire', () => {
    const root = quizRunner(items);
    document.body.appendChild(root);
    expect(validerBtn(root).type).toBe('submit');
  });

  it('choisir, valider, voir la correction et l’explication, puis recommencer', async () => {
    const onAnswer = vi.fn();
    const onDone = vi.fn();
    const root = quizRunner(items, { restartable: true, onAnswer, onDone });
    document.body.appendChild(root);

    for (let i = 0; i < items.length; i++) {
      // Valider sans réponse : message d'aide, pas de correction
      click(validerBtn(root));
      await flush();
      expect(root.querySelector('.quiz__hint')).not.toBeNull();
      expect(root.querySelector('.quiz__result')).toBeNull();
      // Choisir la bonne réponse en touchant son libellé
      click(root.querySelectorAll('.quiz__label')[items[i].quiz.reponse]);
      click(validerBtn(root));
      await flush();
      const result = root.querySelector('.quiz__result');
      expect(result?.classList.contains('is-correct')).toBe(true);
      expect(result?.textContent).toContain(items[i].quiz.explication);
      expect(root.querySelectorAll('.quiz__option.is-correct').length).toBe(1);
      // Question suivante / Terminer
      click(root.querySelector('.quiz__actions button'));
      await flush();
    }
    expect(onAnswer).toHaveBeenCalledTimes(items.length);
    expect(onDone).toHaveBeenCalledWith(items.length, items.length);
    expect(root.querySelector('.quiz__summary')?.textContent).toContain(`${items.length} bonnes réponses sur ${items.length}`);

    // Recommencer : retour à la question 1, rien de coché
    click([...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Recommencer')) ?? null);
    await flush();
    expect(root.querySelector('.quiz__legend')?.textContent).toContain('Question 1 sur');
    expect(root.querySelector('.quiz__radio:checked')).toBeNull();
  });

  it('une mauvaise réponse est corrigée et montre la bonne', async () => {
    const root = quizRunner(items.slice(0, 1));
    document.body.appendChild(root);
    const faux = items[0].quiz.reponse === 0 ? 1 : 0;
    click(root.querySelectorAll('.quiz__label')[faux]);
    click(validerBtn(root));
    await flush();
    expect(root.querySelector('.quiz__result')?.classList.contains('is-wrong')).toBe(true);
    expect(root.querySelector('.quiz__answer')?.textContent).toContain(items[0].quiz.choix[items[0].quiz.reponse]);
    expect(root.querySelector('.quiz__option.is-wrong')).not.toBeNull();
  });
});
