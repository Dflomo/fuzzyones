# Fuzzy Buddies — Project Vision & Development Brief

## Project Overview

**Project Name:** Fuzzy Buddies\
**Genre:** Autonomous virtual pet, interactive browser/desktop companion, creature-raising and discovery game\
**Inspirations:** BonziBuddy, Tamagotchi, Neopets, Slava Rybin's *Crawlers*, emergent creature simulations

### The North Star

**Fuzzy Buddies is a living, interactive digital companion that makes everyday computer use more playful, surprising, and magical.**

Players raise customizable, fuzzy little creatures that inhabit their browser or desktop. These buddies roam around, explore their environment, react to webpage content, make expressive noises, perform funny physical actions, and interact with their owners.

Over time, engagement, exploration, personality development, and hidden discoveries contribute to experience, collectible rewards, and branching evolutions.

The goal is not to build another chatbot, conventional virtual pet, or productivity assistant.

**The goal is to create a little creature that feels alive and is genuinely entertaining to have around.**

The creature must be enjoyable even before progression, collecting, and evolution systems are implemented.

---

## 1. Core Product Philosophy

The following principles should guide every design and engineering decision.

### Silliness First

Physical comedy, expressive animation, surprising reactions, and playful noises are the foundation of the experience.

### Autonomy

Buddies make their own decisions based on personality, needs, memory, environment, and controlled randomness.

They should be capable of entertaining themselves without constant user input.

### Emergent Interactions

Small reusable systems should combine to generate many different behaviors rather than relying entirely on scripted animations.

### Discovery

Players uncover unusual interactions, secret conditions, rare rewards, and evolution paths through experimentation.

### Long-Term Companionship

Players should develop genuine attachment to their creatures over weeks and months.

### Personality Through Experience

The creature's history affects its future behavior, affinities, personality, and evolutionary opportunities.

### Respect the User

Buddies should never interfere with typing, important controls, presentations, or other work. When possible, avoiding interference should itself become a humorous physical reaction.

---

## 2. Initial Development Priority: One Exceptional Buddy

**Do not begin by implementing all five species, evolution trees, a complex economy, or a full sanctuary.**

The first priority is to create one adorable, fuzzy creature with an extensive variety of fun, responsive, and autonomous behaviors.

The prototype should be entertaining enough that someone wants to leave it running while browsing, even without experience points or rewards.

### Initial Creature Design

Proposed characteristics:

- Small, soft, fuzzy, squishy body
- Large expressive eyes
- Tiny flexible legs
- Small grabby arms
- Squash-and-stretch animation
- Physics-inspired movement
- Distinct vocalizations
- Flexible body rig that can eventually support different species and evolutionary forms

The design should support climbing, falling, stumbling, hanging, rolling, and recovery animations.

The initial art direction is provisional and should remain easy to iterate upon.

---

## 3. Core Animation and Behavior Library

Target approximately 40 reusable behaviors or animation primitives.

### Movement

- Walk
- Scurry
- Hop
- Roll
- Climb
- Hang from surfaces
- Leap
- Slide

### Expressions

- Blink
- Squint
- Track the cursor with its eyes
- Look around curiously
- Widen eyes in surprise
- Smile
- Frown
- Yawn
- Puff up or squash down

### Direct Player Interactions

- Poke
- Pet
- Tickle
- Pick up
- Drag
- Gently toss
- Feed selected words
- Play cursor chase

### Environmental Comedy

- Dive away from active input fields
- Lose balance while the page scrolls
- Grab onto nearby webpage elements
- Stumble and tumble
- Dodge the cursor
- Investigate text
- React to page changes
- Panic and perform exaggerated escapes

### Autonomous Activities

- Nap
- Stretch
- Groom
- Daydream
- Inspect interesting objects
- Hum
- Dance
- Wander around
- Find favorite resting spots

These primitives should be combinable.

For example:

**Climb → Lose grip → Panic → Fall → Bounce → Dizzy expression → Recover → Angry squeak**

Not every interaction needs to provide experience or rewards. Some events should exist purely for entertainment.

---

## 4. Five Signature Interactions for the First Prototype

### A. The Typing Escape

The buddy may rest or wander near a webpage input field.

When the player clicks the field or begins typing, it notices the activity and performs a comical escape.

Possible outcomes include diving, scrambling, rolling, clinging to an edge, or tumbling away.

The animation should depend on context and personality.

**Critical:** The creature must never delay or prevent typing.

### B. The Curious Cursor

The buddy visually tracks the player's mouse.

It might chase the cursor, try to catch it, dodge it, become startled by rapid movement, or lose interest.

### C. Word Feeding

Players can drag selected words or phrases onto their buddy.

The creature catches, investigates, chews, or reacts to the word.

Eventually, the word's semantic meaning influences experience, discoveries, affinities, and evolution conditions.

Example:

Feeding "mushroom" to a nature-oriented buddy might trigger a happy reaction and contribute toward botanical affinity.

### D. Pick-Up and Dragging

Players can pick up their buddy and move it.

Its body and limbs should respond expressively through dangling, stretching, wobbling, and recovery motions.

### E. The Unexpected Nap

The buddy autonomously finds a place to rest, curls up, falls asleep, and responds naturally when disturbed.

---

## 5. Browser and Desktop Integration

The long-term vision supports both browser and desktop companions.

### Browser Mode

The buddy can interact with approved webpage content, including:

- Text blocks
- Headings
- Images
- Element boundaries
- Page scrolling
- Mouse movement
- Text selection
- Input fields

Page elements should be interpreted as potential physical surfaces or objects for the creature to explore.

For example, a heading might become a platform, while the edge of an image could become a climbing surface.

### Desktop Mode

Eventually, buddies should be able to inhabit the operating system desktop, move between screen regions, and respond to supported desktop events.

### Architectural Requirement

Design a reusable companion simulation engine that can operate independently from browser- or desktop-specific integrations.

Begin with the browser prototype, but avoid unnecessarily tying creature logic to browser DOM APIs.

---

## 6. Companion Interaction Modes

Two player-selectable modes are planned.

### Dynamic Buddy

The buddy independently investigates permitted webpage content.

It may notice words, images, page elements, and interesting patterns.

This mode emphasizes autonomous curiosity, surprises, and environmental discovery.

### Knowledge-Hungry Buddy

The buddy still moves, plays, and behaves autonomously, but primarily understands content deliberately shared by the player.

Players feed it words, phrases, emojis, or other supported items.

Both modes should support progression and evolution equally.

Players may switch modes without losing progress.

### Additional Settings

- Quiet Mode
- Creature sound enable/disable
- Sound volume
- Discovery notifications
- Environmental curiosity frequency
- Spontaneous interaction frequency

Initial preferred configuration:

**Dynamic Buddy, Quiet Mode off, sounds enabled, discovery notifications enabled.**

---

## 7. Creature Intelligence and Autonomous Behavior

The initial prototype should not require a large language model to make ordinary movement decisions.

Implement a lightweight autonomous behavior engine using internal drives, environmental signals, personality traits, and controlled randomness.

Suggested internal state:

- Energy
- Curiosity
- Comfort
- Playfulness
- Confidence
- Sociability
- Recent experiences
- Preferred activities

Use a utility-based decision system or similarly suitable architecture.

The buddy evaluates possible behaviors and chooses what to do based on its current state.

Sudden events can interrupt ordinary behavior.

For example, typing may trigger an immediate escape response, while exhaustion may increase the likelihood of napping.

The system should prevent constant action switching and repetitive behavior loops.

AI-assisted interpretation of complex webpage content may be added later as an optional capability.

---

## 8. Procedural Animation and Physical Comedy

The creature should feel physically connected to its environment.

Prioritize:

- Squash and stretch
- Anticipation before movement
- Expressive eye tracking
- Inertia and wobble
- Simple collision detection
- Grabbing and hanging
- Falling and landing
- Recovery motions
- Occasional intentional animation imperfections
- Comical failures

The creature should sometimes unsuccessfully perform an action.

For example, it attempts a graceful leap but stumbles and lands upside down.

The comedy should emerge from the same movement systems used for normal navigation wherever practical.

---

## 9. Sound and Musical Expression

Sound is a major component of the creature's personality.

Each species should eventually possess a distinct vocal identity.

Initial examples:

- Curious chirps
- Happy squeaks
- Startled noises
- Soft purrs
- Little grunts
- Landing plops
- Sleepy humming
- Short musical celebrations

Consider procedural audio using the Web Audio API or Tone.js.

Creature sounds should respond to movement, mood, interactions, and discoveries.

Audio must be configurable and should never become excessively repetitive or disruptive.

---

## 10. Long-Term Progression and Experience

Each meaningful interaction may contribute to one or more experience categories.

Proposed categories:

- Bond
- Discovery
- Play
- Harmony
- Ingenuity
- Serenity

Additional semantic affinities can develop based on encountered content:

- Nature
- Music
- Technology
- Weather
- Emotion
- Fantasy
- Mystery
- Other expandable categories

Experience should reward varied activity, meaningful interactions, and novel discoveries.

Avoid repetitive click-farming or passive accumulation simply from keeping a browser open.

The initial prototype does not need a fully implemented progression UI, but the event system should be designed to support future progression.

Examples of events:

`buddy_petted`\
`buddy_poked`\
`word_eaten`\
`input_escaped`\
`object_inspected`\
`buddy_fell`\
`buddy_recovered`\
`new_behavior_discovered`\
`toy_played`

---

## 11. Long-Term Evolution System

The planned game includes:

**Five starter species, five evolutionary stages, and branching evolution forms.**

Provisional starter species:

1. Puff — Affection, comfort, bouncing
2. Mossling — Nature, exploration, climbing
3. Impkin — Mischief, tricks, energetic movement
4. Glimmer — Music, light, floating
5. Oddling — Mystery, mimicry, unusual movement

> **Director revision, 2026-11-03.** The form structure below replaces the original 1, 2, 3, 2, 2 branching plan.

Each species has five base stages. Stages I to III are a single growth line. Stages IV and V are shaped by six elements (Fire, Water, Earth, Air, Light, Shadow), which the buddy picks up from the words it is fed:

- Stage I, II, III: one form each
- Stage IV: one form per element (6), chosen by the buddy's strongest element
- Stage V: deepens the Stage IV element (6), or blends in a second element when the buddy ate plenty of it after Stage IV (30 ordered pairs)

That gives each species 45 possible forms and 225 across the five starters. Details live in `docs/GAME_DESIGN.md`.

<details><summary>Original plan (superseded)</summary>

- Stage I: 1 starting form
- Stage II: 2 possible forms
- Stage III: 3 possible forms
- Stage IV: 2 possible forms
- Stage V: 2 possible ultimate forms

This produced a provisional total of 50 discoverable evolutionary forms.
</details>

Evolution conditions may depend on:

- Maturity
- Experience
- Personality
- Semantic affinities
- Relationship history
- Special interactions
- Collectible charms
- Evolution stones
- Environmental conditions
- Hidden discoveries

Some evolution paths should require rare combinations of conditions.

Evolution should take place over meaningful periods, potentially weeks or months for advanced stages.

The complete system is a future milestone, not an immediate implementation requirement.

---

## 12. Collectibles and Rewards

Long-term collectible categories include:

### Evolution Stones

Special catalysts required for certain evolutionary transformations.

### Charms

Equipable items that influence affinities, behavior, sound, or evolution eligibility.

### Cosmetics

Fur colors, markings, hats, accessories, eyes, visual effects, and movement trails.

### Behaviors

Unlockable animations, tricks, reactions, dances, and playful interactions.

### Sanctuary Objects

Toys, resting places, decorations, and environmental items that influence autonomous activity.

Some rewards may drop through controlled randomness.

Rare discoveries should also have meaningful ways to improve eligibility through experimentation rather than relying entirely on blind luck.

---

## 13. Sanctuary and Collection

The long-term sanctuary design has been established.

**A maximum of five buddies may live in a player's sanctuary.**

One buddy is active in the browser or desktop at a time.

The remaining buddies inhabit a small persistent sanctuary where they autonomously:

- Play
- Sleep
- Explore
- Socialize
- Develop preferences
- Form relationships
- Discover interactions

Players influence sanctuary activity through environmental design and available objects rather than directly assigning tasks.

A collection Codex records evolutionary forms, discoveries, and individual creature histories.

The final rules for revisiting alternate evolutionary paths are not yet confirmed. Avoid hardcoding permanent evolution or unrestricted reversibility until that decision is made.

The sanctuary is a future feature and should not distract from the initial single-creature prototype.

---

## 14. Privacy, Safety, and User Experience

Fuzzy Buddies should be a trustworthy alternative to the invasive software behavior historically associated with BonziBuddy.

Requirements:

- No advertising-based tracking
- No unauthorized collection of browsing information
- Explicit permissions for webpage inspection
- Local content processing by default
- No unrestricted access to passwords, private messages, or sensitive form fields
- No unauthorized clicking, typing, submitting forms, or changing webpage content
- Transparent companion controls
- Immediate ability to pause or dismiss the buddy
- Minimal interference with work
- No required cloud connection for basic behaviors

The buddy may react humorously to interface events, but the interface must remain usable.

---

## 15. Proposed Technical Direction

Suggested stack, subject to architectural review:

- TypeScript
- Browser-based prototype
- Canvas/PixiJS or a comparable 2D rendering engine
- Lightweight procedural animation and physics
- Web Audio API for sounds
- Browser DOM observation for approved environmental awareness
- Local persistent creature state
- Modular utility-based behavioral AI
- Event-driven interaction and progression architecture

Future desktop deployment may use Tauri, Electron, or another appropriate host.

The engineering team should assess these choices before making binding architectural commitments.

Prioritize maintainability, modularity, extensibility, testability, and reproducibility.

---

## 16. Development Roadmap

### Phase 1 — A Living Creature

Create one rendered buddy capable of basic movement, facial expressions, eye tracking, idling, and reacting to the mouse.

### Phase 2 — Physical Comedy

Introduce jumping, falling, tumbling, grabbing, dragging, climbing, and humorous recoveries.

### Phase 3 — Browser Interaction

Detect approved page geometry, respond to input fields, investigate text, and support drag-and-drop word feeding.

### Phase 4 — Autonomous Life

Implement internal needs, behavior selection, personality variation, idle activities, and procedural sounds.

### Phase 5 — Early Progression

Add experience, semantic affinities, discovery events, simple rewards, and persistent state.

### Phase 6 — First Evolution

Introduce two alternate evolutionary forms with distinctive appearances and behavior changes.

### Phase 7 — Sanctuary and Collection

Expand toward the five-buddy sanctuary, other species, the Codex, collectibles, and advanced evolution systems.

---

## 17. Initial Engineering Deliverables

Before implementing major features, please:

1. Review this product vision and propose a suitable technical architecture.
2. Recommend an initial browser-first framework and rendering approach.
3. Define the creature model, animation architecture, and autonomous behavior system.
4. Define the interface between the core companion engine and browser-specific integrations.
5. Propose an event schema that can eventually support experience, collectibles, and evolution.
6. Identify technical risks, especially realistic movement across browser elements, input safety, and performance.
7. Establish a phased implementation plan with small, testable milestones.
8. Create initial repository documentation and development conventions.
9. Begin with a minimal, runnable prototype containing one expressive buddy.

Do not prematurely implement the complete roadmap.

Prefer small, demonstrable iterations that can be visually tested and reviewed.

## 18. Success Criteria for the First Playable Prototype

The first prototype is successful when:

- The buddy is visually appealing and expressive.
- It moves around the screen convincingly.
- It autonomously chooses interesting activities.
- It responds naturally to cursor movement.
- Players can poke, pet, drag, and feed it words.
- It reacts comically to typing and scrolling.
- It can climb, stumble, fall, and recover.
- It produces enjoyable sounds.
- It doesn't interfere with normal browsing.
- Its behavior demonstrates enough variation to remain entertaining.

### The Ultimate Quality Test

**Would someone leave Fuzzy Buddies running simply because they enjoy watching the little creature live its life?**

If the answer is yes, the foundation is successful.

Everything else—evolutions, charms, stones, cosmetics, collections, and the sanctuary—should build on that foundation rather than compensate for a boring creature.

---

## 19. Collaboration and Development Governance

The project will be developed collaboratively using GitHub, ChatGPT, Claude, and human direction.

The human Project Director owns the creative vision, product priorities, and major approvals.

AI collaborators may assist with architecture, planning, engineering, implementation, code reviews, testing, and documentation.

### Expectations

- Keep the North Star visible in project documentation.
- Build incrementally.
- Keep implementation work organized through GitHub issues and pull requests.
- Maintain clear acceptance criteria.
- Document important architecture decisions.
- Highlight architectural risks and unnecessary complexity early.
- Do not merge major changes to the project's vision or scope without Director approval.
- Prefer working, visually testable implementations over speculative systems.
- Ensure each development milestone preserves the expressiveness and playful nature of the companion.

**Primary directive: Build one wonderful, funny, curious little digital creature first. Then build the world around it.**
