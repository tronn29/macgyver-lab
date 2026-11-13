/*
 * Schémas SVG : chargés depuis public/schemas/, nettoyés, puis insérés dans la page
 * pour hériter du thème (variables CSS) et des marqueurs communs (flèches, cotes).
 */
import { h } from '../core/dom';
import { t } from '../core/i18n';
import { icon } from './icons';
import { openDialog } from './components';

const SVG_NS = 'http://www.w3.org/2000/svg';
const cache = new Map<string, Promise<string>>();

const ALLOWED = new Set(['svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'title', 'desc']);

/** Définitions communes injectées une seule fois : marqueurs et halo lumineux. */
export function ensureSchemaDefs(): void {
  if (document.getElementById('mg-defs')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
<svg id="mg-defs" xmlns="${SVG_NS}" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">
  <defs>
    <marker id="mg-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="mg-m-line" d="M0 1.2 L9 5 L0 8.8 L2.2 5 z"/></marker>
    <marker id="mg-arrow-hot" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="mg-m-hot" d="M0 1.2 L9 5 L0 8.8 L2.2 5 z"/></marker>
    <marker id="mg-arrow-cold" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="mg-m-cold" d="M0 1.2 L9 5 L0 8.8 L2.2 5 z"/></marker>
    <marker id="mg-arrow-accent" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="mg-m-accent" d="M0 1.2 L9 5 L0 8.8 L2.2 5 z"/></marker>
    <marker id="mg-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse"><circle class="mg-m-accent" cx="5" cy="5" r="4"/></marker>
    <marker id="mg-tick" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path class="mg-m-tick" d="M5 0 V10"/></marker>
    <filter id="mg-glow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="440" height="320">
      <feGaussianBlur stdDeviation="1.8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
</svg>`;
  document.body.prepend(wrap.firstElementChild as Element);
}

export function fetchSvg(file: string): Promise<string> {
  let p = cache.get(file);
  if (!p) {
    p = fetch(`./schemas/${file}`).then((r) => {
      if (!r.ok) throw new Error(`schéma ${file} : HTTP ${r.status}`);
      return r.text();
    });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p;
}

/** Nettoie le SVG : éléments et attributs autorisés uniquement. */
export function sanitizeSvg(markup: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName !== 'svg' || doc.querySelector('parsererror')) return null;
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED.has(child.localName)) {
        child.remove();
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const n = attr.name.toLowerCase();
        if (n.startsWith('on') || n === 'style' || n.endsWith('href')) child.removeAttribute(attr.name);
      }
      walk(child);
    }
  };
  walk(svg);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return document.importNode(svg, true) as unknown as SVGSVGElement;
}

export interface SchemaOptions {
  fichier: string;
  alt: string;
  legende?: string;
  titre?: string;
  zoomable?: boolean;
  compact?: boolean;
}

/** Figure de schéma avec état de chargement, erreur, et agrandissement. */
export function schemaFigure(opts: SchemaOptions): HTMLElement {
  ensureSchemaDefs();
  const stage = h('div', { class: 'schema__stage', role: 'img', 'aria-label': opts.alt }, h('div', { class: 'schema__loading', 'aria-hidden': 'true' }));
  const fig = h(
    'figure',
    { class: ['schema', opts.compact && 'schema--compact'] },
    h('div', { class: 'schema__frame' }, h('span', { class: 'schema__corner schema__corner--tl', 'aria-hidden': 'true' }), h('span', { class: 'schema__corner schema__corner--br', 'aria-hidden': 'true' }), stage)
  );
  const bar = h('figcaption', { class: 'schema__bar' }, h('span', { class: 'schema__caption' }, opts.legende ?? ''));
  fig.appendChild(bar);

  fetchSvg(opts.fichier)
    .then((markup) => {
      const svg = sanitizeSvg(markup);
      stage.replaceChildren(svg ?? h('p', { class: 'schema__error' }, t('schema.erreur')));
    })
    .catch(() => {
      stage.replaceChildren(h('p', { class: 'schema__error' }, icon('wifi-off', 20), t('schema.horsLigne')));
    });

  if (opts.zoomable !== false) {
    bar.appendChild(
      h(
        'button',
        { type: 'button', class: 'btn btn--quiet btn--sm schema__zoom', onclick: () => openSchemaZoom(opts) },
        icon('expand', 16),
        h('span', null, t('schema.agrandir'))
      )
    );
  }
  if (!opts.legende && opts.zoomable === false) bar.remove();
  return fig;
}

export function openSchemaZoom(opts: SchemaOptions): void {
  const big = schemaFigure({ ...opts, zoomable: false, legende: undefined });
  big.classList.add('schema--zoom');
  openDialog({
    title: opts.titre ?? t('schema.titre'),
    wide: true,
    body: h('div', { class: 'schema-zoom' }, big, h('p', { class: 'schema-zoom__alt' }, opts.alt)),
  });
}
