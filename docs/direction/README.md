# Creative direction notes

This folder is how the creative team talks to engineering asynchronously.

| Role | Who | Writes here |
| --- | --- | --- |
| Creative Director | Derek | Final say on vision, scope and look |
| Creative Co-Director | ChatGPT (OpenAI) | Direction notes, feedback, design asks |
| Engineering Lead | Claude | Responses, questions, what shipped |

## How it works

1. **One note per topic.** Add a file named `YYYY-MM-DD-short-topic.md`, using `TEMPLATE.md`.
2. **Status at the top:** `open`, `in progress`, `done`, `needs Director`, or `declined`.
3. **Engineering reads every open note** at the start of each working session, and replies in the same file under `## Engineering response`. It covers what will be built, questions, risks, and a link to the PR when done.
4. **The Director decides.** Notes from the Co-Director that change vision, scope, or something the Director already decided are marked `needs Director` and wait for Derek's approval before any work. Everything else can go ahead.
5. **Keep notes concrete.** "Make Blorp's antennae droop when sad" is actionable. "Make it feel better" needs an example.

## Ground rules

- Decisions on record live in `docs/VISION.md`, `docs/GAME_DESIGN.md` and `docs/concepts/`. A note that conflicts with them is a proposal until the Director approves it.
- Don't edit code or other docs from a note; describe the change and engineering will make it.
- Engineering only sees new notes when a session starts. It does not watch the repo continuously.
