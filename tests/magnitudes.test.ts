import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript partagé avec le validateur
import { findMagnitudes, ficheTextFields } from '../scripts/magnitudes.mjs';
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

  it('ignore le balisage et les mots qui ressemblent à des unités', () => {
    expect(pron('**Au moins 3 mètres** de [[detente|détente]]')).toEqual([]);
    expect(pron('Il a 2 ans et 3 amis')).toEqual([]);
  });
});

describe('fiche CO₂ : nouvelle version', () => {
  const co2 = c.byId.fiche.get('detente-co2-froid')!;

  it('chaque ordre de grandeur est prononcé', () => {
    const manquants = ficheTextFields(co2).flatMap(([path, text]: [string, string]) =>
      findMagnitudes(text).filter((m: { prononcee: boolean }) => !m.prononcee).map((m: { valeur: string }) => `${path} : ${m.valeur}`)
    );
    expect(manquants).toEqual([]);
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
