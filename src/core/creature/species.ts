/**
 * Starter species. A species is data: size, palette, movement traits, where
 * its face, arms and feet sit, and which body the renderer draws. Behavior
 * and physics are shared. Evolution forms come from core/evolution/forms.ts.
 *
 * Anatomy is in design units: the creature is authored about 100 units wide,
 * centered on x = 0, standing on the ground at y = 80. The renderer scales
 * design units so the physics radius matches.
 */
import type { Element } from '../evolution/elements';

export type BodyKind = 'cappy' | 'pip' | 'blorp' | 'bean' | 'oddling';
export type Gait = 'waddle' | 'scamper' | 'jiggle' | 'stride' | 'wobble';
export type Stage = 1 | 2 | 3 | 4 | 5;

export interface Anatomy {
  /** Face center and size (50 = a standard face). */
  face: { x: number; y: number; size: number; mouthDy: number };
  /** The main round mass: arms, marks and poses are placed against it. */
  core: { cy: number; r: number };
  /** Top of the head, where elemental crests sit. */
  top: number;
  /** Feet: horizontal offset from center, width and height. Width 0 means no feet. */
  feet: { dx: number; w: number; h: number };
}

export interface SpeciesDesign {
  body: BodyKind;
  eyes: 1 | 2;
  /** Multiplier on eye size. */
  eyeScale: number;
  /** White of the eye around the iris (Bean). */
  sclera: boolean;
  nose: boolean;
  teeth: boolean;
  /** Hovers slightly above the ground. */
  floats: boolean;
  gait: Gait;
  // Filled in by the form resolver. Base species are Stage II with no element.
  stage: Stage;
  element: Element | null;
  secondary: Element | null;
  /** Feature scales for growth stages: antennae and ears, sprouts and horns, tails. */
  earScale: number;
  headScale: number;
  tailScale: number;
}

export interface Palette {
  /** Main mass color, tinted by elements. */
  fur: string;
  furLight: string;
  furDark: string;
  /** Secondary mass (Cappy's stem, bellies, Oddling's eye disc). */
  belly: string;
  /** Arms and feet. */
  limb: string;
  /** Eyelid color, matches the skin around the eyes. */
  lid: string;
  innerEar: string;
  pad: string;
  line: string;
  iris: string;
  pupil: string;
  nose: string;
  /** Signature details: Cappy's spots, Pip's leaves, Blorp's antenna tips, Bean's horns, Oddling's teal wire. */
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
  kind: string;
  tagline: string;
  /** Names for Stage I, II and III. */
  stageNames: [string, string, string];
  /** Stems combined with element prefixes for Stage IV and V, e.g. Ember + cap. */
  formStems: [string, string];
  radius: number;
  palette: Palette;
  anatomy: Anatomy;
  design: SpeciesDesign;
  traits: Traits;
}

const line = '#3a2a30';
const form = { stage: 2 as Stage, element: null, secondary: null, earScale: 1, headScale: 1, tailScale: 1 };

export const CAPPY: Species = {
  id: 'cappy',
  name: 'Cappy',
  kind: 'mushroom',
  tagline: 'Shy, cozy, loves a good nap',
  stageNames: ['Capling', 'Cappy', 'Capsworth'],
  formStems: ['cap', 'shroom'],
  radius: 30,
  palette: {
    fur: '#e9685a', furLight: '#ff9a8a', furDark: '#b8443a', belly: '#f6e7d2', limb: '#eedcc4', lid: '#f6e7d2',
    innerEar: '#e7c9a8', pad: '#f3b3a0', line, iris: '#2a1c3a', pupil: '#120c14', nose: '#e07c8c', accent: '#fff7ef', accentDark: '#f1dccb',
  },
  anatomy: { face: { x: 0, y: 34, size: 36, mouthDy: 0.3 }, core: { cy: 38, r: 34 }, top: -68, feet: { dx: 15, w: 13, h: 8 } },
  design: { body: 'cappy', eyes: 2, eyeScale: 1.05, sclera: false, nose: false, teeth: false, floats: false, gait: 'waddle', ...form },
  traits: { speed: 0.8, jump: 0.85, bias: { nap: 1.5, groom: 1.4, peek: 1.3, idle: 1.2, chase: 0.7, hop: 0.8 } },
};

export const PIP: Species = {
  id: 'pip',
  name: 'Pip',
  kind: 'seed',
  tagline: 'Curious, bouncy, always climbing',
  stageNames: ['Pipseed', 'Pip', 'Pipsprout'],
  formStems: ['pip', 'bloom'],
  radius: 28,
  palette: {
    fur: '#d8a465', furLight: '#f3cf94', furDark: '#a8743c', belly: '#f3dcae', limb: '#c99558', lid: '#d8a465',
    innerEar: '#e9c48c', pad: '#b98760', line, iris: '#2a1c3a', pupil: '#120c14', nose: '#c4486f', accent: '#7cc35e', accentDark: '#4f8f3a',
  },
  anatomy: { face: { x: 0, y: 24, size: 41, mouthDy: 0.3 }, core: { cy: 22, r: 46 }, top: -58, feet: { dx: 13, w: 11, h: 7 } },
  design: { body: 'pip', eyes: 2, eyeScale: 1.05, sclera: false, nose: false, teeth: false, floats: false, gait: 'scamper', ...form },
  traits: { speed: 1.1, jump: 1.25, bias: { explore: 1.7, peek: 1.5, hop: 1.4, inspect: 1.2, nap: 0.8 } },
};

export const BLORP: Species = {
  id: 'blorp',
  name: 'Blorp',
  kind: 'squishy alien',
  tagline: 'Wobbly, silly, made of jelly',
  stageNames: ['Blip', 'Blorp', 'Blorpling'],
  formStems: ['blorp', 'gloop'],
  radius: 31,
  palette: {
    fur: '#7fe0b8', furLight: '#c8ffe6', furDark: '#3fae84', belly: '#e6fff4', limb: '#7fe0b8', lid: '#7fe0b8',
    innerEar: '#2f5a48', pad: '#5ccaa0', line, iris: '#2a1c3a', pupil: '#120c14', nose: '#2f5a48', accent: '#ff8fc8', accentDark: '#d9589c',
  },
  anatomy: { face: { x: 0, y: 17, size: 58, mouthDy: 0.28 }, core: { cy: 22, r: 52 }, top: -46, feet: { dx: 0, w: 0, h: 0 } },
  design: { body: 'blorp', eyes: 2, eyeScale: 1.05, sclera: false, nose: false, teeth: false, floats: false, gait: 'jiggle', ...form },
  traits: { speed: 0.95, jump: 1.15, bias: { flop: 1.9, dance: 1.5, hop: 1.3, chase: 1.2, peek: 0.7 } },
};

export const BEAN: Species = {
  id: 'bean',
  name: 'Bean',
  kind: 'cuddly cyclops',
  tagline: 'Big-hearted, clingy, loves cuddles',
  stageNames: ['Peep', 'Bean', 'Beano'],
  formStems: ['bean', 'gazer'],
  radius: 31,
  palette: {
    fur: '#ffb37a', furLight: '#ffd7b4', furDark: '#e0834a', belly: '#fff0df', limb: '#ffb37a', lid: '#ffb37a',
    innerEar: '#ffd0b0', pad: '#ff9a8a', line, iris: '#3f8f6f', pupil: '#120c14', nose: '#c4486f', accent: '#fff0c6', accentDark: '#e3c98a',
  },
  anatomy: { face: { x: 0, y: -12, size: 50, mouthDy: 0.5 }, core: { cy: 8, r: 46 }, top: -60, feet: { dx: 20, w: 15, h: 9 } },
  design: { body: 'bean', eyes: 1, eyeScale: 1.38, sclera: true, nose: false, teeth: true, floats: false, gait: 'stride', ...form },
  traits: { speed: 1, jump: 0.9, bias: { cuddle: 1.9, chase: 1.3, nap: 1.1, explore: 0.8 } },
};

export const ODDLING: Species = {
  id: 'oddling',
  name: 'Oddling',
  kind: 'wire tangle',
  tagline: 'Odd, nosy, full of springs',
  stageNames: ['Oddlet', 'Oddling', 'Oddity'],
  formStems: ['odd', 'tangle'],
  radius: 29,
  palette: {
    fur: '#e0915a', furLight: '#f2c07a', furDark: '#c46f45', belly: '#fff4de', limb: '#e7a37a', lid: '#fff4de',
    innerEar: '#7fd0c4', pad: '#e3795e', line, iris: '#2a1c3a', pupil: '#120c14', nose: '#7b4a2a', accent: '#9be3d8', accentDark: '#5b4a52',
  },
  anatomy: { face: { x: 0, y: 12, size: 50, mouthDy: 0.36 }, core: { cy: 14, r: 50 }, top: -38, feet: { dx: 16, w: 13, h: 8 } },
  design: { body: 'oddling', eyes: 1, eyeScale: 1.06, sclera: false, nose: false, teeth: false, floats: false, gait: 'wobble', ...form },
  traits: { speed: 1.15, jump: 1.2, bias: { inspect: 1.8, peek: 1.3, stretch: 1.5, idle: 1.2, cuddle: 0.8 } },
};

export const SPECIES: readonly Species[] = [CAPPY, PIP, BLORP, BEAN, ODDLING];
/** Default starter. */
export const DEFAULT_SPECIES = CAPPY;

export function speciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}
