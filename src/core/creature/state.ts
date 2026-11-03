/**
 * Plain-data creature state. Renderers read it, the engine writes it.
 * Keep this serializable-ish so it can later be persisted or sent to a
 * sanctuary process.
 */

export type Expression =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'panic'
  | 'curious'
  | 'hungry'
  | 'angry'
  | 'dizzy'
  | 'sleepy'
  | 'sleep'
  | 'chew';

export type ArmPose = 'rest' | 'chin';

export interface Mood {
  energy: number;
  curiosity: number;
  playfulness: number;
  comfort: number;
}

export interface Species {
  id: string;
  name: string;
  radius: number;
  palette: { fur: string; furDark: string; belly: string; line: string; pupil: string };
}

export const PUFF: Species = {
  id: 'puff',
  name: 'Puff',
  radius: 30,
  palette: { fur: '#f5a3bb', furDark: '#df7896', belly: '#ffd9e3', line: '#4a2433', pupil: '#22181f' },
};

export interface HangState {
  surfaceId: string;
  side: -1 | 1;
  t: number;
  willClimb: boolean;
}

export interface LeapPlan {
  kind: 'land' | 'hang' | 'short';
  surfaceId: string;
  side?: -1 | 1;
}

export interface CreatureState {
  species: Species;
  // body
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Squash and stretch, sprung toward restSx/restSy. */
  sx: number;
  sy: number;
  vsx: number;
  vsy: number;
  restSx: number;
  restSy: number;
  rot: number;
  vrot: number;
  facing: -1 | 1;
  /** Fur fluff amount, 0 to 1, used by grooming. */
  fluff: number;
  // locomotion
  grounded: boolean;
  /** Id of the surface we stand on, or null for the floor. */
  platformId: string | null;
  platformTop: number;
  walkTo: number | null;
  walkSpeed: number;
  walking: boolean;
  legPhase: number;
  held: boolean;
  hang: HangState | null;
  leap: LeapPlan | null;
  /** Airborne in an uncontrolled way; landing may flip or daze. */
  tumble: boolean;
  pendingDizzy: boolean;
  /** Set while recovering from an upside-down landing. */
  flipT: number | null;
  asleep: boolean;
  hidden: boolean;
  // face
  expr: Expression;
  exprUntil: number;
  blink: number;
  blinkStart: number;
  nextBlink: number;
  look: { x: number; y: number } | null;
  arm: ArmPose;
  hungryNear: boolean;
  mood: Mood;
}

export function createCreature(species: Species = PUFF, x = 240, y = -90): CreatureState {
  return {
    species,
    x, y, vx: 0, vy: 0,
    sx: 1, sy: 1, vsx: 0, vsy: 0, restSx: 1, restSy: 1,
    rot: 0, vrot: 0, facing: 1, fluff: 0,
    grounded: false, platformId: null, platformTop: 0,
    walkTo: null, walkSpeed: 100, walking: false, legPhase: 0,
    held: false, hang: null, leap: null, tumble: false, pendingDizzy: false, flipT: null,
    asleep: false, hidden: false,
    expr: 'surprised', exprUntil: 1.2, blink: 1, blinkStart: -9, nextBlink: 2,
    look: null, arm: 'rest', hungryNear: false,
    mood: { energy: 0.55, curiosity: 0.75, playfulness: 0.7, comfort: 0.6 },
  };
}
