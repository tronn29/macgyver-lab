/* Réglages : affichage, accessibilité, sons, données (export/import/effacement), installation. */
import { content } from '../core/content';
import { h } from '../core/dom';
import { t } from '../core/i18n';
import { exportProgress, getSettings, importProgress, isPersistent, resetProgress, setSettings, type Settings } from '../core/store';
import { btn, confirmDialog, linkBtn, panel, segmented, switchControl, toast } from '../ui/components';
import { icon } from '../ui/icons';
import { applySettings, installState, promptInstall } from '../app';
import { pageHeader } from './common';

declare const __APP_VERSION__: string;

function usedKb(): number {
  try {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      if (k.startsWith('mgl:')) n += (localStorage.getItem(k) ?? '').length + k.length;
    }
    return Math.round((n * 2) / 1024);
  } catch {
    return 0;
  }
}

export function settingsView() {
  const s = getSettings();
  const set = (patch: Partial<Settings>) => applySettings(setSettings(patch));

  const scaleOut = h('output', { class: 'mono', for: 'font-scale' }, `${Math.round(s.fontScale * 100)} %`);
  const range = h('input', { type: 'range', id: 'font-scale', class: 'range', min: '0.85', max: '1.5', step: '0.05', value: String(s.fontScale), 'aria-describedby': 'font-desc' });
  range.addEventListener('input', () => {
    const v = Number(range.value);
    scaleOut.textContent = `${Math.round(v * 100)} %`;
    set({ fontScale: v });
  });

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'import-file', tabindex: '-1' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      importProgress(await file.text());
      applySettings(getSettings());
      toast(t('reglages.importOk'), { icon: 'check', tone: 'success' });
    } catch {
      toast(t('reglages.importErreur'), { icon: 'alert', tone: 'danger' });
    }
    fileInput.value = '';
  });

  const exportData = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `macgyver-lab-sauvegarde-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const inst = installState();
  const installBlock = panel(
    [
      h('h2', { class: 'block-title' }, icon('download', 20), t('reglages.installer')),
      h('p', { class: 'panel__text' }, t('reglages.installerDesc')),
      inst === 'installed'
        ? h('p', { class: 'notice notice--success' }, icon('check', 18), t('reglages.installerOk'))
        : inst === 'available'
          ? btn(t('reglages.installer'), { variant: 'primary', icon: 'download', onClick: () => void promptInstall() })
          : h('p', { class: 'notice notice--info' }, icon('info', 18), t('reglages.installerIos')),
    ]
  );

  const offlineReady = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);

  return {
    title: t('reglages.titre'),
    section: '',
    node: h(
      'div',
      { class: 'page page--reading settings' },
      pageHeader({ kicker: t('reglages.kicker'), title: t('reglages.titre'), icon: 'settings' }),
      h(
        'section',
        { class: 'panel settings__group', 'aria-labelledby': 'aff-t' },
        h('h2', { class: 'block-title', id: 'aff-t' }, icon('eye', 20), t('reglages.affichage')),
        segmented<Settings['theme']>(
          t('reglages.theme'),
          [
            { value: 'dark', label: t('reglages.themeSombre'), icon: 'moon' },
            { value: 'light', label: t('reglages.themeClair'), icon: 'sun' },
            { value: 'system', label: t('reglages.themeSysteme'), icon: 'phone' },
          ],
          s.theme,
          (v) => set({ theme: v })
        ),
        h(
          'div',
          { class: 'setting setting--col' },
          h('div', { class: 'setting__row' }, h('label', { for: 'font-scale', class: 'setting__label' }, icon('text-size', 18), t('reglages.taille')), scaleOut),
          h('p', { id: 'font-desc', class: 'setting__desc' }, t('reglages.tailleDesc')),
          range,
          h('p', { class: 'setting__preview' }, t('reglages.apercu'))
        ),
        segmented<Settings['motion']>(
          t('reglages.mouvement'),
          [
            { value: 'system', label: t('reglages.mouvementSysteme') },
            { value: 'on', label: t('reglages.mouvementOn') },
            { value: 'off', label: t('reglages.mouvementOff') },
          ],
          s.motion,
          (v) => set({ motion: v })
        ),
        switchControl(t('reglages.contraste'), s.contrast === 'high', (v) => set({ contrast: v ? 'high' : 'normal' }), t('reglages.contrasteDesc'))
      ),
      h(
        'section',
        { class: 'panel settings__group', 'aria-labelledby': 'exp-t' },
        h('h2', { class: 'block-title', id: 'exp-t' }, icon('spark', 20), t('reglages.experience')),
        switchControl(t('reglages.son'), s.son, (v) => set({ son: v }), t('reglages.sonDesc')),
        switchControl(t('reglages.chrono'), s.chronoParDefaut, (v) => set({ chronoParDefaut: v }), t('reglages.chronoDesc')),
        switchControl(t('reglages.enfant'), s.modeEnfant, (v) => set({ modeEnfant: v }), t('reglages.enfantDesc'))
      ),
      installBlock,
      h(
        'section',
        { class: 'panel settings__group', 'aria-labelledby': 'data-t' },
        h('h2', { class: 'block-title', id: 'data-t' }, icon('lock', 20), t('reglages.donnees')),
        h('p', { class: 'panel__text' }, t('reglages.donneesDesc'), ' ', h('a', { href: '#/confidentialite' }, t('nav.confidentialite'))),
        !isPersistent() ? h('p', { class: 'notice notice--warning' }, icon('alert', 18), t('app.stockageIndispo')) : null,
        h(
          'div',
          { class: 'btn-row' },
          btn(t('reglages.exporter'), { variant: 'ghost', icon: 'download', onClick: exportData }),
          h('label', { for: 'import-file', class: 'btn btn--ghost', tabindex: '0', role: 'button', onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } } }, icon('upload', 18), h('span', null, t('reglages.importer'))),
          fileInput
        ),
        btn(t('reglages.reinitialiser'), {
          variant: 'danger',
          icon: 'trash',
          onClick: () =>
            confirmDialog(t('reglages.reinitTitre'), t('reglages.reinitTexte'), t('reglages.reinitialiser'), () => {
              resetProgress();
              toast(t('reglages.reinitOk'), { icon: 'check' });
            }, true),
        }),
        h('p', { class: 'muted small' }, t('reglages.stockage', { n: usedKb() }))
      ),
      h(
        'section',
        { class: 'panel settings__group', 'aria-labelledby': 'about-t' },
        h('h2', { class: 'block-title', id: 'about-t' }, icon('info', 20), t('reglages.aPropos')),
        h('p', { class: 'mono small' }, t('reglages.version', { v: __APP_VERSION__, c: content().version })),
        h('p', { class: ['notice', offlineReady ? 'notice--success' : 'notice--info'] }, icon(offlineReady ? 'wifi' : 'wifi-off', 18), offlineReady ? t('reglages.horsLignePret') : t('reglages.horsLigneNon')),
        linkBtn(t('nav.confidentialite'), '#/confidentialite', { variant: 'quiet', icon: 'lock' })
      )
    ),
  };
}
