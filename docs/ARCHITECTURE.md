# Architecture

Status: Phase 1 playground. Owner: Engineering Lead. Changes to the boundaries below need an ADR.

## Shape

```
            ┌──────────────────────── host (browser today, desktop later) ─────────────────────────┐
 page/OS ──▶│ BrowserHost: DOM rects → Surfaces, pointer, typing, drag/drop  │ WebAudioPort │ storage │
            └──────────────┬───────────────────────────────▲──────────────────────────▲─────────────┘
                 WorldSnapshot + player intent         SoundCue                 BuddyEvents
                           ▼                               │                          │
            ┌───────────────────────────────── src/core (no DOM) ──────────────────────────────────┐
            │ Buddy engine ─ behavior (utility AI) ─ physics ─ creature state ─ events ─ effects   │
            └──────────────┬───────────────────────────────────────────────────────────────────────┘
                 CreatureState + effects (read only)
                           ▼
            CanvasRenderer (src/rendering) ──▶ fixed full-viewport canvas, pointer-events: none
```

| Folder | Responsibility | May import |
| --- | --- | --- |
| `src/core/` | All creature logic: state, moods, behaviors, physics, reactions, event schema, sound cues | nothing outside `core` |
| `src/browser/` | Host adapter for web pages: builds `WorldSnapshot`, forwards gestures, Web Audio, local storage | `core` |
| `src/rendering/` | Draws `CreatureState` and effects to a canvas | `core` types only |
| `src/ui/` | Playground chrome (inspector panel, toasts) | `core` |
| `src/main.ts` | Wires everything for the playground | all |

The rule that matters most: **`src/core` never touches the DOM, `window`, or timers.** It advances only when a host calls `buddy.update(world, dt)`. That is what lets the same creature run in the browser, on the desktop, in a sanctuary process, and in headless tests (`tests/buddy.test.ts` simulates three minutes of life in about 100 ms).

## The world contract

`WorldSnapshot` (`src/core/world.ts`) is everything the creature may know:

- viewport size
- visible **surfaces** (id, kind, rect, and an optional short list of words)
- the **pointer** (position, smoothed velocity, last move time)
- a **drag point** when a word is being dragged

Surfaces are one-way platforms: the buddy passes through them going up and lands on the top edge coming down. They are tracked by a stable id, so when a page scrolls, the platform moves under the buddy's feet. Large per-frame moves can knock it off, which produces scroll comedy without any scroll-specific animation.

Player intent arrives as calls rather than raw events: `poke()`, `rubbed(distance)`, `pickUp()`, `release(vx, vy)`, `feed(word)`, `inputActivity(fieldRect, onField)`, `call()`, `setHidden()`, `setMode()`.

## Engine internals

- **CreatureState** (`core/creature/state.ts`): plain data for the body (position, squash and stretch springs, rotation), locomotion flags, face (expression, blink, look target), and mood (energy, curiosity, playfulness, comfort).
- **Activities**: exactly one at a time.
  - *Behavior*: chosen autonomously (idle, wander, hop, explore, chase, nap, inspect, dance, groom, stretch). Each is a small `{score, start, update, end}` object in `core/behavior/library.ts`.
  - *Reaction*: an interrupt with a duration, optionally "until grounded" (poked, tossed, upside down, escaping your typing).
  - *Held*: being carried.
- **Selection** (`core/behavior/selector.ts`): utility score from mood and world, minus 0.2 per appearance in the last four choices, plus up to 0.18 noise. The top three scores are exposed for the inspector.
- **Physics** (`core/physics/physics.ts`): gravity, one-way landing, walls, squash springs, and `planLeap`, which decides the outcome of a jump up front (land, hang, or fall short) and solves the ballistic launch. Comedy uses the same code path as competent movement.
- **Scheduler**: sim-time choreography (crouch, then launch; chew, then react). Never `setTimeout` in core.
- **Randomness**: injected seedable `Rng`, so a seed reproduces a whole session for bug reports.

## Event schema

All meaningful moments go through `EventBus` as `{ type, at, data }` (`core/events/events.ts`):

- `type` is snake_case, subject first (`buddy_petted`, `word_eaten`, `input_escaped`).
- `at` is sim time in seconds.
- `data` is a flat map of string, number, or boolean values. It never contains page content beyond a single fed or inspected word.

Phase 1 consumers: the inspector log, discoveries, and local affinity counts. Phase 5 progression (experience categories, affinities, unlock and evolution conditions) will subscribe to the same stream, so XP rules can be written and tested as pure reducers over event logs.

`new_behavior_discovered { key, label }` fires the first time any of the 21 discoveries in `core/events/discoveries.ts` happens.

## Input safety and privacy

These are hard requirements from the vision:

1. The overlay canvas has `pointer-events: none`. The host only calls `preventDefault` on presses that hit the buddy, and on drag-over near it.
2. Typing reactions run after the event. Nothing is captured, delayed, or blocked.
3. Password, card, one-time-code fields, and anything marked `data-fuzzy-ignore` are ignored. Field values are never read.
4. Inspected text is reduced locally to a handful of single words per approved surface. Nothing is sent anywhere. Persistence is `localStorage` only.
5. Hide and Call are always one click away.

## Rendering

Canvas 2D, procedural, at device pixel ratio up to 2x, in a squishy vinyl style (`rendering/vinyl.ts`). Each species body (`rendering/bodies.ts`) is drawn in design units and scaled to its physics radius; faces, arms, feet and elemental overlays are shared and anchored per species through `Species.anatomy`, so evolution forms need no per-form art. Secondary motion (ears, tail, arm lag, lean, breathing, face parallax) is simulated in `core/animation/rig.ts` so it stays deterministic and testable; the renderer only adds visual easing between poses. `/sheet.html` renders every pose and expression for art review. See ADR 0002.

## Known risks

| Risk | Mitigation now | Later |
| --- | --- | --- |
| Arbitrary page CSS and layout | Playground uses explicit `data-surface` | Extension mounts in a closed shadow root. Surface discovery heuristics for headings, images and block edges, capped per frame |
| Layout cost of measuring rects | Only listed elements, measured once per frame | IntersectionObserver for visibility, measure only candidates near the buddy |
| Sound becoming annoying | Pitch variance, gesture-gated start, toggle | Per-cue cooldowns, quiet hours, volume slider |
| Behavior loops | Repeat penalty plus noise | Longer-term memory of preferred activities |
| Fixed-step determinism | Variable dt, clamped to 33 ms | Fixed 120 Hz substeps if physics bugs appear |
