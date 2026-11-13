/*
 * Détection des ordres de grandeur dans un texte : valeur + unité (57 bar, -78,5 °C, 10 m),
 * valeur de symbole (μ = 0,3), facteur (×6,6), puissance de dix (10⁻⁸).
 * Une valeur est « prononcée » si elle est suivie d'une parenthèse qui contient des lettres.
 * Utilisé par le validateur (avertissements) et par les tests.
 */
const UNIT = String.raw`(?:°C|°|K|bar|hPa|kPa|Pa|atm|km\/h|m\/s|m²|cm²|mm²|m³|cm³|km|cm|mm|µm|μm|nm|m|kg|mg|g|t|mL|ml|L|kV|mV|V|mA|A|kW|kWh|W|Wh|kJ|J|Hz|kHz|MHz|N|s|min|h|%|Ω·m|Ω|kΩ|MΩ|lux|cal|kcal|ppm|dB)`;
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
    out.push({ valeur: m[0].trim(), index: m.index ?? 0, prononcee });
  }
  // Les valeurs d'un même intervalle (« 0,4 à 0,6 ») ou d'une liste serrée partagent la parenthèse suivante
  for (let i = out.length - 2; i >= 0; i--) {
    const gap = shown.slice(out[i].index + out[i].valeur.length, out[i + 1].index);
    if (!out[i].prononcee && out[i + 1].prononcee && /^\s?(?:à|et|ou|-|,)\s?$/.test(gap)) out[i].prononcee = true;
  }
  return out;
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
  add('securite.note', f.securite?.note);
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
