/**
 * Starter species. A species is data: size, palette and which body parts the
 * renderer assembles. Behavior and physics are shared, so a new species or
 * evolution form starts as an entry here.
 */

export type FurStyle = 'cloud' | 'fluffy' | 'moss' | 'sleek';
export type EarStyle = 'bunny' | 'leaf' | 'bat' | 'fin' | 'odd';
export type HeadExtra = 'none' | 'sprout' | 'horns' | 'antenna';
export type TailStyle = 'cotton' | 'leaf' | 'devil' | 'wisp' | 'ringed';
export type Marking = 'none' | 'freckles' | 'flowers' | 'stars' | 'swirl';

export interface SpeciesDesign {
  fur: FurStyle;
  ears: EarStyle;
  head: HeadExtra;
  tail: TailStyle;
  marking: Marking;
  eyes: 1 | 2;
  /** Multiplier on eye size. */
  eyeScale: number;
  /** Body width and height multipliers (silhouette). */
  bodyW: number;
  bodyH: number;
  fang: boolean;
  /** Hovers slightly above the ground and glows. */
  floats: boolean;
}

export interface Palette {
  fur: string;
  furLight: string;
  furDark: string;
  belly: string;
  innerEar: string;
  pad: string;
  line: string;
  stitch: string;
  iris: string;
  pupil: string;
  nose: string;
  tag: string;
  /** Horns, leaves, antenna orb, stripes: the species' signature accent. */
  accent: string;
  accentDark: string;
}

export interface Species {
  id: string;
  name: string;
  tagline: string;
  radius: number;
  palette: Palette;
  design: SpeciesDesign;
}

const base = { line: '#3d2430', pupil: '#16101a', tag: '#fdf7ea' };

export const PUFF: Species = {
  id: 'puff',
  name: 'Puff',
  tagline: 'Affection, comfort, bouncing',
  radius: 32,
  palette: {
    ...base,
    fur: '#fbe6d4', furLight: '#fff8f0', furDark: '#e7bfa2', belly: '#fffaf5', innerEar: '#ffc4c8', pad: '#f3a0a8',
    stitch: '#d79a8c', iris: '#6b4636', nose: '#e07c8c', accent: '#ffc4c8', accentDark: '#e8959f',
  },
  design: { fur: 'cloud', ears: 'bunny', head: 'none', tail: 'cotton', marking: 'freckles', eyes: 2, eyeScale: 1, bodyW: 1.06, bodyH: 0.96, fang: false, floats: false },
};

export const MOSSLING: Species = {
  id: 'mossling',
  name: 'Mossling',
  tagline: 'Nature, exploration, climbing',
  radius: 33,
  palette: {
    ...base,
    fur: '#93c47d', furLight: '#cfe8ae', furDark: '#5e9150', belly: '#f2f6dc', innerEar: '#d8efb4', pad: '#b98760',
    stitch: '#7fa267', iris: '#4f3a22', nose: '#6e4a36', accent: '#6fbf5a', accentDark: '#3f8a3c',
  },
  design: { fur: 'moss', ears: 'leaf', head: 'sprout', tail: 'leaf', marking: 'flowers', eyes: 2, eyeScale: 0.95, bodyW: 1, bodyH: 1.04, fang: false, floats: false },
};

export const IMPKIN: Species = {
  id: 'impkin',
  name: 'Impkin',
  tagline: 'Mischief, tricks, energetic movement',
  radius: 29,
  palette: {
    ...base,
    fur: '#a085d6', furLight: '#d4c4f6', furDark: '#6c55a6', belly: '#f4ecff', innerEar: '#f6a9c9', pad: '#f6a9c9',
    stitch: '#8b72c4', iris: '#3b2a5c', nose: '#4a2c6e', accent: '#fff0c4', accentDark: '#e5c98a',
  },
  design: { fur: 'sleek', ears: 'bat', head: 'horns', tail: 'devil', marking: 'none', eyes: 2, eyeScale: 1.08, bodyW: 0.94, bodyH: 1.06, fang: true, floats: false },
};

export const GLIMMER: Species = {
  id: 'glimmer',
  name: 'Glimmer',
  tagline: 'Music, light, floating',
  radius: 30,
  palette: {
    ...base,
    fur: '#aed9f4', furLight: '#e9f7ff', furDark: '#7aaedc', belly: '#f6fbff', innerEar: '#ffd6f0', pad: '#ffc0e2',
    stitch: '#8fb7df', iris: '#36407a', nose: '#7a86d6', accent: '#fff3a1', accentDark: '#f3c94e',
  },
  design: { fur: 'fluffy', ears: 'fin', head: 'antenna', tail: 'wisp', marking: 'stars', eyes: 2, eyeScale: 1.05, bodyW: 1, bodyH: 1, fang: false, floats: true },
};

export const ODDLING: Species = {
  id: 'oddling',
  name: 'Oddling',
  tagline: 'Mystery, mimicry, unusual movement',
  radius: 31,
  palette: {
    ...base,
    fur: '#f4ba62', furLight: '#ffe1a6', furDark: '#cf8a3a', belly: '#fff4de', innerEar: '#ffd2a6', pad: '#e3795e',
    stitch: '#c9884a', iris: '#2f5b5a', nose: '#7b4a2a', accent: '#7c4f2a', accentDark: '#5a361b',
  },
  design: { fur: 'fluffy', ears: 'odd', head: 'none', tail: 'ringed', marking: 'swirl', eyes: 1, eyeScale: 1, bodyW: 1.02, bodyH: 1, fang: false, floats: false },
};

export const SPECIES: readonly Species[] = [PUFF, MOSSLING, IMPKIN, GLIMMER, ODDLING];

export function speciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}
