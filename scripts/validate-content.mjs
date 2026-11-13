#!/usr/bin/env node
/*
 * Validateur du contenu MacGyver Lab.
 *   npm run validate
 *   node scripts/validate-content.mjs [langue] [--dir dossier-de-contenu]
 * Vérifie : format (schema/content.schema.json), identifiants en double, liens cassés,
 * termes du glossaire, schémas SVG (présence, éléments et classes autorisés),
 * règles des missions et règle de sécurité des sujets sensibles.
 * Code de sortie 1 en cas d'erreur (bloque la construction).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const LANG = args.find((a, i) => !a.startsWith('--') && i !== dirIdx + 1) ?? 'fr';
const CONTENT = dirIdx >= 0 ? args[dirIdx + 1] : join(ROOT, 'public', 'content', LANG);
const SCHEMAS = join(ROOT, 'public', 'schemas');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`✗ ${where} : ${msg}`);
const warn = (where, msg) => warnings.push(`! ${where} : ${msg}`);

function readJSON(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(file.replace(ROOT + '/', ''), `JSON invalide (${e.message})`);
    return null;
  }
}

/* ---------- 1. Format ---------- */
const schema = readJSON(join(ROOT, 'schema', 'content.schema.json'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema, 'content');
const validator = (def) => ajv.getSchema(`content#/definitions/${def}`);

const index = readJSON(join(CONTENT, 'index.json'));
if (!index) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (!validator('index')(index)) err('index.json', ajv.errorsText(validator('index').errors));

const COLLECTIONS = {
  categories: 'categorie',
  theorie: 'fiche',
  objets: 'objet',
  equivalences: 'fonction',
  pratique: 'experience',
  missions: 'mission',
  glossaire: 'terme',
  parcours: 'parcours',
};

const data = {};
for (const [col, def] of Object.entries(COLLECTIONS)) {
  data[col] = [];
  const validate = validator(def);
  for (const file of index[col] ?? []) {
    const path = join(CONTENT, file);
    if (!existsSync(path)) {
      err('index.json', `fichier introuvable : ${file}`);
      continue;
    }
    const arr = readJSON(path);
    if (!arr) continue;
    if (!Array.isArray(arr)) {
      err(file, 'le fichier doit contenir un tableau');
      continue;
    }
    arr.forEach((item, i) => {
      if (!validate(item)) {
        for (const e of validate.errors) err(`${file} [${item?.id ?? i}]`, `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}${e.params?.additionalProperty ? ` : « ${e.params.additionalProperty} »` : ''}`);
      }
      data[col].push({ ...item, __file: file });
    });
  }
}

/* ---------- 2. Identifiants uniques ---------- */
const ids = {};
for (const col of Object.keys(COLLECTIONS)) {
  ids[col] = new Set();
  for (const it of data[col]) {
    if (ids[col].has(it.id)) err(`${it.__file} [${it.id}]`, `identifiant en double dans « ${col} »`);
    ids[col].add(it.id);
  }
}

const ref = (where, col, id, label) => {
  if (!ids[col].has(id)) err(where, `${label} inconnu(e) : « ${id} »`);
};

/* ---------- 3. Icônes ---------- */
const iconsSrc = readFileSync(join(ROOT, 'src', 'ui', 'icons.ts'), 'utf8');
const iconNames = new Set([...iconsSrc.matchAll(/^\s+'?([a-z-]+)'?: '</gm)].map((m) => m[1]));
for (const m of iconsSrc.matchAll(/^\s+([a-z]+): '([a-z-]+)',$/gm)) iconNames.add(m[1]);
const checkIcon = (where, name) => {
  if (name && !iconNames.has(name)) warn(where, `icône inconnue « ${name} » (remplacée par « other »)`);
};

/* ---------- 4. Glossaire dans les textes ---------- */
const TERM_RE = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
function checkRich(where, text) {
  if (typeof text !== 'string') return;
  for (const m of text.matchAll(TERM_RE)) {
    if (!ids.glossaire.has(m[1])) err(where, `terme de glossaire inconnu : [[${m[1]}]]`);
    if (m[2] !== undefined && !m[2].trim()) err(where, `texte affiché vide pour [[${m[1]}]]`);
  }
  if (/\[\[[^\]]*$/.test(text) || /\[[^[]*\]\]/.test(text.replace(TERM_RE, ''))) err(where, 'balise de glossaire mal fermée');
  if ((text.match(/\*\*/g) ?? []).length % 2) err(where, 'gras mal fermé : nombre impair de « ** »');
}

/* ---------- 5. Schémas SVG ---------- */
const css = readFileSync(join(ROOT, 'src', 'styles', 'schemas.css'), 'utf8');
const allowedClasses = new Set([...css.matchAll(/\.schema \.(s-[a-z0-9-]+)/g)].map((m) => m[1]));
const allowedElements = new Set(['svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'title', 'desc']);
const allowedMarkers = new Set(['mg-arrow', 'mg-arrow-hot', 'mg-arrow-cold', 'mg-arrow-accent', 'mg-dot', 'mg-tick']);
const usedSvgs = new Set();

function checkSvg(where, file) {
  usedSvgs.add(file);
  const path = join(SCHEMAS, file);
  if (!existsSync(path)) return err(where, `schéma introuvable : schemas/${file}`);
  const svg = readFileSync(path, 'utf8');
  if (!/viewBox="0 0 360 240"/.test(svg)) err(`schemas/${file}`, 'viewBox attendu : "0 0 360 240"');
  if (/<svg[^>]*\s(width|height)=/.test(svg)) warn(`schemas/${file}`, 'retire width/height de la balise <svg>');
  for (const m of svg.matchAll(/<([a-zA-Z][\w:-]*)/g)) if (!allowedElements.has(m[1])) err(`schemas/${file}`, `élément interdit <${m[1]}>`);
  if (/\sstyle=|\sfill=|\sstroke=|\son[a-z]+=|href=/i.test(svg)) err(`schemas/${file}`, 'attribut interdit (style, fill, stroke, on*, href) : utilise les classes');
  if (/<script|javascript:/i.test(svg)) err(`schemas/${file}`, 'script interdit');
  for (const m of svg.matchAll(/class="([^"]+)"/g))
    for (const c of m[1].split(/\s+/)) if (c && !allowedClasses.has(c)) err(`schemas/${file}`, `classe inconnue « ${c} »`);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) if (!allowedMarkers.has(m[1])) err(`schemas/${file}`, `référence inconnue url(#${m[1]})`);
  // Équilibre simple des balises (le navigateur rejette un XML mal formé)
  const open = (svg.match(/<(g|text|svg)(\s[^>]*)?>/g) ?? []).filter((t) => !t.endsWith('/>')).length;
  const close = (svg.match(/<\/(g|text|svg)>/g) ?? []).length;
  if (open !== close) err(`schemas/${file}`, `balises <g>/<text>/<svg> déséquilibrées (${open} ouvertes, ${close} fermées)`);
}

/* ---------- 5 bis. Format long des fiches (guide de style, CONTENU.md) ---------- */
function checkLongFormat(where, texte) {
  const last = texte[texte.length - 1] ?? '';
  if (!/^\*\*\s*À retenir/.test(last.trim())) err(where, 'le dernier paragraphe doit commencer par « **À retenir :** »');
  if (!texte.some((p) => /Dans la série/.test(p) && /Dans la réalité/.test(p)))
    err(where, 'il manque le paragraphe « Dans la série… Dans la réalité… »');
  if (!texte.some((p) => /Peu de gens savent/i.test(p))) warn(where, 'accroche « Peu de gens savent que… » absente');
  texte.forEach((p, i) => {
    if (/[—–]/.test(p)) warn(where, `paragraphe ${i + 1} : tiret cadratin ou demi-cadratin (le guide de style les exclut)`);
    if (/^\s*[-*•]\s/m.test(p.replace(/\*\*/g, ''))) warn(where, `paragraphe ${i + 1} : liste à puces dans le texte (préférer un texte qui coule)`);
  });
}

/* ---------- 6. Contrôles par collection ---------- */
for (const c of data.categories) checkIcon(`categories [${c.id}]`, c.icone);

const sensibles = new Set(data.theorie.filter((f) => f.principeSeul).map((f) => f.id));

for (const f of data.theorie) {
  const w = `${f.__file} [${f.id}]`;
  for (const c of f.categories ?? []) ref(w, 'categories', c, 'catégorie');
  checkSvg(w, f.schema?.fichier ?? '');
  for (const id of f.liens?.fiches ?? []) {
    ref(w, 'theorie', id, 'fiche liée');
    if (id === f.id) err(w, 'une fiche ne peut pas se lier à elle-même');
  }
  for (const id of f.liens?.equivalences ?? []) ref(w, 'equivalences', id, 'équivalence');
  for (const id of f.liens?.pratique ?? []) ref(w, 'pratique', id, 'expérience');
  [...(f.texte ?? []), ...(f.pourquoi ?? []), f.enfant, f.realite?.explication, ...(f.principe ?? [])].forEach((t) => checkRich(w, t));
  if (f.texte) checkLongFormat(w, f.texte);
  (f.quiz ?? []).forEach((q, i) => {
    if (q.reponse >= q.choix.length) err(w, `quiz ${i + 1} : « reponse » hors des choix`);
    if (new Set(q.choix).size !== q.choix.length) err(w, `quiz ${i + 1} : choix en double`);
  });
  if (f.principeSeul) {
    if (f.securite?.niveau !== 'rouge') err(w, 'un sujet sensible (principeSeul) doit avoir une sécurité rouge');
    if ((f.liens?.pratique ?? []).length) err(w, 'un sujet sensible (principeSeul) ne doit proposer aucune expérience');
  }
}

for (const o of data.objets) checkIcon(`objets [${o.id}]`, o.icone);

for (const fn of data.equivalences) {
  const w = `${fn.__file} [${fn.id}]`;
  checkIcon(w, fn.icone);
  ref(w, 'categories', fn.categorie, 'catégorie');
  for (const id of fn.fiches ?? []) ref(w, 'theorie', id, 'fiche');
  const seen = new Set();
  for (const it of fn.objets ?? []) {
    ref(w, 'objets', it.objet, 'objet');
    if (seen.has(it.objet)) err(w, `objet en double : ${it.objet}`);
    seen.add(it.objet);
  }
  checkRich(w, fn.principe);
}

for (const e of data.pratique) {
  const w = `${e.__file} [${e.id}]`;
  for (const c of e.categories ?? []) ref(w, 'categories', c, 'catégorie');
  checkSvg(w, e.schema?.fichier ?? '');
  for (const id of e.fiches ?? []) {
    ref(w, 'theorie', id, 'fiche');
    if (sensibles.has(id)) err(w, `une expérience ne peut pas être liée au sujet sensible « ${id} »`);
  }
  for (const m of e.materiel ?? []) if (m.objet) ref(w, 'objets', m.objet, 'objet');
  if (e.securite?.niveau === 'rouge') err(w, 'aucune expérience Pratique ne peut être en sécurité rouge');
  [...(e.explication ?? []), e.pourAllerPlusLoin, e.resultat].forEach((t) => checkRich(w, t));
}

const NB_SOLUTIONS = { facile: [1, 1], moyen: [2, 4], difficile: [1, 4] };
for (const m of data.missions) {
  const w = `${m.__file} [${m.id}]`;
  for (const c of m.categories ?? []) ref(w, 'categories', c, 'catégorie');
  const zones = new Set((m.zones ?? []).map((z) => z.id));
  const present = new Set();
  for (const o of m.objets ?? []) {
    ref(w, 'objets', o.objet, 'objet');
    if (!zones.has(o.zone)) err(w, `zone inconnue « ${o.zone} » pour ${o.objet}`);
    if (present.has(o.objet)) err(w, `objet présent deux fois : ${o.objet}`);
    present.add(o.objet);
  }
  const mustBePresent = (id, label) => {
    if (!present.has(id)) err(w, `${label} « ${id} » absent de la pièce`);
  };
  const leurres = new Set(m.leurres ?? []);
  leurres.forEach((id) => mustBePresent(id, 'leurre'));
  const [min, max] = NB_SOLUTIONS[m.difficulte] ?? [1, 9];
  if ((m.solutions ?? []).length < min || (m.solutions ?? []).length > max) warn(w, `${m.solutions.length} solution(s) pour une mission ${m.difficulte} (attendu : ${min} à ${max})`);
  if (m.difficulte !== 'facile' && !leurres.size) err(w, 'une mission moyenne ou difficile doit contenir des leurres');
  if (m.difficulte === 'difficile') {
    if (!m.objetCle) err(w, 'une mission difficile doit avoir un objet clé (objetCle)');
    if (!m.pieceManquante) err(w, 'une mission difficile doit avoir une pièce manquante (pieceManquante)');
  }
  if (m.objetCle) mustBePresent(m.objetCle, 'objet clé');
  for (const id of m.pieceManquante?.remplacements ?? []) mustBePresent(id, 'remplacement');
  const solIds = new Set();
  for (const s of m.solutions ?? []) {
    const ws = `${w} solution ${s.id}`;
    if (solIds.has(s.id)) err(ws, 'identifiant de solution en double');
    solIds.add(s.id);
    for (const id of [...(s.objets ?? []), ...(s.optionnels ?? [])]) {
      mustBePresent(id, 'objet de solution');
      if (leurres.has(id)) err(ws, `l'objet « ${id} » est à la fois un leurre et utile`);
    }
    for (const id of s.principes ?? []) ref(ws, 'theorie', id, 'principe (fiche)');
    for (const g of s.motsCles ?? []) if (!g.some((k) => k.trim())) err(ws, 'groupe de mots-clés vide');
  }
  if (m.objetCle && !(m.solutions ?? []).some((s) => [...s.objets, ...(s.optionnels ?? [])].includes(m.objetCle)))
    warn(w, "l'objet clé n'apparaît dans aucune solution");
  for (const id of m.fiches ?? []) ref(w, 'theorie', id, 'fiche à réviser');
  for (const id of m.equivalences ?? []) ref(w, 'equivalences', id, 'équivalence à réviser');
}

for (const t of data.glossaire) {
  const w = `${t.__file} [${t.id}]`;
  for (const id of t.fiches ?? []) ref(w, 'theorie', id, 'fiche');
}

const STEP_COL = { fiche: 'theorie', equivalence: 'equivalences', pratique: 'pratique', mission: 'missions' };
for (const p of data.parcours) {
  const w = `${p.__file} [${p.id}]`;
  checkIcon(w, p.icone);
  for (const e of p.etapes ?? []) ref(w, STEP_COL[e.type], e.id, `étape ${e.type}`);
}

/* ---------- 6 bis. Règle de contenu (non négociable) ----------
 * Bloque les termes de fabrication d'armes, d'explosifs ou de dispositifs dangereux, partout.
 * Pour un sujet sensible (principeSeul), bloque aussi toute quantité de matière et tout vocabulaire de montage. */
const INTERDITS = [
  /d[ée]tonateur/i, /poudre noire/i, /thermite/i, /napalm/i, /molotov/i, /nitrate d'ammonium/i, /chlorate de (potassium|sodium)/i,
  /peroxyde d'ac[ée]tone/i, /\btatp\b/i, /m[èe]che lente/i, /explosif artisanal/i, /engin explosif/i, /arme artisanale/i,
  /fabriquer (une|un|des) (arme|bombe|explosif|grenade|fumig[èe]ne)/i, /fabrication (d'une|d'un|de) (arme|bombe|explosif|grenade)/i,
  /taser artisanal/i, /canon (de|à) (pomme de terre|patate)/i, /pistolet [àa] (clous|bille) improvis/i,
];
const QUANTITE = /\b\d+(?:[.,]\d+)?\s?(?:mg|g|kg|grammes?|kilos?|ml|mL|cl|L|litres?|cuill[èe]res?)\b/;
const MONTAGE = /\b(sch[ée]ma de montage|liste des composants|branche[rz]? (le|la|les) (fil|borne)|r[ée]sistance de \d|condensateur de \d|enroule[rz]? \d+ (tours|spires))/i;

function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (let i = 0; i < value.length; i++) yield* strings(value[i], `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (k !== '__file') yield* strings(v, path ? `${path}.${k}` : k);
}
for (const col of Object.keys(COLLECTIONS))
  for (const it of data[col])
    for (const [path, text] of strings(it))
      for (const re of INTERDITS) if (re.test(text)) err(`${it.__file} [${it.id}] ${path}`, `contenu interdit (règle de contenu) : « ${text.match(re)[0]} »`);
for (const f of data.theorie.filter((x) => x.principeSeul))
  for (const [path, text] of strings({ texte: f.texte, principe: f.principe, pourquoi: f.pourquoi, enfant: f.enfant }))
    if (QUANTITE.test(text) || MONTAGE.test(text))
      err(`${f.__file} [${f.id}] ${path}`, `sujet sensible : quantité ou montage interdit (« ${(text.match(QUANTITE) ?? text.match(MONTAGE))[0]} »)`);

/* ---------- 7. SVG orphelins ---------- */
for (const f of readdirSync(SCHEMAS)) if (f.endsWith('.svg') && !usedSvgs.has(f)) warn(`schemas/${f}`, "schéma non utilisé par aucune fiche ni expérience");

/* ---------- Résumé ---------- */
const counts = Object.entries(data).map(([k, v]) => `${k} : ${v.length}`).join(' · ');
console.log(`\nMacGyver Lab — validation du contenu (${LANG})\n${counts}\n`);
if (warnings.length) console.log(warnings.join('\n') + '\n');
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} erreur(s). Corrige-les avant de publier.`);
  process.exit(1);
}
console.log(`✓ Contenu valide${warnings.length ? ` (${warnings.length} avertissement(s))` : ''}.`);
