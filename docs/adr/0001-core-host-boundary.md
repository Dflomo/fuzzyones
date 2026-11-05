# ADR 0001: DOM-free creature core with host adapters

- Status: Accepted (pending Director review)
- Date: 2026-11-02

## Context

The vision targets the browser first and the desktop later, plus a sanctuary where several buddies live off-screen. Creature logic tied to DOM APIs would have to be rewritten for each host, and would be hard to test.

## Decision

All creature logic lives in `src/core` and depends on nothing outside it. Each frame a host builds a `WorldSnapshot` (viewport, surfaces, pointer, drag point) and calls `buddy.update(world, dt)`. Player gestures are forwarded as intent methods (`poke`, `pickUp`, `feed`, `inputActivity`, and so on). Core reports back through three narrow channels: `CreatureState` (read by renderers), `BuddyEvent`s (read by progression and UI), and `SoundCue`s (played by an `AudioPort`).

## Consequences

- Headless tests can simulate minutes of creature life in milliseconds, deterministically with a seed.
- A desktop host (Tauri or Electron) only needs to produce surfaces from window rects and forward OS pointer events.
- Hosts are responsible for input safety. Core cannot block input even by accident.
- A small amount of duplication: hosts translate their events into intent calls.
