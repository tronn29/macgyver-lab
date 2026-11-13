import { beforeEach, describe, expect, it } from 'vitest';
import { setRead, recordFicheQuiz, isRead } from '../src/core/progress';
import { getProgress, resetProgress } from '../src/core/store';
import { dayKey } from '../src/core/dates';
import { loadAll } from './helpers';

const c = loadAll();
const f = c.byId.fiche.get('levier')!;

describe('case « Lu » manuelle', () => {
  beforeEach(() => resetProgress());

  it('cocher : lue, +XP, révision espacée, série du jour', () => {
    expect(isRead(f.id)).toBe(false);
    expect(setRead(f, true)).toBe(true);
    const p = getProgress();
    expect(isRead(f.id)).toBe(true);
    expect(p.xp).toBe(10);
    expect(p.srs[f.id]).toBeDefined();
    expect(p.serie.dernierJour).toBe(dayKey());
    expect(p.serie.courante).toBe(1);
  });

  it('cocher deux fois ne compte qu’une fois', () => {
    setRead(f, true);
    expect(setRead(f, true)).toBe(false);
    expect(getProgress().xp).toBe(10);
  });

  it('décocher : non lue, XP retirés, sortie de la révision, série conservée', () => {
    setRead(f, true);
    expect(setRead(f, false)).toBe(true);
    const p = getProgress();
    expect(isRead(f.id)).toBe(false);
    expect(p.xp).toBe(0);
    expect(p.srs[f.id]).toBeUndefined();
    expect(p.serie.courante).toBe(1);
  });
});

describe('score des quiz de fiche', () => {
  beforeEach(() => resetProgress());

  it('enregistre le dernier score, le meilleur et les tentatives', () => {
    recordFicheQuiz(f.id, 1, 2);
    recordFicheQuiz(f.id, 2, 2);
    recordFicheQuiz(f.id, 0, 2);
    expect(getProgress().quizFiches[f.id]).toMatchObject({ dernier: 0, meilleur: 2, total: 2, tentatives: 3 });
    expect(getProgress().serie.courante).toBe(1);
  });
});
