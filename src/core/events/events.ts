/**
 * Buddy event schema. Every meaningful thing the buddy does or has done to it
 * is emitted here. Phase 1 only logs these; Phase 5 progression (experience,
 * affinities, discoveries, evolution conditions) will consume the same stream.
 *
 * Rules:
 * - Event names are snake_case, subject first: buddy_*, word_*, input_*.
 * - Payloads are flat and serializable (string | number | boolean).
 * - Never put page content beyond a single fed or inspected word in a payload.
 */

export type BuddyEventType =
  // lifecycle
  | 'buddy_arrived'
  | 'buddy_called'
  | 'buddy_dismissed'
  | 'buddy_returned'
  // direct interaction
  | 'buddy_poked'
  | 'buddy_petted'
  | 'buddy_picked_up'
  | 'buddy_tossed'
  | 'buddy_startled'
  | 'cursor_pounced'
  // physical comedy
  | 'buddy_fell'
  | 'buddy_landed'
  | 'buddy_bonked'
  | 'buddy_tripped'
  | 'buddy_hanging'
  | 'buddy_climbed'
  | 'buddy_recovered'
  | 'leap_failed'
  | 'surface_reached'
  // autonomous life
  | 'buddy_napped'
  | 'buddy_danced'
  | 'object_inspected'
  // environment
  | 'input_escaped'
  | 'word_eaten'
  | 'word_spat'
  | 'mode_changed'
  // progression seed
  | 'new_behavior_discovered';

export type EventPayload = Record<string, string | number | boolean>;

export interface BuddyEvent {
  type: BuddyEventType;
  /** Simulation time in seconds since the engine started. */
  at: number;
  data: EventPayload;
}

export type Listener = (e: BuddyEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type: BuddyEventType, at: number, data: EventPayload = {}): BuddyEvent {
    const e: BuddyEvent = { type, at, data };
    for (const fn of this.listeners) fn(e);
    return e;
  }
}
