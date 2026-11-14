#!/usr/bin/env node
/*
 * Outil des modèles de contenu (voir MODELES.md).
 *
 *   npm run modele:verifier -- public/content/fr/_modeles/ma-fiche.json
 *       Liste ce qui reste à faire : textes entre crochets non remplacés, champs obligatoires
 *       manquants ou mal écrits, identifiants inconnus ou déjà pris. Ne modifie rien.
 *
 *   npm run modele:ajouter -- public/content/fr/_modeles/ma-fiche.json
 *       Vérifie, puis ajoute le contenu dans les fichiers « *-perso.json » de public/content/fr/
 *       (créés et déclarés dans index.json au besoin), puis lance le validateur complet.
 *       En cas d'erreur, tout est remis comme avant.
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Sections d'un modèle → collection de l'appli, définition du schéma, fichier personnel. */
export const SECTIONS = {
  theorie: { def: 'fiche', fichier: 'theorie-perso.json', nom: 'fiche Théorie' },
  glossaire: { def: 'terme', fichier: 'glossaire-perso.json', nom: 'terme du glossaire' },
  equivalences: { def: 'fonction', fichier: 'equivalences-perso.json', nom: 'fonction' },
  objets: { def: 'objet', fichier: 'objets-perso.json', nom: 'objet' },
  pratique: { def: 'experience', fichier: 'pratique-perso.json', nom: 'expérience' },
  missions: { def: 'mission', fichier: 'missions-perso.json', nom: 'mission' },
};
const INFOS = new Set(['modele', 'aide', 'score']);

/** Retire les balises de glossaire [[id]] / [[id|texte]] : ce qui reste entre crochets est un texte à remplacer. */
/** Valeur désignée par un chemin JSON (« /schema/fichier »). */
function valueAt(obj, pointer) {
  return pointer
    .split('/')
    .slice(1)
    .reduce((v, key) => (v == null ? v : v[key.replace(/~1/g, '/').replace(/~0/g, '~')]), obj);
}

export function hasPlaceholder(text) {
  return typeof text === 'string' && /[[\]]/.test(text.replace(/\[\[[^\]]*\]\]/g, ''));
}

function* strings(value, path) {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (let i = 0; i < value.length; i++) yield* strings(value[i], `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* strings(v, `${path}.${k}`);
}

function loadContent(contentDir) {
  const index = JSON.parse(readFileSync(join(contentDir, 'index.json'), 'utf8'));
  const read = (k) => (index[k] ?? []).flatMap((f) => (existsSync(join(contentDir, f)) ? JSON.parse(readFileSync(join(contentDir, f), 'utf8')) : []));
  const ids = {};
  for (const k of ['theorie', 'glossaire', 'equivalences', 'objets', 'pratique', 'missions']) ids[k] = new Set(read(k).map((x) => x.id));
  return { index, ids };
}

const TYPE_FR = { number: 'un nombre écrit sans guillemets', integer: 'un nombre entier écrit sans guillemets', boolean: 'true ou false, écrit sans guillemets', string: 'un texte entre guillemets', array: 'une liste entre crochets [ ]', object: 'un bloc entre accolades { }' };

function ajvMessage(e) {
  const where = e.instancePath || '(racine)';
  switch (e.keyword) {
    case 'required':
      return `champ obligatoire manquant : « ${e.params.missingProperty} » (dans ${where})`;
    case 'additionalProperties':
      return `champ inconnu « ${e.params.additionalProperty} » (dans ${where}) : vérifie l'orthographe ou supprime-le`;
    case 'type':
      return `${where} doit être ${TYPE_FR[e.params.type] ?? e.params.type}`;
    case 'enum':
      return `${where} doit valoir : ${e.params.allowedValues.join(', ')}`;
    case 'minItems':
      return `${where} doit contenir au moins ${e.params.limit} élément(s)`;
    case 'maxItems':
      return `${where} doit contenir au plus ${e.params.limit} élément(s)`;
    case 'minLength':
      return `${where} est trop court (au moins ${e.params.limit} caractères)`;
    case 'maxLength':
      return `${where} est trop long (au plus ${e.params.limit} caractères)`;
    case 'pattern':
      return `${where} : identifiant invalide (minuscules, chiffres et tirets seulement)`;
    case 'minimum':
    case 'maximum':
      return `${where} doit être ${e.keyword === 'minimum' ? '≥' : '≤'} ${e.params.limit}`;
    case 'anyOf':
      return `${where} : il faut soit « texte » (format long), soit « principe » et « pourquoi » (ancien format)`;
    default:
      return `${where} ${e.message}`;
  }
}

/**
 * Vérifie un modèle rempli. Renvoie { erreurs, avertissements, sections }.
 * Aucune écriture.
 */
export function verifyModel(model, { contentDir = join(ROOT, 'public', 'content', 'fr'), schemasDir = join(ROOT, 'public', 'schemas') } = {}) {
  const erreurs = [];
  const avertissements = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) return { erreurs: ['le fichier doit être un modèle (un bloc { … } avec « modele » et ses sections)'], avertissements, sections: {} };

  const sections = Object.fromEntries(Object.entries(model).filter(([k]) => k in SECTIONS));
  for (const k of Object.keys(model)) if (!(k in SECTIONS) && !INFOS.has(k)) erreurs.push(`section inconnue « ${k} »`);
  if (!Object.keys(sections).length) erreurs.push('aucune section à ajouter (theorie, glossaire, equivalences, objets, pratique ou missions)');

  // 1. Textes entre crochets non remplacés
  for (const [k, items] of Object.entries(sections))
    for (const [path, text] of strings(items, k)) if (hasPlaceholder(text)) erreurs.push(`texte à remplacer : ${path} = « ${text.length > 70 ? `${text.slice(0, 70)}…` : text} »`);

  // 2. Format (champs obligatoires, types, valeurs autorisées)
  const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'content.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addSchema(schema, 'content');
  for (const [k, items] of Object.entries(sections)) {
    if (!Array.isArray(items)) {
      erreurs.push(`la section « ${k} » doit être une liste [ … ]`);
      continue;
    }
    const validate = ajv.getSchema(`content#/definitions/${SECTIONS[k].def}`);
    items.forEach((item, i) => {
      if (!validate(item))
        for (const e of validate.errors) {
          // Un texte entre crochets est déjà signalé « texte à remplacer » : pas de second message sur son format
          if (['pattern', 'enum', 'minLength', 'maxLength'].includes(e.keyword) && hasPlaceholder(valueAt(item, e.instancePath))) continue;
          erreurs.push(`${k}[${i}] : ${ajvMessage(e)}`);
        }
    });
  }

  // 3. Identifiants et liens
  const { ids } = loadContent(contentDir);
  const local = Object.fromEntries(Object.keys(SECTIONS).map((k) => [k, new Set((sections[k] ?? []).map((x) => x?.id))]));
  const known = (k, id) => ids[k].has(id) || local[k].has(id);
  for (const [k, items] of Object.entries(sections))
    for (const it of Array.isArray(items) ? items : []) if (it?.id && ids[k].has(it.id)) erreurs.push(`${k} : l'identifiant « ${it.id} » existe déjà, choisis-en un autre`);

  const ref = (where, k, id, quoi) => {
    if (typeof id === 'string' && !hasPlaceholder(id) && !known(k, id)) erreurs.push(`${where} : ${quoi} inconnu(e) « ${id} »`);
  };
  const termes = (where, text) => {
    for (const m of String(text ?? '').matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]/g)) ref(where, 'glossaire', m[1], 'terme du glossaire');
    if ((String(text ?? '').match(/\*\*/g) ?? []).length % 2) erreurs.push(`${where} : gras mal fermé (nombre impair de « ** »)`);
  };
  const svg = (where, f) => {
    if (typeof f === 'string' && !hasPlaceholder(f) && !existsSync(join(schemasDir, f))) erreurs.push(`${where} : schéma introuvable « public/schemas/${f} » (pars de modele-exemple.svg)`);
  };

  (sections.theorie ?? []).forEach((f, i) => {
    const w = `theorie[${i}]`;
    svg(`${w}.schema.fichier`, f?.schema?.fichier);
    (f?.liens?.fiches ?? []).forEach((id) => ref(w, 'theorie', id, 'fiche liée'));
    (f?.liens?.equivalences ?? []).forEach((id) => ref(w, 'equivalences', id, 'équivalence'));
    (f?.liens?.pratique ?? []).forEach((id) => ref(w, 'pratique', id, 'expérience'));
    for (const [p, t] of strings(f, w)) termes(p, t);
    if (Array.isArray(f?.texte)) {
      const last = f.texte[f.texte.length - 1] ?? '';
      if (!/^\*\*\s*À retenir/.test(last.trim())) erreurs.push(`${w}.texte : le dernier paragraphe doit commencer par « **À retenir :** »`);
      if (!f.texte.some((p) => /Dans la série/.test(p) && /Dans la réalité/.test(p))) erreurs.push(`${w}.texte : il manque le paragraphe « Dans la série… Dans la réalité… »`);
      if (!f.texte.some((p) => /Peu de gens savent/i.test(p))) avertissements.push(`${w}.texte : accroche « Peu de gens savent que… » absente (conseillée)`);
      if (f.texte.some((p) => /[—–]/.test(p))) avertissements.push(`${w}.texte : tiret cadratin ou demi-cadratin à remplacer`);
    }
    if (f?.principeSeul && (f?.liens?.pratique ?? []).length) erreurs.push(`${w} : un sujet sensible ne doit proposer aucune expérience`);
  });
  (sections.glossaire ?? []).forEach((t, i) => (t?.fiches ?? []).forEach((id) => ref(`glossaire[${i}]`, 'theorie', id, 'fiche')));
  (sections.equivalences ?? []).forEach((fn, i) => {
    const w = `equivalences[${i}]`;
    (fn?.objets ?? []).forEach((o, j) => ref(`${w}.objets[${j}]`, 'objets', o?.objet, 'objet'));
    (fn?.fiches ?? []).forEach((id) => ref(w, 'theorie', id, 'fiche'));
    termes(`${w}.principe`, fn?.principe);
  });
  (sections.pratique ?? []).forEach((e, i) => {
    const w = `pratique[${i}]`;
    svg(`${w}.schema.fichier`, e?.schema?.fichier);
    (e?.fiches ?? []).forEach((id) => ref(w, 'theorie', id, 'fiche'));
    for (const [p, t] of strings(e, w)) termes(p, t);
    if (e?.securite?.niveau === 'rouge') erreurs.push(`${w} : une expérience ne peut pas être en sécurité rouge`);
  });
  (sections.missions ?? []).forEach((m, i) => {
    const w = `missions[${i}]`;
    const zones = new Set((m?.zones ?? []).map((z) => z?.id));
    const presents = new Set((m?.objets ?? []).map((o) => o?.objet));
    (m?.objets ?? []).forEach((o, j) => {
      ref(`${w}.objets[${j}]`, 'objets', o?.objet, 'objet');
      if (o?.zone && !hasPlaceholder(o.zone) && !zones.has(o.zone)) erreurs.push(`${w}.objets[${j}] : zone non déclarée « ${o.zone} »`);
    });
    const doitEtrePresent = (id, quoi) => {
      if (typeof id === 'string' && !hasPlaceholder(id) && !presents.has(id)) erreurs.push(`${w} : ${quoi} « ${id} » absent de la liste des objets de la pièce`);
    };
    const leurres = new Set(m?.leurres ?? []);
    leurres.forEach((id) => doitEtrePresent(id, 'leurre'));
    if (m?.objetCle) doitEtrePresent(m.objetCle, 'objet clé');
    (m?.pieceManquante?.remplacements ?? []).forEach((id) => doitEtrePresent(id, 'remplacement'));
    (m?.solutions ?? []).forEach((s, j) => {
      [...(s?.objets ?? []), ...(s?.optionnels ?? [])].forEach((id) => {
        doitEtrePresent(id, `objet de la solution ${j + 1}`);
        if (leurres.has(id)) erreurs.push(`${w}.solutions[${j}] : « ${id} » est à la fois un leurre et un objet utile`);
      });
      (s?.principes ?? []).forEach((id) => ref(`${w}.solutions[${j}]`, 'theorie', id, 'fiche'));
    });
    (m?.fiches ?? []).forEach((id) => ref(w, 'theorie', id, 'fiche'));
    (m?.equivalences ?? []).forEach((id) => ref(w, 'equivalences', id, 'équivalence'));
    if (m?.difficulte === 'difficile' && (!m.objetCle || !m.pieceManquante)) erreurs.push(`${w} : une mission difficile doit avoir « objetCle » et « pieceManquante »`);
  });

  return { erreurs: [...new Set(erreurs)], avertissements, sections };
}

/** Ajoute le contenu vérifié dans les fichiers *-perso.json et les déclare dans index.json. */
export function installModel(sections, contentDir) {
  const indexPath = join(contentDir, 'index.json');
  const touched = [indexPath];
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  for (const [k, items] of Object.entries(sections)) {
    if (!items.length) continue;
    const file = SECTIONS[k].fichier;
    const path = join(contentDir, file);
    touched.push(path);
    const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
    writeFileSync(path, `${JSON.stringify([...current, ...items], null, 2)}\n`);
    index[k] = index[k] ?? [];
    if (!index[k].includes(file)) index[k].push(file);
  }
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  return touched;
}

/* ---------- Ligne de commande ---------- */
function main() {
  const [cmd, fichier] = process.argv.slice(2);
  if (!['verifier', 'ajouter'].includes(cmd) || !fichier) {
    console.log('Usage : npm run modele:verifier -- <fichier>   ou   npm run modele:ajouter -- <fichier>');
    process.exit(2);
  }
  const path = resolve(fichier);
  let model;
  try {
    model = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`✗ Impossible de lire ${fichier} : ${e.message}`);
    console.error('  Astuce : une virgule en trop ou un guillemet manquant suffit à casser un fichier JSON.');
    process.exit(1);
  }
  const contentDir = join(ROOT, 'public', 'content', 'fr');
  const { erreurs, avertissements, sections } = verifyModel(model, { contentDir });
  console.log(`\nModèle « ${model.modele ?? '?'} » : ${fichier}\n`);
  avertissements.forEach((a) => console.log(`! ${a}`));
  if (erreurs.length) {
    erreurs.forEach((e) => console.error(`✗ ${e}`));
    console.error(`\n${erreurs.length} point(s) à corriger avant de pouvoir l'ajouter.`);
    process.exit(1);
  }
  console.log('✓ Tous les champs obligatoires sont remplis, aucun texte entre crochets ne reste.');
  if (cmd === 'verifier') {
    console.log('  Prochaine étape : npm run modele:ajouter -- ' + fichier);
    return;
  }
  // Ajout avec retour en arrière si le validateur complet échoue
  const candidates = ['index.json', ...Object.values(SECTIONS).map((s) => s.fichier)].map((f) => join(contentDir, f));
  const backups = candidates.map((p) => ({ p, existed: existsSync(p) }));
  backups.forEach((b) => b.existed && copyFileSync(b.p, `${b.p}.bak`));
  const restore = () =>
    backups.forEach((b) => {
      if (b.existed) {
        copyFileSync(`${b.p}.bak`, b.p);
        rmSync(`${b.p}.bak`);
      } else if (existsSync(b.p)) rmSync(b.p);
    });
  try {
    const touched = installModel(sections, contentDir);
    const v = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-content.mjs')], { encoding: 'utf8' });
    if (v.status !== 0) {
      restore();
      console.error(v.stdout + v.stderr);
      console.error('✗ Le validateur a refusé le contenu : rien n\'a été modifié.');
      process.exit(1);
    }
    backups.forEach((b) => b.existed && rmSync(`${b.p}.bak`));
    console.log(`✓ Ajouté dans : ${touched.map((p) => p.replace(`${ROOT}/`, '')).join(', ')}`);
    console.log('  Relance l\'appli (npm run dev) : ta fiche apparaît dans la liste. Le modèle rempli peut être supprimé ou gardé.');
  } catch (e) {
    restore();
    console.error(`✗ Erreur pendant l'ajout, rien n'a été modifié : ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
