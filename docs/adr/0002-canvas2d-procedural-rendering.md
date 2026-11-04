# ADR 0002: Canvas 2D procedural rendering for Phase 1

- Status: Accepted (pending Director review)
- Date: 2026-11-02

## Context

The brief suggested Canvas or PixiJS. Phase 1 draws one creature plus a few text effects, and the art direction is provisional.

## Decision

Use plain Canvas 2D on a fixed, full-viewport overlay with `pointer-events: none`. The creature is drawn procedurally from a `Species` (radius and palette), with squash and stretch applied around the feet, animated fur strands, and expression-driven eyes and mouth. No sprite sheets.

**Update 2026-11-04:** the Director chose a squishy vinyl style. The plush renderer was replaced by a shared vinyl material plus one body drawer per species; still Canvas 2D and still procedural.

## Consequences

- No rendering dependency. The playground bundle is about 16 KB gzipped.
- Art iteration is code iteration, which is fast now but will need a rig format once there are many forms.
- Revisit PixiJS or WebGL when we have five buddies on screen in the sanctuary, particle-heavy effects, or texture-based fur.
