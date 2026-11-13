/* Opérations (Missions) : liste, briefing, terrain (scan + solution + indices + chrono), rapport. */
import { content } from '../core/content';
import { debounce, h } from '../core/dom';
import { fmtDate, t } from '../core/i18n';
import { recordMission, setLast } from '../core/progress';
import type { RouteContext, View } from '../core/router';
import { navigate } from '../core/router';
import { applyAlternative, HINT_COST, MAX, PASS_SCORE, scoreMission, type ScoreResult } from '../core/scoring';
import { buzz, play } from '../core/sound';
import { getProgress, getSettings, update, type MissionRun } from '../core/store';
import type { Difficulte, Mission } from '../core/types';
import { announce, btn, confirmDialog, emptyState, label, linkBtn, panel, segmented, switchControl, toast } from '../ui/components';
import { icon } from '../ui/icons';
import { notesPanel } from '../ui/notes';
import { catIcon, catName, favButton, missionCard, notFoundView, pageHeader, relatedLinks } from './common';

const ORDER: Difficulte[] = ['facile', 'moyen', 'difficile'];

/* ===================== Liste ===================== */

export function operationsList(): View {
  const c = content();
  const runs = getProgress().missions;
  const groups = ORDER.map((d) => ({ d, items: c.missions.filter((m) => m.difficulte === d) })).filter((g) => g.items.length);
  const reussies = c.missions.filter((m) => runs.some((r) => r.id === m.id && r.reussie)).length;
  return {
    title: t('operations.titre'),
    section: 'operations',
    keepScroll: true,
    node: h(
      'div',
      { class: 'page' },
      pageHeader({
        kicker: t('operations.kicker'),
        title: t('operations.titre'),
        icon: 'target',
        intro: t('operations.intro'),
        meta: [h('span', { class: 'chip chip--accent' }, icon('check', 14), t('home.reussies', { a: reussies, b: c.missions.length })), h('a', { class: 'chip chip--link', href: '#/progression' }, icon('history', 14), t('operations.historique'))],
      }),
      h('p', { class: 'notice notice--info' }, icon('info', 18), t('operations.niveaux')),
      ...groups.map((g) =>
        h(
          'section',
          { class: 'ops-group', 'aria-labelledby': `grp-${g.d}` },
          h('h2', { class: 'ops-group__title', id: `grp-${g.d}` }, h('span', { class: `difficulty difficulty--${ORDER.indexOf(g.d) + 1}` }, h('span', { class: 'difficulty__bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), t(`difficulte.${g.d}`))),
          h('div', { class: 'card-grid' }, ...g.items.map(missionCard))
        )
      )
    ),
  };
}

/* ===================== Briefing ===================== */

export function missionBriefing(ctx: RouteContext): View {
  const c = content();
  const m = c.byId.mission.get(ctx.params.id);
  if (!m) return notFoundView(t('operations.introuvable'), { href: '#/operations', label: t('operations.titre') });
  const p = getProgress();
  const draft = p.brouillons[m.id];
  const runs = p.missions.filter((r) => r.id === m.id).slice(-5).reverse();
  let chrono = draft?.chrono ?? getSettings().chronoParDefaut;

  const launch = (fresh: boolean) => {
    if (fresh && draft) update((pp) => delete pp.brouillons[m.id]);
    navigate(`/operations/${m.id}/terrain?chrono=${chrono ? 1 : 0}`);
  };

  return {
    title: m.titre,
    section: 'operations',
    node: h(
      'article',
      { class: 'page briefing' },
      pageHeader({
        kicker: `${t('operations.dossier')} · ${m.code ?? m.id.toUpperCase()}`,
        title: m.titre,
        back: { href: '#/operations', label: t('operations.titre') },
        actions: [favButton('mission', m.id, m.titre)],
        meta: [
          h('span', { class: `difficulty difficulty--${ORDER.indexOf(m.difficulte) + 1}` }, h('span', { class: 'difficulty__bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), t(`difficulte.${m.difficulte}`)),
          ...m.categories.map((id) => h('span', { class: 'chip chip--muted' }, icon(catIcon(id), 14), catName(id))),
          h('span', { class: 'chip chip--muted' }, icon('scan', 14), t('commun.objets', { n: m.objets.length })),
        ],
      }),
      h(
        'div',
        { class: 'dossier hud-corners' },
        h('div', { class: 'dossier__stamp', 'aria-hidden': 'true' }, m.code ?? 'OP'),
        h('dl', { class: 'dossier__grid' },
          h('div', { class: 'dossier__row' }, h('dt', null, t('operations.lieu')), h('dd', { class: 'dossier__mono' }, m.briefing.lieu)),
          h('div', { class: 'dossier__row' }, h('dt', null, t('operations.situation')), h('dd', null, m.briefing.contexte)),
          h('div', { class: 'dossier__row dossier__row--goal' }, h('dt', null, t('operations.objectif')), h('dd', null, icon('target', 18), h('strong', null, m.briefing.objectif))),
          m.briefing.contraintes?.length
            ? h('div', { class: 'dossier__row' }, h('dt', null, t('operations.contraintes')), h('dd', null, h('ul', { class: 'bullets' }, ...m.briefing.contraintes.map((x) => h('li', null, x)))))
            : null
        )
      ),
      h(
        'div',
        { class: 'briefing__launch panel' },
        switchControl(t('operations.chrono'), chrono, (v) => (chrono = v), t('operations.chronoDesc', { n: m.duree })),
        h(
          'div',
          { class: 'briefing__actions' },
          draft ? btn(t('operations.reprendreBrouillon'), { variant: 'action', icon: 'play', onClick: () => launch(false) }) : null,
          btn(t('operations.lancer'), { variant: draft ? 'ghost' : 'action', icon: 'scan', onClick: () => launch(true) })
        )
      ),
      runs.length
        ? h(
            'section',
            { 'aria-labelledby': 'hist-t' },
            h('h2', { class: 'block-title block-title--spaced', id: 'hist-t' }, icon('history', 20), t('operations.historique')),
            h('ul', { class: 'run-list' }, ...runs.map((r) => runRow(r, m)))
          )
        : null,
      notesPanel(`mission:${m.id}`, m.titre, `#/operations/${m.id}`)
    ),
    onMount: () => setLast(`#/operations/${m.id}`, m.titre),
  };
}

export function runRow(r: MissionRun, m?: Mission): HTMLElement {
  return h(
    'li',
    { class: ['run', r.reussie ? 'run--ok' : 'run--ko'] },
    h('span', { class: 'run__score' }, String(r.score)),
    h('span', { class: 'run__main' }, h('strong', null, m?.titre ?? r.id), h('small', null, `${fmtDate(new Date(r.date), { dateStyle: 'medium', timeStyle: 'short' })} · ${r.details.indices.length} ${t('operations.indices').toLowerCase()}`)),
    h('span', { class: 'run__status' }, icon(r.reussie ? 'check' : 'refresh', 16), r.reussie ? t('operations.statutReussie') : t('operations.statutRevoir'))
  );
}

/* ===================== Terrain ===================== */

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function missionField(ctx: RouteContext): View {
  const c = content();
  const m = c.byId.mission.get(ctx.params.id);
  if (!m) return notFoundView(t('operations.introuvable'), { href: '#/operations', label: t('operations.titre') });

  const draft = getProgress().brouillons[m.id];
  const chrono = ctx.query.get('chrono') === '1';
  const selection = new Set<string>(draft?.selection ?? []);
  const indices = new Set<number>(draft?.indices ?? []);
  let texte = draft?.texte ?? '';
  let elapsed = draft?.temps ?? 0;
  let paused = false;
  let timerId: number | undefined;
  let warnedMinute = false;
  let warnedEnd = false;
  let submitted = false;
  const total = m.duree * 60;

  const saveDraft = () => {
    if (submitted) return;
    const vide = !selection.size && !texte.trim() && !indices.size && !(chrono && elapsed > 0);
    update((p) => {
      if (vide) delete p.brouillons[m.id];
      else p.brouillons[m.id] = { selection: [...selection], texte, indices: [...indices], temps: Math.round(elapsed), chrono, maj: new Date().toISOString() };
    });
  };
  const saveDraftSoon = debounce(saveDraft, 600);

  /* ---- Barre d'état (sticky) ---- */
  const selCount = h('span', { class: 'ops-bar__sel' });
  const timeEl = h('span', { class: 'ops-bar__time', role: 'timer', 'aria-label': t('operations.tempsRestant') });
  const pauseBtn = h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': t('operations.pause') }, icon('pause', 18));
  const timerBox = chrono ? h('div', { class: 'ops-bar__timer' }, icon('timer', 18), timeEl, pauseBtn) : null;

  const paintSel = () => {
    selCount.replaceChildren(icon('box-tools', 16), h('span', { 'aria-hidden': 'true' }, t('operations.selectionCourt', { n: selection.size })), h('span', { class: 'sr-only' }, t('operations.selectionNb', { n: selection.size })));
  };
  const paintTime = () => {
    if (!chrono) return;
    const left = total - elapsed;
    timeEl.textContent = left >= 0 ? fmtTime(left) : `−${fmtTime(-left)}`;
    timerBox?.classList.toggle('is-low', left <= 60 && left > 0);
    timerBox?.classList.toggle('is-over', left <= 0);
  };
  const tick = () => {
    if (paused || document.hidden) return;
    elapsed += 1;
    paintTime();
    const left = total - elapsed;
    if (left === 60 && !warnedMinute) {
      warnedMinute = true;
      announce(t('operations.minuteRestante'));
      play('alarm');
    }
    if (left === 0 && !warnedEnd) {
      warnedEnd = true;
      toast(t('operations.tempsEcoule'), { icon: 'timer', tone: 'orange' });
      play('alarm');
      buzz(80);
    }
    if (elapsed % 10 === 0) saveDraftSoon();
  };
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-label', paused ? t('operations.reprendre') : t('operations.pause'));
    pauseBtn.replaceChildren(icon(paused ? 'play' : 'pause', 18));
    timerBox?.classList.toggle('is-paused', paused);
  });

  const bar = h(
    'div',
    { class: 'ops-bar' },
    h('span', { class: 'ops-bar__code' }, m.code ?? m.id.toUpperCase()),
    selCount,
    timerBox
  );

  /* ---- Scan de la pièce ---- */
  const zoneLetters = 'ABCDEF';
  let vue: 'scan' | 'liste' = 'scan';
  const scanBox = h('div', { class: 'scan' });

  const objButton = (entry: Mission['objets'][number]) => {
    const o = c.byId.objet.get(entry.objet);
    if (!o) return null;
    const on = selection.has(o.id);
    const b = h(
      'button',
      { type: 'button', class: ['scan-obj', on && 'is-on'], 'aria-pressed': String(on), 'data-obj': o.id },
      h('span', { class: 'scan-obj__icon', 'aria-hidden': 'true' }, icon(o.icone, 20)),
      h('span', { class: 'scan-obj__text' }, h('span', { class: 'scan-obj__name' }, o.nom), entry.etat ? h('span', { class: 'scan-obj__state' }, entry.etat) : null),
      h('span', { class: 'scan-obj__mark', 'aria-hidden': 'true' }, icon('check', 14))
    );
    b.addEventListener('click', () => {
      const now = !selection.has(o.id);
      if (now) selection.add(o.id);
      else selection.delete(o.id);
      b.setAttribute('aria-pressed', String(now));
      b.classList.toggle('is-on', now);
      play('tap');
      paintSel();
      paintSelectedList();
      saveDraftSoon();
    });
    return b;
  };

  const renderScan = (animate: boolean) => {
    const zones = m.zones.map((z, zi) => {
      const items = m.objets.filter((o) => o.zone === z.id);
      return h(
        'section',
        { class: ['zone', vue === 'liste' && 'zone--list'], 'aria-labelledby': `zone-${z.id}` },
        h('h3', { class: 'zone__title', id: `zone-${z.id}` }, h('span', { class: 'zone__tag' }, `${t('operations.zone')} ${zoneLetters[zi] ?? zi + 1}`), z.nom, h('span', { class: 'zone__n' }, String(items.length))),
        h('div', { class: 'zone__items' }, ...items.map(objButton))
      );
    });
    scanBox.className = ['scan', vue === 'liste' ? 'scan--list' : 'scan--map', animate ? 'is-scanning' : ''].join(' ');
    scanBox.replaceChildren(h('div', { class: 'scan__sweep', 'aria-hidden': 'true' }), h('div', { class: 'scan__zones' }, ...zones));
    if (animate) {
      play('scan');
      window.setTimeout(() => scanBox.classList.remove('is-scanning'), 1600);
    }
  };

  const scanStatus = h('p', { class: 'scan-status', role: 'status' }, icon('radar', 16), t('operations.scanTermine', { n: m.objets.length }));

  /* ---- Sélection récapitulative ---- */
  const selectedList = h('div', { class: 'selected' });
  const paintSelectedList = () => {
    if (!selection.size) {
      selectedList.replaceChildren(h('p', { class: 'muted' }, t('operations.selectionVide')));
      return;
    }
    selectedList.replaceChildren(
      h(
        'ul',
        { class: 'chips' },
        ...[...selection].map((id) => {
          const o = c.byId.objet.get(id);
          if (!o) return null;
          return h(
            'li',
            null,
            h(
              'button',
              {
                type: 'button',
                class: 'chip chip--accent chip--removable',
                'aria-label': t('operations.retirer', { o: o.nom }),
                onclick: () => {
                  selection.delete(id);
                  const objBtn = scanBox.querySelector<HTMLButtonElement>(`[data-obj="${id}"]`);
                  objBtn?.setAttribute('aria-pressed', 'false');
                  objBtn?.classList.remove('is-on');
                  paintSel();
                  paintSelectedList();
                  saveDraftSoon();
                },
              },
              icon(o.icone, 14),
              o.nom,
              icon('close', 12)
            )
          );
        })
      )
    );
  };

  /* ---- Indices ---- */
  const hintsBox = h('div', { class: 'hints' });
  const paintHints = () => {
    hintsBox.replaceChildren(
      ...m.indices.map((txt, i) => {
        const n = i + 1;
        const open = indices.has(n);
        const locked = !open && n > 1 && !indices.has(n - 1);
        return h(
          'div',
          { class: ['hint', open && 'is-open', locked && 'is-locked'] },
          h('div', { class: 'hint__head' }, h('span', { class: 'hint__n' }, t('operations.indiceN', { n })), h('span', { class: 'hint__type' }, t(`operations.indiceType${n}`)), h('span', { class: 'hint__cost' }, t('operations.indiceCout', { n: HINT_COST[i] }))),
          open
            ? h('p', { class: 'hint__text' }, txt)
            : h(
                'button',
                {
                  type: 'button',
                  class: 'btn btn--ghost btn--sm',
                  disabled: locked,
                  title: locked ? t('operations.indiceVerrouille') : undefined,
                  onclick: () => {
                    indices.add(n);
                    play('hint');
                    paintHints();
                    saveDraftSoon();
                    hintsBox.querySelectorAll<HTMLElement>('.hint__text')[n - 1]?.focus();
                  },
                },
                icon(locked ? 'lock' : 'hint', 16),
                h('span', null, locked ? t('operations.indiceVerrouille') : t('operations.indiceDebloquer', { n: HINT_COST[i] }))
              )
        );
      })
    );
    hintsBox.querySelectorAll<HTMLElement>('.hint__text').forEach((el) => el.setAttribute('tabindex', '-1'));
  };

  /* ---- Solution écrite ---- */
  const counter = h('span', { class: 'field__counter', 'aria-live': 'off' });
  const area = h('textarea', { id: 'solution', class: 'input textarea', rows: 6, maxlength: 1500, placeholder: t('operations.solutionPlaceholder'), 'aria-describedby': 'solution-help' });
  area.value = texte;
  const paintCounter = () => (counter.textContent = t('operations.caracteres', { n: area.value.length }));
  area.addEventListener('input', () => {
    texte = area.value;
    paintCounter();
    saveDraftSoon();
  });

  const submitError = h('p', { class: 'form-error', role: 'alert' });
  const submit = () => {
    if (!selection.size || texte.trim().length < 10) {
      submitError.textContent = t('operations.soumettreVide');
      (selection.size ? area : scanBox.querySelector<HTMLElement>('.scan-obj'))?.focus();
      return;
    }
    submitted = true;
    window.clearInterval(timerId);
    const result = scoreMission(m, {
      selection: [...selection],
      texte,
      indices: [...indices],
      chrono: { actif: chrono, respecte: elapsed <= total },
    });
    const run: MissionRun = {
      id: m.id,
      date: new Date().toISOString(),
      score: result.total,
      reussie: result.reussie,
      details: {
        objets: result.objets,
        logique: result.logique,
        rigueur: result.rigueur,
        bonus: result.bonus,
        penaliteIndices: result.penaliteIndices,
        indices: [...indices].sort(),
        leurres: result.leurres,
        selection: [...selection],
        solution: result.meilleure.solution.id,
        texte,
        tempsSec: chrono ? Math.round(elapsed) : null,
        chrono,
        autoEval: null,
      },
      categories: m.categories,
    };
    const gain = recordMission(run);
    sessionStorage.setItem('mgl:lastGain', JSON.stringify({ id: m.id, ...gain }));
    navigate(`/operations/${m.id}/rapport`, true);
  };

  const quit = () =>
    confirmDialog(t('operations.abandonner'), t('operations.abandonConfirm'), t('operations.abandonner'), () => {
      saveDraft();
      navigate(`/operations/${m.id}`);
    });

  paintSel();
  paintTime();
  paintSelectedList();
  paintHints();
  paintCounter();
  renderScan(!draft);

  const node = h(
    'div',
    { class: 'page field-ops' },
    bar,
    pageHeader({
      kicker: `${m.code ?? ''} · ${t('operations.scan')}`,
      title: m.titre,
      back: { href: `#/operations/${m.id}`, label: t('operations.dossier') },
    }),
    h('p', { class: 'field-ops__goal' }, icon('target', 18), h('strong', null, m.briefing.objectif)),
    h(
      'div',
      { class: 'field-ops__layout' },
      h(
        'section',
        { class: 'field-ops__scan', 'aria-labelledby': 'scan-t' },
        h(
          'div',
          { class: 'section-head' },
          h('div', { class: 'section-head__text' }, label(t('operations.touche')), h('h2', { class: 'section-head__title', id: 'scan-t' }, icon('radar', 20), t('operations.scan'))),
          segmented<'scan' | 'liste'>(
            t('operations.scan'),
            [
              { value: 'scan', label: t('operations.vueCarte'), icon: 'grid' },
              { value: 'liste', label: t('operations.vueListe'), icon: 'list' },
            ],
            vue,
            (v) => {
              vue = v;
              renderScan(false);
            },
            { hideLegend: true }
          )
        ),
        scanStatus,
        scanBox
      ),
      h(
        'aside',
        { class: 'field-ops__side' },
        panel([h('h2', { class: 'block-title' }, icon('box-tools', 20), t('operations.selection')), selectedList], { class: 'selected-panel' }),
        panel([h('h2', { class: 'block-title' }, icon('hint', 20), t('operations.indices')), hintsBox]),
        panel(
          [
            h('label', { for: 'solution', class: 'block-title' }, icon('pen', 20), t('operations.solution')),
            h('p', { id: 'solution-help', class: 'field__help' }, t('operations.solutionAide')),
            area,
            h('div', { class: 'field__foot' }, counter),
            submitError,
            h('div', { class: 'field-ops__actions' }, btn(t('operations.soumettre'), { variant: 'action', icon: 'upload', block: true, onClick: submit }), btn(t('operations.abandonner'), { variant: 'quiet', small: true, onClick: quit }))
          ],
          { class: 'solution-panel', corners: true }
        )
      )
    )
  );

  return {
    title: m.titre,
    section: 'operations',
    node,
    onMount: () => {
      if (chrono) timerId = window.setInterval(tick, 1000);
    },
    onLeave: () => {
      window.clearInterval(timerId);
      if (!submitted) saveDraft();
    },
  };
}

/* ===================== Rapport ===================== */

function scoreBar(name: string, value: number, max: number, negative = false): HTMLElement {
  const pct = max ? Math.round((Math.abs(value) / max) * 100) : 0;
  return h(
    'div',
    { class: ['score-bar', negative && 'score-bar--neg'] },
    h('span', { class: 'score-bar__name' }, name),
    h('span', { class: 'score-bar__track', 'aria-hidden': 'true' }, h('span', { class: 'score-bar__fill', style: { width: `${Math.min(100, pct)}%` } })),
    h('span', { class: 'score-bar__value' }, negative ? `−${Math.abs(value)}` : `${value}/${max}`)
  );
}

export function missionReport(ctx: RouteContext): View {
  const c = content();
  const m = c.byId.mission.get(ctx.params.id);
  if (!m) return notFoundView(t('operations.introuvable'), { href: '#/operations', label: t('operations.titre') });
  const p = getProgress();
  const runIndex = p.missions.map((r) => r.id).lastIndexOf(m.id);
  if (runIndex < 0) {
    return {
      title: t('operations.rapport'),
      section: 'operations',
      node: h('div', { class: 'page' }, pageHeader({ title: t('operations.rapport'), back: { href: `#/operations/${m.id}`, label: m.titre } }), emptyState(t('operations.rapportIntrouvable'), '', { icon: 'dossier', action: linkBtn(t('operations.lancer'), `#/operations/${m.id}`, { variant: 'action', icon: 'scan' }) })),
    };
  }
  const run = p.missions[runIndex];
  let result: ScoreResult = scoreMission(m, {
    selection: run.details.selection,
    texte: run.details.texte,
    indices: run.details.indices,
    chrono: { actif: run.details.chrono, respecte: run.details.tempsSec !== null && run.details.tempsSec <= m.duree * 60 },
  });
  if (run.details.autoEval === 'alternative') result = applyAlternative(result);

  let gain: { id: string; premiereReussite: boolean; xp: number } | null = null;
  try {
    const raw = sessionStorage.getItem('mgl:lastGain');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.id === m.id) gain = parsed;
      sessionStorage.removeItem('mgl:lastGain');
    }
  } catch {
    gain = null;
  }

  const container = h('div', { class: 'page report' });

  const render = () => {
    const ok = result.reussie;
    const best = result.meilleure;
    const obj = (id: string) => c.byId.objet.get(id)?.nom ?? id;
    const fiches = (m.fiches ?? []).map((id) => c.byId.fiche.get(id)).filter(Boolean);
    const equivs = (m.equivalences ?? []).map((id) => c.byId.fonction.get(id)).filter(Boolean);

    const scoreEl = h('span', { class: 'report__score-n' }, String(result.total));

    container.replaceChildren(...([
      pageHeader({ kicker: `${t('operations.rapport')} · ${m.code ?? ''}`, title: m.titre, back: { href: '#/operations', label: t('operations.retourOps') } }),
      h(
        'section',
        { class: ['report__hero', ok ? 'is-ok' : 'is-ko'], 'aria-labelledby': 'verdict-t' },
        h('div', { class: 'report__stamp', id: 'verdict-t' }, icon(ok ? 'check' : 'refresh', 26), ok ? t('operations.reussie') : t('operations.aRevoir')),
        h('div', { class: 'report__score', role: 'img', 'aria-label': `${t('operations.scoreTotal')} : ${result.total} / 100` }, scoreEl, h('span', { class: 'report__score-max', 'aria-hidden': 'true' }, '/100')),
        h('p', { class: 'report__threshold' }, t('operations.seuil', { n: PASS_SCORE })),
        gain ? h('p', { class: 'report__xp' }, icon('spark', 16), t('operations.xpGagne', { n: gain.xp }), gain.premiereReussite ? h('strong', null, ` · ${t('operations.premiereReussite')}`) : null) : null,
        h(
          'div',
          { class: 'report__bars' },
          scoreBar(t('operations.scoreObjets'), result.objets, MAX.objets),
          scoreBar(t('operations.scoreLogique'), result.logique, MAX.logique),
          scoreBar(t('operations.scoreRigueur'), result.rigueur, MAX.rigueur),
          result.bonus ? scoreBar(t('operations.scoreBonus'), result.bonus, 5) : null,
          result.penaliteIndices ? scoreBar(t('operations.scoreIndices'), result.penaliteIndices, 30, true) : null
        )
      ),
      h(
        'section',
        { class: 'panel analysis', 'aria-labelledby': 'ana-t' },
        h('h2', { class: 'block-title', id: 'ana-t' }, icon('scan', 20), t('operations.analyse')),
        h('p', { class: 'analysis__closest' }, t('operations.solutionProche', { s: best.solution.titre })),
        h('h3', { class: 'analysis__sub' }, t('operations.ideesTrouvees')),
        h(
          'ul',
          { class: 'ideas' },
          ...best.idees.map((i) => h('li', { class: ['idea', i.trouve ? 'is-ok' : 'is-ko'] }, icon(i.trouve ? 'check' : 'x', 16), h('span', null, i.groupe[0]), !i.trouve ? h('span', { class: 'sr-only' }, ` (${t('operations.ideeManquante')})`) : null))
        ),
        best.objetsManquants.length ? h('div', { class: 'analysis__row' }, h('h3', { class: 'analysis__sub' }, t('operations.objetsManquants')), h('div', { class: 'chips' }, ...best.objetsManquants.map((id) => h('span', { class: 'chip chip--warning' }, obj(id))))) : null,
        result.leurres.length ? h('div', { class: 'analysis__row' }, h('h3', { class: 'analysis__sub' }, t('operations.leurresChoisis')), h('div', { class: 'chips' }, ...result.leurres.map((id) => h('span', { class: 'chip chip--danger' }, icon('alert', 12), obj(id))))) : null,
        result.horsSujet.length ? h('div', { class: 'analysis__row' }, h('h3', { class: 'analysis__sub' }, t('operations.horsSujet')), h('div', { class: 'chips' }, ...result.horsSujet.map((id) => h('span', { class: 'chip chip--muted' }, obj(id))))) : null,
        m.objetCle ? h('p', { class: ['analysis__flag', result.objetCleTrouve ? 'is-ok' : 'is-ko'] }, icon(result.objetCleTrouve ? 'check' : 'alert', 16), result.objetCleTrouve ? t('operations.objetCleOk', { o: obj(m.objetCle) }) : t('operations.objetCleKo', { o: obj(m.objetCle) })) : null,
        m.pieceManquante
          ? h(
              'div',
              { class: ['analysis__flag', result.pieceManquanteCouverte ? 'is-ok' : 'is-ko'] },
              icon(result.pieceManquanteCouverte ? 'check' : 'alert', 16),
              h('div', null, h('strong', null, t('operations.pieceManquante', { p: m.pieceManquante.nom })), ' ', result.pieceManquanteCouverte ? t('operations.pieceOk') : t('operations.pieceKo', { o: m.pieceManquante.remplacements.map(obj).join(', ') }), h('p', { class: 'muted' }, m.pieceManquante.explication))
            )
          : null,
        h('details', { class: 'analysis__text' }, h('summary', null, t('operations.tonTexte')), h('p', null, run.details.texte || t('operations.aucunTexte')))
      ),
      h(
        'section',
        { 'aria-labelledby': 'sol-t' },
        h('h2', { class: 'block-title block-title--spaced', id: 'sol-t' }, icon('bulb', 20), t('operations.solutionsPossibles')),
        ...m.solutions.map((s, i) =>
          h(
            'details',
            { class: ['solution', s.id === best.solution.id && 'is-closest'], open: i === 0 || s.id === best.solution.id },
            h('summary', { class: 'solution__head' }, h('span', { class: 'solution__n' }, `S${i + 1}`), h('span', { class: 'solution__title' }, s.titre), icon('chevron-down', 18)),
            h(
              'div',
              { class: 'solution__body' },
              h('h3', { class: 'analysis__sub' }, t('operations.objetsSolution')),
              h('div', { class: 'chips' }, ...s.objets.map((id) => h('a', { class: ['chip', run.details.selection.includes(id) ? 'chip--success' : 'chip--muted'], href: `#/arsenal/o/${id}` }, run.details.selection.includes(id) ? icon('check', 12) : null, obj(id))), ...(s.optionnels ?? []).map((id) => h('a', { class: 'chip chip--ghost', href: `#/arsenal/o/${id}` }, `+ ${obj(id)}`))),
              h('h3', { class: 'analysis__sub' }, t('operations.etapesSolution')),
              h('ol', { class: 'solution__steps' }, ...s.etapes.map((e) => h('li', null, e))),
              h('h3', { class: 'analysis__sub' }, t('operations.principeDerriere')),
              h('p', null, s.explication),
              s.principes?.length ? h('div', { class: 'chips' }, ...s.principes.map((fid) => c.byId.fiche.get(fid)).filter(Boolean).map((f) => h('a', { class: 'chip chip--link', href: `#/archives/${f!.id}` }, icon('archive', 12), f!.titre))) : null
            )
          )
        )
      ),
      run.details.autoEval !== 'alternative' && result.logique < 30
        ? panel(
            [
              h('h2', { class: 'block-title' }, icon('shield', 20), t('operations.alternative')),
              h('p', { class: 'panel__text' }, t('operations.alternativeDesc')),
              btn(t('operations.alternative'), {
                variant: 'ghost',
                icon: 'check',
                onClick: () => {
                  result = applyAlternative(result);
                  update((pp) => {
                    const r = pp.missions[runIndex];
                    if (!r) return;
                    r.details.autoEval = 'alternative';
                    r.details.logique = result.logique;
                    r.score = result.total;
                    r.reussie = result.reussie;
                  });
                  toast(t('operations.alternativeOk'), { icon: 'check', tone: 'success' });
                  render();
                },
              }),
            ],
            { class: 'alt-panel' }
          )
        : null,
      fiches.length || equivs.length
        ? h(
            'section',
            { class: ['to-review', !ok && 'is-highlight'], 'aria-labelledby': 'rev-t' },
            h('h2', { class: 'block-title block-title--spaced', id: 'rev-t' }, icon('archive', 20), t('operations.aReviser')),
            relatedLinks([
              { title: t('archives.titre'), icon: 'archive', items: fiches.map((f) => ({ href: `#/archives/${f!.id}`, label: f!.titre, icon: catIcon(f!.categories[0]) })) },
              { title: t('arsenal.titre'), icon: 'multitool', items: equivs.map((f) => ({ href: `#/arsenal/f/${f!.id}`, label: f!.titre, icon: f!.icone })) },
            ])
          )
        : null,
      h('div', { class: 'report__actions' }, linkBtn(t('operations.rejouer'), `#/operations/${m.id}`, { variant: 'action', icon: 'refresh' }), linkBtn(t('operations.retourOps'), '#/operations', { variant: 'ghost', icon: 'target' }))
    ].filter(Boolean) as Node[])
    );

    // Compteur animé du score
    const reduce = document.documentElement.classList.contains('motion-off') || (matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-on'));
    if (!reduce) {
      const target = result.total;
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / 900);
        scoreEl.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  render();
  return {
    title: `${t('operations.rapport')} — ${m.titre}`,
    section: 'operations',
    node: container,
    onMount: () => {
      if (gain) {
        play(result.reussie ? 'success' : 'fail');
        announce(`${result.reussie ? t('operations.reussie') : t('operations.aRevoir')} : ${result.total} / 100`);
      }
    },
  };
}
