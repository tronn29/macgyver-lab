/*
 * Score d'une mission : fondé sur la logique, pas seulement sur le résultat.
 * Plusieurs solutions peuvent être valables : on évalue le joueur par rapport
 * à la solution qui lui correspond le mieux.
 *
 *   Objets   /40 : part des objets requis de la solution retenue (+ bonus optionnels)
 *   Logique  /40 : idées clés (groupes de mots-clés) retrouvées dans le texte écrit
 *   Rigueur  /20 : 20 − 5 par leurre sélectionné − 2 par objet hors sujet (au-delà de 2)
 *   Indices      : −5 / −10 / −15 selon le niveau utilisé
 *   Bonus        : +5 si le compte à rebours est activé et respecté
 *   Seuil de réussite : 60 / 100
 */
import { normalize } from './dom';
import type { Mission, MissionSolution } from './types';

export const HINT_COST = [5, 10, 15] as const;
export const PASS_SCORE = 60;
export const MAX = { objets: 40, logique: 40, rigueur: 20 } as const;

export interface ScoreInput {
  selection: string[];
  texte: string;
  indices: number[]; // niveaux 1..3 utilisés
  chrono?: { actif: boolean; respecte: boolean };
}

export interface SolutionMatch {
  solution: MissionSolution;
  objetsTrouves: string[];
  objetsManquants: string[];
  idees: { groupe: string[]; trouve: boolean }[];
  objetsScore: number;
  logiqueScore: number;
}

export interface ScoreResult {
  total: number;
  reussie: boolean;
  objets: number;
  logique: number;
  rigueur: number;
  bonus: number;
  penaliteIndices: number;
  meilleure: SolutionMatch;
  toutes: SolutionMatch[];
  leurres: string[];
  horsSujet: string[];
  pieceManquanteCouverte: boolean | null;
  objetCleTrouve: boolean | null;
}

/** Recherche d'un mot-clé dans un texte normalisé, tolérante au pluriel. */
export function containsKeyword(normText: string, keyword: string): boolean {
  const k = normalize(keyword);
  if (!k) return false;
  const padded = ` ${normText} `;
  if (padded.includes(` ${k} `)) return true;
  // Tolérance : pluriels simples (s, x) et terminaisons verbales courtes
  const words = k.split(' ');
  const pattern = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (w.length >= 4 ? '[a-z]{0,3}' : '(s|x)?'))
    .join(' ');
  return new RegExp(`(^| )${pattern}( |$)`).test(normText);
}

export function matchSolution(solution: MissionSolution, selection: Set<string>, normText: string): SolutionMatch {
  const objetsTrouves = solution.objets.filter((o) => selection.has(o));
  const objetsManquants = solution.objets.filter((o) => !selection.has(o));
  const optionnels = (solution.optionnels ?? []).filter((o) => selection.has(o)).length;
  const base = solution.objets.length ? objetsTrouves.length / solution.objets.length : 1;
  const bonusOpt = Math.min(0.1, optionnels * 0.05);
  const objetsScore = Math.min(1, base + (base > 0 ? bonusOpt : 0));
  const idees = solution.motsCles.map((groupe) => ({
    groupe,
    trouve: groupe.some((k) => containsKeyword(normText, k)),
  }));
  const logiqueScore = idees.length ? idees.filter((i) => i.trouve).length / idees.length : 0;
  return { solution, objetsTrouves, objetsManquants, idees, objetsScore, logiqueScore };
}

export function scoreMission(mission: Mission, input: ScoreInput): ScoreResult {
  const selection = new Set(input.selection);
  const normText = normalize(input.texte || '');
  const toutes = mission.solutions.map((s) => matchSolution(s, selection, normText));
  const meilleure = toutes.reduce((best, cur) =>
    cur.objetsScore * MAX.objets + cur.logiqueScore * MAX.logique >
    best.objetsScore * MAX.objets + best.logiqueScore * MAX.logique
      ? cur
      : best
  );

  const leurresSet = new Set(mission.leurres ?? []);
  const utiles = new Set<string>();
  for (const s of mission.solutions) {
    s.objets.forEach((o) => utiles.add(o));
    (s.optionnels ?? []).forEach((o) => utiles.add(o));
  }
  (mission.pieceManquante?.remplacements ?? []).forEach((o) => utiles.add(o));
  if (mission.objetCle) utiles.add(mission.objetCle);

  const leurres = input.selection.filter((o) => leurresSet.has(o));
  const horsSujet = input.selection.filter((o) => !leurresSet.has(o) && !utiles.has(o));

  const objets = Math.round(meilleure.objetsScore * MAX.objets);
  const logique = Math.round(meilleure.logiqueScore * MAX.logique);
  // Rigueur : pas de rigueur sans engagement (aucun objet sélectionné = 0)
  const rigueur =
    input.selection.length === 0
      ? 0
      : Math.max(0, MAX.rigueur - 5 * leurres.length - 2 * Math.max(0, horsSujet.length - 2));
  const indicesUniques = Array.from(new Set(input.indices)).filter((n) => n >= 1 && n <= 3);
  const penaliteIndices = indicesUniques.reduce((sum, n) => sum + HINT_COST[n - 1], 0);
  const bonus = input.chrono?.actif && input.chrono.respecte && objets + logique > 0 ? 5 : 0;

  const total = Math.max(0, Math.min(100, objets + logique + rigueur + bonus - penaliteIndices));

  const pieceManquanteCouverte = mission.pieceManquante
    ? mission.pieceManquante.remplacements.some((o) => selection.has(o))
    : null;
  const objetCleTrouve = mission.objetCle ? selection.has(mission.objetCle) : null;

  return {
    total,
    reussie: total >= PASS_SCORE,
    objets,
    logique,
    rigueur,
    bonus,
    penaliteIndices,
    meilleure,
    toutes,
    leurres,
    horsSujet,
    pieceManquanteCouverte,
    objetCleTrouve,
  };
}

/** Score « logique » après auto-évaluation honnête d'une solution alternative. */
export function applyAlternative(result: ScoreResult): ScoreResult {
  const logique = Math.max(result.logique, 30);
  const total = Math.max(
    0,
    Math.min(100, result.objets + logique + result.rigueur + result.bonus - result.penaliteIndices)
  );
  return { ...result, logique, total, reussie: total >= PASS_SCORE };
}
