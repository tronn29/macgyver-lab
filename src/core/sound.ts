/* Sons d'interface synthétisés (aucun fichier audio). Désactivés par défaut. */
import { getSettings } from './store';

type Cue = 'tap' | 'success' | 'fail' | 'tick' | 'hint' | 'scan' | 'alarm';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!getSettings().son) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.06): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

export function play(cue: Cue): void {
  const ac = audio();
  if (!ac) return;
  switch (cue) {
    case 'tap':
      tone(ac, 880, 0, 0.05, 'triangle', 0.03);
      break;
    case 'tick':
      tone(ac, 1400, 0, 0.03, 'square', 0.015);
      break;
    case 'hint':
      tone(ac, 520, 0, 0.12, 'sine');
      tone(ac, 780, 0.1, 0.16, 'sine');
      break;
    case 'scan':
      tone(ac, 300, 0, 0.5, 'sawtooth', 0.015);
      tone(ac, 600, 0.1, 0.4, 'sine', 0.02);
      break;
    case 'success':
      tone(ac, 660, 0, 0.12, 'triangle');
      tone(ac, 880, 0.12, 0.12, 'triangle');
      tone(ac, 1320, 0.24, 0.25, 'triangle');
      break;
    case 'fail':
      tone(ac, 330, 0, 0.18, 'sawtooth', 0.03);
      tone(ac, 247, 0.18, 0.3, 'sawtooth', 0.03);
      break;
    case 'alarm':
      tone(ac, 980, 0, 0.12, 'square', 0.03);
      tone(ac, 980, 0.2, 0.12, 'square', 0.03);
      break;
  }
}

/** Retour haptique discret (si disponible et sons activés). */
export function buzz(ms = 12): void {
  if (getSettings().son && 'vibrate' in navigator) navigator.vibrate?.(ms);
}
