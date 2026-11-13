/*
 * Progression locale (localStorage). Aucune donnée ne quitte l'appareil.
 * Schéma versionné avec migrations ; repli en mémoire si le stockage est indisponible.
 */

export const STORAGE_KEY = 'mgl:progress';
export const SETTINGS_KEY = 'mgl:settings';
export const SCHEMA_VERSION = 1;

export interface SrsCard {
  boite: number; // 0..5 (Leitner)
  due: string; // AAAA-MM-JJ
  vues: number;
  ok: number;
  ko: number;
}

export interface MissionRun {
  id: string;
  date: string; // ISO
  score: number;
  reussie: boolean;
  details: {
    objets: number;
    logique: number;
    rigueur: number;
    bonus: number;
    penaliteIndices: number;
    indices: number[]; // niveaux utilisés
    leurres: string[];
    selection: string[];
    solution: string | null;
    texte: string;
    tempsSec: number | null;
    chrono: boolean;
    autoEval?: 'alternative' | null;
  };
  categories: string[];
}

export interface Brouillon {
  selection: string[];
  texte: string;
  indices: number[];
  temps?: number; // secondes écoulées
  chrono?: boolean;
  maj?: string;
}

export interface Progress {
  version: number;
  creeLe: string;
  xp: number;
  lus: Record<string, string>; // ficheId -> date ISO de première lecture
  vuesFonctions: Record<string, string>;
  experiences: Record<string, { statut: 'fait'; date: string; note?: string }>;
  favoris: Record<string, string>; // "fiche:levier" -> date
  srs: Record<string, SrsCard>; // ficheId -> carte
  quiz: Record<string, { ok: number; ko: number }>; // par catégorie
  missions: MissionRun[];
  brouillons: Record<string, Brouillon>;
  serie: { courante: number; record: number; dernierJour: string | null };
  jours: Record<string, number>; // AAAA-MM-JJ -> nb d'actions
  defis: Record<string, { ok: boolean; xp: number }>;
  dernier: { route: string; titre: string } | null;
  badges: Record<string, string>;
  notes: Record<string, { texte: string; titre: string; route: string; maj: string }>; // carnet de terrain
  /** Score des quiz par fiche : dernier essai, meilleur, nombre d'essais. */
  quizFiches: Record<string, { dernier: number; meilleur: number; total: number; tentatives: number; date: string }>;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  fontScale: number;
  motion: 'system' | 'on' | 'off';
  contrast: 'normal' | 'high';
  son: boolean;
  chronoParDefaut: boolean;
  modeEnfant: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontScale: 1,
  motion: 'system',
  contrast: 'normal',
  son: false,
  chronoParDefaut: false,
  modeEnfant: false,
};

export function emptyProgress(): Progress {
  return {
    version: SCHEMA_VERSION,
    creeLe: new Date().toISOString(),
    xp: 0,
    lus: {},
    vuesFonctions: {},
    experiences: {},
    favoris: {},
    srs: {},
    quiz: {},
    missions: [],
    brouillons: {},
    serie: { courante: 0, record: 0, dernierJour: null },
    jours: {},
    defis: {},
    dernier: null,
    badges: {},
    notes: {},
    quizFiches: {},
  };
}

/** Migre une progression ancienne ou partielle vers le schéma courant. */
export function migrate(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<Progress> & { version?: number };
  // v0 (hypothétique) -> v1 : champs manquants complétés par défaut.
  const merged: Progress = { ...base, ...data, version: SCHEMA_VERSION } as Progress;
  merged.serie = { ...base.serie, ...(data.serie ?? {}) };
  for (const key of ['lus', 'vuesFonctions', 'experiences', 'favoris', 'srs', 'quiz', 'brouillons', 'jours', 'defis', 'badges', 'notes', 'quizFiches'] as const) {
    if (!merged[key] || typeof merged[key] !== 'object' || Array.isArray(merged[key])) {
      (merged as unknown as Record<string, unknown>)[key] = {};
    }
  }
  if (!Array.isArray(merged.missions)) merged.missions = [];
  if (typeof merged.xp !== 'number' || !Number.isFinite(merged.xp) || merged.xp < 0) merged.xp = 0;
  return merged;
}

/* ---- Accès au stockage, tolérant aux pannes ---- */

const memory = new Map<string, string>();
let storageOk: boolean | null = null;

function storageAvailable(): boolean {
  if (storageOk !== null) return storageOk;
  try {
    const k = '__mgl_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    storageOk = true;
  } catch {
    storageOk = false;
  }
  return storageOk;
}

export function isPersistent(): boolean {
  return storageAvailable();
}

function readRaw(key: string): string | null {
  if (storageAvailable()) {
    try {
      return localStorage.getItem(key);
    } catch {
      /* ignore */
    }
  }
  return memory.get(key) ?? null;
}

function writeRaw(key: string, value: string): boolean {
  memory.set(key, value);
  if (!storageAvailable()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // quota dépassé : on garde la copie en mémoire
  }
}

/* ---- Magasin réactif minimal ---- */

type Listener = (p: Progress) => void;
const listeners = new Set<Listener>();
let progress: Progress | null = null;

export function getProgress(): Progress {
  if (!progress) {
    let parsed: unknown = null;
    try {
      const raw = readRaw(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    progress = migrate(parsed);
  }
  return progress;
}

export function saveProgress(): boolean {
  return writeRaw(STORAGE_KEY, JSON.stringify(getProgress()));
}

export function update(mutator: (p: Progress) => void): Progress {
  const p = getProgress();
  mutator(p);
  saveProgress();
  listeners.forEach((fn) => fn(p));
  return p;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetProgress(): void {
  progress = emptyProgress();
  saveProgress();
  listeners.forEach((fn) => fn(progress as Progress));
}

export function exportProgress(): string {
  return JSON.stringify({ app: 'macgyver-lab', exportLe: new Date().toISOString(), progression: getProgress(), reglages: getSettings() }, null, 2);
}

export function importProgress(json: string): void {
  const data = JSON.parse(json) as { app?: string; progression?: unknown; reglages?: unknown };
  if (data.app !== 'macgyver-lab' || !data.progression) throw new Error('format');
  progress = migrate(data.progression);
  saveProgress();
  if (data.reglages) setSettings(data.reglages as Partial<Settings>);
  listeners.forEach((fn) => fn(progress as Progress));
}

/* ---- Réglages ---- */

let settings: Settings | null = null;

export function getSettings(): Settings {
  if (!settings) {
    let parsed: Partial<Settings> = {};
    try {
      parsed = JSON.parse(readRaw(SETTINGS_KEY) || '{}') as Partial<Settings>;
    } catch {
      parsed = {};
    }
    settings = { ...DEFAULT_SETTINGS, ...parsed };
    settings.fontScale = clamp(Number(settings.fontScale) || 1, 0.85, 1.5);
  }
  return settings;
}

export function setSettings(patch: Partial<Settings>): Settings {
  settings = { ...getSettings(), ...patch };
  settings.fontScale = clamp(Number(settings.fontScale) || 1, 0.85, 1.5);
  writeRaw(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export function resetSettingsCache(): void {
  settings = null;
  progress = null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
