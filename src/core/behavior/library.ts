/**
 * Puff's autonomous behavior library. Each behavior is small and reuses the
 * shared locomotion (walkTo, launch, crouch) so comedy comes from the same
 * systems as normal movement.
 */
import { clamp, sign } from '../random';
import { GRAVITY, leapCandidates, planLeap } from '../physics/physics';
import { classifyWord } from '../creature/affinity';
import type { Behavior } from './types';

const idle: Behavior<{ dur: number; nextLook: number }> = {
  id: 'idle',
  label: 'Looking around',
  score: () => 0.28,
  start(ctx, d) {
    d.dur = ctx.rng.range(1.6, 3.2);
    d.nextLook = 0;
  },
  update(ctx, d, _dt, t) {
    const { c, rng } = ctx;
    if (t > d.nextLook) {
      d.nextLook = t + rng.range(0.6, 1.3);
      c.look = { x: c.x + rng.range(-300, 300), y: c.y + rng.range(-220, 60) };
      if (rng.chance(0.3)) c.facing = c.facing === 1 ? -1 : 1;
    }
    return t > d.dur;
  },
};

const wander: Behavior<{ dur: number }> = {
  id: 'wander',
  label: 'Wandering',
  score: ({ c }) => 0.22 + 0.35 * c.mood.curiosity * c.mood.energy,
  start(ctx, d) {
    const { c, rng, world } = ctx;
    const s = ctx.currentSurface();
    const r = c.species.radius;
    // Mostly stay on the current ledge; sometimes walk right off it.
    const x = c.platformId && rng.chance(0.72) ? rng.range(s.left + 12, s.right - 12) : rng.range(r + 10, world.width - r - 10);
    c.walkTo = clamp(x, r, world.width - r);
    c.walkSpeed = rng.range(70, 125);
    d.dur = 7;
  },
  update: ({ c }, d, _dt, t) => c.walkTo === null || t > d.dur || !c.grounded,
  end: ({ c }) => {
    c.walkTo = null;
  },
};

const hop: Behavior<{ n: number; next: number }> = {
  id: 'hop',
  label: 'Hopping',
  score: ({ c }) => 0.08 + 0.45 * c.mood.playfulness * c.mood.energy,
  start(ctx, d) {
    d.n = 1 + Math.floor(ctx.rng.range(0, 3));
    d.next = 0;
  },
  update(ctx, d, _dt, t) {
    const { c, rng } = ctx;
    if (!c.grounded || t < d.next) return false;
    if (d.n-- <= 0) return true;
    d.next = t + 0.75;
    ctx.crouchThen(() => {
      ctx.launch(c.facing * rng.range(40, 150), -rng.range(380, 560));
      if (rng.chance(0.12)) {
        c.tumble = true;
        c.vrot = rng.range(-12, 12);
        ctx.discover('trip');
        ctx.emit('buddy_tripped');
      }
      ctx.sound('chirp');
    }, 0.15);
    ctx.adjustMood('energy', -0.02);
    return false;
  },
};

const explore: Behavior<{ fail?: boolean; target?: string; launched: boolean }> = {
  id: 'explore',
  label: 'Leaping to a ledge',
  score: ({ c, world }) =>
    leapCandidates(c, world.surfaces, world.height).length ? 0.15 + 0.6 * c.mood.curiosity * (0.4 + c.mood.energy) : 0,
  start(ctx, d) {
    const { c, rng, world } = ctx;
    d.launched = false;
    const options = leapCandidates(c, world.surfaces, world.height);
    if (!options.length) {
      d.fail = true;
      return;
    }
    const s = rng.pick(options);
    d.target = s.id;
    const confidence = 0.6 + 0.25 * c.mood.energy;
    const roll = rng.next();
    const kind = roll < confidence ? 'land' : roll < confidence + 0.22 ? 'hang' : 'short';
    c.facing = sign((s.left + s.right) / 2 - c.x);
    ctx.crouchThen(() => {
      const now = ctx.surface(s.id);
      const sol = now && planLeap(c, now, kind, rng);
      if (!sol) {
        d.fail = true;
        return;
      }
      ctx.launch(sol.vx, sol.vy);
      c.leap = sol.plan;
      if (sol.plan.kind === 'short') {
        c.pendingDizzy = true;
        c.tumble = rng.chance(0.5);
        ctx.after(0.5, () => {
          ctx.discover('bonk');
          ctx.emit('leap_failed', { reason: 'fell short' });
        });
      }
      d.launched = true;
      ctx.sound('chirp');
      ctx.adjustMood('energy', -0.05);
    }, 0.32);
  },
  update(ctx, d, _dt, t) {
    const { c } = ctx;
    if (d.fail || t > 9) return true;
    if (d.launched && c.grounded && !c.hang) {
      if (c.platformId === d.target) {
        ctx.adjustMood('curiosity', -0.2);
        ctx.emit('surface_reached', { surface: ctx.currentSurface().kind });
        if (c.expr === 'neutral') {
          ctx.setExpr('happy', 1);
          ctx.sound('squeak');
        }
      }
      return true;
    }
    return false;
  },
};

const chase: Behavior<{ dur: number; next: number }> = {
  id: 'chase',
  label: 'Chasing your cursor',
  score: (ctx) => (ctx.cursorRecent(1.5) && ctx.world.pointer.y > 0 ? 0.18 + 0.7 * ctx.c.mood.playfulness : 0),
  start(ctx, d) {
    d.dur = ctx.rng.range(4, 7);
    d.next = 0;
  },
  update(ctx, d, dt, t) {
    const { c, world } = ctx;
    const p = world.pointer;
    if (t > 2) ctx.discover('chase');
    if (!ctx.cursorRecent(3) || t > d.dur) return true;
    ctx.adjustMood('playfulness', -dt * 0.06);
    if (c.grounded) {
      const s = ctx.currentSurface();
      const r = c.species.radius;
      c.walkTo = clamp(clamp(p.x, s.left - r * 0.2, s.right + r * 0.2), r, world.width - r);
      c.walkSpeed = 190;
      if (Math.abs(p.x - c.x) < 70 && p.y < c.y && p.y > c.y - 280 && t > d.next) {
        d.next = t + 1.3;
        const h = c.y - p.y + 20;
        ctx.crouchThen(() => ctx.launch((p.x - c.x) * 2, -Math.sqrt(2 * GRAVITY * h)), 0.12);
        ctx.sound('squeak');
        ctx.emit('cursor_pounced');
      }
    }
    return false;
  },
  end: ({ c }) => {
    c.walkTo = null;
  },
};

const nap: Behavior<{ slept: boolean; nextZ: number }> = {
  id: 'nap',
  label: 'Napping',
  score: ({ c }) => Math.pow(1 - c.mood.energy, 1.6) * 1.6,
  start(ctx, d) {
    ctx.c.walkTo = null;
    ctx.setExpr('sleepy', 1.3);
    ctx.sound('yawn');
    d.slept = false;
    d.nextZ = 1.6;
  },
  update(ctx, d, dt, t) {
    const { c, rng } = ctx;
    if (t > 1.2 && !c.asleep && !d.slept) {
      d.slept = true;
      c.asleep = true;
      c.restSy = 0.72;
      c.restSx = 1.16;
      ctx.emit('buddy_napped');
      ctx.discover('nap');
    }
    if (c.asleep) {
      ctx.setExpr('sleep', 0.2);
      ctx.adjustMood('energy', dt * 0.05);
      ctx.adjustMood('comfort', dt * 0.01);
      if (t > d.nextZ) {
        d.nextZ = t + 1.5;
        ctx.effect('z', { x: c.x + c.species.radius * 0.6, vx: 18, vy: -30, size: 14 + rng.range(0, 6) });
        if (rng.chance(0.3)) ctx.sound('hum');
      }
    }
    if (d.slept && !c.asleep) return true; // woken by something else
    if (c.mood.energy > 0.96 || t > 32) {
      ctx.wake();
      ctx.setExpr('happy', 1);
      ctx.after(0.1, () => ctx.startBehavior('stretch'));
      return true;
    }
    return false;
  },
};

const inspect: Behavior<{ target?: string; phase: number; t1: number; asked: boolean; read: boolean }> = {
  id: 'inspect',
  label: 'Investigating',
  score: (ctx) =>
    ctx.world.surfaces.length ? (ctx.mode === 'dynamic' ? 0.14 + 0.55 * ctx.c.mood.curiosity : 0.06) : 0,
  start(ctx, d) {
    const { c, rng, world } = ctx;
    let best = world.surfaces[0];
    let bd = Infinity;
    for (const s of world.surfaces) {
      const dd = Math.hypot((s.left + s.right) / 2 - c.x, s.top - c.y);
      if (dd < bd) {
        bd = dd;
        best = s;
      }
    }
    d.target = best.id;
    d.phase = 0;
    d.asked = false;
    d.read = false;
    const cs = ctx.currentSurface();
    const r = c.species.radius;
    c.walkTo = clamp(clamp((best.left + best.right) / 2 + rng.range(-60, 60), cs.left + 8, cs.right - 8), r, world.width - r);
    c.walkSpeed = 90;
  },
  update(ctx, d, _dt, t) {
    const { c, rng } = ctx;
    const s = ctx.surface(d.target ?? null);
    if (!s) return true;
    if (d.phase === 0 && (c.walkTo === null || t > 4)) {
      d.phase = 1;
      d.t1 = t;
      c.walkTo = null;
      c.facing = sign((s.left + s.right) / 2 - c.x);
    }
    if (d.phase === 1) {
      c.look = { x: clamp(c.x, s.left, s.right), y: s.id === c.platformId ? s.top + 30 : (s.top + s.bottom) / 2 };
      c.arm = 'chin';
      ctx.setExpr('curious', 0.3);
      if (!d.asked && t - d.t1 > 0.2) {
        d.asked = true;
        ctx.effect('?', { size: 20 });
        ctx.sound('chirp');
      }
      if (!d.read && t - d.t1 > 1) {
        d.read = true;
        const words = s.words ?? [];
        if (ctx.mode === 'dynamic' && words.length) {
          const w = rng.pick(words).toLowerCase();
          ctx.effect(w + '?', { size: 13, bubble: true, life: 1.8, vy: -25 });
          const a = classifyWord(w);
          ctx.emit('object_inspected', a ? { surface: s.kind, word: w, affinity: a } : { surface: s.kind, word: w });
        } else ctx.emit('object_inspected', { surface: s.kind });
        ctx.discover('inspect');
        ctx.adjustMood('curiosity', -0.35);
      }
      if (t - d.t1 > 2.3) return true;
    }
    return !c.grounded;
  },
  end: ({ c }) => {
    c.arm = 'rest';
    c.walkTo = null;
  },
};

const NOTES = [523, 587, 659, 784, 880];
const dance: Behavior<{ dur: number; beat: number }> = {
  id: 'dance',
  label: 'Dancing',
  score: ({ c }) => 0.04 + 0.55 * c.mood.playfulness * c.mood.energy * (0.5 + c.mood.comfort),
  start(ctx, d) {
    d.dur = 4.6;
    d.beat = 0;
    ctx.discover('dance');
    ctx.emit('buddy_danced');
  },
  update(ctx, d, dt, t) {
    const { c, rng } = ctx;
    if (!c.grounded) return false;
    c.restSy = 1 + Math.sin(t * 9) * 0.13;
    c.restSx = 1 - Math.sin(t * 9) * 0.08;
    c.vrot += Math.sin(t * 4.5) * dt * 14;
    if (t > d.beat) {
      d.beat = t + 0.45;
      c.facing = c.facing === 1 ? -1 : 1;
      ctx.sound('note', rng.pick(NOTES));
      ctx.effect('♪', { size: 16, vx: rng.range(-30, 30) });
    }
    ctx.setExpr('happy', 0.2);
    ctx.adjustMood('playfulness', -dt * 0.08);
    ctx.adjustMood('energy', -dt * 0.01);
    return t > d.dur;
  },
  end: ({ c }) => {
    c.restSx = c.restSy = 1;
  },
};

const groom: Behavior<{ dur: number }> = {
  id: 'groom',
  label: 'Grooming',
  score: ({ c }) => 0.06 + 0.4 * (1 - c.mood.comfort),
  start(ctx, d) {
    d.dur = 2.2;
    ctx.sound('purr');
  },
  update(ctx, d, _dt, t) {
    const { c } = ctx;
    c.fluff = Math.max(0, Math.sin(t * 3));
    if (t < 1.2) c.sx = 1 + Math.sin(t * 38) * 0.06;
    ctx.setExpr(t < 1.2 ? 'happy' : 'neutral', 0.2);
    if (t > d.dur) {
      ctx.adjustMood('comfort', 0.25);
      return true;
    }
    return false;
  },
  end: ({ c }) => {
    c.fluff = 0;
  },
};

const stretch: Behavior<{ dur: number }> = {
  id: 'stretch',
  label: 'Stretching',
  score: ({ c }) => 0.07 * c.mood.energy,
  start(ctx, d) {
    d.dur = 1.7;
    ctx.sound('yawn');
  },
  update(ctx, d, _dt, t) {
    ctx.c.restSy = t < 0.9 ? 1.3 : 1;
    ctx.c.restSx = t < 0.9 ? 0.84 : 1;
    ctx.setExpr('sleepy', 0.2);
    return t > d.dur;
  },
  end: ({ c }) => {
    c.restSx = c.restSy = 1;
  },
};

export const BEHAVIORS: readonly Behavior<any>[] = [idle, wander, hop, explore, chase, nap, inspect, dance, groom, stretch];

export function behaviorById(id: string): Behavior<any> | undefined {
  return BEHAVIORS.find((b) => b.id === id);
}
