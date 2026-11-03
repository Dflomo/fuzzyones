import type { Rng } from '../random';
import type { Behavior, BuddyContext } from './types';

export interface ScoredBehavior {
  id: string;
  score: number;
}

export const REPEAT_PENALTY = 0.2;
export const NOISE = 0.18;
export const HISTORY = 4;

/**
 * Utility selection: base score from mood and world, minus a penalty for each
 * recent repeat (prevents loops), plus a little noise (prevents robotic
 * predictability). Returns all scores sorted, best first, for the inspector.
 */
export function scoreBehaviors(
  behaviors: readonly Behavior<any>[],
  ctx: BuddyContext,
  recent: readonly string[],
  rng: Rng,
): ScoredBehavior[] {
  return behaviors
    .map((b) => {
      const base = b.score(ctx);
      if (base <= 0) return { id: b.id, score: 0 };
      const repeats = recent.filter((r) => r === b.id).length;
      return { id: b.id, score: base - repeats * REPEAT_PENALTY + rng.range(0, NOISE) };
    })
    .sort((a, b) => b.score - a.score);
}

export function pushRecent(recent: string[], id: string): void {
  recent.push(id);
  while (recent.length > HISTORY) recent.shift();
}
