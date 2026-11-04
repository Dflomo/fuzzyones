# Notes for AI collaborators

Read `docs/VISION.md` (North Star and scope), `docs/ARCHITECTURE.md` (boundaries) and `CONTRIBUTING.md` (conventions) before making changes.

**At the start of every session, read all open notes in `docs/direction/`** (see its README). Reply in each note under `## Engineering response`. Notes from the Creative Co-Director that change vision, scope or a Director decision wait for Derek's approval.

- Primary directive: one wonderful, funny, curious creature first. Do not build evolution trees, economies, or the sanctuary ahead of the roadmap.
- Keep `src/core` DOM-free and deterministic (injected `Rng`, sim-time `Scheduler`).
- Run `npm test` and `npm run build` before pushing. Add a headless test for new engine behavior.
- Never delay, block, or read user input. Ignore password and payment fields.
- Changes to vision or scope need Director approval in the PR.
- Avoid em dashes in docs and UI copy.
