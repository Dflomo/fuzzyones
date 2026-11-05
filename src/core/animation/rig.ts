/**
 * Secondary motion for the plush rig. Pure and deterministic: everything is
 * driven by creature state, the world snapshot and the injected Rng.
 */
import type { CreatureState, Expression } from '../creature/state';
import { clamp, type Rng } from '../random';
import type { WorldSnapshot } from '../world';

const EAR_K = 120;
const EAR_D = 9;

function earTarget(c: CreatureState): number {
  const e: Expression = c.expr;
  if (c.held) return 0.75;
  if (c.pose === 'curl' || e === 'sleep' || e === 'sleepy' || e === 'sad') return 1.0;
  if (e === 'angry') return 0.55;
  if (e === 'surprised' || e === 'panic' || e === 'curious' || c.hungryNear) return -0.18;
  if (c.pose === 'flop') return 0.45;
  return 0.12;
}

/** Where the eyes want to look: drag point, then a nearby moving cursor, then the behavior's look target. */
export function lookTarget(c: CreatureState, world: WorldSnapshot, now: number): { x: number; y: number } | null {
  const p = world.pointer;
  if (c.pose === 'hug' && c.reach) return c.reach;
  if (world.dragPoint) return world.dragPoint;
  if (p.inside && now - p.lastMoveAt < 2.5 && Math.hypot(p.x - c.x, p.y - c.y) < 520) return { x: p.x, y: p.y };
  return c.look;
}

export function stepRig(c: CreatureState, world: WorldSnapshot, dt: number, now: number, rng: Rng): void {
  const r = c.rig;
  const idt = 1 / Math.max(dt, 1e-3);
  const ax = clamp((c.vx - r.prevVx) * idt, -20000, 20000);
  const ay = clamp((c.vy - r.prevVy) * idt, -20000, 20000);
  r.prevVx = c.vx;
  r.prevVy = c.vy;

  // Ears: spring to an expression target, kicked by acceleration (they flop up when falling).
  const base = earTarget(c);
  const twitchL = r.twitch > 0 ? -0.5 * Math.sin(r.twitch * 40) : 0;
  const twitchR = r.twitch < 0 ? -0.5 * Math.sin(-r.twitch * 40) : 0;
  const airborne = !c.grounded && !c.hang && !c.held;
  // Falling (vy > 0) lifts the ears up; rising makes them trail down.
  const flight = airborne ? clamp(c.vy * 0.0006, -0.6, 0.6) : 0;
  r.earVL += ((base + twitchL - flight - r.earL) * EAR_K - r.earVL * EAR_D - ax * 0.0009 + ay * 0.0004) * dt;
  r.earVR += ((base + twitchR - flight - r.earR) * EAR_K - r.earVR * EAR_D - ax * 0.0009 + ay * 0.0004) * dt;
  r.earL += r.earVL * dt;
  r.earR += r.earVR * dt;
  r.earL = clamp(r.earL, -0.8, 1.4);
  r.earR = clamp(r.earR, -0.8, 1.4);

  if (r.twitch > 0) r.twitch = Math.max(0, r.twitch - dt);
  else if (r.twitch < 0) r.twitch = Math.min(0, r.twitch + dt);
  else if (!c.asleep && rng.chance(dt * 0.12)) r.twitch = rng.chance(0.5) ? 0.25 : -0.25;

  // Tail: wags when happy, wraps around when curled, swings with acceleration.
  let tailT = 0;
  if (c.pose === 'curl') tailT = 1.25;
  else if (c.expr === 'happy' || c.pose === 'hug') tailT = Math.sin(now * 14) * 0.55;
  else if (c.expr === 'angry') tailT = Math.sin(now * 30) * 0.25;
  else if (c.expr === 'sad') tailT = -0.3;
  r.tailV += ((tailT - r.tail) * 90 - r.tailV * 7 + ax * 0.0012) * dt;
  r.tail = clamp(r.tail + r.tailV * dt, -1.4, 1.6);

  // Arms lag behind body motion.
  r.armLagV += ((0 - r.armLag) * 160 - r.armLagV * 10 - ax * 0.00006 - ay * 0.00004) * dt;
  r.armLag = clamp(r.armLag + r.armLagV * dt, -1, 1);

  // Lean into walking, over edges when peeking.
  const leanT = c.pose === 'peek' ? c.poseSide * 0.42 : c.walking ? clamp(c.vx * 0.0005 + c.facing * c.walkSpeed * 0.0009, -0.22, 0.22) : 0;
  r.lean += (leanT - r.lean) * Math.min(1, dt * 8);

  r.breath += dt * (c.asleep ? 1.3 : c.walking ? 4 : 2.4);

  // Face parallax: features slide toward the look target, which reads as a 3D head turn.
  const t = lookTarget(c, world, now);
  let fx = c.facing * 0.35;
  let fy = 0;
  if (t) {
    const dx = t.x - c.x;
    const dy = t.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const f = Math.min(1, d / 120);
    fx = (dx / d) * f;
    fy = (dy / d) * f;
  }
  if (c.pose === 'curl') {
    fx = 0;
    fy = 0.4;
  }
  r.faceX += (fx - r.faceX) * Math.min(1, dt * 10);
  r.faceY += (fy - r.faceY) * Math.min(1, dt * 10);
}
