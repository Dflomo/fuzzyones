import { Buddy } from '../src/core/buddy';
import type { BuddyEvent } from '../src/core/events/events';
import { createRng } from '../src/core/random';
import { emptyWorld, type Surface, type WorldSnapshot } from '../src/core/world';

export function heading(id: string, top: number, left = 100, right = 400): Surface {
  return { id, kind: 'heading', top, left, right, bottom: top + 30, words: ['orchard', 'honey'] };
}

export function setup(seed = 42, surfaces: Surface[] = []) {
  const buddy = new Buddy({ rng: createRng(seed), spawnX: 200 });
  const world: WorldSnapshot = { ...emptyWorld(1000, 700), surfaces };
  const events: BuddyEvent[] = [];
  buddy.bus.on((e) => events.push(e));
  const run = (seconds: number, dt = 1 / 60) => {
    for (let t = 0; t < seconds; t += dt) buddy.update(world, dt);
  };
  return { buddy, world, events, run };
}
