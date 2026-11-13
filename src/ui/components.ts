/* Composants d'interface réutilisables. */
import { h, nextId } from '../core/dom';
import { t } from '../core/i18n';
import type { NiveauSecurite, Verdict, Difficulte } from '../core/types';
import { icon } from './icons';

type Child = Parameters<typeof h>[2];

/* ---- Boutons et liens ---- */

export function btn(
  label: string | Node,
  opts: { variant?: 'primary' | 'action' | 'ghost' | 'quiet' | 'danger'; icon?: string; iconAfter?: string; onClick?: (e: MouseEvent) => void; type?: 'button' | 'submit'; small?: boolean; ariaLabel?: string; disabled?: boolean; block?: boolean } = {}
): HTMLButtonElement {
  return h(
    'button',
    {
      type: opts.type ?? 'button',
      class: ['btn', `btn--${opts.variant ?? 'ghost'}`, opts.small && 'btn--sm', opts.block && 'btn--block'],
      onclick: opts.onClick,
      'aria-label': opts.ariaLabel,
      disabled: opts.disabled,
    },
    opts.icon ? icon(opts.icon, 18) : null,
    typeof label === 'string' ? h('span', null, label) : label,
    opts.iconAfter ? icon(opts.iconAfter, 18) : null
  );
}

export function linkBtn(
  label: string,
  href: string,
  opts: { variant?: 'primary' | 'action' | 'ghost' | 'quiet'; icon?: string; iconAfter?: string; small?: boolean; block?: boolean } = {}
): HTMLAnchorElement {
  return h(
    'a',
    { href, class: ['btn', `btn--${opts.variant ?? 'ghost'}`, opts.small && 'btn--sm', opts.block && 'btn--block'] },
    opts.icon ? icon(opts.icon, 18) : null,
    h('span', null, label),
    opts.iconAfter ? icon(opts.iconAfter, 18) : null
  );
}

export function iconBtn(name: string, label: string, onClick: (e: MouseEvent) => void, extra: Record<string, unknown> = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onclick: onClick, ...extra }, icon(name, 22));
}

/* ---- Étiquettes ---- */

export function label(text: string, extraClass = ''): HTMLElement {
  return h('span', { class: `hud-label ${extraClass}`.trim() }, text);
}

export function chip(text: string, opts: { icon?: string; tone?: 'accent' | 'orange' | 'muted' | 'success' | 'warning' | 'danger' } = {}): HTMLElement {
  return h('span', { class: ['chip', opts.tone && `chip--${opts.tone}`] }, opts.icon ? icon(opts.icon, 14) : null, text);
}

const SAFETY_TONE: Record<NiveauSecurite, 'success' | 'warning' | 'danger'> = { vert: 'success', orange: 'warning', rouge: 'danger' };

export function safetyBadge(niveau: NiveauSecurite, compact = false): HTMLElement {
  return h(
    'span',
    { class: ['safety', `safety--${niveau}`, compact && 'safety--compact'], title: t(`securite.${niveau}.long`) },
    h('span', { class: 'safety__dot', 'aria-hidden': 'true' }),
    h('span', { class: compact ? 'sr-only' : '' }, t('securite.prefixe') + ' '),
    t(`securite.${niveau}.court`)
  );
}
export const safetyTone = (n: NiveauSecurite) => SAFETY_TONE[n];

export function verdictBadge(verdict: Verdict): HTMLElement {
  const ic = verdict === 'vrai' ? 'check' : verdict === 'partiel' ? 'alert' : 'x';
  return h('span', { class: ['verdict', `verdict--${verdict}`] }, icon(ic, 16), t(`verdict.${verdict}`));
}

export function difficultyBadge(d: Difficulte | number): HTMLElement {
  const n = typeof d === 'number' ? d : d === 'facile' ? 1 : d === 'moyen' ? 2 : 3;
  const txt = typeof d === 'number' ? t(`difficulte.n${d}`) : t(`difficulte.${d}`);
  return h(
    'span',
    { class: `difficulty difficulty--${n}` },
    h('span', { class: 'difficulty__bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    txt
  );
}

/* ---- Panneaux ---- */

export function panel(children: Child[], opts: { tag?: 'section' | 'div' | 'article'; class?: string; label?: string; corners?: boolean } = {}): HTMLElement {
  const el = h(opts.tag ?? 'section', { class: ['panel', opts.corners && 'hud-corners', opts.class], 'aria-label': opts.label }, ...children);
  return el;
}

export function sectionHead(title: string, opts: { kicker?: string; icon?: string; action?: Node | null; level?: 2 | 3; id?: string } = {}): HTMLElement {
  const H = opts.level === 3 ? 'h3' : 'h2';
  return h(
    'div',
    { class: 'section-head' },
    h(
      'div',
      { class: 'section-head__text' },
      opts.kicker ? label(opts.kicker) : null,
      h(H, { class: 'section-head__title', id: opts.id }, opts.icon ? icon(opts.icon, 20) : null, title)
    ),
    opts.action ?? null
  );
}

export function emptyState(title: string, text: string, opts: { icon?: string; action?: Node } = {}): HTMLElement {
  return h(
    'div',
    { class: 'empty' },
    h('div', { class: 'empty__icon', 'aria-hidden': 'true' }, icon(opts.icon ?? 'radar', 32)),
    h('p', { class: 'empty__title' }, title),
    h('p', { class: 'empty__text' }, text),
    opts.action ?? null
  );
}

export function progressBar(ratio: number, labelText: string, opts: { tone?: 'accent' | 'orange'; showValue?: boolean } = {}): HTMLElement {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return h(
    'div',
    { class: ['progress', opts.tone === 'orange' && 'progress--orange'], role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': labelText },
    h('div', { class: 'progress__fill', style: { width: `${pct}%` } })
  );
}

export function ring(ratio: number, size = 56, labelText = ''): HTMLElement {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, ratio));
  const wrap = h('div', { class: 'ring', style: { width: `${size}px`, height: `${size}px` }, role: 'img', 'aria-label': labelText || `${Math.round(pct * 100)} %` });
  wrap.innerHTML = `<svg viewBox="0 0 50 50" aria-hidden="true"><circle class="ring__track" cx="25" cy="25" r="${r}"/><circle class="ring__fill" cx="25" cy="25" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}"/></svg><span class="ring__value" aria-hidden="true">${Math.round(pct * 100)}<small>%</small></span>`;
  return wrap;
}

/* ---- Notifications (toasts) ---- */

let toastRegion: HTMLElement | null = null;
export function toast(message: string, opts: { tone?: 'accent' | 'orange' | 'success' | 'danger'; icon?: string; action?: { label: string; onClick: () => void }; duration?: number } = {}): void {
  if (!toastRegion) {
    toastRegion = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastRegion);
  }
  const el = h(
    'div',
    { class: ['toast', opts.tone && `toast--${opts.tone}`] },
    icon(opts.icon ?? 'info', 18),
    h('span', { class: 'toast__msg' }, message),
    opts.action
      ? h('button', { type: 'button', class: 'toast__action', onclick: () => { opts.action?.onClick(); el.remove(); } }, opts.action.label)
      : null,
    h('button', { type: 'button', class: 'toast__close', 'aria-label': t('commun.fermer'), onclick: () => el.remove() }, icon('close', 16))
  );
  toastRegion.appendChild(el);
  const duration = opts.duration ?? (opts.action ? 9000 : 4200);
  window.setTimeout(() => {
    el.classList.add('toast--out');
    window.setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ---- Boîte de dialogue (élément <dialog> natif : focus piégé, Échap) ---- */

export function openDialog(opts: { title: string; body: Node; actions?: Node[]; wide?: boolean; onClose?: () => void; kicker?: string }): { close: () => void; el: HTMLDialogElement } {
  const titleId = nextId('dlg');
  const dlg = h('dialog', { class: ['dialog', opts.wide && 'dialog--wide'], 'aria-labelledby': titleId }) as HTMLDialogElement;
  const close = () => {
    if (dlg.open) dlg.close();
  };
  dlg.append(
    h(
      'div',
      { class: 'dialog__head' },
      h('div', null, opts.kicker ? label(opts.kicker) : null, h('h2', { id: titleId, class: 'dialog__title' }, opts.title)),
      iconBtn('close', t('commun.fermer'), close)
    ),
    h('div', { class: 'dialog__body' }, opts.body),
    ...(opts.actions?.length ? [h('div', { class: 'dialog__actions' }, ...opts.actions)] : [])
  );
  const opener = document.activeElement as HTMLElement | null;
  dlg.addEventListener('close', () => {
    dlg.remove();
    opts.onClose?.();
    opener?.focus?.();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close(); // clic sur le fond
  });
  document.body.appendChild(dlg);
  dlg.showModal();
  return { close, el: dlg };
}

/** Confirmation intégrée (pas de confirm() natif). */
export function confirmDialog(title: string, text: string, confirmLabel: string, onConfirm: () => void, danger = false): void {
  const d = openDialog({
    title,
    body: h('p', null, text),
    actions: [
      btn(t('commun.annuler'), { variant: 'ghost', onClick: () => d.close() }),
      btn(confirmLabel, { variant: danger ? 'danger' : 'primary', onClick: () => { d.close(); onConfirm(); } }),
    ],
  });
}

/* ---- Interrupteur accessible ---- */

export function switchControl(labelText: string, checked: boolean, onChange: (v: boolean) => void, description?: string): HTMLElement {
  const id = nextId('sw');
  const descId = description ? `${id}-desc` : undefined;
  const input = h('button', {
    type: 'button',
    role: 'switch',
    id,
    class: 'switch',
    'aria-checked': String(checked),
    'aria-describedby': descId,
    onclick: () => {
      const v = input.getAttribute('aria-checked') !== 'true';
      input.setAttribute('aria-checked', String(v));
      onChange(v);
    },
  }, h('span', { class: 'switch__thumb', 'aria-hidden': 'true' }));
  return h(
    'div',
    { class: 'setting' },
    h('div', { class: 'setting__text' }, h('label', { for: id, class: 'setting__label' }, labelText), description ? h('p', { id: descId, class: 'setting__desc' }, description) : null),
    input
  );
}

/** Groupe de boutons radio stylés en segments. */
export function segmented<T extends string | number>(
  legend: string,
  options: { value: T; label: string; icon?: string }[],
  value: T,
  onChange: (v: T) => void,
  opts: { hideLegend?: boolean } = {}
): HTMLElement {
  const name = nextId('seg');
  const fs = h('fieldset', { class: 'segmented' }, h('legend', { class: opts.hideLegend ? 'sr-only' : 'segmented__legend' }, legend));
  const row = h('div', { class: 'segmented__row' });
  for (const o of options) {
    const id = `${name}-${o.value}`;
    const input = h('input', { type: 'radio', name, id, value: String(o.value), checked: o.value === value, class: 'segmented__input', onchange: () => onChange(o.value) });
    row.append(input, h('label', { for: id, class: 'segmented__label' }, o.icon ? icon(o.icon, 16) : null, o.label));
  }
  fs.append(row);
  return fs;
}

/** Annonce pour les lecteurs d'écran. */
let liveRegion: HTMLElement | null = null;
export function announce(message: string): void {
  if (!liveRegion) {
    liveRegion = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = '';
  window.setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message;
  }, 60);
}
