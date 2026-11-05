import { Buddy } from '../src/core/buddy';
import { BEAN, CAPPY, PIP, SPECIES } from '../src/core/creature/species';
import { classifyElement, emptyElements } from '../src/core/evolution/elements';
import { formName, resolveForm } from '../src/core/evolution/forms';
import { Progression, stageFiveForm, THRESHOLDS } from '../src/core/evolution/progression';
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

describe('progression', () => {
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
