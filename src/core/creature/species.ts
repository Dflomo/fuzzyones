/**
 * Starter species. A species is data: size, palette, movement traits and
 * which body parts the renderer assembles. Behavior and physics are shared.
 * Evolution forms are derived from these with core/evolution/forms.ts.
 */
import type { Element } from '../evolution/elements';

export type FurStyle = 'cloud' | 'fluffy' | 'moss' | 'sleek';
export type EarStyle = 'bunny' | 'leaf' | 'bat' | 'fin' | 'odd';
export type HeadExtra = 'none' | 'sprout' | 'horns' | 'antenna';
export type TailStyle = 'cotton' | 'leaf' | 'devil' | 'wisp' | 'ringed';
export type Marking = 'none' | 'freckles' | 'flowers' | 'stars' | 'swirl';
export type Gait = 'waddle' | 'stride' | 'scamper' | 'float' | 'wobble';
export type Feet = 'stubby' | 'tendrils';
/** Detail added at Stage III that stays through later stages. */
export type Flourish = 'bow' | 'bloom' | 'wings' | 'orbit' | 'spots';

export type Stage = 1 | 2 | 3 | 4 | 5;

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
  /** 0 is round; higher narrows the top half (pear, acorn, egg). */
  taper: number;
  /** 0 is round; higher flattens the bottom (dome). */
  flat: number;
  fang: boolean;
  /** Hovers slightly above the ground and glows. */
  floats: boolean;
  gait: Gait;
  feet: Feet;
  flourish: Flourish;
  // Filled in by the form resolver. Base species are Stage II, no element.
  stage: Stage;
  element: Element | null;
  secondary: Element | null;
  /** Feature scales for growth stages. */
  earScale: number;
  headScale: number;
  tailScale: number;
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

export interface Traits {
  /** Walk speed multiplier. */
  speed: number;
  /** Hop height multiplier. */
  jump: number;
  /** Multipliers on behavior utility scores, by behavior id. Shapes personality. */
  bias: Record<string, number>;
}

export interface Species {
  id: string;
  name: string;
  tagline: string;
  /** Names for Stage I, II and III. */
  stageNames: [string, string, string];
  /** Stems combined with element prefixes for Stage IV and V, e.g. Ember + puff. */
  formStems: [string, string];
  radius: number;
  palette: Palette;
  design: SpeciesDesign;
  traits: Traits;
}

const base = { line: '#3d2430', pupil: '#16101a', tag: '#fdf7ea' };
const form = { stage: 2 as Stage, element: null, secondary: null, earScale: 1, headScale: 1, tailScale: 1 };

export const PUFF: Species = {
  id: 'puff',
  name: 'Puff',
  tagline: 'Affection, comfort, bouncing',
  stageNames: ['Puffbit', 'Puff', 'Pufflop'],
  formStems: ['puff', 'mallow'],
  radius: 32,
  palette: {
    ...base,
    fur: '#fbe6d4', furLight: '#fff8f0', furDark: '#e7bfa2', belly: '#fffaf5', innerEar: '#ffc4c8', pad: '#f3a0a8',
    stitch: '#d79a8c', iris: '#6b4636', nose: '#e07c8c', accent: '#ffc4c8', accentDark: '#e8959f',
  },
  design: {
    fur: 'cloud', ears: 'bunny', head: 'none', tail: 'cotton', marking: 'freckles', eyes: 2, eyeScale: 1,
    bodyW: 1.14, bodyH: 0.9, taper: 0, flat: 0.04, fang: false, floats: false, gait: 'waddle', feet: 'stubby', flourish: 'bow', ...form,
  },
  traits: { speed: 0.8, jump: 0.9, bias: { cuddle: 1.7, nap: 1.3, flop: 1.6, hop: 1.2, chase: 0.8, explore: 0.75 } },
};

export const MOSSLING: Species = {
  id: 'mossling',
  name: 'Mossling',
  tagline: 'Nature, exploration, climbing',
  stageNames: ['Mossbud', 'Mossling', 'Mosswick'],
  formStems: ['moss', 'grove'],
  radius: 33,
  palette: {
    ...base,
    fur: '#93c47d', furLight: '#cfe8ae', furDark: '#5e9150', belly: '#f2f6dc', innerEar: '#d8efb4', pad: '#b98760',
    stitch: '#7fa267', iris: '#4f3a22', nose: '#6e4a36', accent: '#6fbf5a', accentDark: '#3f8a3c',
  },
  design: {
    fur: 'moss', ears: 'leaf', head: 'sprout', tail: 'leaf', marking: 'flowers', eyes: 2, eyeScale: 0.92,
    bodyW: 0.96, bodyH: 1.1, taper: 0.22, flat: 0, fang: false, floats: false, gait: 'stride', feet: 'stubby', flourish: 'bloom', ...form,
  },
  traits: { speed: 0.85, jump: 1, bias: { explore: 1.6, peek: 1.7, inspect: 1.3, groom: 1.2, dance: 0.6 } },
};

export const IMPKIN: Species = {
  id: 'impkin',
  name: 'Impkin',
  tagline: 'Mischief, tricks, energetic movement',
  stageNames: ['Impip', 'Impkin', 'Impscamp'],
  formStems: ['imp', 'fiend'],
  radius: 28,
  palette: {
    ...base,
    fur: '#a085d6', furLight: '#d4c4f6', furDark: '#6c55a6', belly: '#f4ecff', innerEar: '#f6a9c9', pad: '#f6a9c9',
    stitch: '#8b72c4', iris: '#3b2a5c', nose: '#4a2c6e', accent: '#fff0c4', accentDark: '#e5c98a',
  },
  design: {
    fur: 'sleek', ears: 'bat', head: 'horns', tail: 'devil', marking: 'none', eyes: 2, eyeScale: 1.1,
    bodyW: 0.9, bodyH: 1.1, taper: 0.12, flat: 0, fang: true, floats: false, gait: 'scamper', feet: 'stubby', flourish: 'wings', ...form,
  },
  traits: { speed: 1.4, jump: 1.35, bias: { hop: 1.7, chase: 1.8, explore: 1.2, nap: 0.55, cuddle: 0.6, groom: 0.6 } },
};

export const GLIMMER: Species = {
  id: 'glimmer',
  name: 'Glimmer',
  tagline: 'Music, light, floating',
  stageNames: ['Glim', 'Glimmer', 'Glimmerling'],
  formStems: ['glim', 'shimmer'],
  radius: 30,
  palette: {
    ...base,
    fur: '#aed9f4', furLight: '#e9f7ff', furDark: '#7aaedc', belly: '#f6fbff', innerEar: '#ffd6f0', pad: '#ffc0e2',
    stitch: '#8fb7df', iris: '#36407a', nose: '#7a86d6', accent: '#fff3a1', accentDark: '#f3c94e',
  },
  design: {
    fur: 'fluffy', ears: 'fin', head: 'antenna', tail: 'wisp', marking: 'stars', eyes: 2, eyeScale: 1.05,
    bodyW: 1.04, bodyH: 0.94, taper: 0, flat: 0.28, fang: false, floats: true, gait: 'float', feet: 'tendrils', flourish: 'orbit', ...form,
  },
  traits: { speed: 0.9, jump: 0.8, bias: { dance: 1.9, idle: 1.2, hop: 0.6, flop: 0.5, peek: 0.7 } },
};

export const ODDLING: Species = {
  id: 'oddling',
  name: 'Oddling',
  tagline: 'Mystery, mimicry, unusual movement',
  stageNames: ['Oddlet', 'Oddling', 'Oddity'],
  formStems: ['odd', 'enigma'],
  radius: 31,
  palette: {
    ...base,
    fur: '#f4ba62', furLight: '#ffe1a6', furDark: '#cf8a3a', belly: '#fff4de', innerEar: '#ffd2a6', pad: '#e3795e',
    stitch: '#c9884a', iris: '#2f5b5a', nose: '#7b4a2a', accent: '#7c4f2a', accentDark: '#5a361b',
  },
  design: {
    fur: 'fluffy', ears: 'odd', head: 'none', tail: 'ringed', marking: 'swirl', eyes: 1, eyeScale: 1,
    bodyW: 0.9, bodyH: 1.16, taper: 0.06, flat: 0, fang: false, floats: false, gait: 'wobble', feet: 'stubby', flourish: 'spots', ...form,
  },
  traits: { speed: 1, jump: 1.1, bias: { inspect: 1.8, peek: 1.3, stretch: 1.6, idle: 1.2, cuddle: 0.8 } },
};

export const SPECIES: readonly Species[] = [PUFF, MOSSLING, IMPKIN, GLIMMER, ODDLING];

export function speciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}
