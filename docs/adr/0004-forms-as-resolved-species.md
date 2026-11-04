# ADR 0004: Evolution forms are resolved species data

- Status: Accepted (pending Director review)
- Date: 2026-11-03

## Context

The Director set the evolution structure: five stages per species, with elemental Stage IV and V forms chosen by feeding. That is 45 forms per species. Drawing each by hand, or branching engine logic per form, would not scale.

## Decision

A form is `{ stage, element, secondary }`. `resolveForm(base, form)` returns an ordinary `Species` with size, palette tint, feature scales and element fields filled in. The engine and renderer only ever see a resolved species, so physics, behavior and drawing need no form-specific code paths. Growth rules live in `core/evolution/progression.ts` as a listener on the event stream; it never touches the DOM and is tested headlessly.

## Consequences

- New elements or species are data plus a few drawing parts.
- Hand-tuned art for a specific form can still be added later as an override keyed by species and form.
- Evolution is not hardcoded as permanent; `Progression` owns the state, so a re-evolve or reversal rule can be added once the Director decides.
