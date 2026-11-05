import { Buddy } from '../src/core/buddy';
import { BEAN, CAPPY, PIP, SPECIES } from '../src/core/creature/species';
import { classifyElement, emptyElements } from '../src/core/evolution/elements';
import { formName, resolveForm } from '../src/core/evolution/forms';
import { Progression, sanitizeGrowthSave, stageFiveForm, THRESHOLDS } from '../src/core/evolution/progression';
import { createRng } from '../src/core/random';
import { emptyWorld } from '../src/core/world';

function rig(seed = 5) {
  const buddy = new Buddy({ rng: createRng(seed) });
  const growth = new Progression(buddy, CAPPY);
  const world = emptyWorld(1000, 700);
  const run = (s: number) => {
    for (let t = 0; t < s; t += 1 / 60) {
      buddy.update(world, 1 / 60);
      growth.tick();
    }
  };
  /** Fill the bar and let the evolution animation play out. */
  const grow = () => {
    growth.fastForward();
    run(7);
  };
  const feed = (words: string[]) => {
    for (const w of words) {
      buddy.feed(w);
      run(1.8);
    }
  };
  return { buddy, growth, run, grow, feed };
}

describe('elements', () => {
  it('classifies words and falls back to affinities', () => {
    expect(classifyElement('ember')).toBe('fire');
    expect(classifyElement('raindrop')).toBe('water');
    expect(classifyElement('midnight')).toBe('shadow');
    expect(classifyElement('synth')).toBe('air');
    expect(classifyElement('quarterly synergy')).toBeNull();
  });
});

describe('forms', () => {
  it('grows bigger each stage and tints at Stage IV', () => {
    const r = [1, 2, 3, 4, 5].map((stage) => resolveForm(CAPPY, { stage: stage as 1, element: stage >= 4 ? 'fire' : null, secondary: null }).radius);
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeGreaterThan(r[i - 1]);
    expect(resolveForm(CAPPY, { stage: 4, element: 'fire', secondary: null }).palette.fur).not.toBe(CAPPY.palette.fur);
  });

  it('names every form', () => {
    expect(formName(CAPPY, { stage: 1, element: null, secondary: null })).toBe('Capling');
    expect(formName(PIP, { stage: 4, element: 'earth', secondary: null })).toBe('Pebblebud');
    expect(formName(PIP, { stage: 5, element: 'earth', secondary: null })).toBe('Sunbloom');
    expect(formName(PIP, { stage: 5, element: 'air', secondary: null })).toBe('Wishpuff');
    expect(formName(PIP, { stage: 5, element: 'fire', secondary: 'shadow' })).toBe('Dusk Blazepoppy');
    expect(formName(BEAN, { stage: 5, element: 'fire', secondary: null })).toBe('Blazegazer');
    expect(formName(CAPPY, { stage: 5, element: 'water', secondary: 'light' })).toBe('Abyss-Halo Shroom');
  });

  it('gives every species distinct traits and silhouettes', () => {
    expect(new Set(SPECIES.map((s) => s.design.body)).size).toBe(5);
    expect(new Set(SPECIES.map((s) => s.design.gait)).size).toBe(5);
    expect(new Set(SPECIES.map((s) => JSON.stringify(s.traits.bias))).size).toBe(5);
  });
});

describe('stage V rule', () => {
  it('deepens when one element dominates', () => {
    const since = { ...emptyElements(), fire: 6, water: 2 };
    expect(stageFiveForm('fire', since)).toEqual({ stage: 5, element: 'fire', secondary: null });
  });
  it('blends when a second element is close behind', () => {
    const since = { ...emptyElements(), fire: 4, water: 4 };
    expect(stageFiveForm('fire', since)).toEqual({ stage: 5, element: 'fire', secondary: 'water' });
  });
});

describe('persisted growth validation', () => {
  it('drops unknown keys and non-finite or negative counters', () => {
    const saved = {
      base: 'cappy', stage: 4, growth: Number.POSITIVE_INFINITY,
      elements: { fire: 5, water: Number.NaN, earth: -3, unknown: 999 },
      sinceIV: { fire: 2, shadow: 'oops', unknown: 5 },
      element: 'fire', secondary: 'not-an-element',
    } as unknown as Parameters<typeof sanitizeGrowthSave>[0];
    const clean = sanitizeGrowthSave(saved);
    expect(clean.stage).toBe(4);
    expect(clean.growth).toBe(0);
    expect(clean.elements).toEqual({ ...emptyElements(), fire: 5 });
    expect(clean.sinceIV).toEqual({ ...emptyElements(), fire: 2 });
    expect(clean.secondary).toBeNull();
    expect(Object.keys(clean.elements)).toHaveLength(6);
  });

  it('repairs incomplete saves and impossible evolved forms', () => {
    const bad = {
      base: 'cappy', stage: 5, growth: -1,
      elements: null, sinceIV: undefined, element: 'unknown', secondary: 'water',
    } as unknown as Parameters<typeof sanitizeGrowthSave>[0];
    const clean = sanitizeGrowthSave(bad);
    expect(clean.stage).toBe(3);
    expect(clean.element).toBeNull();
    expect(clean.secondary).toBeNull();
    expect(clean.elements).toEqual(emptyElements());
    expect(clean.sinceIV).toEqual(emptyElements());
    const { buddy } = rig();
    const loaded = new Progression(buddy, CAPPY, bad);
    expect(loaded.state.stage).toBe(3);
    expect(loaded.state.elements).toEqual(emptyElements());
    loaded.dispose();
  });

  it('preserves valid saved progress and elemental forms', () => {
    const valid = {
      base: CAPPY.id, stage: 5 as const, growth: 12,
      elements: { ...emptyElements(), fire: 8 },
      sinceIV: { ...emptyElements(), water: 5 },
      element: 'fire' as const, secondary: 'water' as const,
    };
    expect(sanitizeGrowthSave(valid)).toEqual(valid);
  });
});

describe('progression', () => {
  it('ignores malformed element identifiers without corrupting counters', () => {
    const { buddy, growth } = rig();
    const initial = { ...growth.state.elements };
    buddy.bus.emit('word_eaten', 1, { word: 'oops', element: 'unknown-element' });
    buddy.bus.emit('word_eaten', 2, { word: 'nothing', element: 'none' });
    expect(growth.state.elements).toEqual(initial);
    expect((growth.state.elements as Record<string, number>)['unknown-element']).toBeUndefined();
    expect(Object.values(growth.state.elements).every(Number.isFinite)).toBe(true);

    buddy.bus.emit('word_eaten', 3, { word: 'ember', element: 'fire' });
    expect(growth.state.elements.fire).toBe(initial.fire + 1);

    growth.state.stage = 4;
    const beforeSinceIV = { ...growth.state.sinceIV };
    buddy.bus.emit('word_eaten', 4, { word: 'invalid', element: 'not-an-element' });
    expect(growth.state.sinceIV).toEqual(beforeSinceIV);
    buddy.bus.emit('word_eaten', 5, { word: 'river', element: 'water' });
    expect(growth.state.sinceIV.water).toBe(beforeSinceIV.water + 1);
  });

  it('finishes the body swap even if the evolution is interrupted', () => {
    const { buddy, growth, run } = rig(3);
    run(2);
    growth.fastForward();
    for (let i = 0; i < 400 && buddy.activityLabel !== 'Evolving'; i++) run(1 / 60) ;
    expect(buddy.activityLabel).toBe('Evolving');
    run(0.3);
    buddy.poke();
    run(0.1);
    expect(buddy.c.species.name).toBe('Cappy');
    expect(growth.state.stage).toBe(2);
  });

  it('earns growth from varied interactions with diminishing repeats', () => {
    const { buddy, growth, run } = rig();
    run(2);
    const before = growth.state.growth;
    buddy.pet();
    const once = growth.state.growth - before;
    buddy.pet();
    buddy.pet();
    const three = growth.state.growth - before;
    expect(once).toBeGreaterThan(0);
    expect(three).toBeLessThan(once * 3);
  });

  it('walks I to III, waits for elements, then takes the fed element at IV', () => {
    const { buddy, growth, run, grow, feed } = rig();
    run(2);
    grow();
    expect(growth.state.stage).toBe(2);
    grow();
    expect(growth.state.stage).toBe(3);
    grow();
    expect(growth.state.stage).toBe(3); // no elements yet
    expect(growth.status().hint).toMatch(/elemental/);
    feed(['ember', 'chili pepper', 'candle', 'raindrop']);
    grow();
    expect(growth.state.stage).toBe(4);
    expect(growth.state.element).toBe('fire');
    expect(buddy.c.species.name).toBe('Embercap');
    expect(buddy.c.species.design.element).toBe('fire');
  });

  it('blends a second element into Stage V when fed enough of it', () => {
    const { growth, run, grow, feed } = rig(8);
    run(2);
    grow();
    grow();
    feed(['ember', 'lava', 'torch']);
    grow();
    expect(growth.state.element).toBe('fire');
    feed(['midnight', 'shadow', 'ghost', 'ember', 'cave']);
    grow();
    expect(growth.form).toEqual({ stage: 5, element: 'fire', secondary: 'shadow' });
    expect(growth.status().name).toBe('Blaze-Dusk Shroom');
  });

  it('keeps stage and elements when switching species', () => {
    const { buddy, growth, run, grow, feed } = rig(9);
    run(2);
    grow();
    grow();
    feed(['ocean', 'raindrop', 'river']);
    grow();
    growth.setBase(PIP);
    expect(buddy.c.species.name).toBe('Tidebud');
    expect(buddy.c.species.radius).toBeGreaterThan(PIP.radius);
  });

  it('never evolves past Stage V and stays sane through the animation', () => {
    const { buddy, growth, run, grow, feed } = rig(12);
    run(2);
    grow();
    grow();
    feed(['sunbeam', 'star', 'glow']);
    grow();
    feed(['sunbeam', 'star', 'glow', 'gold']);
    grow();
    expect(growth.state.stage).toBe(5);
    growth.fastForward();
    run(3);
    expect(growth.state.stage).toBe(5);
    expect(THRESHOLDS[4]).toBeGreaterThan(THRESHOLDS[3]);
    for (const v of [buddy.c.x, buddy.c.y, buddy.c.species.radius]) expect(Number.isFinite(v)).toBe(true);
    expect(buddy.c.grounded).toBe(true);
  });
});
