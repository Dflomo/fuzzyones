/**
 * Lightweight platformer physics. Surfaces are one-way platforms: the buddy
 * passes through them going up and lands on their top edge coming down.
 * These helpers are pure so they can be unit tested without a host.
 */
import type { CreatureState, LeapPlan } from '../creature/state';
import type { Surface } from '../world';
import { clamp, type Rng } from '../random';

export const GRAVITY = 1800;
export const MAX_LEAP_VX = 950;
const SPRING_K = 230;
const SPRING_D = 14;

export function launch(c: CreatureState, vx: number, vy: number): void {
  c.grounded = false;
  c.platformId = null;
  c.walkTo = null;
  c.vx = vx;
  c.vy = vy;
  c.vrot = vx * 0.0007;
}

/**
 * Which surface (if any) the body crossed this frame while falling.
 * Picks the highest top crossed, so fast falls do not tunnel through.
 */
export function findLanding(prevBottom: number, c: CreatureState, candidates: Surface[]): Surface | null {
  if (c.vy <= 0) return null;
  const r = c.species.radius;
  const bottom = c.y + r;
  let best: Surface | null = null;
  for (const s of candidates) {
    const crossed = prevBottom <= s.top + 4 && bottom >= s.top;
    const over = c.x >= s.left - r * 0.4 && c.x <= s.right + r * 0.4;
    if (crossed && over && (!best || s.top < best.top)) best = s;
  }
  return best;
}

export interface LeapSolution {
  vx: number;
  vy: number;
  plan: LeapPlan;
}

/**
 * Ballistic launch toward a surface. The outcome is decided up front:
 * - land: apex above the target, comes down on its top edge
 * - hang: apex just below the top edge, reaching the nearest edge (grabbed in flight)
 * - short: apex too low, falls back down dazed
 * Returns null when the jump would be faster than the buddy can launch.
 */
export function planLeap(c: CreatureState, target: Surface, kind: LeapPlan['kind'], rng: Rng): LeapSolution | null {
  const r = c.species.radius;
  const sx = c.x;
  const sy = c.y;
  const ty = target.top - r;
  let vx: number;
  let vy: number;
  let plan: LeapPlan = { kind, surfaceId: target.id };

  if (kind === 'hang') {
    const side: -1 | 1 = sx < (target.left + target.right) / 2 ? -1 : 1;
    const ex = side < 0 ? target.left - r * 0.35 : target.right + r * 0.35;
    const apex = target.top + r * 0.7;
    if (apex < sy) {
      vy = -Math.sqrt(2 * GRAVITY * (sy - apex));
      vx = (ex - sx) / (-vy / GRAVITY);
      plan = { kind, surfaceId: target.id, side };
      return finish(vx, vy, plan);
    }
    plan = { kind: 'land', surfaceId: target.id };
  }

  if (kind === 'short') {
    const apex = ty + 70;
    if (apex < sy) {
      vy = -Math.sqrt(2 * GRAVITY * (sy - apex));
      const tUp = -vy / GRAVITY;
      vx = ((rng.range(target.left, target.right) - sx) * 0.5) / tUp;
      return finish(vx, vy, plan);
    }
    plan = { kind: 'land', surfaceId: target.id };
  }

  const lo = target.left + r * 0.6;
  const hi = Math.max(lo, target.right - r * 0.6);
  const lx = rng.range(lo, hi);
  const apex = Math.min(sy, ty) - rng.range(60, 120);
  vy = -Math.sqrt(2 * GRAVITY * (sy - apex));
  const T = -vy / GRAVITY + Math.sqrt((2 * (ty - apex)) / GRAVITY);
  vx = (lx - sx) / T;
  return finish(vx, vy, plan);
}

function finish(vx: number, vy: number, plan: LeapPlan): LeapSolution | null {
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return null;
  if (Math.abs(vx) > MAX_LEAP_VX * 1.15) return null;
  return { vx: clamp(vx, -MAX_LEAP_VX, MAX_LEAP_VX), vy, plan };
}

/** Squash and stretch springs, plus rotation recovery when standing. */
export function stepSprings(c: CreatureState, dt: number): void {
  c.vsx += ((c.restSx - c.sx) * SPRING_K - c.vsx * SPRING_D) * dt;
  c.sx += c.vsx * dt;
  c.vsy += ((c.restSy - c.sy) * SPRING_K - c.vsy * SPRING_D) * dt;
  c.sy += c.vsy * dt;
  if (c.grounded && c.flipT === null && !c.hang) {
    c.vrot += (-c.rot * 70 - c.vrot * 9) * dt;
    c.rot += c.vrot * dt;
  }
}

/** Visible surfaces a leap could reasonably reach from here. */
export function leapCandidates(c: CreatureState, surfaces: Surface[], viewportH: number): Surface[] {
  const bottom = c.y + c.species.radius;
  return surfaces.filter(
    (s) =>
      s.id !== c.platformId &&
      s.top > 60 &&
      s.top < viewportH - 20 &&
      s.right - s.left > 40 &&
      Math.abs((s.left + s.right) / 2 - c.x) < 650 &&
      bottom - s.top < 440,
  );
}
