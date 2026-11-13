import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, dayKey, diffDays, seeded } from '../src/core/dates';
import { normalize } from '../src/core/dom';
import { containsKeyword, scoreMission, applyAlternative, PASS_SCORE } from '../src/core/scoring';
import { newCard, review, dueIds, INTERVALS } from '../src/core/srs';
import { buildIndex, search, tokenize } from '../src/core/search';
import { migrate, emptyProgress } from '../src/core/store';
import { levelFor, recordActivity, currentStreak, dailyChallenge, weakPoints } from '../src/core/progress';
import { parseRich } from '../src/ui/richtext';
import { loadAll } from './helpers';

const c = loadAll();

describe('dates', () => {
  it('ajoute et compare des jours locaux', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-03-01', '2026-02-28')).toBe(1);
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('produit un aléatoire déterministe', () => {
    expect(seeded('a')()).toBe(seeded('a')());
    expect(seeded('a')()).not.toBe(seeded('b')());
  });
});

describe('normalisation', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normalize("Pied-de-Biche, ÉTABLI !")).toBe('pied de biche etabli');
    expect(normalize('CO₂')).toBe('co2');
    expect(normalize('Œuf')).toBe('oeuf');
  });
});

describe('score des missions', () => {
  it('reconnaît les mots-clés avec tolérance au pluriel', () => {
    expect(containsKeyword(normalize('Je fais levier sur des briques'), 'brique')).toBe(true);
    expect(containsKeyword(normalize("un point d'appui"), "point d'appui")).toBe(true);
    expect(containsKeyword(normalize('aucun rapport'), 'levier')).toBe(false);
  });

  for (const m of c.missions) {
    it(`${m.id} : la solution de référence réussit, le vide échoue`, () => {
      const s = m.solutions[0];
      const texte = s.motsCles.map((g) => g[0]).join(', ');
      const ok = scoreMission(m, { selection: s.objets, texte, indices: [] });
      expect(ok.total).toBeGreaterThanOrEqual(PASS_SCORE);
      expect(ok.reussie).toBe(true);
      expect(ok.objets).toBe(40);
      expect(ok.logique).toBe(40);
      const ko = scoreMission(m, { selection: [], texte: '', indices: [] });
      expect(ko.total).toBe(0);
      expect(ko.reussie).toBe(false);
    });
    it(`${m.id} : les leurres et indices coûtent des points`, () => {
      const s = m.solutions[0];
      const texte = s.motsCles.map((g) => g[0]).join(' ');
      const base = scoreMission(m, { selection: s.objets, texte, indices: [] }).total;
      const withHints = scoreMission(m, { selection: s.objets, texte, indices: [1, 2, 3] }).total;
      expect(base - withHints).toBe(30);
      if (m.leurres?.length) {
        const withDecoy = scoreMission(m, { selection: [...s.objets, m.leurres[0]], texte, indices: [] });
        expect(withDecoy.leurres).toEqual([m.leurres[0]]);
        expect(withDecoy.total).toBe(base - 5);
      }
    });
  }
  it('choisit la solution la plus proche quand il y en a plusieurs', () => {
    const m = c.missions.find((x) => x.solutions.length > 1)!;
    const s2 = m.solutions[1];
    const r = scoreMission(m, { selection: s2.objets, texte: s2.motsCles.map((g) => g[0]).join(' '), indices: [] });
    expect(r.meilleure.solution.id).toBe(s2.id);
  });
  it("l'auto-évaluation relève la logique à 30 au minimum", () => {
    const m = c.missions[0];
    const r = scoreMission(m, { selection: m.solutions[0].objets, texte: 'xx', indices: [] });
    expect(applyAlternative(r).logique).toBe(30);
  });
  it('le bonus de chrono ne s’applique que si le temps est respecté', () => {
    const m = c.missions[0];
    const s = m.solutions[0];
    const texte = s.motsCles.map((g) => g[0]).join(' ');
    const a = scoreMission(m, { selection: s.objets, texte, indices: [1], chrono: { actif: true, respecte: true } });
    const b = scoreMission(m, { selection: s.objets, texte, indices: [1], chrono: { actif: true, respecte: false } });
    expect(a.total - b.total).toBe(5);
  });
});

describe('révision espacée', () => {
  it('monte et redescend les boîtes', () => {
    const today = '2026-11-13';
    let card = newCard(today);
    expect(card.due).toBe('2026-11-14');
    card = review(card, true, today);
    expect(card.boite).toBe(1);
    expect(card.due).toBe(addDays(today, INTERVALS[1]));
    card = review(card, false, today);
    expect(card.boite).toBe(0);
    expect(dueIds({ a: { ...card, due: today }, b: { ...card, due: '2099-01-01' } }, today)).toEqual(['a']);
  });
});

describe('recherche', () => {
  const index = buildIndex(c);
  it('nettoie les questions naturelles', () => {
    expect(tokenize('Que faire avec du papier alu ?')).toEqual(['papier', 'alu']);
  });
  it('trouve le papier alu et ses fonctions', () => {
    const r = search(index, 'que faire avec du papier alu ?');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].doc.type).toBe('objet');
    expect(r.some((x) => x.doc.type === 'fonction')).toBe(true);
  });
  it('trouve une fiche par son titre sans accents', () => {
    const r = search(index, 'electroaimant');
    expect(r[0].doc.id).toBe('electroaimant');
  });
  it('ne renvoie rien pour une requête vide', () => {
    expect(search(index, '  ? ')).toEqual([]);
  });
});

describe('progression', () => {
  it('migre une progression partielle ou corrompue', () => {
    const m = migrate({ xp: -5, lus: [], serie: { courante: 3 } });
    expect(m.xp).toBe(0);
    expect(m.lus).toEqual({});
    expect(m.serie.record).toBe(0);
    expect(m.serie.courante).toBe(3);
    expect(migrate('nimporte quoi').version).toBe(1);
  });
  it('calcule les niveaux', () => {
    expect(levelFor(0).niveau).toBe(1);
    expect(levelFor(100).niveau).toBe(2);
    expect(levelFor(99999).ratio).toBe(1);
  });
  it('gère la série de jours', () => {
    const p = emptyProgress();
    recordActivity(p, '2026-11-10');
    recordActivity(p, '2026-11-11');
    recordActivity(p, '2026-11-11');
    expect(p.serie.courante).toBe(2);
    expect(currentStreak(p, '2026-11-12')).toMatchObject({ jours: 2, enDanger: true });
    expect(currentStreak(p, '2026-11-14').jours).toBe(0);
    recordActivity(p, '2026-11-14');
    expect(p.serie.courante).toBe(1);
    expect(p.serie.record).toBe(2);
  });
  it('le défi du jour est stable pour une date', () => {
    const a = dailyChallenge(c, '2026-11-13').map((q) => q.fiche.id);
    expect(dailyChallenge(c, '2026-11-13').map((q) => q.fiche.id)).toEqual(a);
    expect(new Set(a).size).toBe(3);
  });
  it('calcule les points faibles', () => {
    const p = emptyProgress();
    p.quiz.lumiere = { ok: 1, ko: 3 };
    p.quiz.mecanique = { ok: 4, ko: 0 };
    const w = weakPoints(c, p);
    expect(w[0].categorie).toBe('lumiere');
  });
});

describe('contenu', () => {
  it('a le volume minimal demandé', () => {
    expect(c.fiches.length).toBeGreaterThanOrEqual(15);
    expect(c.fonctions.length).toBeGreaterThanOrEqual(8);
    expect(c.experiences.length).toBeGreaterThanOrEqual(8);
    expect(c.missions.length).toBeGreaterThanOrEqual(5);
  });
  it('les liens entre fiches sont symétriques', () => {
    for (const f of c.fiches) for (const id of f.liens.fiches ?? []) expect(c.fichesParFiche.get(id)?.some((x) => x.id === f.id)).toBe(true);
  });
  it('analyse le balisage du glossaire', () => {
    expect(parseRich('a [[detente]] b [[uv|ultraviolets]]')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'term', id: 'detente', text: '' },
      { type: 'text', text: ' b ' },
      { type: 'term', id: 'uv', text: 'ultraviolets' },
    ]);
  });
});

describe('interface', () => {
  const fr = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'i18n', 'fr.json'), 'utf8'));
  const get = (k: string) => k.split('.').reduce((a: any, p) => (a ? a[p] : undefined), fr);
  const files: string[] = [];
  const walk = (d: string) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.ts') && files.push(join(d, f))));
  walk(join(__dirname, '..', 'src'));
  it('toutes les clés de traduction utilisées existent', () => {
    const missing: string[] = [];
    for (const f of files.filter((x) => !x.endsWith('i18n.ts'))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bt(?:List)?\('([a-zA-Z0-9.]+)'/g)) if (get(m[1]) === undefined) missing.push(`${m[1]} (${f.split('/src/')[1]})`);
    }
    expect(missing).toEqual([]);
  });
  it('aucun emoji dans l’interface', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emoji.test(JSON.stringify(fr))).toBe(false);
  });
});
