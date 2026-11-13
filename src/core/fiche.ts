/*
 * Outils purs sur les fiches Théorie (aucun accès au DOM) :
 * format long ou court, texte brut, temps de lecture, paragraphes spéciaux.
 */
import type { Fiche } from './types';

/** Vitesse de lecture attentive d'un texte explicatif, en mots par minute. */
export const MOTS_PAR_MINUTE = 200;

const TERM_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function isLongFormat(f: Fiche): f is Fiche & { texte: string[] } {
  return Array.isArray(f.texte) && f.texte.length > 0;
}

/** Retire le balisage : **gras** et [[terme|texte]] (garde le texte affiché, ou l'identifiant). */
export function stripMarkup(text: string, termLabel: (id: string) => string = (id) => id.replace(/-/g, ' ')): string {
  return text.replace(/\*\*/g, '').replace(TERM_RE, (_, id: string, label?: string) => label ?? termLabel(id));
}

/** Paragraphes lisibles de la fiche, quel que soit son format. */
export function ficheBody(f: Fiche): string[] {
  if (isLongFormat(f)) return f.texte;
  return [...(f.principe ?? []), ...(f.pourquoi ?? []), f.realite.explication];
}

export function countWords(text: string): number {
  return stripMarkup(text).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Temps de lecture estimé, en minutes (1 au minimum). */
export function readingMinutes(f: Fiche): number {
  const words = ficheBody(f).reduce((n, p) => n + countWords(p), countWords(f.titre));
  return Math.max(1, Math.ceil(words / MOTS_PAR_MINUTE));
}

export const isRetenir = (p: string): boolean => /^\*\*\s*À retenir/i.test(p.trim());
export const isSerieRealite = (p: string): boolean => /Dans la série/i.test(p) && /Dans la réalité/i.test(p);

/** Découpe en morceaux normaux / gras (le balisage de glossaire reste à l'intérieur). */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), bold: false });
    out.push({ text: m[1], bold: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}
