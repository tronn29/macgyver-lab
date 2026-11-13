/*
 * Routeur par ancre (#/chemin?param=valeur) : compatible GitHub Pages et Netlify
 * sans réécriture d'URL, et fonctionne hors connexion.
 */

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

export interface View {
  title: string;
  section: string; // onglet actif de la navigation
  node: HTMLElement;
  onMount?: () => void;
  onLeave?: () => void;
  /** Conserver la position de défilement au retour (listes). */
  keepScroll?: boolean;
}

type Handler = (ctx: RouteContext) => View | Promise<View>;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];
let notFound: Handler | null = null;

export function route(path: string, handler: Handler): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' +
      path.replace(/\//g, '\\/').replace(/:(\w+)/g, (_, k: string) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '\\/?$'
  );
  routes.push({ pattern, keys, handler });
}

export function fallback(handler: Handler): void {
  notFound = handler;
}

export function parseHash(hash: string = location.hash): { path: string; query: URLSearchParams } {
  const raw = hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const path = p.startsWith('/') ? p : `/${p}`;
  return { path: decodeURI(path), query: new URLSearchParams(q) };
}

export function resolve(hash: string = location.hash): { handler: Handler; ctx: RouteContext } {
  const { path, query } = parseHash(hash);
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: r.handler, ctx: { path, params, query } };
    }
  }
  return { handler: notFound as Handler, ctx: { path, params: {}, query } };
}

export function navigate(to: string, replace = false): void {
  const hash = to.startsWith('#') ? to : `#${to}`;
  if (replace) {
    history.replaceState(history.state, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}

/** Met à jour la requête sans recréer l'historique (filtres, onglets). */
export function setQuery(params: Record<string, string | null>): void {
  const { path, query } = parseHash();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === '') query.delete(k);
    else query.set(k, v);
  }
  const qs = query.toString();
  history.replaceState(history.state, '', `#${path}${qs ? `?${qs}` : ''}`);
}
