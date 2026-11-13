/* Arsenal d'objets (Équivalences) : par fonction, par objet, et fiches détaillées. */
import { content } from '../core/content';
import { debounce, h, normalize } from '../core/dom';
import { t } from '../core/i18n';
import { markFonctionVue, setLast } from '../core/progress';
import type { RouteContext, View } from '../core/router';
import { setQuery } from '../core/router';
import { tokenize } from '../core/search';
import type { Fonction, Objet } from '../core/types';
import { emptyState, panel, safetyBadge, segmented } from '../ui/components';
import { icon } from '../ui/icons';
import { catIcon, catName, favButton, fonctionCard, notFoundView, pageHeader, relatedLinks } from './common';

type Vue = 'fonctions' | 'objets';

function efficacite(n: number): HTMLElement {
  return h(
    'span',
    { class: `eff eff--${n}`, title: `${t('arsenal.efficacite')} : ${t(`arsenal.eff${n}`)}` },
    h('span', { class: 'eff__bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('span', { class: 'eff__label' }, h('span', { class: 'sr-only' }, `${t('arsenal.efficacite')} : `), t(`arsenal.eff${n}`))
  );
}

function objetMatches(o: Objet, tokens: string[]): boolean {
  const hay = ` ${normalize(`${o.nom} ${(o.alias ?? []).join(' ')} ${(o.proprietes ?? []).join(' ')}`)} `;
  return tokens.every((tok) => hay.includes(` ${tok}`) || (tok.length >= 4 && hay.includes(tok)));
}

function fonctionMatches(f: Fonction, tokens: string[]): boolean {
  const c = content();
  const objs = f.objets.map((o) => {
    const ob = c.byId.objet.get(o.objet);
    return `${ob?.nom ?? ''} ${(ob?.alias ?? []).join(' ')}`;
  });
  const hay = ` ${normalize(`${f.titre} ${f.resume} ${objs.join(' ')}`)} `;
  return tokens.every((tok) => hay.includes(` ${tok}`) || (tok.length >= 4 && hay.includes(tok)));
}

export function arsenalList(ctx: RouteContext): View {
  const c = content();
  let vue: Vue = ctx.query.get('vue') === 'objets' ? 'objets' : 'fonctions';
  let q = ctx.query.get('q') ?? '';
  const results = h('div', { 'aria-live': 'polite' });
  const countEl = h('p', { class: 'list-count' });

  const objetsUtiles = c.objets
    .filter((o) => (c.fonctionsParObjet.get(o.id) ?? []).length > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const render = () => {
    const tokens = tokenize(q);
    if (vue === 'fonctions') {
      const items = c.fonctions.filter((f) => !tokens.length || fonctionMatches(f, tokens));
      countEl.textContent = t('arsenal.fonctions', { n: items.length });
      results.replaceChildren(items.length ? h('div', { class: 'card-grid' }, ...items.map(fonctionCard)) : emptyState(t('arsenal.aucunResultat'), '', { icon: 'search' }));
    } else {
      const items = objetsUtiles.filter((o) => !tokens.length || objetMatches(o, tokens));
      countEl.textContent = t('commun.objets', { n: items.length });
      results.replaceChildren(
        items.length
          ? h(
              'ul',
              { class: 'obj-grid' },
              ...items.map((o) =>
                h(
                  'li',
                  null,
                  h(
                    'a',
                    { class: 'obj-tile', href: `#/arsenal/o/${o.id}` },
                    h('span', { class: 'obj-tile__icon', 'aria-hidden': 'true' }, icon(o.icone, 22)),
                    h('span', { class: 'obj-tile__name' }, o.nom),
                    h('span', { class: 'obj-tile__n' }, t('arsenal.fonctions', { n: (c.fonctionsParObjet.get(o.id) ?? []).length }))
                  )
                )
              )
            )
          : emptyState(t('arsenal.aucunResultat'), '', { icon: 'search' })
      );
    }
  };

  const input = h('input', { type: 'search', id: 'arsenal-q', class: 'input', placeholder: t('arsenal.recherchePlaceholder'), value: q, autocomplete: 'off', enterkeyhint: 'search' });
  input.addEventListener(
    'input',
    debounce(() => {
      q = input.value;
      setQuery({ q: q || null });
      render();
    }, 150) as EventListener
  );

  render();
  return {
    title: t('arsenal.titre'),
    section: 'arsenal',
    keepScroll: true,
    node: h(
      'div',
      { class: 'page' },
      pageHeader({ kicker: t('arsenal.kicker'), title: t('arsenal.titre'), icon: 'multitool', intro: t('arsenal.intro') }),
      h(
        'div',
        { class: 'toolbar toolbar--split' },
        h('div', { class: 'field field--grow' }, h('label', { for: 'arsenal-q', class: 'field__label' }, t('arsenal.rechercheLabel')), h('div', { class: 'input-wrap' }, icon('search', 18), input)),
        segmented<Vue>(
          t('arsenal.rechercheLabel'),
          [
            { value: 'fonctions', label: t('arsenal.parFonction'), icon: 'grid' },
            { value: 'objets', label: t('arsenal.parObjet'), icon: 'list' },
          ],
          vue,
          (v) => {
            vue = v;
            setQuery({ vue: v === 'objets' ? 'objets' : null });
            render();
          },
          { hideLegend: true }
        )
      ),
      countEl,
      h('h2', { class: 'sr-only' }, t('commun.listeTitre')),
      results
    ),
  };
}

export function fonctionDetail(ctx: RouteContext): View {
  const c = content();
  const fn = c.byId.fonction.get(ctx.params.id);
  if (!fn) return notFoundView(t('arsenal.introuvable'), { href: '#/arsenal', label: t('arsenal.titre') });
  const items = [...fn.objets].sort((a, b) => b.efficacite - a.efficacite);
  const fiches = (fn.fiches ?? []).map((id) => c.byId.fiche.get(id)).filter(Boolean);

  return {
    title: fn.titre,
    section: 'arsenal',
    node: h(
      'article',
      { class: 'page fonction' },
      pageHeader({
        kicker: `${t('arsenal.kicker')} · ${catName(fn.categorie)}`,
        title: fn.titre,
        icon: fn.icone,
        back: { href: '#/arsenal', label: t('arsenal.titre') },
        actions: [favButton('fonction', fn.id, fn.titre)],
        intro: fn.resume,
        meta: [h('span', { class: 'chip chip--muted' }, icon(catIcon(fn.categorie), 14), catName(fn.categorie)), fn.securite ? safetyBadge(fn.securite.niveau) : null],
      }),
      panel([h('h2', { class: 'block-title' }, icon('bulb', 20), t('arsenal.principe')), h('p', { class: 'panel__text panel__text--lg' }, fn.principe), fn.securite ? h('p', { class: `notice notice--${fn.securite.niveau === 'rouge' ? 'danger' : 'warning'}` }, icon('shield', 18), fn.securite.note) : null], { class: 'principle-panel', corners: true }),
      h('h2', { class: 'block-title block-title--spaced' }, icon('multitool', 20), t('arsenal.objetsCandidats')),
      h(
        'ol',
        { class: 'equiv-list' },
        ...items.map((it, i) => {
          const o = c.byId.objet.get(it.objet);
          if (!o) return null;
          return h(
            'li',
            { class: 'equiv' },
            h(
              'div',
              { class: 'equiv__head' },
              h('span', { class: 'equiv__rank', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
              h('a', { class: 'equiv__obj', href: `#/arsenal/o/${o.id}` }, icon(o.icone, 20), h('span', null, o.nom)),
              efficacite(it.efficacite)
            ),
            h(
              'dl',
              { class: 'equiv__body' },
              h('div', null, h('dt', null, t('arsenal.comment')), h('dd', null, it.comment)),
              h('div', null, h('dt', null, t('arsenal.pourquoi')), h('dd', null, it.pourquoi)),
              it.limite ? h('div', { class: 'equiv__limit' }, h('dt', null, t('arsenal.limite')), h('dd', null, it.limite)) : null
            )
          );
        })
      ),
      relatedLinks([{ title: t('arsenal.fichesTheorie'), icon: 'archive', items: fiches.map((f) => ({ href: `#/archives/${f!.id}`, label: f!.titre, icon: catIcon(f!.categories[0]) })) }])
    ),
    onMount: () => {
      markFonctionVue(fn.id);
      setLast(`#/arsenal/f/${fn.id}`, fn.titre);
    },
  };
}

export function objetDetail(ctx: RouteContext): View {
  const c = content();
  const o = c.byId.objet.get(ctx.params.id);
  if (!o) return notFoundView(t('arsenal.introuvable'), { href: '#/arsenal?vue=objets', label: t('arsenal.titre') });
  const fonctions = c.fonctionsParObjet.get(o.id) ?? [];
  const missions = c.missionsParObjet.get(o.id) ?? [];

  return {
    title: o.nom,
    section: 'arsenal',
    node: h(
      'article',
      { class: 'page page--reading objet' },
      pageHeader({
        kicker: t('arsenal.parObjet'),
        title: o.nom,
        icon: o.icone,
        back: { href: '#/arsenal?vue=objets', label: t('arsenal.titre') },
        actions: [favButton('objet', o.id, o.nom)],
      }),
      o.proprietes?.length || o.lieux?.length
        ? h(
            'div',
            { class: 'obj-facts' },
            o.proprietes?.length ? h('div', null, h('span', { class: 'hud-label' }, t('arsenal.objetProprietes')), h('div', { class: 'chips' }, ...o.proprietes.map((p) => h('span', { class: 'chip chip--accent' }, p)))) : null,
            o.lieux?.length ? h('div', null, h('span', { class: 'hud-label' }, t('arsenal.objetLieux')), h('div', { class: 'chips' }, ...o.lieux.map((l) => h('span', { class: 'chip chip--muted' }, t(`lieux.${l}`))))) : null
          )
        : null,
      h('h2', { class: 'block-title block-title--spaced' }, icon('multitool', 20), t('arsenal.objetFonctions')),
      fonctions.length
        ? h(
            'ul',
            { class: 'equiv-list' },
            ...fonctions.map((fn) => {
              const it = fn.objets.find((x) => x.objet === o.id);
              return h(
                'li',
                { class: 'equiv' },
                h('div', { class: 'equiv__head' }, h('a', { class: 'equiv__obj', href: `#/arsenal/f/${fn.id}` }, icon(fn.icone, 20), h('span', null, fn.titre)), it ? efficacite(it.efficacite) : null),
                it ? h('dl', { class: 'equiv__body' }, h('div', null, h('dt', null, t('arsenal.comment')), h('dd', null, it.comment)), h('div', null, h('dt', null, t('arsenal.pourquoi')), h('dd', null, it.pourquoi)), it.limite ? h('div', { class: 'equiv__limit' }, h('dt', null, t('arsenal.limite')), h('dd', null, it.limite)) : null) : null
              );
            })
          )
        : h('p', { class: 'muted' }, t('commun.aucun')),
      relatedLinks([{ title: t('arsenal.objetMissions'), icon: 'target', items: missions.map((m) => ({ href: `#/operations/${m.id}`, label: m.titre, icon: 'target', sub: m.code })) }])
    ),
  };
}
