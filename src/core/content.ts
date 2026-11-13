/* Chargement du contenu JSON (public/content/<langue>/) et construction des index. */
import type {
  Categorie,
  Content,
  ContentIndex,
  Experience,
  Fiche,
  Fonction,
  Mission,
  Objet,
  Parcours,
  Terme,
} from './types';

const BASE = './content';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function loadCollection<T>(lang: string, files: string[]): Promise<T[]> {
  const parts = await Promise.all(files.map((f) => getJSON<T[]>(`${BASE}/${lang}/${f}`)));
  return parts.flat();
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const it of items) {
    if (m.has(it.id) && import.meta.env?.DEV) console.warn(`[contenu] identifiant en double : ${it.id}`);
    m.set(it.id, it);
  }
  return m;
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) {
    if (!list.includes(value)) list.push(value);
  } else map.set(key, [value]);
}

export function buildContent(raw: {
  version: string;
  categories: Categorie[];
  fiches: Fiche[];
  objets: Objet[];
  fonctions: Fonction[];
  experiences: Experience[];
  missions: Mission[];
  termes: Terme[];
  parcours: Parcours[];
}): Content {
  const byId = {
    categorie: mapById(raw.categories),
    fiche: mapById(raw.fiches),
    objet: mapById(raw.objets),
    fonction: mapById(raw.fonctions),
    experience: mapById(raw.experiences),
    mission: mapById(raw.missions),
    terme: mapById(raw.termes),
    parcours: mapById(raw.parcours),
  };

  const fonctionsParObjet = new Map<string, Fonction[]>();
  for (const f of raw.fonctions) for (const o of f.objets) pushTo(fonctionsParObjet, o.objet, f);

  const missionsParObjet = new Map<string, Mission[]>();
  for (const m of raw.missions) for (const o of m.objets) pushTo(missionsParObjet, o.objet, m);

  const experiencesParFiche = new Map<string, Experience[]>();
  for (const e of raw.experiences) for (const fid of e.fiches ?? []) pushTo(experiencesParFiche, fid, e);
  for (const f of raw.fiches)
    for (const eid of f.liens.pratique ?? []) {
      const e = byId.experience.get(eid);
      if (e) pushTo(experiencesParFiche, f.id, e);
    }

  // Liens entre fiches rendus symétriques (si A cite B, B affiche A).
  const fichesParFiche = new Map<string, Fiche[]>();
  for (const f of raw.fiches)
    for (const lid of f.liens.fiches ?? []) {
      const other = byId.fiche.get(lid);
      if (!other || other.id === f.id) continue;
      pushTo(fichesParFiche, f.id, other);
      pushTo(fichesParFiche, other.id, f);
    }

  return {
    version: raw.version,
    categories: raw.categories,
    fiches: raw.fiches,
    objets: raw.objets,
    fonctions: raw.fonctions,
    experiences: raw.experiences,
    missions: raw.missions,
    termes: raw.termes,
    parcours: raw.parcours,
    byId,
    fonctionsParObjet,
    missionsParObjet,
    experiencesParFiche,
    fichesParFiche,
  };
}

export async function loadContent(lang = 'fr'): Promise<Content> {
  const index = await getJSON<ContentIndex>(`${BASE}/${lang}/index.json`);
  const [categories, fiches, objets, fonctions, experiences, missions, termes, parcours] = await Promise.all([
    loadCollection<Categorie>(lang, index.categories),
    loadCollection<Fiche>(lang, index.theorie),
    loadCollection<Objet>(lang, index.objets),
    loadCollection<Fonction>(lang, index.equivalences),
    loadCollection<Experience>(lang, index.pratique),
    loadCollection<Mission>(lang, index.missions),
    loadCollection<Terme>(lang, index.glossaire),
    loadCollection<Parcours>(lang, index.parcours),
  ]);
  return buildContent({ version: index.version, categories, fiches, objets, fonctions, experiences, missions, termes, parcours });
}

let current: Content | null = null;
export function setContent(c: Content): void {
  current = c;
}
export function content(): Content {
  if (!current) throw new Error('Contenu non chargé');
  return current;
}
