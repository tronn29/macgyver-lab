/* Actions de progression : XP, niveaux, série de jours, lectures, favoris, révision, badges. */
import { addDays, dayKey, diffDays, seeded, shuffle } from './dates';
import { newCard, review, dueIds, MASTERED_BOX } from './srs';
import { getProgress, update, type MissionRun, type Progress } from './store';
import type { Content, Fiche, Quiz } from './types';

export const XP = {
  ficheLue: 10,
  quizOk: 5,
  quizKo: 1,
  defi: 20,
  experience: 15,
  fonctionVue: 3,
  missionPremiereReussite: 10,
} as const;

export const LEVELS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];

export function levelFor(xp: number): { niveau: number; min: number; max: number | null; ratio: number } {
  let niveau = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) niveau = i;
  const min = LEVELS[niveau];
  const max = LEVELS[niveau + 1] ?? null;
  const ratio = max === null ? 1 : (xp - min) / (max - min);
  return { niveau: niveau + 1, min, max, ratio };
}

/* ---- Série de jours ---- */

export function recordActivity(p: Progress, today = dayKey()): void {
  p.jours[today] = (p.jours[today] ?? 0) + 1;
  const last = p.serie.dernierJour;
  if (last === today) return;
  if (last && diffDays(today, last) === 1) p.serie.courante += 1;
  else p.serie.courante = 1;
  p.serie.dernierJour = today;
  p.serie.record = Math.max(p.serie.record, p.serie.courante);
}

/** Série affichée : remise à zéro si un jour a été manqué. */
export function currentStreak(p: Progress, today = dayKey()): { jours: number; enDanger: boolean; faitAujourdhui: boolean } {
  const last = p.serie.dernierJour;
  if (!last) return { jours: 0, enDanger: false, faitAujourdhui: false };
  const gap = diffDays(today, last);
  if (gap === 0) return { jours: p.serie.courante, enDanger: false, faitAujourdhui: true };
  if (gap === 1) return { jours: p.serie.courante, enDanger: true, faitAujourdhui: false };
  return { jours: 0, enDanger: false, faitAujourdhui: false };
}

/* ---- Actions ---- */

/**
 * Lecture d'une fiche, déclarée par l'utilisateur (case « Lu »), jamais automatique.
 * Cocher : +XP, entrée dans la révision espacée, activité du jour (série).
 * Décocher : XP retirés et fiche retirée de la révision (son historique de révision repart de zéro).
 */
export function setRead(fiche: Fiche, lu: boolean): boolean {
  let change = false;
  update((p) => {
    const deja = Boolean(p.lus[fiche.id]);
    if (lu && !deja) {
      p.lus[fiche.id] = new Date().toISOString();
      p.xp += XP.ficheLue;
      if (!p.srs[fiche.id]) p.srs[fiche.id] = newCard();
      recordActivity(p);
      change = true;
    } else if (!lu && deja) {
      delete p.lus[fiche.id];
      delete p.srs[fiche.id];
      p.xp = Math.max(0, p.xp - XP.ficheLue);
      change = true;
    }
  });
  return change;
}

export function isRead(id: string): boolean {
  return Boolean(getProgress().lus[id]);
}

/** Enregistre le résultat complet d'un quiz de fiche. */
export function recordFicheQuiz(ficheId: string, score: number, total: number): void {
  update((p) => {
    const prev = p.quizFiches[ficheId];
    p.quizFiches[ficheId] = {
      dernier: score,
      meilleur: Math.max(score, prev?.meilleur ?? 0),
      total,
      tentatives: (prev?.tentatives ?? 0) + 1,
      date: new Date().toISOString(),
    };
    recordActivity(p);
  });
}

export function markFonctionVue(id: string): void {
  update((p) => {
    if (!p.vuesFonctions[id]) {
      p.vuesFonctions[id] = new Date().toISOString();
      p.xp += XP.fonctionVue;
    }
  });
}

export function toggleExperience(id: string): boolean {
  let fait = false;
  update((p) => {
    if (p.experiences[id]) {
      delete p.experiences[id];
      p.xp = Math.max(0, p.xp - XP.experience);
    } else {
      p.experiences[id] = { statut: 'fait', date: new Date().toISOString() };
      p.xp += XP.experience;
      recordActivity(p);
      fait = true;
    }
  });
  return fait;
}

export function favKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export function isFavori(type: string, id: string): boolean {
  return Boolean(getProgress().favoris[favKey(type, id)]);
}

export function toggleFavori(type: string, id: string): boolean {
  const key = favKey(type, id);
  let on = false;
  update((p) => {
    if (p.favoris[key]) delete p.favoris[key];
    else {
      p.favoris[key] = new Date().toISOString();
      on = true;
    }
  });
  return on;
}

export function answerQuiz(ficheId: string, categories: string[], correct: boolean, srs: boolean): void {
  update((p) => {
    if (srs) p.srs[ficheId] = review(p.srs[ficheId] ?? newCard(), correct);
    for (const c of categories) {
      const q = (p.quiz[c] ??= { ok: 0, ko: 0 });
      if (correct) q.ok += 1;
      else q.ko += 1;
    }
    p.xp += correct ? XP.quizOk : XP.quizKo;
    recordActivity(p);
  });
}

export function recordMission(run: MissionRun): { premiereReussite: boolean; xp: number } {
  let premiereReussite = false;
  let gain = 0;
  update((p) => {
    premiereReussite = run.reussie && !p.missions.some((m) => m.id === run.id && m.reussie);
    gain = Math.round(run.score / 4) + (premiereReussite ? XP.missionPremiereReussite : 0);
    p.missions.push(run);
    if (p.missions.length > 300) p.missions = p.missions.slice(-300);
    delete p.brouillons[run.id];
    p.xp += gain;
    recordActivity(p);
  });
  return { premiereReussite, xp: gain };
}

export function setLast(route: string, titre: string): void {
  update((p) => {
    p.dernier = { route, titre };
  });
}

/* ---- Révision ---- */

export function dueFiches(content: Content, today = dayKey()): Fiche[] {
  const p = getProgress();
  return dueIds(p.srs, today)
    .map((id) => content.byId.fiche.get(id))
    .filter((f): f is Fiche => Boolean(f));
}

export function masteredCount(p: Progress): number {
  return Object.values(p.srs).filter((c) => c.boite >= MASTERED_BOX).length;
}

/* ---- Défi du jour : 3 questions tirées de façon déterministe ---- */

export interface DefiQuestion {
  fiche: Fiche;
  quiz: Quiz;
}

export function dailyChallenge(content: Content, today = dayKey()): DefiQuestion[] {
  const rand = seeded(`defi-${today}`);
  const fiches = shuffle(content.fiches, rand).slice(0, 3);
  return fiches.map((fiche) => ({ fiche, quiz: fiche.quiz[Math.floor(rand() * fiche.quiz.length)] }));
}

export function completeDaily(score: number, total: number, today = dayKey()): number {
  let gain = 0;
  update((p) => {
    if (p.defis[today]) return;
    gain = XP.defi + score * 5;
    p.defis[today] = { ok: score === total, xp: gain };
    p.xp += gain;
    recordActivity(p);
  });
  return gain;
}

/* ---- Points faibles par catégorie ---- */

export interface CategoryStat {
  categorie: string;
  missions: number;
  moyenneMission: number | null;
  quizOk: number;
  quizKo: number;
  taux: number | null; // 0..1 combiné
}

export function weakPoints(content: Content, p: Progress = getProgress()): CategoryStat[] {
  return content.categories
    .map((c) => {
      const runs = p.missions.filter((m) => m.categories.includes(c.id));
      const moyenneMission = runs.length ? runs.reduce((s, r) => s + r.score, 0) / runs.length : null;
      const q = p.quiz[c.id] ?? { ok: 0, ko: 0 };
      // Données minimales : au moins 3 réponses, sinon on ne conclut rien
      const quizRate = q.ok + q.ko >= 3 ? q.ok / (q.ok + q.ko) : null;
      const parts = [moyenneMission !== null ? moyenneMission / 100 : null, quizRate].filter(
        (x): x is number => x !== null
      );
      const taux = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
      return { categorie: c.id, missions: runs.length, moyenneMission, quizOk: q.ok, quizKo: q.ko, taux };
    })
    .sort((a, b) => (a.taux ?? 2) - (b.taux ?? 2));
}

/* ---- Badges ---- */

export interface BadgeDef {
  id: string;
  icone: string;
  test: (p: Progress, c: Content) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'premiere-fiche', icone: 'archive', test: (p) => Object.keys(p.lus).length >= 1 },
  { id: 'archiviste', icone: 'book', test: (p, c) => c.fiches.length > 0 && c.fiches.every((f) => p.lus[f.id]) },
  { id: 'premiere-mission', icone: 'target', test: (p) => p.missions.some((m) => m.reussie) },
  { id: 'sans-indice', icone: 'shield', test: (p) => p.missions.some((m) => m.reussie && m.details.indices.length === 0) },
  { id: 'difficile', icone: 'radar', test: (p, c) => p.missions.some((m) => m.reussie && c.byId.mission.get(m.id)?.difficulte === 'difficile') },
  { id: 'operateur', icone: 'trophy', test: (p, c) => c.missions.length > 0 && c.missions.every((mi) => p.missions.some((m) => m.id === mi.id && m.reussie)) },
  { id: 'laborantin', icone: 'flask', test: (p) => Object.keys(p.experiences).length >= 3 },
  { id: 'serie-3', icone: 'flame', test: (p) => p.serie.record >= 3 },
  { id: 'serie-7', icone: 'flame', test: (p) => p.serie.record >= 7 },
  { id: 'memoire', icone: 'brain', test: (p) => masteredCount(p) >= 5 },
  { id: 'polyvalent', icone: 'multitool', test: (p, c) => c.fonctions.length > 0 && c.fonctions.every((f) => p.vuesFonctions[f.id]) },
];

/** Débloque les nouveaux badges et renvoie leurs identifiants. */
export function checkBadges(content: Content): string[] {
  const p = getProgress();
  const nouveaux = BADGES.filter((b) => !p.badges[b.id] && b.test(p, content)).map((b) => b.id);
  if (nouveaux.length) {
    update((pp) => {
      const now = new Date().toISOString();
      nouveaux.forEach((id) => (pp.badges[id] = now));
    });
  }
  return nouveaux;
}

/** Activité des N derniers jours (pour le graphique). */
export function activityDays(p: Progress, n = 28, today = dayKey()): { jour: string; actions: number }[] {
  const out: { jour: string; actions: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const jour = addDays(today, -i);
    out.push({ jour, actions: p.jours[jour] ?? 0 });
  }
  return out;
}
