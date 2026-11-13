/*
 * Texte enrichi du contenu : [[id]] ou [[id|texte]] devient un terme du glossaire
 * avec infobulle accessible (clic, clavier, Échap ; survol sur ordinateur).
 */
import { content } from '../core/content';
import { h, nextId } from '../core/dom';
import { t } from '../core/i18n';
import { icon } from './icons';

const RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export interface Segment {
  type: 'text' | 'term';
  text: string;
  id?: string;
}

export function parseRich(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: 'text', text: text.slice(last, idx) });
    out.push({ type: 'term', id: m[1], text: m[2] ?? '' });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** Texte brut (sans balisage) pour la recherche, le partage, etc. */
export function plain(text: string): string {
  return parseRich(text)
    .map((s) => {
      if (s.type === 'text') return s.text;
      if (s.text) return s.text;
      const term = safeTerm(s.id ?? '');
      return term ? displayName(term.terme) : s.id ?? '';
    })
    .join('');
}

function safeTerm(id: string) {
  try {
    return content().byId.terme.get(id);
  } catch {
    return undefined;
  }
}

/** « Détente (d'un gaz) » → « détente » pour l'affichage en ligne. */
function displayName(terme: string): string {
  const base = terme.replace(/\s*\(.*\)\s*$/, '');
  return base.charAt(0).toLowerCase() + base.slice(1);
}

export function rich(text: string, tag: 'p' | 'span' | 'li' = 'p', className?: string): HTMLElement {
  const el = h(tag, { class: className });
  for (const seg of parseRich(text)) {
    if (seg.type === 'text') {
      el.append(seg.text);
      continue;
    }
    const term = safeTerm(seg.id ?? '');
    if (!term) {
      el.append(seg.text || seg.id || '');
      continue;
    }
    el.append(termButton(term.id, seg.text || displayName(term.terme)));
  }
  return el;
}

export function termButton(id: string, text: string): HTMLButtonElement {
  return h('button', { type: 'button', class: 'term', 'data-term': id, 'aria-expanded': 'false', 'aria-haspopup': 'dialog' }, text);
}

/* ---- Infobulle unique, partagée ---- */

let tip: HTMLElement | null = null;
let owner: HTMLButtonElement | null = null;
let hoverTimer: number | undefined;

function hideTip(returnFocus = false): void {
  if (!tip || tip.hidden) return;
  tip.hidden = true;
  owner?.setAttribute('aria-expanded', 'false');
  if (returnFocus) owner?.focus();
  owner = null;
}

function showTip(btn: HTMLButtonElement): void {
  const term = safeTerm(btn.dataset.term ?? '');
  if (!term) return;
  if (!tip) {
    tip = h('div', { class: 'tip', role: 'dialog', hidden: true });
    tip.addEventListener('mouseenter', () => window.clearTimeout(hoverTimer));
    tip.addEventListener('mouseleave', () => {
      hoverTimer = window.setTimeout(() => hideTip(), 250);
    });
    document.body.appendChild(tip);
  }
  if (owner && owner !== btn) owner.setAttribute('aria-expanded', 'false');
  owner = btn;
  const titleId = nextId('tip');
  tip.setAttribute('aria-labelledby', titleId);
  tip.replaceChildren(
    h('div', { class: 'tip__head' }, icon('book', 16), h('strong', { id: titleId }, term.terme)),
    h('p', { class: 'tip__def' }, term.definition),
    h('a', { class: 'tip__link', href: `#/glossaire?terme=${term.id}`, onclick: () => hideTip() }, t('glossaire.voir'), icon('arrow-right', 14))
  );
  tip.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  position(btn);
}

function position(btn: HTMLElement): void {
  if (!tip) return;
  const r = btn.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = Math.min(320, vw - 24);
  tip.style.width = `${w}px`;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(12, Math.min(left, vw - w - 12));
  const tipH = tip.offsetHeight;
  let top = r.bottom + 8;
  tip.dataset.side = 'bottom';
  if (top + tipH > vh - 12 && r.top - tipH - 8 > 12) {
    top = r.top - tipH - 8;
    tip.dataset.side = 'top';
  }
  tip.style.left = `${left + window.scrollX}px`;
  tip.style.top = `${top + window.scrollY}px`;
}

export function initGlossaryTips(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('button.term');
    if (btn) {
      e.preventDefault();
      if (owner === btn && tip && !tip.hidden) hideTip();
      else showTip(btn);
      return;
    }
    if (tip && !tip.hidden && !tip.contains(target)) hideTip();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tip && !tip.hidden) {
      e.stopPropagation();
      hideTip(true);
    }
  });
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener('mouseover', (e) => {
    if (!fine.matches) return;
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button.term');
    if (!btn) return;
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => showTip(btn), 350);
  });
  document.addEventListener('mouseout', (e) => {
    if (!fine.matches) return;
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button.term');
    if (!btn) return;
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      if (tip && !tip.matches(':hover')) hideTip();
    }, 300);
  });
  window.addEventListener('hashchange', () => hideTip());
  window.addEventListener('resize', () => hideTip());
}
