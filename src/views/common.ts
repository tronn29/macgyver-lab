/* Briques de vues partagées : en-têtes, cartes, filtres, liens croisés. */
import { content } from '../core/content';
import { h } from '../core/dom';
import { t } from '../core/i18n';
import { isFavori, toggleFavori } from '../core/progress';
import { getProgress } from '../core/store';
import type { CategorieId, Experience, Fiche, Fonction, Mission, Objet } from '../core/types';
import { chip, difficultyBadge, label, safetyBadge, toast, verdictBadge } from '../ui/components';
import { icon } from '../ui/icons';
import { play } from '../core/sound';

export function catName(id: string): string {
  return content().byId.categorie.get(id)?.nom ?? id;
}
export function catIcon(id: string): string {
  return content().byId.categorie.get(id)?.icone ?? 'other';
}

/** En-tête de page : retour, sur-titre (kicker), titre h1 focalisable, actions. */
export function pageHeader(opts: {
  kicker?: string;
  title: string;
  intro?: string;
  back?: { href: string; label: string } | null;
  actions?: (Node | null)[];
  icon?: string;
  meta?: (Node | null)[];
}): HTMLElement {
  return h(
    'header',
    { class: 'page-head' },
    opts.back
      ? h('a', { class: 'back-link', href: opts.back.href }, icon('chevron-left', 18), h('span', null, opts.back.label))
      : null,
    h(
      'div',
      { class: 'page-head__row' },
      h(
        'div',
        { class: 'page-head__text' },
        opts.kicker ? label(opts.kicker) : null,
        h('h1', { class: 'page-head__title', tabindex: '-1' }, opts.icon ? h('span', { class: 'page-head__icon', 'aria-hidden': 'true' }, icon(opts.icon, 28)) : null, opts.title)
      ),
      opts.actions?.length ? h('div', { class: 'page-head__actions' }, ...opts.actions) : null
    ),
    opts.meta?.length ? h('div', { class: 'page-head__meta' }, ...opts.meta) : null,
    opts.intro ? h('p', { class: 'page-head__intro' }, opts.intro) : null
  );
}

/** Bouton favori (étoile) avec état annoncé. */
export function favButton(type: string, id: string, titre: string): HTMLButtonElement {
  const on = isFavori(type, id);
  const b = h(
    'button',
    { type: 'button', class: ['icon-btn', 'fav-btn', on && 'is-on'], 'aria-pressed': String(on), 'aria-label': `${t('commun.favori')} : ${titre}`, title: on ? t('commun.favoriRetirer') : t('commun.favori') },
    icon(on ? 'star-fill' : 'star', 22)
  );
  b.addEventListener('click', () => {
    const now = toggleFavori(type, id);
    b.setAttribute('aria-pressed', String(now));
    b.classList.toggle('is-on', now);
    b.title = now ? t('commun.favoriRetirer') : t('commun.favori');
    b.replaceChildren(icon(now ? 'star-fill' : 'star', 22));
    play('tap');
    toast(now ? t('commun.favoriAjoute') : t('commun.favoriRetire'), { icon: now ? 'star-fill' : 'star', duration: 2200 });
  });
  return b;
}

/* ---- Cartes ---- */

export function ficheCard(f: Fiche, opts: { compact?: boolean } = {}): HTMLElement {
  const lu = Boolean(getProgress().lus[f.id]);
  return h(
    'a',
    { class: ['card', 'card--fiche', opts.compact && 'card--compact', lu && 'is-read'], href: `#/archives/${f.id}` },
    h(
      'div',
      { class: 'card__top' },
      h('span', { class: 'card__cat' }, icon(catIcon(f.categories[0]), 16), catName(f.categories[0])),
      lu ? h('span', { class: 'card__status card__status--done' }, icon('check', 14), t('commun.lu')) : h('span', { class: 'card__status' }, t('commun.nonLu'))
    ),
    h('h3', { class: 'card__title' }, f.titre),
    !opts.compact && f.sousTitre ? h('p', { class: 'card__text' }, f.sousTitre) : null,
    h(
      'div',
      { class: 'card__foot' },
      verdictBadge(f.realite.verdict),
      safetyBadge(f.securite.niveau, true),
      h('span', { class: 'card__meta' }, icon('clock', 14), t('commun.minutes', { n: f.duree }))
    )
  );
}

export function fonctionCard(fn: Fonction): HTMLElement {
  const vue = Boolean(getProgress().vuesFonctions[fn.id]);
  return h(
    'a',
    { class: ['card', 'card--fonction', vue && 'is-read'], href: `#/arsenal/f/${fn.id}` },
    h('div', { class: 'card__icon', 'aria-hidden': 'true' }, icon(fn.icone, 26)),
    h('h3', { class: 'card__title' }, fn.titre),
    h('p', { class: 'card__text' }, fn.resume),
    h(
      'div',
      { class: 'card__foot' },
      h('span', { class: 'card__meta' }, icon('multitool', 14), t('commun.objets', { n: fn.objets.length })),
      vue ? h('span', { class: 'card__status card__status--done' }, icon('check', 14), t('commun.lu')) : null
    )
  );
}

export function experienceCard(e: Experience): HTMLElement {
  const fait = Boolean(getProgress().experiences[e.id]);
  return h(
    'a',
    { class: ['card', 'card--xp', fait && 'is-read'], href: `#/labo/${e.id}` },
    h(
      'div',
      { class: 'card__top' },
      h('span', { class: 'card__cat' }, icon(catIcon(e.categories[0]), 16), catName(e.categories[0])),
      fait ? h('span', { class: 'card__status card__status--done' }, icon('check', 14), t('commun.fait')) : null
    ),
    h('h3', { class: 'card__title' }, e.titre),
    e.sousTitre ? h('p', { class: 'card__text' }, e.sousTitre) : null,
    h(
      'div',
      { class: 'card__foot' },
      difficultyBadge(e.difficulte),
      safetyBadge(e.securite.niveau, true),
      h('span', { class: 'card__meta' }, icon('clock', 14), t('commun.minutes', { n: e.duree }))
    )
  );
}

export function missionStatus(m: Mission): { best: number | null; reussie: boolean } {
  const runs = getProgress().missions.filter((r) => r.id === m.id);
  if (!runs.length) return { best: null, reussie: false };
  return { best: Math.max(...runs.map((r) => r.score)), reussie: runs.some((r) => r.reussie) };
}

export function missionCard(m: Mission): HTMLElement {
  const st = missionStatus(m);
  return h(
    'a',
    { class: ['card', 'card--mission', `card--${m.difficulte}`, st.reussie && 'is-read'], href: `#/operations/${m.id}` },
    h(
      'div',
      { class: 'card__top' },
      h('span', { class: 'card__code' }, m.code ?? m.id.toUpperCase()),
      getProgress().brouillons[m.id]
        ? h('span', { class: 'card__status card__status--live' }, icon('play', 14), t('operations.enCours'))
        : st.best === null
        ? h('span', { class: 'card__status' }, t('operations.jamais'))
        : h('span', { class: ['card__status', st.reussie ? 'card__status--done' : 'card__status--warn'] }, icon(st.reussie ? 'check' : 'refresh', 14), st.reussie ? t('operations.statutReussie') : t('operations.statutRevoir'))
    ),
    h('h3', { class: 'card__title' }, m.titre),
    h('p', { class: 'card__text' }, m.briefing.objectif),
    h(
      'div',
      { class: 'card__foot' },
      difficultyBadge(m.difficulte),
      h('span', { class: 'card__meta' }, icon('timer', 14), t('commun.minutes', { n: m.duree })),
      st.best !== null ? h('span', { class: 'card__meta card__meta--score' }, t('operations.meilleur', { n: st.best })) : null
    )
  );
}

export function objetChip(o: Objet, href = true): HTMLElement {
  const inner = [icon(o.icone, 16), h('span', null, o.nom)];
  return href ? h('a', { class: 'obj-chip', href: `#/arsenal/o/${o.id}` }, ...inner) : h('span', { class: 'obj-chip' }, ...inner);
}

/* ---- Filtres de catégories (boutons à bascule, défilement horizontal) ---- */

export function categoryFilter(selected: string | null, counts: Map<string, number>, onChange: (id: string | null) => void): HTMLElement {
  const c = content();
  const group = h('div', { class: 'filter-row', role: 'group', 'aria-label': t('archives.filtrer') });
  const make = (id: string | null, text: string, ic: string, n?: number) => {
    const b = h(
      'button',
      { type: 'button', class: 'filter-chip', 'aria-pressed': String(selected === id), onclick: () => onChange(id) },
      icon(ic, 16),
      h('span', null, text),
      n !== undefined ? h('span', { class: 'filter-chip__n' }, String(n)) : null
    );
    return b;
  };
  group.append(make(null, t('commun.toutes'), 'grid'));
  for (const cat of c.categories) {
    const n = counts.get(cat.id) ?? 0;
    if (!n) continue;
    group.append(make(cat.id, cat.nom, cat.icone, n));
  }
  return group;
}

export function countByCategory(items: { categories?: CategorieId[]; categorie?: CategorieId }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const cats = it.categories ?? (it.categorie ? [it.categorie] : []);
    for (const id of cats) m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

/* ---- Liens croisés ---- */

export function relatedLinks(groups: { title: string; icon: string; items: { href: string; label: string; icon?: string; sub?: string }[] }[]): HTMLElement | null {
  const visible = groups.filter((g) => g.items.length);
  if (!visible.length) return null;
  return h(
    'div',
    { class: 'related' },
    ...visible.map((g) =>
      h(
        'div',
        { class: 'related__group' },
        h('h3', { class: 'related__title' }, icon(g.icon, 18), g.title),
        h(
          'ul',
          { class: 'related__list' },
          ...g.items.map((it) =>
            h(
              'li',
              null,
              h(
                'a',
                { class: 'related__link', href: it.href },
                it.icon ? icon(it.icon, 18) : null,
                h('span', { class: 'related__text' }, h('span', null, it.label), it.sub ? h('small', null, it.sub) : null),
                icon('chevron-right', 16)
              )
            )
          )
        )
      )
    )
  );
}

export function categoriesChips(ids: string[]): HTMLElement {
  return h('div', { class: 'chips' }, ...ids.map((id) => chip(catName(id), { icon: catIcon(id), tone: 'muted' })));
}

export function notFoundView(title: string, back: { href: string; label: string }) {
  return {
    title,
    section: '',
    node: h(
      'div',
      { class: 'page' },
      pageHeader({ title, kicker: t('erreur.titre'), back }),
      h('p', null, t('erreur.introuvable'))
    ),
  };
}
