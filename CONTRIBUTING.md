# Contributing

## Setup

```bash
npm install
npm run dev        # playground at http://localhost:5173
npm test           # unit and headless simulation tests
npm run build      # type-check and production build
```

## Workflow

- One GitHub issue per milestone task, with acceptance criteria someone can check by watching the buddy.
- Branch names: `phase-N/short-topic`. Open a PR into `main`. The Director approves anything that changes vision or scope.
- Keep PRs small and demonstrable. Include a short screen recording or GIF for anything visual.
- New architecture decisions get an ADR in `docs/adr/`.

## Code conventions

- TypeScript strict mode. No new runtime dependencies without an ADR.
- `src/core` must not import from `browser`, `rendering`, or `ui`, and must not use the DOM, `window`, `setTimeout`, or `Math.random` directly. Use the injected `Rng` and the `Scheduler`.
- New meaningful moments get an event type in `core/events/events.ts` with a flat payload.
- New behaviors go in `core/behavior/library.ts` with a row in `docs/GAME_DESIGN.md`.
- Hosts never block or delay user input, and never read field values.
- Writing in docs and UI copy avoids em dashes. Use commas, periods or colons.
