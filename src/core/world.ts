/**
 * The World is everything the creature engine is allowed to know about its
 * surroundings. Host adapters (browser, later desktop) build one each frame.
 * Nothing in src/core may touch the DOM; it only sees this snapshot.
 */

export type SurfaceKind = 'heading' | 'image' | 'input' | 'text' | 'floor' | 'other';

export interface Surface {
  /** Stable id for the lifetime of the element. The engine tracks platforms by id. */
  id: string;
  kind: SurfaceKind;
  /** Viewport coordinates in CSS pixels. */
  top: number;
  left: number;
  right: number;
  bottom: number;
  /** Words the buddy may "read" when inspecting. Already filtered by the adapter. */
  words?: string[];
}

export interface PointerState {
  x: number;
  y: number;
  /** Smoothed velocity in px/s. */
  vx: number;
  vy: number;
  /** Sim time (seconds) of the last movement. */
  lastMoveAt: number;
  inside: boolean;
}

export interface WorldSnapshot {
  width: number;
  height: number;
  /** Visible surfaces, excluding the floor. */
  surfaces: Surface[];
  pointer: PointerState;
  /** Point a word is currently being dragged at, if any. */
  dragPoint: { x: number; y: number } | null;
}

export const FLOOR_ID = '__floor__';

export function floorSurface(world: WorldSnapshot): Surface {
  return { id: FLOOR_ID, kind: 'floor', top: world.height - 6, left: -1e5, right: 1e5, bottom: world.height };
}

export function emptyWorld(width = 800, height = 600): WorldSnapshot {
  return {
    width,
    height,
    surfaces: [],
    pointer: { x: -999, y: -999, vx: 0, vy: 0, lastMoveAt: -99, inside: false },
    dragPoint: null,
  };
}
