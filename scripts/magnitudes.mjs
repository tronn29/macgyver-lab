/*
 * Détection des ordres de grandeur dans un texte : valeur + unité (57 bar, -78,5 °C, 10 m),
 * valeur de symbole (μ = 0,3), facteur (×6,6), puissance de dix (10⁻⁸).
 * Une valeur est « prononcée » si elle est suivie d'une parenthèse qui contient des lettres.
 * Règle (CONTENU.md) : pas de prononciation pour les unités courantes que tout le monde connaît
 * (kg, g, m, cm, mm, km, °C, L, mL, V, A, W, s, min, h, %…) ni pour un facteur « × 12 » ;
 * la prononciation reste obligatoire pour les unités et symboles peu courants (μ, bar, Hz, Ω, µm…)
 * et pour les nombres qui ne se lisent pas naturellement (puissances de dix).
 * Utilisé par le validateur (avertissements), par les tests et par le correcteur de style.
 */
const UNIT = String.raw`(?:°C|°|K|bar|hPa|kPa|Pa|atm|km\/h|m\/s|m²|cm²|mm²|m³|cm³|km|cm|mm|µm|μm|nm|m|kg|mg|g|t|mL|ml|L|kV|mV|V|mA|A|kW|kWh|W|Wh|kJ|J|Hz|kHz|MHz|N|s|min|h|%|Ω·m|Ω|kΩ|MΩ|lux|cal|kcal|ppm|dB)`;
/** Unités que tout le monde sait lire : leur valeur se passe de prononciation. */
export const UNITES_COURANTES = new Set(['°C', '°', 'km/h', 'm/s', 'm²', 'cm²', 'm³', 'cm³', 'km', 'cm', 'mm', 'm', 'kg', 'mg', 'g', 't', 'mL', 'ml', 'cl', 'L', 'V', 'A', 'kW', 'kWh', 'W', 's', 'min', 'h', '%']);
const UNIT_END = new RegExp(String.raw`${UNIT}$`, 'u');
/** Début d'une parenthèse de prononciation : un nombre écrit en lettres (« (vingt degrés Celsius) »). */
export const PARENTHESE_PRONONCIATION =
  /^\s?\((?:environ |moins |plus |fois |un peu plus |près de )?(?:zéro|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille)\b[^)]*\)/iu;

/**
 * Vrai si la valeur se lit naturellement : unité courante seule (pas d'unité composée « W/m² »),
 * ou facteur « × 12 ». Faux pour μ = …, une puissance de dix ou une unité peu courante.
 */
export function uniteCourante(valeur, suite = '') {
  if (/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(valeur.replace(/[m]?[²³]$/, ''))) return false;
  if (/^[μµ]/.test(valeur)) return false;
  if (/^(?:[≈~]\s?)?×/.test(valeur)) return true;
  if (/^\//.test(suite)) return false; // unité composée : W/m², kV/mm, kJ/kg
  const u = valeur.match(UNIT_END);
  return !!u && UNITES_COURANTES.has(u[0]);
}

const RE = new RegExp(
  String.raw`(?:[≈~<>≤≥]\s?)?[−-]?\d[\d  ]*(?:[,.]\d+)?(?:\s?[×x]\s?10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)?(?:\s?(?:à|-|–)\s?[−-]?\d+(?:[,.]\d+)?)?\s?${UNIT}(?![\p{L}\p{N}])` +
    String.raw`|[μµ]\s?=\s?\d+(?:[,.]\d+)?(?:\s?à\s?\d+(?:[,.]\d+)?)?` +
    String.raw`|×\s?\d+(?:[,.]\d+)?` +
    String.raw`|10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+`,
  'gu'
);

/** Retire le balisage (**gras**, [[terme|texte]]) en gardant le texte affiché. */
function displayed(text) {
  return text.replace(/\*\*/g, '').replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g, '$1').replace(/\[\[([a-z0-9-]+)\]\]/g, '$1');
}

export function findMagnitudes(text) {
  if (typeof text !== 'string') return [];
  const shown = displayed(text);
  const out = [];
  for (const m of shown.matchAll(RE)) {
    const end = (m.index ?? 0) + m[0].length;
    const after = shown.slice(end);
    // Prononciation : parenthèse immédiate, ou après la fin d'un intervalle / d'une formule courte
    const prononcee = /^\s?\([^)]*\p{L}[^)]*\)/u.test(after);
    const valeur = m[0].trim();
    const courante = uniteCourante(valeur, after);
    out.push({ valeur, index: m.index ?? 0, prononcee, courante, superflue: courante && PARENTHESE_PRONONCIATION.test(after) });
  }
  // Les valeurs d'un même intervalle (« 0,4 à 0,6 ») ou d'une liste serrée partagent la parenthèse suivante
  for (let i = out.length - 2; i >= 0; i--) {
    const gap = shown.slice(out[i].index + out[i].valeur.length, out[i + 1].index);
    if (!out[i].prononcee && out[i + 1].prononcee && /^\s?(?:à|et|ou|-|,)\s?$/.test(gap)) out[i].prononcee = true;
  }
  return out;
}

/**
 * Retire les parenthèses de prononciation qui suivent une valeur à unité courante
 * (« 20 °C (vingt degrés Celsius) » devient « 20 °C »). Travaille sur le texte balisé.
 */
export function retirerPrononciationsCourantes(text) {
  if (typeof text !== 'string') return text;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end < last) continue;
    const rest = text.slice(end);
    const bold = rest.startsWith('**') ? 2 : 0;
    const p = rest.slice(bold).match(PARENTHESE_PRONONCIATION);
    if (!p || !uniteCourante(m[0].trim(), rest.slice(bold))) continue;
    out += text.slice(last, end + bold);
    last = end + bold + p[0].length;
  }
  return out + text.slice(last);
}

/** Valeur d'une donnée clé (chiffres) ou d'un niveau d'échelle qui se lit sans prononciation. */
export function valeurCourante(valeur) {
  const ms = [...String(valeur).matchAll(RE)];
  if (/[=μµωθ⁻]|\/\(|[A-Za-z]\s?=/.test(valeur)) return false;
  if (!ms.length) return /^[≈~<>\s]*[\d\s ,.àspire]+$/u.test(valeur) || /^[≈~<>\s]*\d[\d\s ,.]*(?:à\s?\d[\d\s ,.]*)?\s?\p{L}+$/u.test(valeur);
  return ms.every((m) => uniteCourante(m[0].trim(), String(valeur).slice((m.index ?? 0) + m[0].length)));
}

/** Champs texte affichés d'une fiche Théorie, avec leur chemin. */
export function ficheTextFields(f) {
  const fields = [];
  const add = (path, v) => typeof v === 'string' && fields.push([path, v]);
  add('sousTitre', f.sousTitre);
  (f.texte ?? []).forEach((v, i) => add(`texte[${i}]`, v));
  (f.principe ?? []).forEach((v, i) => add(`principe[${i}]`, v));
  (f.pourquoi ?? []).forEach((v, i) => add(`pourquoi[${i}]`, v));
  add('enfant', f.enfant);
  add('realite.explication', f.realite?.explication);
  (f.chiffres ?? []).forEach((c, i) => {
    add(`chiffres[${i}].label`, c.label);
    add(`chiffres[${i}].concret`, c.concret);
  });
  if (f.echelle) {
    add('echelle.intro', f.echelle.intro);
    f.echelle.niveaux.forEach((n, i) => add(`echelle.niveaux[${i}].description`, n.description));
  }
  (f.quiz ?? []).forEach((q, i) => {
    add(`quiz[${i}].question`, q.question);
    q.choix.forEach((c, j) => add(`quiz[${i}].choix[${j}]`, c));
    add(`quiz[${i}].explication`, q.explication);
  });
  return fields;
}
