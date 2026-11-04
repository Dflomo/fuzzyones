# Roadmap

Phases come from [VISION.md](VISION.md). Each milestone should be small, visually testable, and reviewed in a PR.

| Phase | Goal | Status |
| --- | --- | --- |
| 1. A living creature | One rendered buddy with movement, expressions, eye tracking, idling, mouse reactions | **Playground done** (this PR) |
| 2. Physical comedy | Jumping, falling, tumbling, grabbing, dragging, climbing, recoveries | Partly done: leaps, ledge hangs, pull-ups, tosses, flips, wall bonks |
| 3. Browser interaction | Real page geometry, input fields, text investigation, word feeding | Playground only. Next: browser extension |
| 4. Autonomous life | Needs, behavior selection, personality, idle activities, procedural sound | Core loop done. Species personalities in place; per-buddy traits next |
| 5. Early progression | Experience, affinities, discovery events, simple rewards, persistence | Growth points, element points, discoveries and local persistence in place |
| 6. Evolution | Five stages per species, elemental Stage IV and V | **Pulled forward by Director, prototype done**: all forms drawn, feeding drives growth |
| 7. Sanctuary and collection | Five-buddy sanctuary, other species, Codex | Not started |

## Next milestones

1. **M1.1 Playground polish** (Director feedback on feel). Tune jump arcs, sounds, nap timing, and creature proportions from playtest notes.
2. **M1.2 Browser extension** (Manifest V3, unpacked). Content script mounts the overlay in a shadow root on any site, with a toolbar toggle, per-site allow list, and pause.
3. **M1.3 Real-page surfaces.** Heuristic surface discovery (headings, images, card edges), with caps and visibility filtering. Performance budget: under 1 ms per frame on a typical article.
4. **M1.4 Personality traits.** Per-buddy seeded traits (bold vs timid, tidy vs scruffy) that weight behavior scores and reactions.
5. **M1.5 Sound pass.** Per-cue cooldowns, volume slider, quiet mode.

Everything in Phases 5 to 7 waits until the Ultimate Quality Test passes: someone leaves their buddy running because they enjoy watching it.
