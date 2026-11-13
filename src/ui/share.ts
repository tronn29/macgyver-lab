/*
 * Partage d'une fiche en image (PNG 1080 × 1350) : rendu sur canvas avec le schéma,
 * le principe en 3 lignes et le verdict. Utilise le partage natif si possible,
 * sinon télécharge l'image. Rien n'est envoyé sans action de l'utilisateur.
 */
import { t } from '../core/i18n';
import type { Fiche } from '../core/types';
import { toast } from './components';
import { fetchSvg, sanitizeSvg, ensureSchemaDefs } from './schema';

const W = 1080;
const H = 1350;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Transforme le SVG thématisé en SVG autonome (styles calculés en ligne). */
async function standaloneSvg(fichier: string): Promise<string | null> {
  const markup = await fetchSvg(fichier);
  const svg = sanitizeSvg(markup);
  if (!svg) return null;
  ensureSchemaDefs();
  const host = document.createElement('div');
  host.className = 'schema';
  host.style.cssText = 'position:fixed;left:-9999px;top:0;width:720px;visibility:hidden';
  host.appendChild(svg);
  document.body.appendChild(host);
  const props = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-weight', 'font-family', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'opacity'];
  svg.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    const style: string[] = [];
    for (const p of props) {
      let v = cs.getPropertyValue(p);
      if (p === 'opacity' && el.classList.contains('s-diffuse')) v = '0.55';
      if (p === 'opacity' && (el.classList.contains('s-pulse') || el.classList.contains('s-blink'))) v = '1';
      if (v) style.push(`${p}:${v}`);
    }
    if (el.classList.contains('s-draw')) style.push('stroke-dashoffset:0;stroke-dasharray:none');
    if (el.classList.contains('s-flow')) style.push('stroke-dasharray:6 6');
    el.setAttribute('style', style.join(';'));
    el.removeAttribute('class');
    const filter = el.getAttribute('filter');
    if (filter) el.removeAttribute('filter');
  });
  // Marqueurs : copie des définitions avec couleurs résolues
  const defs = document.querySelector('#mg-defs defs')?.cloneNode(true) as Element | undefined;
  if (defs) {
    defs.querySelectorAll('[class]').forEach((el) => {
      const cls = el.getAttribute('class') ?? '';
      const color = cls.includes('hot') ? cssVar('--sc-hot') : cls.includes('cold') ? cssVar('--sc-cold') : cls.includes('accent') ? cssVar('--sc-accent') : cssVar('--sc-line');
      if (cls.includes('tick')) el.setAttribute('style', `stroke:${cssVar('--sc-muted')};stroke-width:1.2;fill:none`);
      else el.setAttribute('style', `fill:${color}`);
      el.removeAttribute('class');
    });
    defs.querySelector('filter')?.remove();
    svg.insertBefore(defs, svg.firstChild);
  }
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', '720');
  svg.setAttribute('height', '480');
  svg.querySelectorAll('[style*="url(#mg-glow)"]').forEach((el) => el.setAttribute('style', (el.getAttribute('style') ?? '').replace(/filter:[^;]+;?/, '')));
  const out = new XMLSerializer().serializeToString(svg);
  host.remove();
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderFicheImage(f: Fiche): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const bg0 = cssVar('--c-bg-0') || '#04070b';
  const bg1 = cssVar('--c-bg-1') || '#070b11';
  const text = cssVar('--c-text') || '#e8edf2';
  const text2 = cssVar('--c-text-2') || '#aebbc8';
  const accent = cssVar('--c-accent') || '#2ee6e6';
  const orange = cssVar('--c-orange') || '#ff8a1f';
  const border = cssVar('--c-border-strong') || 'rgba(110,228,236,.38)';
  const head = '600 64px "Chakra Petch", "Segoe UI", sans-serif';
  const body = '400 34px "Inter Variable", Inter, system-ui, sans-serif';
  const mono = '500 24px "JetBrains Mono", ui-monospace, monospace';

  // Fond + grille
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg1);
  g.addColorStop(1, bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = cssVar('--sc-grid') || 'rgba(110,200,220,.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  // Cadre HUD
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 40);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 40, y);
    ctx.stroke();
  };
  corner(40, 40, 1, 1);
  corner(W - 40, 40, -1, 1);
  corner(40, H - 40, 1, -1);
  corner(W - 40, H - 40, -1, -1);

  // En-tête
  ctx.fillStyle = accent;
  ctx.font = mono;
  ctx.fillText('MACGYVER LAB · ARCHIVES', 90, 120);
  ctx.fillStyle = text;
  ctx.font = head;
  let y = 200;
  for (const line of wrapText(ctx, f.titre, W - 180).slice(0, 2)) {
    ctx.fillText(line, 90, y);
    y += 74;
  }

  // Schéma
  try {
    const svg = await standaloneSvg(f.schema.fichier);
    if (svg) {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      ctx.fillStyle = cssVar('--sc-bg') || '#081019';
      ctx.fillRect(90, y, W - 180, 600);
      ctx.drawImage(img, 90 + (W - 180 - 900) / 2, y + 0, 900, 600);
    }
  } catch {
    /* schéma facultatif */
  }
  y += 640;

  // Principe en 3 lignes
  ctx.font = mono;
  ctx.fillStyle = accent;
  ctx.fillText(t('archives.principe').toUpperCase(), 90, y);
  y += 50;
  ctx.font = body;
  f.principe.forEach((p, i) => {
    ctx.fillStyle = orange;
    ctx.font = mono;
    ctx.fillText(`0${i + 1}`, 90, y);
    ctx.fillStyle = text;
    ctx.font = body;
    for (const line of wrapText(ctx, p, W - 260).slice(0, 2)) {
      ctx.fillText(line, 150, y);
      y += 44;
    }
    y += 10;
  });

  // Verdict
  ctx.font = mono;
  ctx.fillStyle = text2;
  ctx.fillText(`${t('verdict.titre')} ${t(`verdict.${f.realite.verdict}`)}`.toUpperCase(), 90, H - 90);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'));
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function shareFiche(f: Fiche): Promise<void> {
  toast(t('commun.partageEnCours'), { icon: 'share', duration: 1800 });
  try {
    await document.fonts?.ready;
    const blob = await renderFicheImage(f);
    const file = new File([blob], `macgyver-lab-${f.id}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: f.titre, text: f.principe.join(' ') });
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    download(blob, file.name);
    toast(t('commun.partageOk'), { icon: 'download', tone: 'success' });
  } catch {
    toast(t('commun.partageErreur'), { icon: 'alert', tone: 'danger' });
  }
}
