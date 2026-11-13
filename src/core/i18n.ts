/*
 * Internationalisation : tous les textes d'interface sont dans src/i18n/<langue>.json.
 * Ajouter une langue = ajouter un fichier JSON et l'enregistrer dans LOCALES.
 * Clés en notation pointée : t('home.title'), paramètres {nom} : t('x', { nom: 'A' }).
 * Pluriels : une valeur objet { "one": "...", "other": "..." } + param "n".
 */
import fr from '../i18n/fr.json';

type Dict = { [k: string]: string | string[] | Dict | { one: string; other: string } };

const LOCALES: Record<string, Dict> = { fr: fr as unknown as Dict };
let current = 'fr';

export function setLocale(lang: string): void {
  if (LOCALES[lang]) {
    current = lang;
    document.documentElement.lang = lang;
  }
}

export function locale(): string {
  return current;
}

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, LOCALES[current]);
}

export function has(key: string): boolean {
  return lookup(key) !== undefined;
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  let value = lookup(key);
  if (value && typeof value === 'object' && 'other' in (value as object)) {
    const n = Number(params.n ?? 0);
    const forms = value as { one: string; other: string; zero?: string };
    value = n === 0 && forms.zero ? forms.zero : n <= 1 ? forms.one : forms.other;
  }
  if (typeof value !== 'string') {
    if (import.meta.env?.DEV) console.warn(`[i18n] clé manquante : ${key}`);
    return key;
  }
  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`
  );
}

/** Liste de chaînes (ex. : grades, paragraphes). */
export function tList(key: string): string[] {
  const value = lookup(key);
  return Array.isArray(value) ? value.map(String) : [];
}

/** Formate un nombre selon la langue (espaces fines insécables en français). */
export function fmtNumber(n: number): string {
  return new Intl.NumberFormat(current).format(n);
}

export function fmtDate(d: Date | number, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return new Intl.DateTimeFormat(current, opts).format(d);
}
