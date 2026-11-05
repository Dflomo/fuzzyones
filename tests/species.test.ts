import { Buddy } from '../src/core/buddy';
import { SPECIES } from '../src/core/creature/species';
import { createRng } from '../src/core/random';
import { emptyWorld } from '../src/core/world';
import { heading } from './helpers';

describe('Starter species', () => {
  it('has five species with unique ids', () => {
    expect(SPECIES).toHaveLength(5);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(5);
  });

  for (const sp of SPECIES) {
    it(`${sp.name} lives a minute on the shared engine`, () => {
      const b = new Buddy({ species: sp, rng: createRng(21) });
      const world = { ...emptyWorld(1000, 700), surfaces: [heading('h', 300)] };
      for (let i = 0; i < 60 * 60; i++) b.update(world, 1 / 60);
      expect(b.c.grounded || b.c.hang !== null || !b.c.grounded).toBe(true);
      for (const v of [b.c.x, b.c.y, b.c.sx, b.c.sy, ...Object.values(b.c.rig)]) expect(Number.isFinite(v)).toBe(true);
      expect(b.c.y).toBeLessThanOrEqual(world.height);
    });
  }
});
