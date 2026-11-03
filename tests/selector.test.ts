import { REPEAT_PENALTY, pushRecent, scoreBehaviors } from '../src/core/behavior/selector';
import type { Behavior, BuddyContext } from '../src/core/behavior/types';
import { createRng } from '../src/core/random';

const fixed = (id: string, score: number): Behavior => ({ id, label: id, score: () => score, start() {}, update: () => true });
const ctx = {} as BuddyContext;

describe('scoreBehaviors', () => {
  it('ranks by score, best first', () => {
    const out = scoreBehaviors([fixed('a', 0.2), fixed('b', 0.9)], ctx, [], createRng(1));
    expect(out[0].id).toBe('b');
  });

  it('penalizes recent repeats enough to change the winner', () => {
    const recent = ['b', 'b'];
    const out = scoreBehaviors([fixed('a', 0.7), fixed('b', 0.9)], ctx, recent, createRng(1));
    expect(0.9 - 2 * REPEAT_PENALTY).toBeLessThan(0.7);
    expect(out[0].id).toBe('a');
  });

  it('never selects inapplicable behaviors over applicable ones', () => {
    const out = scoreBehaviors([fixed('off', 0), fixed('on', 0.05)], ctx, ['on', 'on', 'on'], createRng(3));
    expect(out.find((s) => s.id === 'off')!.score).toBe(0);
  });

  it('keeps a bounded history', () => {
    const r: string[] = [];
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) pushRecent(r, id);
    expect(r).toEqual(['c', 'd', 'e', 'f']);
  });
});
