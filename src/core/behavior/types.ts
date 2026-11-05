import type { SoundCue } from '../audio/cues';
import type { EffectOptions } from '../animation/effects';
import type { CreatureState, Expression, Mood } from '../creature/state';
import type { BuddyEventType, EventPayload } from '../events/events';
import type { DiscoveryKey } from '../events/discoveries';
import type { Rng } from '../random';
import type { Surface, WorldSnapshot } from '../world';

export type CompanionMode = 'dynamic' | 'knowledge_hungry';

/** What a behavior may see and do. Implemented by the Buddy engine. */
export interface BuddyContext {
  readonly c: CreatureState;
  readonly world: WorldSnapshot;
  readonly rng: Rng;
  readonly now: number;
  readonly mode: CompanionMode;
  currentSurface(): Surface;
  surface(id: string | null): Surface | undefined;
  cursorRecent(seconds: number): boolean;
  setExpr(e: Expression, seconds: number): void;
  sound(cue: SoundCue, intensity?: number): void;
  effect(text: string, o?: EffectOptions): void;
  emit(type: BuddyEventType, data?: EventPayload): void;
  discover(key: DiscoveryKey): void;
  after(seconds: number, fn: () => void): void;
  crouchThen(fn: () => void, seconds?: number): void;
  launch(vx: number, vy: number): void;
  adjustMood(key: keyof Mood, delta: number): void;
  wake(): void;
  startBehavior(id: string): void;
}

export interface Behavior<D = Record<string, unknown>> {
  id: string;
  label: string;
  /** Utility score, roughly 0 to 1.5. Return 0 when not applicable. */
  score(ctx: BuddyContext): number;
  start(ctx: BuddyContext, d: D): void;
  /** Return true when finished. t is seconds since start. */
  update(ctx: BuddyContext, d: D, dt: number, t: number): boolean;
  end?(ctx: BuddyContext, d: D): void;
}
