// @vitest-environment happy-dom
/* Fiches et fonctions écrites dans l'appli : stockage, superposition au contenu, conversions, export, éditeur. */
import { beforeEach, describe, expect, it } from 'vitest';
import { setContent } from '../src/core/content';
import {
  APERCU_FICHE,
  applyPerso,
  assembleTexte,
  deleteAllPerso,
  deletePerso,
  exportFiche,
  exportFonction,
  fromTexte,
  loadPerso,
  newId,
  paragrapheVide,
  persoFiches,
  resolveObjet,
  saveFiche,
  saveFonction,
  termeInterdit,
  toTexte,
  toutesFiches,
} from '../src/core/perso';
import { setRead, toggleFavori } from '../src/core/progress';
import { getProgress, PERSO_KEY, resetProgress } from '../src/core/store';
import { buildIndex, search } from '../src/core/search';
import type { Fiche } from '../src/core/types';
import { isLongFormat, isRetenir, isSerieRealite } from '../src/core/fiche';
import { loadAll } from './helpers';
// @ts-expect-error module JavaScript de l'outil des modèles
import { verifyModel } from '../scripts/modele.mjs';

const c = loadAll();
setContent(c);
const officielles = c.fiches.map((f) => JSON.stringify(f));

const ficheTest = (id = 'perso-test'): Fiche => ({
  id,
  titre: 'Pourquoi la glace flotte',
  sousTitre: "L'eau solide prend plus de place",
  categories: ['thermique'],
  schema: { fichier: 'perso-defaut.svg', alt: 'Image par défaut' },
  texte: assembleTexte([
    { ...paragrapheVide('accroche'), phrase: 'Peu de gens savent que la glace est moins dense que l’eau.', texte: 'En gelant, l’eau forme des cristaux qui laissent des vides.' },
    { ...paragrapheVide('serie'), serie: 'le héros fait éclater un tuyau.', realite: 'il faut des heures de froid intense.' },
    { ...paragrapheVide('retenir'), texte: 'La glace flotte parce qu’elle est moins dense.' },
  ]),
  enfant: 'Comme des enfants qui se tiennent par la main en cercle : ils prennent plus de place.',
  realite: { verdict: 'partiel', explication: 'Dans la série, le tuyau éclate. Dans la réalité, il faut du temps.' },
  securite: { niveau: 'vert' },
  liens: {},
  quiz: [{ question: 'De combien le volume augmente-t-il ?', choix: ['Environ 9 %', 'Environ 50 %'], reponse: 0, explication: 'Environ un dixième.' }],
  motsCles: [],
});

beforeEach(() => {
  localStorage.clear();
  resetProgress();
  applyPerso(c);
});

describe('paragraphes : éditeur → texte enrichi → éditeur', () => {
  it('produit le gras attendu pour chaque type', () => {
    expect(toTexte({ ...paragrapheVide('accroche'), phrase: 'Accroche.', texte: 'Suite.' })).toBe('**Accroche.** Suite.');
    expect(toTexte({ ...paragrapheVide('simple'), texte: '  Texte   simple. ' })).toBe('Texte simple.');
    expect(toTexte({ ...paragrapheVide('serie'), serie: 'il fait X.', realite: 'ça marche à moitié.' })).toBe('**Dans la série**, il fait X. **Dans la réalité**, ça marche à moitié.');
    expect(toTexte({ ...paragrapheVide('retenir'), texte: 'Le principe.' })).toBe('**À retenir :** Le principe.');
    // Les astérisques tapés à la main ne cassent pas le gras
    expect(toTexte({ ...paragrapheVide('simple'), texte: 'du **gras** sauvage' })).toBe('du gras sauvage');
  });

  it('est reconnu par l’affichage des fiches (série, À retenir, format long)', () => {
    const f = ficheTest();
    expect(isLongFormat(f)).toBe(true);
    expect(f.texte!.some(isSerieRealite)).toBe(true);
    expect(isRetenir(f.texte!.at(-1)!)).toBe(true);
  });

  it('relit le texte enregistré à l’identique', () => {
    for (const p of ficheTest().texte!) expect(toTexte(fromTexte(p))).toBe(p);
  });

  it('place « À retenir » à la fin et retire les paragraphes vides', () => {
    const t = assembleTexte([{ ...paragrapheVide('retenir'), texte: 'Fin.' }, paragrapheVide('simple'), { ...paragrapheVide('simple'), texte: 'Début.' }]);
    expect(t).toEqual(['Début.', '**À retenir :** Fin.']);
  });
});

describe('stockage et superposition au contenu officiel', () => {
  it('ajoute la fiche perso sans toucher aux fiches officielles', () => {
    saveFiche(c, ficheTest());
    expect(c.fiches).toHaveLength(officielles.length);
    expect(c.fiches.map((f) => JSON.stringify(f))).toEqual(officielles);
    expect(c.byId.fiche.get('perso-test')?.titre).toBe('Pourquoi la glace flotte');
    expect(persoFiches()).toHaveLength(1);
    expect(toutesFiches(c)).toHaveLength(officielles.length + 1);
    // Relu depuis le stockage
    expect(loadPerso().fiches[0].id).toBe('perso-test');
  });

  it('compte dans la lecture, les favoris et la recherche, puis disparaît avec ses traces', () => {
    const f = saveFiche(c, ficheTest());
    setRead(f, true);
    toggleFavori('fiche', f.id);
    expect(getProgress().lus[f.id]).toBeTruthy();
    expect(getProgress().srs[f.id]).toBeTruthy();
    expect(search(buildIndex(c), 'glace flotte')[0].doc.id).toBe(f.id);

    deletePerso(c, 'fiche', f.id);
    expect(c.byId.fiche.has(f.id)).toBe(false);
    expect(getProgress().lus[f.id]).toBeUndefined();
    expect(getProgress().srs[f.id]).toBeUndefined();
    expect(getProgress().favoris[`fiche:${f.id}`]).toBeUndefined();
    expect(c.fiches).toHaveLength(officielles.length);
  });

  it('une fiche sans quiz n’entre pas dans la révision espacée', () => {
    const f = saveFiche(c, { ...ficheTest(), quiz: [] });
    setRead(f, true);
    expect(getProgress().lus[f.id]).toBeTruthy();
    expect(getProgress().srs[f.id]).toBeUndefined();
  });

  it('ne supprime jamais une fiche officielle', () => {
    deletePerso(c, 'fiche', 'siphon');
    expect(c.byId.fiche.has('siphon')).toBe(true);
  });

  it('ignore un stockage abîmé ou des identifiants non perso', () => {
    localStorage.setItem(PERSO_KEY, '{pas du json');
    expect(loadPerso()).toEqual({ version: 1, fiches: [], fonctions: [], objets: [] });
    localStorage.setItem(PERSO_KEY, JSON.stringify({ fiches: [{ ...ficheTest('siphon') }, { ...ficheTest(), texte: [] }] }));
    expect(loadPerso().fiches).toEqual([]);
  });

  it('crée des identifiants uniques préfixés', () => {
    const ids = new Set(['perso-glace']);
    expect(newId('Glace !', ids)).toBe('perso-glace-2');
    expect(newId('Électricité & CO₂', new Set())).toMatch(/^perso-electricite-co/);
  });

  it('fonction perso : objets du catalogue reconnus, objets nouveaux créés, index par objet mis à jour', () => {
    const r1 = resolveObjet(c, 'ruban adhésif', []);
    expect(r1).toEqual({ id: 'ruban-adhesif', nouveau: null });
    const r2 = resolveObjet(c, 'Fil de canne à pêche', []);
    expect(r2.id).toBe('perso-objet-fil-de-canne-a-peche');
    saveFonction(
      c,
      { id: 'perso-ficelle', titre: 'Remplacer une ficelle', icone: 'multitool', categorie: 'mecanique', resume: '', principe: '', fiches: [], objets: [{ objet: r1.id, comment: '', pourquoi: 'Résiste à la traction.', efficacite: 3 }, { objet: r2.id, comment: '', pourquoi: 'Le nylon est solide.', efficacite: 2 }] },
      [r2.nouveau!]
    );
    expect(c.fonctions).toHaveLength(12);
    expect(c.byId.fonction.get('perso-ficelle')).toBeTruthy();
    expect(c.fonctionsParObjet.get('ruban-adhesif')!.some((f) => f.id === 'perso-ficelle')).toBe(true);
    expect(c.byId.objet.get('perso-objet-fil-de-canne-a-peche')?.nom).toBe('Fil de canne à pêche');
    // Export au format du modèle « equivalence », objet nouveau décrit dans la section objets
    const m = JSON.parse(exportFonction(c, c.byId.fonction.get('perso-ficelle')!));
    expect(m.modele).toBe('equivalence');
    expect(m.objets[0].id).toBe('fil-de-canne-a-peche');
    expect(m.equivalences[0].objets.map((o: { objet: string }) => o.objet)).toEqual(['ruban-adhesif', 'fil-de-canne-a-peche']);
    deleteAllPerso(c);
    expect(c.fonctionsParObjet.get('ruban-adhesif')!.some((f) => f.id === 'perso-ficelle')).toBe(false);
    expect(c.byId.objet.has('perso-objet-fil-de-canne-a-peche')).toBe(false);
  });
});

describe('export au format des modèles', () => {
  it('une fiche exportée n’a que des textes à remplacer, puis passe la vérification du modèle', () => {
    const m = JSON.parse(exportFiche(ficheTest()));
    expect(m.modele).toBe('fiche-theorie');
    expect(m.theorie[0].id).toBe('test');
    const avant = verifyModel(m).erreurs as string[];
    expect(avant.length).toBeGreaterThan(0);
    expect(avant.filter((e) => !e.startsWith('texte à remplacer'))).toEqual([]);

    // Une fois les crochets remplacés (schéma dessiné, mots-clés), le modèle est accepté
    m.theorie[0].id = 'glace-flotte-test';
    m.theorie[0].schema = { fichier: 'modele-exemple.svg', alt: 'Schéma de test assez long pour être valide', legende: 'Légende' };
    m.theorie[0].motsCles = ['glace'];
    // 3 paragraphes écrits : le 4e, ajouté à remplir avant « À retenir », est complété
    expect(m.theorie[0].texte).toHaveLength(4);
    m.theorie[0].texte[2] = 'Un paragraphe de plus, écrit avant de publier.';
    expect(verifyModel(m).erreurs).toEqual([]);
  });
});

describe('règle de contenu (même liste que le validateur)', () => {
  it('repère les termes interdits', () => {
    expect(termeInterdit(['Le principe de la thermite est…'])).toBe('thermite');
    expect(termeInterdit(['La glace flotte.'])).toBeNull();
  });
});

describe('éditeur (formulaire réel)', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const set = (root: HTMLElement, id: string, v: string) => {
    const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
    el.value = v;
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };

  it('refuse un formulaire vide, enregistre une fiche complète, l’aperçu n’écrit rien', async () => {
    const { ficheEditor } = await import('../src/views/editeur');
    const view = ficheEditor({ path: '/archives/creer', params: {}, query: new URLSearchParams() });
    document.body.replaceChildren(view.node);
    const root = view.node;
    const enregistrer = () => (root.querySelector('.editor__actions button[type=submit]') as HTMLButtonElement).click();

    enregistrer();
    await flush();
    const resume = root.querySelector('.error-summary') as HTMLElement;
    expect(resume.hidden).toBe(false);
    expect(resume.querySelectorAll('li')).toHaveLength(3);
    expect(root.querySelector('#f-titre')!.getAttribute('aria-invalid')).toBe('true');
    expect(loadPerso().fiches).toHaveLength(0);

    set(root, 'f-titre', 'Ma fiche de test');
    set(root, 'f-categorie', 'chimie');
    const phrase = root.querySelector<HTMLInputElement>('[id$="-phrase"]')!.id;
    set(root, phrase, 'Peu de gens savent que…');
    set(root, phrase.replace('-phrase', '-texte'), 'la suite du paragraphe.');

    // Aperçu : vrai design, aucune trace dans la progression
    (root.querySelector('.js-apercu') as HTMLButtonElement).click();
    await flush();
    expect(root.querySelector('.editor__preview')!.textContent).toContain('Ma fiche de test');
    expect(c.byId.fiche.has(APERCU_FICHE)).toBe(false);
    expect(Object.keys(getProgress().lus)).toHaveLength(0);
    (root.querySelector('.apercu-bar .btn--ghost') as HTMLButtonElement).click();

    enregistrer();
    await flush();
    const d = loadPerso();
    expect(d.fiches).toHaveLength(1);
    expect(d.fiches[0].texte).toEqual(['**Peu de gens savent que…** la suite du paragraphe.']);
    expect(d.fiches[0].categories).toEqual(['chimie']);
    expect(c.fiches).toHaveLength(officielles.length);
    expect(location.hash).toBe(`#/archives/${d.fiches[0].id}`);
  });
});

describe('schémas dessinés pour les fiches personnelles', () => {
  it('chaque schéma proposé existe et a une description', async () => {
    const { SCHEMAS_PERSO } = await import('../src/core/perso');
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const s of SCHEMAS_PERSO) {
      expect(existsSync(join(__dirname, '..', 'public', 'schemas', s.fichier)), s.fichier).toBe(true);
      expect(s.fichier.startsWith('perso-')).toBe(true);
      expect(s.alt.length).toBeGreaterThan(20);
    }
  });
});
