/*
 * Recherche globale, insensible aux accents et à la casse, avec préfixes.
 * Couvre fiches, fonctions, objets, expériences, missions et glossaire.
 * Les questions naturelles (« que faire avec du papier alu ? ») sont nettoyées
 * de leurs mots vides.
 */
import { normalize } from './dom';
import type { Content } from './types';

export type ResultType = 'fiche' | 'fonction' | 'objet' | 'experience' | 'mission' | 'terme';

export interface SearchDoc {
  type: ResultType;
  id: string;
  titre: string;
  sousTitre: string;
  fields: { text: string; weight: number }[];
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
}

const STOPWORDS = new Set(
  'que quoi faire avec du de des la le les un une au aux en et ou pour par sur dans comment pourquoi est ce qu qui je j me mon ma mes on peut puis peux utiliser sert servir a l d s il elle'.split(
    ' '
  )
);

export function tokenize(query: string): string[] {
  return normalize(query)
    .split(' ')
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

export function buildIndex(c: Content): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const f of c.fiches) {
    docs.push({
      type: 'fiche',
      id: f.id,
      titre: f.titre,
      sousTitre: f.sousTitre ?? f.principe[0],
      fields: [
        { text: f.titre, weight: 10 },
        { text: (f.motsCles ?? []).join(' '), weight: 6 },
        { text: f.categories.map((id) => c.byId.categorie.get(id)?.nom ?? id).join(' '), weight: 3 },
        { text: `${f.sousTitre ?? ''} ${f.principe.join(' ')}`, weight: 2 },
        { text: f.pourquoi.join(' ').replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, '$3 $1'), weight: 1 },
      ],
    });
  }
  for (const fn of c.fonctions) {
    const objets = fn.objets.map((o) => {
      const obj = c.byId.objet.get(o.objet);
      return `${obj?.nom ?? o.objet} ${(obj?.alias ?? []).join(' ')}`;
    });
    docs.push({
      type: 'fonction',
      id: fn.id,
      titre: fn.titre,
      sousTitre: fn.resume,
      fields: [
        { text: fn.titre, weight: 10 },
        { text: objets.join(' '), weight: 5 },
        { text: `${fn.resume} ${fn.principe}`, weight: 2 },
      ],
    });
  }
  for (const o of c.objets) {
    const nb = (c.fonctionsParObjet.get(o.id) ?? []).length;
    if (!nb && !(c.missionsParObjet.get(o.id) ?? []).length) continue;
    docs.push({
      type: 'objet',
      id: o.id,
      titre: o.nom,
      sousTitre: (o.proprietes ?? []).join(' · '),
      fields: [
        { text: o.nom, weight: 10 },
        { text: (o.alias ?? []).join(' '), weight: 8 },
        { text: (o.proprietes ?? []).join(' '), weight: 2 },
      ],
    });
  }
  for (const e of c.experiences) {
    docs.push({
      type: 'experience',
      id: e.id,
      titre: e.titre,
      sousTitre: e.sousTitre ?? e.resultat,
      fields: [
        { text: e.titre, weight: 10 },
        { text: e.materiel.map((m) => m.nom).join(' '), weight: 4 },
        { text: `${e.sousTitre ?? ''} ${e.resultat}`, weight: 2 },
      ],
    });
  }
  for (const m of c.missions) {
    docs.push({
      type: 'mission',
      id: m.id,
      titre: m.titre,
      sousTitre: m.briefing.objectif,
      fields: [
        { text: m.titre, weight: 10 },
        { text: `${m.briefing.lieu} ${m.briefing.objectif}`, weight: 3 },
        { text: m.briefing.contexte, weight: 1 },
      ],
    });
  }
  for (const t of c.termes) {
    docs.push({
      type: 'terme',
      id: t.id,
      titre: t.terme,
      sousTitre: t.definition,
      fields: [
        { text: t.terme, weight: 9 },
        { text: t.definition, weight: 1 },
      ],
    });
  }
  // Pré-normalisation des champs
  for (const d of docs) d.fields = d.fields.map((f) => ({ text: ` ${normalize(f.text)} `, weight: f.weight }));
  return docs;
}

export function search(index: SearchDoc[], query: string, limit = 40): SearchResult[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const phrase = tokens.join(' ');
  const results: SearchResult[] = [];
  for (const doc of index) {
    let score = 0;
    let matched = 0;
    for (const tok of tokens) {
      let best = 0;
      for (const f of doc.fields) {
        if (f.text.includes(` ${tok} `)) best = Math.max(best, f.weight * 2);
        else if (f.text.includes(` ${tok}`)) best = Math.max(best, f.weight * 1.4);
        else if (tok.length >= 4 && f.text.includes(tok)) best = Math.max(best, f.weight * 0.8);
      }
      if (best > 0) matched += 1;
      score += best;
    }
    if (!matched) continue;
    // Tous les mots doivent être trouvés (sauf requêtes longues : 1 mot manquant toléré)
    const required = tokens.length >= 4 ? tokens.length - 1 : tokens.length;
    if (matched < required) continue;
    if (tokens.length > 1 && doc.fields.some((f) => f.text.includes(` ${phrase}`))) score += 15;
    results.push({ doc, score });
  }
  return results.sort((a, b) => b.score - a.score || a.doc.titre.localeCompare(b.doc.titre)).slice(0, limit);
}
