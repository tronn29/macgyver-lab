/* Coquille de l'application : en-tête, navigation, rendu des vues, focus, thème, installation. */
import { content } from './core/content';
import { h } from './core/dom';
import { t } from './core/i18n';
import { checkBadges, currentStreak } from './core/progress';
import { fallback, resolve, route, type View } from './core/router';
import { getProgress, getSettings, subscribe, type Settings } from './core/store';
import { announce, iconBtn, openDialog, toast } from './ui/components';
import { icon } from './ui/icons';
import { initGlossaryTips } from './ui/richtext';
import { archivesList, ficheDetail } from './views/archives';
import { arsenalList, fonctionDetail, objetDetail } from './views/arsenal';
import { glossaireView } from './views/glossaire';
import { homeView } from './views/home';
import { experienceDetail, laboList } from './views/labo';
import { carnetView, errorView, favorisView, notFound, privacyView, searchView } from './views/misc';
import { missionBriefing, missionField, missionReport, operationsList } from './views/operations';
import { settingsView } from './views/settings';
import { statsView } from './views/stats';
import { defiView, parcoursDetail, parcoursList, revisionView } from './views/train';

/* ---------- Réglages appliqués au document ---------- */

const darkQuery = window.matchMedia('(prefers-color-scheme: light)');

export function applySettings(s: Settings = getSettings()): void {
  const d = document.documentElement;
  const theme = s.theme === 'system' ? (darkQuery.matches ? 'light' : 'dark') : s.theme;
  d.setAttribute('data-theme', theme);
  d.style.setProperty('--font-scale', String(s.fontScale));
  d.classList.toggle('motion-off', s.motion === 'off');
  d.classList.toggle('motion-on', s.motion === 'on');
  d.classList.toggle('contrast-high', s.contrast === 'high');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#edf1f5' : '#070b11');
}
darkQuery.addEventListener?.('change', () => getSettings().theme === 'system' && applySettings());

/* ---------- Installation (PWA) ---------- */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});
window.addEventListener('appinstalled', () => (deferredPrompt = null));

export function installState(): 'installed' | 'available' | 'manual' {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return 'installed';
  return deferredPrompt ? 'available' : 'manual';
}

export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
}

/* ---------- Routes ---------- */

function registerRoutes(): void {
  route('/', () => homeView());
  route('/archives', archivesList);
  route('/archives/:id', ficheDetail);
  route('/arsenal', arsenalList);
  route('/arsenal/f/:id', fonctionDetail);
  route('/arsenal/o/:id', objetDetail);
  route('/labo', laboList);
  route('/labo/:id', experienceDetail);
  route('/operations', () => operationsList());
  route('/operations/:id', missionBriefing);
  route('/operations/:id/terrain', missionField);
  route('/operations/:id/rapport', missionReport);
  route('/revision', () => revisionView());
  route('/defi', () => defiView());
  route('/parcours', () => parcoursList());
  route('/parcours/:id', parcoursDetail);
  route('/glossaire', glossaireView);
  route('/recherche', searchView);
  route('/favoris', () => favorisView());
  route('/carnet', () => carnetView());
  route('/progression', () => statsView());
  route('/reglages', () => settingsView());
  route('/confidentialite', () => privacyView());
  fallback(() => notFound());
}

/* ---------- Coquille ---------- */

const PRIMARY = [
  { id: 'accueil', href: '#/', icon: 'dashboard', label: () => t('nav.accueil'), long: () => t('nav.accueilLong') },
  { id: 'archives', href: '#/archives', icon: 'archive', label: () => t('nav.archives'), long: () => t('nav.archives') },
  { id: 'arsenal', href: '#/arsenal', icon: 'multitool', label: () => t('nav.arsenal'), long: () => t('nav.arsenalLong') },
  { id: 'labo', href: '#/labo', icon: 'flask', label: () => t('nav.labo'), long: () => t('nav.laboLong') },
  { id: 'operations', href: '#/operations', icon: 'target', label: () => t('nav.operations'), long: () => t('nav.operations') },
];

const SECONDARY = [
  { group: 'nav.entrainement', items: [
    { href: '#/defi', icon: 'flame', key: 'nav.defi' },
    { href: '#/revision', icon: 'refresh', key: 'nav.revision' },
    { href: '#/parcours', icon: 'route', key: 'nav.parcours' },
  ] },
  { group: 'nav.ressources', items: [
    { href: '#/recherche', icon: 'search', key: 'nav.recherche' },
    { href: '#/glossaire', icon: 'book', key: 'nav.glossaire' },
    { href: '#/favoris', icon: 'star', key: 'nav.favoris' },
    { href: '#/carnet', icon: 'pen', key: 'nav.carnet' },
  ] },
  { group: 'nav.profil', items: [
    { href: '#/progression', icon: 'chart', key: 'nav.stats' },
    { href: '#/reglages', icon: 'settings', key: 'nav.reglages' },
    { href: '#/confidentialite', icon: 'lock', key: 'nav.confidentialite' },
  ] },
];

function brandMark(): SVGSVGElement {
  // Emblème original : hexagone tactique, réticule et lame d'outil
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg class="brand__mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false"><path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 8v4M16 20v4M8 16h4M20 16h4" stroke="var(--c-orange)" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="16" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  return tpl.content.firstElementChild as SVGSVGElement;
}

let main: HTMLElement;
let navLinks: HTMLAnchorElement[] = [];
let streakChip: HTMLElement;
let netChip: HTMLElement;
let current: View | null = null;
let firstRender = true;
let isPop = false;
const scrollPositions = new Map<string, number>();

function secondaryLinks(onClick?: () => void): HTMLElement {
  return h(
    'div',
    { class: 'menu-groups' },
    ...SECONDARY.map((g) =>
      h(
        'div',
        { class: 'menu-group' },
        h('h2', { class: 'menu-group__title' }, t(g.group)),
        h('ul', null, ...g.items.map((it) => h('li', null, h('a', { class: 'menu-link', href: it.href, onclick: onClick }, icon(it.icon, 20), h('span', null, t(it.key))))))
      )
    )
  );
}

function openMenu(): void {
  const d = openDialog({ title: t('nav.menu'), body: secondaryLinks(() => d.close()) });
  d.el.classList.add('dialog--menu');
}

function paintStatus(): void {
  const s = currentStreak(getProgress());
  streakChip.replaceChildren(icon('flame', 16), h('span', null, String(s.jours)), h('span', { class: 'sr-only' }, ` ${t('home.serieJours', { n: s.jours })}`));
  streakChip.classList.toggle('is-danger', s.enDanger);
  streakChip.classList.toggle('is-ok', s.faitAujourdhui);
  streakChip.title = `${t('home.serie')} : ${t('home.serieJours', { n: s.jours })}`;
}

function paintNet(): void {
  const online = navigator.onLine;
  netChip.hidden = online;
  netChip.replaceChildren(icon('wifi-off', 16), h('span', null, t('app.horsLigne')));
  netChip.title = t('app.horsLigneDetail');
}

export function mountShell(root: HTMLElement): void {
  registerRoutes();
  initGlossaryTips();

  streakChip = h('a', { class: 'status-chip', href: '#/progression' });
  netChip = h('span', { class: 'status-chip status-chip--offline', role: 'status' });

  const header = h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'brand', href: '#/', title: t('app.accueil') }, brandMark(), h('span', { class: 'brand__name' }, 'MacGyver', h('b', null, ' Lab'))),
    h('div', { class: 'topbar__status' }, netChip, streakChip),
    h('div', { class: 'topbar__actions' }, h('a', { class: 'icon-btn', href: '#/recherche', 'aria-label': t('nav.recherche'), title: t('nav.recherche') }, icon('search', 22)), iconBtn('menu', t('nav.ouvrirMenu'), openMenu, { class: 'icon-btn topbar__menu' }))
  );

  navLinks = PRIMARY.map((n) =>
    h('a', { class: 'nav__link', href: n.href, 'data-section': n.id, title: n.long() }, h('span', { class: 'nav__icon', 'aria-hidden': 'true' }, icon(n.icon, 24)), h('span', { class: 'nav__label' }, n.label()))
  );
  const nav = h('nav', { class: 'nav', 'aria-label': t('nav.principale') }, h('ul', { class: 'nav__list' }, ...navLinks.map((a) => h('li', null, a))), h('div', { class: 'nav__more' }, secondaryLinks()));

  main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
  root.replaceChildren(h('div', { class: 'shell' }, header, nav, main));
  root.removeAttribute('aria-busy');

  paintStatus();
  paintNet();
  subscribe(() => paintStatus());
  window.addEventListener('online', () => {
    paintNet();
    toast(t('app.enLigne'), { icon: 'wifi', duration: 2500 });
  });
  window.addEventListener('offline', () => {
    paintNet();
    toast(t('app.horsLigneDetail'), { icon: 'wifi-off', tone: 'orange' });
  });

  // Raccourci clavier : « / » ouvre la recherche (hors champs de saisie)
  document.addEventListener('keydown', (e) => {
    const el = e.target instanceof Element ? e.target : document.body;
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !el.closest('input, textarea, select, [contenteditable]') && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      location.hash = '#/recherche';
    }
  });

  window.addEventListener('popstate', () => (isPop = true));
  window.addEventListener('hashchange', () => void render());
  void render();
}

async function render(): Promise<void> {
  const key = location.hash || '#/';
  const prevKey = (main.dataset.route as string) || '';
  if (prevKey) scrollPositions.set(prevKey, window.scrollY);

  let view: View;
  try {
    const { handler, ctx } = resolve(key);
    view = await handler(ctx);
  } catch (err) {
    console.error(err);
    view = errorView(err);
  }

  try {
    current?.onLeave?.();
  } catch {
    /* ignore */
  }
  current = view;

  view.node.classList.add('view-enter');
  main.replaceChildren(view.node);
  main.dataset.route = key;
  document.title = view.title === t('nav.accueilLong') ? t('app.nom') : `${view.title} · ${t('app.nom')}`;

  for (const a of navLinks) {
    const on = a.dataset.section === view.section;
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  // Défilement : restauré au retour arrière sur les listes, sinon en haut
  const saved = scrollPositions.get(key);
  if (isPop && view.keepScroll && saved !== undefined) window.scrollTo(0, saved);
  else window.scrollTo(0, 0);
  isPop = false;

  // Focus : sur le titre de la nouvelle page (sauf premier affichage)
  if (!firstRender) {
    const heading = view.node.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    } else main.focus({ preventScroll: true });
    announce(view.title);
  }
  firstRender = false;

  try {
    view.onMount?.();
  } catch (err) {
    console.error(err);
  }

  // Insignes débloqués
  window.setTimeout(() => {
    for (const id of checkBadges(content())) toast(t('stats.badgeObtenu', { b: t(`badges.${id}.nom`) }), { icon: 'trophy', tone: 'success' });
  }, 400);
}
