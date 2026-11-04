# ADR 0003: Utility scoring for behavior selection

- Status: Accepted (pending Director review)
- Date: 2026-11-02

## Context

The buddy must choose its own activities from internal drives, avoid repetitive loops, and be interruptible by events. An LLM is explicitly out of scope for ordinary decisions.

## Decision

Each behavior exposes `score(ctx)`. When the current activity ends, the engine scores all behaviors, subtracts 0.2 for each appearance in the last four choices, adds up to 0.18 random noise, and runs the winner to completion. Interrupts (pokes, tosses, typing, scroll knock-offs) replace the current activity with a timed reaction and then hand control back to selection. Each behavior runs until done, which prevents constant switching.

## Consequences

- Behaviors are small, independent and easy to add.
- Scores are inspectable, so the playground can show why a buddy chose something.
- Personality can be added later as per-buddy multipliers on scores, without changing the selector.
- Tuning numbers live in code for now. Move them to data once the Producer wants to tune without engineering.
