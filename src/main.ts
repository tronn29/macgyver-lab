/* Point d'entrée : polices locales, styles, contenu, coquille, service worker. */
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/views.css';
import './styles/schemas.css';

import { applySettings, mountShell } from './app';
import { loadContent, setContent } from './core/content';
import { h } from './core/dom';
import { setLocale, t } from './core/i18n';
import { getSettings, isPersistent } from './core/store';
import { toast } from './ui/components';
import { icon } from './ui/icons';

async function boot(): Promise<void> {
  const root = document.getElementById('app') as HTMLElement;
  setLocale('fr');
  applySettings(getSettings());
  try {
    const c = await loadContent('fr');
    setContent(c);
    mountShell(root);
    if (!isPersistent()) toast(t('app.stockageIndispo'), { icon: 'alert', tone: 'orange', duration: 8000 });
  } catch (err) {
    console.error(err);
    root.removeAttribute('aria-busy');
    root.replaceChildren(
      h(
        'div',
        { class: 'boot boot--error', role: 'alert' },
        icon('wifi-off', 40),
        h('h1', { class: 'boot__title' }, t('app.erreurChargement')),
        h('p', { class: 'boot__text' }, t('app.erreurDetail')),
        h('button', { type: 'button', class: 'btn btn--primary', onclick: () => location.reload() }, icon('refresh', 18), h('span', null, t('app.reessayer')))
      )
    );
  }
}

function registerSW(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      const offerUpdate = (worker: ServiceWorker) =>
        toast(t('app.majDispo'), {
          icon: 'refresh',
          tone: 'accent',
          duration: 20000,
          action: { label: t('app.majAction'), onClick: () => worker.postMessage('skip-waiting') },
        });
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) offerUpdate(worker);
            else toast(t('app.prete'), { icon: 'wifi', tone: 'success' });
          }
        });
      });
      // Rechargement uniquement après une mise à jour demandée (pas à la première installation)
      const hadController = Boolean(navigator.serviceWorker.controller);
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading || !hadController) return;
        reloading = true;
        location.reload();
      });
      // Vérifie les mises à jour au retour sur l'appli
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => undefined));
    } catch (err) {
      console.warn('[sw]', err);
    }
  });
}

void boot();
registerSW();
