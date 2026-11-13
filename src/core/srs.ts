/*
 * Révision espacée (système de Leitner) : chaque fiche lue devient une carte.
 * Bonne réponse : la carte monte d'une boîte et revient plus tard.
 * Erreur : elle retourne en boîte 0 et revient demain.
 */
import { addDays, dayKey } from './dates';
import type { SrsCard } from './store';

export const INTERVALS = [1, 2, 4, 8, 16, 32]; // jours, par boîte
export const MASTERED_BOX = 4;

export function newCard(today = dayKey()): SrsCard {
  return { boite: 0, due: addDays(today, INTERVALS[0]), vues: 0, ok: 0, ko: 0 };
}

export function review(card: SrsCard, correct: boolean, today = dayKey()): SrsCard {
  const boite = correct ? Math.min(card.boite + 1, INTERVALS.length - 1) : 0;
  return {
    boite,
    due: addDays(today, INTERVALS[boite]),
    vues: card.vues + 1,
    ok: card.ok + (correct ? 1 : 0),
    ko: card.ko + (correct ? 0 : 1),
  };
}

export function isDue(card: SrsCard, today = dayKey()): boolean {
  return card.due <= today;
}

export function dueIds(cards: Record<string, SrsCard>, today = dayKey()): string[] {
  return Object.entries(cards)
    .filter(([, c]) => isDue(c, today))
    .sort((a, b) => a[1].boite - b[1].boite || a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}
