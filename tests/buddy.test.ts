import { heading, setup } from './helpers';

describe('Buddy engine (headless)', () => {
  it('drops in and lands on the floor', () => {
    const { buddy, world, run } = setup();
    run(2);
    expect(buddy.c.grounded).toBe(true);
    expect(buddy.c.platformId).toBeNull();
    expect(buddy.c.y).toBeCloseTo(world.height - 6 - buddy.c.species.radius, 3);
  });

  it('lands on a surface it falls onto', () => {
    const { buddy, run } = setup(1, [heading('h1', 200, 100, 400)]);
    run(1.5);
    expect(buddy.c.platformId).toBe('h1');
  });

  it('gets knocked off when the platform jumps (scroll)', () => {
    const { buddy, world, events, run } = setup(5, [heading('h1', 300, 0, 1000)]);
    run(1.5);
    expect(buddy.c.platformId).toBe('h1');
    let fell = false;
    for (let i = 0; i < 30 && !fell; i++) {
      world.surfaces[0] = { ...world.surfaces[0], top: world.surfaces[0].top - 60, bottom: world.surfaces[0].bottom - 60 };
      run(1 / 60);
      fell = events.some((e) => e.type === 'buddy_fell' && e.data.cause === 'scroll');
    }
    expect(fell).toBe(true);
  });

  it('emits poke and discovery events', () => {
    const { buddy, events, run } = setup();
    run(2);
    buddy.poke();
    expect(events.map((e) => e.type)).toContain('buddy_poked');
    expect(buddy.discovered.has('poke')).toBe(true);
  });

  it('escapes when the player types nearby, without needing to block input', () => {
    const { buddy, events, run } = setup();
    run(2);
    const { x, y } = buddy.c;
    buddy.inputActivity({ left: x - 50, right: x + 50, top: y - 20, bottom: y + 20 }, false);
    run(0.3);
    expect(events.some((e) => e.type === 'input_escaped')).toBe(true);
    expect(buddy.c.grounded).toBe(false);
  });

  it('ignores typing far away', () => {
    const { buddy, events, run } = setup();
    run(2);
    buddy.inputActivity({ left: 900, right: 990, top: 0, bottom: 40 }, false);
    expect(events.some((e) => e.type === 'input_escaped')).toBe(false);
  });

  it('eats words and reports their affinity', () => {
    const { buddy, events, run } = setup();
    run(2);
    buddy.feed('mushroom');
    run(2);
    const eaten = events.find((e) => e.type === 'word_eaten');
    expect(eaten?.data).toEqual({ word: 'mushroom', affinity: 'nature' });
  });

  it('can be picked up, tossed and recovers', () => {
    const { buddy, world, events, run } = setup();
    run(2);
    buddy.pickUp();
    world.pointer = { ...world.pointer, x: 500, y: 200, inside: true };
    run(0.5);
    buddy.release(1600, -800);
    expect(events.some((e) => e.type === 'buddy_tossed')).toBe(true);
    run(5);
    expect(buddy.c.grounded).toBe(true);
    expect(buddy.c.held).toBe(false);
  });

  it('lives a varied autonomous life and stays numerically sane', () => {
    const { buddy, events, run } = setup(11, [heading('h1', 250, 80, 380), heading('h2', 420, 450, 800)]);
    const chosen = new Set<string>();
    for (let i = 0; i < 180 * 4; i++) {
      run(0.25);
      if (!buddy.activityIsInterrupt) chosen.add(buddy.activityLabel);
      const c = buddy.c;
      for (const v of [c.x, c.y, c.vx, c.vy, c.sx, c.sy, c.rot]) expect(Number.isFinite(v)).toBe(true);
    }
    expect(chosen.size).toBeGreaterThanOrEqual(5);
    expect(events.some((e) => e.type === 'buddy_napped')).toBe(true);
  });

  it('is reproducible with the same seed', () => {
    const a = setup(99, [heading('h1', 250)]);
    const b = setup(99, [heading('h1', 250)]);
    a.run(30);
    b.run(30);
    expect(a.events.map((e) => e.type)).toEqual(b.events.map((e) => e.type));
    expect(a.buddy.c.x).toBeCloseTo(b.buddy.c.x, 6);
  });
});
