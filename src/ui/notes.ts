/* Carnet de terrain : note personnelle attachée à une fiche, une expérience ou une mission. */
import { debounce, h } from '../core/dom';
import { t } from '../core/i18n';
import { getProgress, update } from '../core/store';
import { icon } from './icons';

export function notesPanel(key: string, titre: string, route: string): HTMLElement {
  const id = `note-${key.replace(/[^a-z0-9-]/gi, '-')}`;
  const status = h('span', { class: 'notes__status', 'aria-live': 'polite' });
  const area = h('textarea', { id, class: 'input textarea notes__area', rows: 4, maxlength: 4000, placeholder: t('carnet.placeholder'), 'aria-describedby': `${id}-help` });
  area.value = getProgress().notes[key]?.texte ?? '';
  const save = debounce(() => {
    const texte = area.value.trim();
    update((p) => {
      if (texte) p.notes[key] = { texte: area.value, titre, route, maj: new Date().toISOString() };
      else delete p.notes[key];
    });
    status.textContent = t('carnet.enregistre');
    window.setTimeout(() => (status.textContent = ''), 1800);
  }, 500);
  area.addEventListener('input', save as EventListener);
  return h(
    'section',
    { class: 'panel notes' },
    h('label', { for: id, class: 'block-title' }, icon('pen', 20), t('carnet.panneau')),
    h('p', { id: `${id}-help`, class: 'field__help' }, t('carnet.aide')),
    area,
    h('div', { class: 'field__foot' }, status)
  );
}
