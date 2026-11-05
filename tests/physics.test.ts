import { createCreature } from '../src/core/creature/state';
import { findLanding, GRAVITY, planLeap } from '../src/core/physics/physics';
import { createRng } from '../src/core/random';
import { heading } from './helpers';

describe('findLanding', () => {
  it('lands on a platform crossed while falling', () => {
    const c = createCreature();
    c.x = 200;
    c.y = 300 - 30 + 2; // bottom just past top 300
    c.vy = 200;
    expect(findLanding(299, c, [heading('h', 300)])?.id).toBe('h');
  });

  it('passes through platforms while rising (one-way)', () => {
    const c = createCreature();
    c.x = 200;
    c.y = 280;
    c.vy = -400;
    expect(findLanding(320, c, [heading('h', 300)])).toBeNull();
  });

  it('ignores platforms that are not under the body', () => {
    const c = createCreature();
    c.x = 900;
    c.y = 272;
    c.vy = 200;
    expect(findLanding(299, c, [heading('h', 300)])).toBeNull();
  });
});

describe('planLeap', () => {
  it('produces a ballistic arc that comes down on the target', () => {
    const c = createCreature();
    c.x = 150;
    c.y = 600;
    const target = heading('h', 400, 300, 500);
    const sol = planLeap(c, target, 'land', createRng(7))!;
    expect(sol).not.toBeNull();
    // simulate flight
    let { x, y } = c;
    let vy = sol.vy;
    const dt = 1 / 240;
    let landedX: number | null = null;
    for (let i = 0; i < 2000; i++) {
      const prev = y + 30;
      vy += GRAVITY * dt;
      x += sol.vx * dt;
      y += vy * dt;
      if (vy > 0 && prev <= target.top && y + 30 >= target.top) {
        landedX = x;
        break;
      }
    }
    expect(landedX).not.toBeNull();
    expect(landedX!).toBeGreaterThan(target.left - 12);
    expect(landedX!).toBeLessThan(target.right + 12);
  });

  it('plans hang leaps with an edge side', () => {
    const c = createCreature();
    c.x = 100;
    c.y = 600;
    const sol = planLeap(c, heading('h', 400, 300, 500), 'hang', createRng(1))!;
    expect(sol.plan.kind).toBe('hang');
    expect(sol.plan.side).toBe(-1);
  });
});
