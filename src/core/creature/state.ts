/**
 * Plain-data creature state. Renderers read it, the engine writes it.
 * Keep this serializable-ish so it can later be persisted or sent to a
 * sanctuary process.
 */
import { DEFAULT_SPECIES, type Species } from './species';

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
  | 'chew'
  | 'sad'
  | 'smug';

export type ArmPose = 'rest' | 'chin';

/** Whole-body poses the renderer draws differently. Locomotion overrides to 'stand'. */
export type Pose = 'stand' | 'sit' | 'curl' | 'flop' | 'peek' | 'hug';

/**
 * Secondary motion. Springs driven by body acceleration and expression so
 * ears, tail and arms lag and overshoot like a soft toy.
 */
export interface Rig {
  earL: number;
  earR: number;
  earVL: number;
  earVR: number;
  tail: number;
  tailV: number;
  armLag: number;
  armLagV: number;
  lean: number;
  breath: number;
  prevVx: number;
  prevVy: number;
  /** Seconds left of a random ear twitch (which ear by sign). */
  twitch: number;
  /** Tongue-out micro-expression until this sim time. */
  blepUntil: number;
  /** 0 to 1, face parallax toward where it is looking. */
  faceX: number;
  faceY: number;
}

export interface Mood {
  energy: number;
  curiosity: number;
  playfulness: number;
  comfort: number;
}

export type { Species } from './species';
export { DEFAULT_SPECIES } from './species';

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
  pose: Pose;
  /** Which edge a peek or hug points at: -1 left, 1 right. */
  poseSide: -1 | 1;
  /** Where hug arms reach, in viewport coords. */
  reach: { x: number; y: number } | null;
  /** Seconds the buddy has been standing still. Drives idle sitting. */
  stillFor: number;
  tears: number;
  /** 0 to 1 glow while evolving. */
  evolveGlow: number;
  rig: Rig;
  hungryNear: boolean;
  mood: Mood;
}

export function createCreature(species: Species = DEFAULT_SPECIES, x = 240, y = -90): CreatureState {
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
    look: null, arm: 'rest', pose: 'stand', poseSide: 1, reach: null, stillFor: 0, tears: 0, evolveGlow: 0,
    rig: {
      earL: 0, earR: 0, earVL: 0, earVR: 0, tail: 0, tailV: 0, armLag: 0, armLagV: 0, lean: 0,
      breath: 0, prevVx: 0, prevVy: 0, twitch: 0, blepUntil: 0, faceX: 0, faceY: 0,
    },
    hungryNear: false,
    mood: { energy: 0.55, curiosity: 0.75, playfulness: 0.7, comfort: 0.6 },
  };
}
