import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { countWords, ficheBody, isLongFormat, isRetenir, isSerieRealite, readingMinutes, splitBold, stripMarkup } from '../src/core/fiche';
import { buildIndex, search } from '../src/core/search';
import { loadAll } from './helpers';

const ROOT = join(__dirname, '..');
const c = loadAll();
const co2 = c.byId.fiche.get('detente-co2-froid')!;

describe('format long des fiches', () => {
  it('la fiche CO₂ affiche le texte fourni, mot pour mot', () => {
    const attendu = readFileSync(join(__dirname, 'fixtures', 'fiche-co2.md'), 'utf8').trim();
    expect(isLongFormat(co2)).toBe(true);
    // Les infobulles [[id|texte]] ne changent pas le texte affiché
    const affiche = co2.texte!.map((p) => p.replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g, '$1')).join('\n\n');
    expect(affiche).toBe(attendu);
  });

  it('respecte la structure : série/réalité puis « À retenir » en dernier', () => {
    expect(isRetenir(co2.texte!.at(-1)!)).toBe(true);
    expect(co2.texte!.some(isSerieRealite)).toBe(true);
    expect(co2.principe).toBeUndefined();
    expect(co2.pourquoi).toBeUndefined();
  });

  it('chaque fiche a soit le format long, soit le format court complet (compatibilité)', () => {
    for (const f of c.fiches) {
      if (isLongFormat(f)) continue;
      expect(f.principe?.length, f.id).toBe(3);
      expect(f.pourquoi?.length, f.id).toBeGreaterThan(0);
      expect(ficheBody(f).length).toBeGreaterThan(3);
    }
    expect(c.fiches.filter((f) => !isLongFormat(f)).length).toBeGreaterThan(0);
  });

  it('retire le balisage et découpe le gras', () => {
    expect(stripMarkup('**Accroche.** Un gaz [[detente|se détend]] et [[uv]]')).toBe('Accroche. Un gaz se détend et uv');
    expect(splitBold('**A** b **C**')).toEqual([
      { text: 'A', bold: true },
      { text: ' b ', bold: false },
      { text: 'C', bold: true },
    ]);
    expect(splitBold('sans gras')).toEqual([{ text: 'sans gras', bold: false }]);
  });

  it('calcule le temps de lecture', () => {
    expect(countWords('**Un** gaz [[detente|se détend]] : vite !')).toBe(5);
    const mots = co2.texte!.reduce((n, p) => n + countWords(p), countWords(co2.titre));
    expect(readingMinutes(co2)).toBe(Math.ceil(mots / 200));
    expect(readingMinutes(co2)).toBeGreaterThanOrEqual(3);
    for (const f of c.fiches) expect(readingMinutes(f)).toBeGreaterThanOrEqual(1);
  });

  it('la recherche couvre le texte long', () => {
    const r = search(buildIndex(c), 'extincteur mousse');
    expect(r[0].doc.id).toBe('detente-co2-froid');
  });
});

describe('validateur de contenu', () => {
  const run = (dir?: string) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-content.mjs'), ...(dir ? ['--dir', dir] : [])], { encoding: 'utf8' });

  it('accepte le contenu publié', () => {
    const r = run();
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  const mutate = (fn: (fiches: any[]) => void) => {
    const dir = mkdtempSync(join(tmpdir(), 'mgl-contenu-'));
    cpSync(join(ROOT, 'public', 'content', 'fr'), dir, { recursive: true });
    const file = join(dir, 'theorie-1.json');
    const fiches = JSON.parse(readFileSync(file, 'utf8'));
    fn(fiches);
    writeFileSync(file, JSON.stringify(fiches));
    const r = run(dir);
    rmSync(dir, { recursive: true, force: true });
    return r;
  };
  const longFiche = (fiches: any[]) => fiches.find((f) => f.texte);
  const sensible = (fiches: any[]) => fiches.find((f) => f.principeSeul);

  it('bloque un texte long sans « À retenir » final', () => {
    const r = mutate((fs) => longFiche(fs).texte.pop());
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/À retenir/);
  });

  it('bloque un texte long sans paragraphe série/réalité', () => {
    const r = mutate((fs) => (longFiche(fs).texte = longFiche(fs).texte.filter((p: string) => !p.includes('Dans la série'))));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Dans la série/);
  });

  it('bloque un gras mal fermé', () => {
    const r = mutate((fs) => (longFiche(fs).texte[0] += ' **oubli'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/gras mal fermé/);
  });

  it('bloque un terme de fabrication dangereux (règle de contenu)', () => {
    const r = mutate((fs) => (longFiche(fs).texte[1] += ' On pourrait ajouter un détonateur.'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/règle de contenu/);
  });

  it('bloque une quantité de matière dans un sujet sensible', () => {
    const r = mutate((fs) => (sensible(fs).pourquoi[0] += ' Il suffit de 50 g de matière.'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/sujet sensible/);
  });

  it('bloque un sujet sensible relié à une expérience', () => {
    const r = mutate((fs) => (sensible(fs).liens.pratique = ['pile-citron-xp']));
    expect(r.status).toBe(1);
  });
});

describe('fiche empreintes digitales (format long)', () => {
  const f = c.byId.fiche.get('empreintes-poussiere')!;

  it('affiche le texte fourni, mot pour mot', () => {
    const attendu = readFileSync(join(__dirname, 'fixtures', 'empreintes-poussiere.md'), 'utf8').trim();
    expect(isLongFormat(f)).toBe(true);
    const affiche = f.texte!.map((p) => p.replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g, '$1')).join('\n\n');
    expect(affiche).toBe(attendu);
    expect(f.principe).toBeUndefined();
    expect(f.pourquoi).toBeUndefined();
  });

  it("l'étiquette indique : anciens capteurs oui, capteurs modernes non", () => {
    expect(f.realite.verdict).toBe('partiel');
    expect(f.realite.nuance).toMatch(/anciens capteurs/i);
    expect(f.realite.nuance).toMatch(/plus sur les capteurs modernes/i);
    expect(f.securite.niveau).toBe('vert');
  });

  it('le quiz couvre optique contre capacitif, et pouls, conductivité, température', () => {
    const qs = f.quiz.map((q) => `${q.question} => ${q.choix[q.reponse]}`);
    expect(qs.some((q) => /optique/i.test(q) && /capacitif/i.test(q) && /champ électrique/i.test(q))).toBe(true);
    expect(qs.some((q) => /pouls/i.test(q) && /température/i.test(q))).toBe(true);
    expect(qs.some((q) => /conduit|conductivité/i.test(q))).toBe(true);
  });
});
