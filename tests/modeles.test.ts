import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error module JavaScript de l'outil des modèles
import { hasPlaceholder, installModel, verifyModel } from '../scripts/modele.mjs';

const ROOT = join(__dirname, '..');
const DIR = join(ROOT, 'public', 'content', 'fr', '_modeles');
const lire = (f: string) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const contenu = (f: string) => JSON.parse(readFileSync(join(ROOT, 'public', 'content', 'fr', f), 'utf8'));

describe('modèles vierges', () => {
  it('les 4 modèles existent, avec leurs sections', () => {
    expect(readdirSync(DIR).sort()).toEqual(['modele-equivalence.json', 'modele-experience.json', 'modele-fiche-theorie.json', 'modele-mission.json']);
    expect(Object.keys(lire('modele-fiche-theorie.json'))).toEqual(expect.arrayContaining(['theorie', 'glossaire']));
    expect(Object.keys(lire('modele-equivalence.json'))).toEqual(expect.arrayContaining(['equivalences', 'objets']));
    expect(Object.keys(lire('modele-experience.json'))).toEqual(expect.arrayContaining(['pratique']));
    expect(Object.keys(lire('modele-mission.json'))).toEqual(expect.arrayContaining(['missions', 'objets', 'score']));
  });

  it('la fiche modèle couvre tous les champs du nouveau format', () => {
    const f = lire('modele-fiche-theorie.json').theorie[0];
    for (const k of ['id', 'titre', 'categories', 'schema', 'texte', 'enfant', 'realite', 'securite', 'liens', 'quiz', 'motsCles']) expect(f).toHaveProperty(k);
    expect(f.realite).toHaveProperty('nuance');
    expect(f.texte.at(-1)).toMatch(/^\*\*À retenir/);
    expect(f.texte.some((p: string) => p.includes('Dans la série') && p.includes('Dans la réalité'))).toBe(true);
  });

  it('chaque modèle vierge est refusé tant que les crochets restent', () => {
    for (const f of readdirSync(DIR)) {
      const { erreurs } = verifyModel(lire(f));
      expect(erreurs.length, f).toBeGreaterThan(0);
      expect(erreurs.some((e: string) => e.startsWith('texte à remplacer')), f).toBe(true);
    }
  });

  it('distingue un texte à remplacer d’un terme du glossaire', () => {
    expect(hasPlaceholder('[Titre court]')).toBe(true);
    expect(hasPlaceholder('le gaz [[detente|se détend]]')).toBe(false);
    expect(hasPlaceholder('[ex. : [[detente|se détend]]]')).toBe(true);
  });
});

/** Un modèle rempli correctement, construit à partir d'une vraie fiche. */
function ficheRemplie() {
  const vraie = contenu('theorie-1.json').find((x: { id: string }) => x.id === 'empreintes-poussiere');
  return {
    modele: 'fiche-theorie',
    theorie: [{ ...vraie, id: 'test-ma-fiche', titre: 'Ma fiche de test', texte: [...vraie.texte.slice(0, -1), vraie.texte.at(-1) + ' Voir aussi la [[test-mon-terme|notion]].'] }],
    glossaire: [{ id: 'test-mon-terme', terme: 'Mon terme', definition: 'Une définition de test, claire et courte.', fiches: ['test-ma-fiche'] }],
  };
}

describe('vérification d’un modèle rempli', () => {
  it('accepte un modèle complet (fiche + nouveau terme du glossaire)', () => {
    const { erreurs } = verifyModel(ficheRemplie());
    expect(erreurs).toEqual([]);
  });

  it('signale un champ obligatoire manquant, en français', () => {
    const m = ficheRemplie();
    delete (m.theorie[0] as Record<string, unknown>).titre;
    expect(verifyModel(m).erreurs).toContain('theorie[0] : champ obligatoire manquant : « titre » (dans (racine))');
  });

  it('signale un identifiant déjà pris, un lien inconnu et un « À retenir » manquant', () => {
    const m = ficheRemplie();
    m.theorie[0].id = 'levier';
    m.theorie[0].liens = { fiches: ['fiche-inexistante'] };
    m.theorie[0].texte = m.theorie[0].texte.slice(0, -1);
    const { erreurs } = verifyModel(m);
    expect(erreurs.some((e: string) => /existe déjà/.test(e))).toBe(true);
    expect(erreurs.some((e: string) => /fiche liée inconnu\(e\) « fiche-inexistante »/.test(e))).toBe(true);
    expect(erreurs.some((e: string) => /À retenir/.test(e))).toBe(true);
  });

  it('signale un nombre écrit entre guillemets', () => {
    const m = ficheRemplie();
    (m.theorie[0].quiz[0] as Record<string, unknown>).reponse = '0';
    expect(verifyModel(m).erreurs.some((e: string) => /reponse doit être un nombre entier écrit sans guillemets/.test(e))).toBe(true);
  });
});

describe('ajout d’un modèle rempli', () => {
  it('écrit dans les fichiers *-perso.json et les déclare dans index.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mgl-modele-'));
    cpSync(join(ROOT, 'public', 'content', 'fr'), dir, { recursive: true });
    const { sections } = verifyModel(ficheRemplie(), { contentDir: dir });
    installModel(sections, dir);
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    expect(index.theorie).toContain('theorie-perso.json');
    expect(index.glossaire).toContain('glossaire-perso.json');
    expect(JSON.parse(readFileSync(join(dir, 'theorie-perso.json'), 'utf8'))[0].id).toBe('test-ma-fiche');
    // Une fois ajoutée, la même fiche serait refusée (identifiant déjà pris)
    expect(verifyModel(ficheRemplie(), { contentDir: dir }).erreurs.some((e: string) => /existe déjà/.test(e))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
    expect(existsSync(join(ROOT, 'public', 'content', 'fr', 'theorie-perso.json'))).toBe(false);
  });
});
