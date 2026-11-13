/* Glossaire : liste filtrable des termes techniques + fenêtre « termes de cette fiche ». */
import { content } from '../core/content';
import { debounce, h, normalize } from '../core/dom';
import { t } from '../core/i18n';
import type { RouteContext, View } from '../core/router';
import { setQuery } from '../core/router';
import type { Fiche } from '../core/types';
import { emptyState, openDialog } from '../ui/components';
import { icon } from '../ui/icons';
import { pageHeader } from './common';

function termEntry(id: string, open = false): HTMLElement | null {
  const c = content();
  const term = c.byId.terme.get(id);
  if (!term) return null;
  const fiches = (term.fiches ?? []).map((fid) => c.byId.fiche.get(fid)).filter((x): x is Fiche => Boolean(x));
  return h(
    'details',
    { class: 'term-entry', id: `terme-${term.id}`, open },
    h('summary', { class: 'term-entry__summary' }, h('span', { class: 'term-entry__name' }, term.terme), icon('chevron-down', 18)),
    h(
      'div',
      { class: 'term-entry__body' },
      h('p', null, term.definition),
      fiches.length
        ? h(
            'div',
            { class: 'term-entry__links' },
            h('span', { class: 'hud-label' }, t('glossaire.fiches')),
            h('div', { class: 'chips' }, ...fiches.map((f) => h('a', { class: 'chip chip--link', href: `#/archives/${f.id}` }, icon('archive', 14), f.titre)))
          )
        : null
    )
  );
}

export function glossaireView(ctx: RouteContext): View {
  const c = content();
  const focusId = ctx.query.get('terme');
  const termes = [...c.termes].sort((a, b) => a.terme.localeCompare(b.terme, 'fr'));
  const list = h('div', { class: 'term-list' });
  const input = h('input', { type: 'search', id: 'gloss-filter', class: 'input', placeholder: '…', autocomplete: 'off', value: '' });

  const render = (q: string) => {
    const nq = normalize(q);
    const items = termes.filter((x) => !nq || normalize(`${x.terme} ${x.definition}`).includes(nq));
    if (!items.length) {
      list.replaceChildren(emptyState(t('glossaire.aucun'), '', { icon: 'book' }));
      return;
    }
    // Regroupement alphabétique
    const groups = new Map<string, HTMLElement[]>();
    for (const term of items) {
      const letter = normalize(term.terme).charAt(0).toUpperCase();
      const entry = termEntry(term.id, term.id === focusId);
      if (!entry) continue;
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)?.push(entry);
    }
    list.replaceChildren(...[...groups].map(([letter, entries]) => h('section', { class: 'term-group', 'aria-label': letter }, h('h2', { class: 'term-group__letter', 'aria-hidden': 'true' }, letter), ...entries)));
  };
  input.addEventListener('input', debounce(() => render(input.value), 120) as EventListener);
  render('');

  return {
    title: t('glossaire.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page page--reading' },
      pageHeader({ kicker: t('glossaire.kicker'), title: t('glossaire.titre'), icon: 'book', intro: t('glossaire.intro') }),
      h('div', { class: 'field' }, h('label', { for: 'gloss-filter', class: 'field__label' }, t('glossaire.filtre')), h('div', { class: 'input-wrap' }, icon('search', 18), input)),
      list
    ),
    onMount: () => {
      if (focusId) {
        const el = document.getElementById(`terme-${focusId}`);
        if (el) {
          el.scrollIntoView({ block: 'center' });
          el.querySelector('summary')?.focus();
          setQuery({ terme: null });
        }
      }
    },
  };
}

export function openGlossaryForFiche(f: Fiche, ids: string[]): void {
  const entries = ids.map((id) => termEntry(id, true)).filter((x): x is HTMLElement => Boolean(x));
  openDialog({
    title: t('glossaire.titre'),
    kicker: f.titre,
    body: h('div', { class: 'term-list term-list--dialog' }, ...entries, h('a', { class: 'btn btn--ghost btn--sm', href: '#/glossaire' }, icon('book', 16), h('span', null, t('commun.voirTout')))),
  });
}
