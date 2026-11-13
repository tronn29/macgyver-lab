/* Recherche globale, favoris, confidentialité, page introuvable. */
import { content } from '../core/content';
import { debounce, h } from '../core/dom';
import { fmtDate, t, tList } from '../core/i18n';
import type { RouteContext, View } from '../core/router';
import { setQuery } from '../core/router';
import { buildIndex, search, type ResultType, type SearchDoc } from '../core/search';
import { getProgress } from '../core/store';
import { emptyState, linkBtn, panel } from '../ui/components';
import { icon } from '../ui/icons';
import { experienceCard, ficheCard, fonctionCard, missionCard, pageHeader } from './common';

let index: SearchDoc[] | null = null;
function getIndex(): SearchDoc[] {
  index ??= buildIndex(content());
  return index;
}
export function resetSearchIndex(): void {
  index = null;
}

const TYPE_ICON: Record<ResultType, string> = { fiche: 'archive', fonction: 'multitool', objet: 'box-tools', experience: 'flask', mission: 'target', terme: 'book' };

function hrefFor(type: ResultType, id: string): string {
  switch (type) {
    case 'fiche':
      return `#/archives/${id}`;
    case 'fonction':
      return `#/arsenal/f/${id}`;
    case 'objet':
      return `#/arsenal/o/${id}`;
    case 'experience':
      return `#/labo/${id}`;
    case 'mission':
      return `#/operations/${id}`;
    case 'terme':
      return `#/glossaire?terme=${id}`;
  }
}

/** Surligne les mots trouvés (sans innerHTML). */
function highlight(text: string, tokens: string[]): (string | HTMLElement)[] {
  if (!tokens.length) return [text];
  const norm = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const marks: [number, number][] = [];
  for (const tok of tokens) {
    let i = norm.indexOf(tok);
    while (i >= 0) {
      marks.push([i, i + tok.length]);
      i = norm.indexOf(tok, i + tok.length);
    }
  }
  if (!marks.length || norm.length !== text.length) return [text];
  marks.sort((a, b) => a[0] - b[0]);
  const out: (string | HTMLElement)[] = [];
  let pos = 0;
  for (const [s, e] of marks) {
    if (s < pos) continue;
    out.push(text.slice(pos, s), h('mark', null, text.slice(s, e)));
    pos = e;
  }
  out.push(text.slice(pos));
  return out;
}

export function searchView(ctx: RouteContext): View {
  let q = ctx.query.get('q') ?? '';
  const results = h('div', { class: 'search-results' });
  const status = h('p', { class: 'list-count', role: 'status' });
  const input = h('input', { type: 'search', id: 'global-q', class: 'input input--lg', placeholder: t('recherche.placeholder'), value: q, autocomplete: 'off', enterkeyhint: 'search', spellcheck: false });
  const suggestions = ['papier alu', 'que faire avec une bouteille ?', 'froid', 'pression', 'aimant', 'lumière'];

  const render = () => {
    const raw = q.trim();
    if (!raw) {
      status.textContent = '';
      results.replaceChildren(
        h('div', { class: 'suggest' }, h('span', { class: 'hud-label' }, t('recherche.suggestions')), h('div', { class: 'chips' }, ...suggestions.map((s) => h('button', { type: 'button', class: 'chip chip--link', onclick: () => { input.value = s; q = s; setQuery({ q: s }); render(); } }, icon('search', 12), s))))
      );
      return;
    }
    const found = search(getIndex(), raw);
    const tokens = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2);
    status.textContent = t('commun.resultats', { n: found.length });
    if (!found.length) {
      results.replaceChildren(emptyState(t('recherche.vide'), t('recherche.videDesc'), { icon: 'search' }));
      return;
    }
    results.replaceChildren(
      h(
        'ul',
        { class: 'result-list' },
        ...found.map(({ doc }) =>
          h(
            'li',
            null,
            h(
              'a',
              { class: 'result', href: hrefFor(doc.type, doc.id) },
              h('span', { class: 'result__icon', 'aria-hidden': 'true' }, icon(TYPE_ICON[doc.type], 20)),
              h('span', { class: 'result__body' }, h('span', { class: 'result__type' }, t(`recherche.types.${doc.type}`)), h('span', { class: 'result__title' }, ...highlight(doc.titre, tokens)), doc.sousTitre ? h('span', { class: 'result__sub' }, doc.sousTitre) : null),
              icon('chevron-right', 18)
            )
          )
        )
      )
    );
  };

  input.addEventListener(
    'input',
    debounce(() => {
      q = input.value;
      setQuery({ q: q || null });
      render();
    }, 140) as EventListener
  );
  render();

  return {
    title: t('recherche.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page page--reading' },
      pageHeader({ kicker: t('recherche.kicker'), title: t('recherche.titre'), icon: 'search' }),
      h('form', { class: 'field', role: 'search', onsubmit: (e: Event) => e.preventDefault() }, h('label', { for: 'global-q', class: 'field__label' }, t('recherche.label')), h('div', { class: 'input-wrap input-wrap--lg' }, icon('search', 20), input)),
      status,
      results
    ),
    onMount: () => input.focus(),
  };
}

export function favorisView(): View {
  const c = content();
  const favs = Object.entries(getProgress().favoris).sort((a, b) => b[1].localeCompare(a[1]));
  const cards: HTMLElement[] = [];
  for (const [key] of favs) {
    const [type, id] = key.split(':');
    if (type === 'fiche' && c.byId.fiche.get(id)) cards.push(ficheCard(c.byId.fiche.get(id)!));
    if (type === 'fonction' && c.byId.fonction.get(id)) cards.push(fonctionCard(c.byId.fonction.get(id)!));
    if (type === 'experience' && c.byId.experience.get(id)) cards.push(experienceCard(c.byId.experience.get(id)!));
    if (type === 'mission' && c.byId.mission.get(id)) cards.push(missionCard(c.byId.mission.get(id)!));
    if (type === 'objet' && c.byId.objet.get(id)) {
      const o = c.byId.objet.get(id)!;
      cards.push(h('a', { class: 'card card--fonction', href: `#/arsenal/o/${o.id}` }, h('div', { class: 'card__icon', 'aria-hidden': 'true' }, icon(o.icone, 26)), h('h3', { class: 'card__title' }, o.nom), h('p', { class: 'card__text' }, (o.proprietes ?? []).join(' · '))));
    }
  }
  return {
    title: t('favoris.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page' },
      pageHeader({ kicker: t('favoris.kicker'), title: t('favoris.titre'), icon: 'star' }),
      h('h2', { class: 'sr-only' }, t('commun.listeTitre')),
      cards.length ? h('div', { class: 'card-grid' }, ...cards) : emptyState(t('favoris.vide'), t('favoris.videDesc'), { icon: 'star', action: linkBtn(t('archives.titre'), '#/archives', { variant: 'primary', icon: 'archive' }) })
    ),
  };
}

export function privacyView(): View {
  return {
    title: t('confidentialite.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page page--reading' },
      pageHeader({ kicker: t('confidentialite.kicker'), title: t('confidentialite.titre'), icon: 'lock' }),
      panel([h('p', { class: 'panel__text panel__text--lg' }, h('strong', null, t('confidentialite.resume'))), h('ul', { class: 'checklist' }, ...tList('confidentialite.points').map((x) => h('li', null, icon('check', 16), h('span', null, x))))], { corners: true }),
      h('h2', { class: 'block-title block-title--spaced' }, t('confidentialite.droits')),
      h('p', null, t('confidentialite.droitsTexte')),
      h('h2', { class: 'block-title block-title--spaced' }, t('confidentialite.hebergement')),
      h('p', null, t('confidentialite.hebergementTexte')),
      h('h2', { class: 'block-title block-title--spaced' }, t('confidentialite.contenu')),
      h('p', null, t('confidentialite.contenuTexte')),
      linkBtn(t('nav.reglages'), '#/reglages', { variant: 'ghost', icon: 'settings' })
    ),
  };
}

export function notFound(): View {
  return {
    title: t('erreur.titre'),
    section: '',
    node: h('div', { class: 'page' }, pageHeader({ kicker: '404', title: t('erreur.titre'), icon: 'radar' }), emptyState(t('erreur.titre'), t('erreur.introuvable'), { icon: 'wifi-off', action: linkBtn(t('erreur.retourAccueil'), '#/', { variant: 'primary', icon: 'dashboard' }) })),
  };
}

export function errorView(err: unknown): View {
  return {
    title: t('erreur.titre'),
    section: '',
    node: h('div', { class: 'page' }, pageHeader({ kicker: t('erreur.titre'), title: t('erreur.inattendue'), icon: 'alert' }), h('p', { class: 'muted' }, t('erreur.detail', { m: String((err as Error)?.message ?? err) })), linkBtn(t('erreur.retourAccueil'), '#/', { variant: 'primary', icon: 'dashboard' })),
  };
}

export function carnetView(): View {
  const notes = Object.entries(getProgress().notes).sort((a, b) => b[1].maj.localeCompare(a[1].maj));
  const typeIcon = (key: string) => (key.startsWith('fiche:') ? 'archive' : key.startsWith('experience:') ? 'flask' : 'target');
  return {
    title: t('carnet.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page page--reading' },
      pageHeader({ kicker: t('carnet.kicker'), title: t('carnet.titre'), icon: 'pen', intro: t('carnet.intro') }),
      h('h2', { class: 'sr-only' }, t('commun.listeTitre')),
      notes.length
        ? h(
            'ul',
            { class: 'note-list' },
            ...notes.map(([key, n]) =>
              h(
                'li',
                null,
                h(
                  'a',
                  { class: 'note-card', href: n.route },
                  h('span', { class: 'note-card__head' }, icon(typeIcon(key), 16), h('strong', null, n.titre)),
                  h('span', { class: 'note-card__text' }, n.texte),
                  h('small', { class: 'note-card__date' }, t('carnet.maj', { d: fmtDate(new Date(n.maj), { dateStyle: 'medium', timeStyle: 'short' }) }))
                )
              )
            )
          )
        : emptyState(t('carnet.vide'), t('carnet.videDesc'), { icon: 'pen', action: linkBtn(t('archives.titre'), '#/archives', { variant: 'primary', icon: 'archive' }) })
    ),
  };
}
