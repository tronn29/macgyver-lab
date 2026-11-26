import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript partagé avec le validateur
import { findMagnitudes, ficheTextFields, retirerPrononciationsCourantes, valeurCourante } from '../scripts/magnitudes.mjs';
import { loadAll } from './helpers';

const c = loadAll();

describe('détection des ordres de grandeur', () => {
  const pron = (t: string) => findMagnitudes(t).map((m: { valeur: string; prononcee: boolean }) => [m.valeur, m.prononcee]);

  it('repère valeur + unité, symbole, facteur, puissance de dix', () => {
    expect(pron('il est à 57 bar et à -78,5 °C')).toEqual([['57 bar', false], ['-78,5 °C', false]]);
    expect(pron('μ = 0,3 et ×6,6 puis 10⁻⁸')).toEqual([['μ = 0,3', false], ['×6,6', false], ['10⁻⁸', false]]);
  });

  it('reconnaît la prononciation entre parenthèses', () => {
    expect(pron('à environ 57 bar (cinquante-sept bars), soit…')).toEqual([['57 bar', true]]);
    expect(pron('μ = 0,4 à 0,6 (mu entre zéro virgule quatre et zéro virgule six)')).toEqual([['μ = 0,4 à 0,6', true]]);
  });

  it('distingue les unités courantes des unités peu courantes', () => {
    const info = (t: string) => findMagnitudes(t).map((m: { valeur: string; courante: boolean; superflue: boolean }) => [m.valeur, m.courante, m.superflue]);
    expect(info('20 °C (vingt degrés Celsius), 57 bar, 2 m, 10 µm, 230 V, 50 %, × 12')).toEqual([
      ['20 °C', true, true],
      ['57 bar', false, false],
      ['2 m', true, false],
      ['10 µm', false, false],
      ['230 V', true, false],
      ['50 %', true, false],
      ['× 12', true, false],
    ]);
    // Unité composée, symbole, puissance de dix : pas « courant »
    expect(info('1 000 W/m² et μ = 0,3 et 10⁻⁸')).toEqual([['1 000 W', false, false], ['μ = 0,3', false, false], ['10⁻⁸', false, false]]);
  });

  it('retire seulement les prononciations superflues', () => {
    expect(retirerPrononciationsCourantes('à 57 bar (cinquante-sept bars) et **20 °C** (vingt degrés Celsius), 2 m (deux mètres)')).toBe('à 57 bar (cinquante-sept bars) et **20 °C**, 2 m');
    // Une parenthèse d'explication (pas un nombre en lettres) reste
    expect(retirerPrononciationsCourantes('10 m (la hauteur de trois étages)')).toBe('10 m (la hauteur de trois étages)');
    expect(valeurCourante('≈ 550 L')).toBe(true);
    expect(valeurCourante('1 013 hPa')).toBe(false);
    expect(valeurCourante('9 × 10⁻⁶ /°C')).toBe(false);
  });

  it('ignore le balisage et les mots qui ressemblent à des unités', () => {
    expect(pron('**Au moins 3 mètres** de [[detente|détente]]')).toEqual([]);
    expect(pron('Il a 2 ans et 3 amis')).toEqual([]);
  });
});

describe('fiche CO₂ : nouvelle version', () => {
  const co2 = c.byId.fiche.get('detente-co2-froid')!;

  it('prononce les unités peu courantes (bar), pas les unités courantes (°C)', () => {
    type M = { valeur: string; prononcee: boolean; courante: boolean; superflue: boolean };
    const ms = ficheTextFields(co2).flatMap(([, text]: [string, string]) => findMagnitudes(text) as M[]);
    expect(ms.filter((m) => !m.courante && !m.prononcee).map((m) => m.valeur)).toEqual([]);
    expect(ms.filter((m) => m.superflue).map((m) => m.valeur)).toEqual([]);
    expect(ms.some((m) => m.valeur === '57 bar' && m.prononcee)).toBe(true);
  });

  it('le quiz couvre les comptes et le pourquoi physique', () => {
    const qs = co2.quiz.map((q) => `${q.question} => ${q.choix[q.reponse]}`);
    expect(qs.some((q) => /combien d'éléments/i.test(q) && /^.*=> Trois/.test(q))).toBe(true);
    expect(qs.some((q) => /combien .*types d'extincteurs/i.test(q) && /=> Quatre$/.test(q))).toBe(true);
    expect(qs.some((q) => /gaz qui se détend se refroidit/i.test(q))).toBe(true);
    expect(qs.some((q) => /-78,5/.test(q) && /redevient gaz/.test(q))).toBe(true);
    expect(co2.quiz.length).toBeGreaterThanOrEqual(6);
  });

  it('garde son étiquette et son niveau de sécurité', () => {
    expect(co2.realite.verdict).toBe('partiel');
    expect(co2.securite.niveau).toBe('orange');
    expect(co2.schema.fichier).toBe('detente-co2-froid.svg');
  });
});

describe('règle de style sur toutes les fiches', () => {
  type M = { valeur: string; prononcee: boolean; courante: boolean; superflue: boolean };

  it('aucune parenthèse de prononciation après une unité courante', () => {
    const superflues = c.fiches.flatMap((f) =>
      ficheTextFields(f).flatMap(([path, text]: [string, string]) => (findMagnitudes(text) as M[]).filter((m) => m.superflue).map((m) => `${f.id} ${path} : ${m.valeur}`))
    );
    expect(superflues).toEqual([]);
  });

  it('chaque unité peu courante garde sa prononciation', () => {
    const manquants = c.fiches.flatMap((f) =>
      ficheTextFields(f).flatMap(([path, text]: [string, string]) => (findMagnitudes(text) as M[]).filter((m) => !m.courante && !m.prononcee).map((m) => `${f.id} ${path} : ${m.valeur}`))
    );
    expect(manquants).toEqual([]);
  });

  it('les données clés ne gardent « dit » que pour les valeurs difficiles à lire', () => {
    for (const f of c.fiches) for (const ch of [...(f.chiffres ?? []), ...(f.echelle?.niveaux ?? [])]) expect(!!ch.dit, `${f.id} : ${ch.valeur}`).toBe(!valeurCourante(ch.valeur));
  });

  it('le niveau de sécurité est seul, sans phrase de commentaire', () => {
    for (const f of c.fiches) expect(Object.keys(f.securite), f.id).toEqual(['niveau']);
  });
});
