/* Lecture vocale d'une fiche (synthèse vocale du navigateur, hors connexion si la voix est installée). */
import { h } from '../core/dom';
import { t } from '../core/i18n';
import type { Fiche } from '../core/types';
import { icon } from './icons';
import { plain } from './richtext';

export function speechAvailable(): boolean {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function ficheScript(f: Fiche, enfant: boolean): string[] {
  const parts = [f.titre + '.'];
  if (enfant) parts.push(f.enfant);
  parts.push(`${t('archives.principe')}.`, ...f.principe);
  if (!enfant) parts.push(`${t('archives.pourquoi')}.`, ...f.pourquoi.map(plain));
  parts.push(`${t('verdict.titre')} ${t(`verdict.${f.realite.verdict}`)}.`, f.realite.explication);
  return parts;
}

export function stopSpeech(): void {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

export function listenButton(f: Fiche, isEnfant: () => boolean): HTMLButtonElement | null {
  if (!speechAvailable()) return null;
  const btn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm listen', 'aria-pressed': 'false' });
  const paint = (on: boolean) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.replaceChildren(icon(on ? 'pause' : 'volume', 18), h('span', null, on ? t('ecoute.arreter') : t('ecoute.ecouter')));
  };
  paint(false);
  btn.addEventListener('click', () => {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      paint(false);
      return;
    }
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang?.toLowerCase().startsWith('fr')) ?? null;
    const lines = ficheScript(f, isEnfant());
    lines.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line);
      u.lang = 'fr-FR';
      if (voice) u.voice = voice;
      u.rate = 1;
      if (i === lines.length - 1) u.onend = () => paint(false);
      u.onerror = () => paint(false);
      synth.speak(u);
    });
    paint(true);
  });
  return btn;
}
