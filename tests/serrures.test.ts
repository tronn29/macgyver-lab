/* Fiches « serrures et sécurité » : texte fourni repris mot pour mot, sauf les corrections de physique listées. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLongFormat, isRetenir, isSerieRealite } from '../src/core/fiche';
import { loadAll } from './helpers';

const c = loadAll();
const IDS = ['serrure-goupilles', 'porte-charniere', 'cadenas-combinaison', 'fusible-alarme', 'sciage-abrasif'];

/** Corrections apportées au texte fourni (voir DECISIONS.md), et rien d'autre. */
const CORRECTIONS: [string, string][] = [
  [
    "Ce jeu fait qu'une seule goupille touche vraiment la ligne de cisaillement à la fois, les autres restent légèrement coincées.",
    'Ce jeu fait que les goupilles ne se bloquent jamais toutes en même temps : quand le barillet est sollicité en rotation, une seule à la fois se retrouve vraiment coincée sur la ligne de cisaillement, les autres restent libres.',
  ],
  ['un trombone plie avant de pouvoir', 'un trombone plie souvent avant de pouvoir'],
  [
    'ajoutent des goupilles à ressort ou des formes en disque qui rendent la méthode inefficace.',
    'ajoutent des goupilles de sécurité (en forme de champignon ou de bobine) ou remplacent les goupilles par des disques, ce qui rend la méthode inefficace.',
  ],
  [
    "Si tu glisses un objet rigide dans l'espace entre la charnière et son logement, l'objet se coince et crée un point de friction énorme qui empêche toute rotation.",
    "Si tu glisses un objet rigide dans l'interstice côté charnières, entre la porte et le cadre, il se coince tout près du pivot. Comme un levier marche dans les deux sens, la poussée exercée loin, sur la porte, y est multipliée : l'objet est écrasé avec une force énorme et empêche toute rotation.",
  ],
];

const fourni = readFileSync(join(__dirname, 'fixtures', 'serrures-et-securite.md'), 'utf8')
  .trim()
  .split(/^\d\. /m)
  .filter(Boolean)
  .map((bloc) => {
    const [titre, ...paras] = bloc.trim().split(/\n\n+/);
    return { titre: titre.trim(), texte: paras.join('\n\n') };
  });

const affiche = (id: string) =>
  c.byId.fiche
    .get(id)!
    .texte!.map((p) => p.replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g, '$1').replace(/\*\*/g, ''))
    .join('\n\n');

describe('fiches serrures et sécurité', () => {
  it('les 5 fiches existent, au format long, dans l’ordre fourni', () => {
    expect(fourni).toHaveLength(5);
    IDS.forEach((id, i) => {
      const f = c.byId.fiche.get(id)!;
      expect(f.titre).toBe(fourni[i].titre);
      expect(isLongFormat(f)).toBe(true);
      expect(f.texte!.some(isSerieRealite)).toBe(true);
      expect(isRetenir(f.texte!.at(-1)!)).toBe(true);
    });
  });

  it('reprennent le texte fourni mot pour mot, hors corrections listées', () => {
    let utilisees = 0;
    IDS.forEach((id, i) => {
      let attendu = fourni[i].texte;
      for (const [avant, apres] of CORRECTIONS)
        if (attendu.includes(avant)) {
          attendu = attendu.replace(avant, apres);
          utilisees++;
        }
      expect(affiche(id)).toBe(attendu);
    });
    expect(utilisees).toBe(CORRECTIONS.length);
  });

  it('chaque fiche a son schéma, un quiz et une étiquette nuancée', () => {
    for (const id of IDS) {
      const f = c.byId.fiche.get(id)!;
      expect(f.schema.fichier).toBe(`${id}.svg`);
      expect(f.quiz.length).toBeGreaterThanOrEqual(4);
      expect(f.realite.nuance!.length).toBeLessThanOrEqual(90);
    }
    expect(c.byId.fiche.get('fusible-alarme')!.realite.verdict).toBe('faux');
  });
});
