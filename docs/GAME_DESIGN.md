# Game Design: Puff, as built

This records what the playground actually does, so design discussion starts from reality. The Producer owns this doc. Engineering keeps it in sync with code.

## Mood

Four values from 0 to 1 that drift over time and shift with events.

| Mood | Drifts | Raised by | Lowered by |
| --- | --- | --- | --- |
| Energy | Down slowly, faster while walking or airborne | Napping | Hops, leaps, dancing |
| Curiosity | Up slowly | Tech and mystery snacks | Reaching a ledge, inspecting |
| Playfulness | Up slowly | Pokes, music snacks | Chasing, dancing |
| Comfort | Down slowly | Petting, grooming, nature, food and emotion snacks | Repeated pokes, rude awakenings |

## Autonomous behaviors

| Behavior | Score (before repeat penalty and noise) | What happens |
| --- | --- | --- |
| Idle | 0.28 | Looks around, turns |
| Wander | 0.22 + 0.35 × curiosity × energy | Walks, usually staying on its ledge. Sometimes walks off and falls |
| Hop | 0.08 + 0.45 × playful × energy | 1 to 3 hops, 12% chance to trip and tumble |
| Explore | 0.15 + 0.6 × curiosity × (0.4 + energy) if a ledge is reachable | Crouches and leaps. Lands, hangs from the edge (60% pulls up), or falls short dazed |
| Chase | 0.18 + 0.7 × playful while the cursor moves | Runs after the cursor and pounces when it is just above |
| Nap | 1.6 × (1 − energy)^1.6 | Yawns, curls up, z's, hums. Wakes and stretches when rested |
| Inspect | 0.14 + 0.55 × curiosity (Dynamic mode) | Walks to the nearest element, ponders, and reads one word from it |
| Dance | 0.04 + 0.55 × playful × energy × (0.5 + comfort) | Bounces, sways, sings notes |
| Groom | 0.06 + 0.4 × (1 − comfort) | Fluffs and shakes its fur |
| Stretch | 0.07 × energy, or after napping | Tall stretch and a yawn |

## Interrupts

| Trigger | Reaction |
| --- | --- |
| Click | Squash, squeak, sometimes a hop. 4 pokes within 3 s makes it grumpy. Poking a sleeping Puff earns a rude awakening |
| Rub without clicking | Purr, hearts, blush |
| Press and drag | Dangles, legs kick. Release over 1000 px/s is a toss |
| Very fast cursor nearby | Startled leap away |
| Focus or typing in a field within 150 px, or on the field Puff is sitting on | Panicked escape leap. Typing is never blocked |
| Its platform moves (scroll) | Wobbles. A jump of more than 24 px in one frame may knock it off |
| Landing after a tumble | 55% upside down with leg flailing, then flips back angry. Otherwise dazed |
| Hitting a wall fast | Bonk and dizzy on landing |

## Snacks

Words are classified locally into affinities: nature, food, music, technology, weather, emotion, fantasy, mystery.

| Affinity | Reaction |
| --- | --- |
| Nature, food | Delighted hop, hearts (Puff's favorites) |
| Music | Starts dancing |
| Technology | Curious bleeps |
| Weather | Thunder and storms scare it. Gentle weather is fine |
| Emotion | Lots of hearts, purring |
| Fantasy | Sparkles and a fanfare |
| Mystery | Big question mark, more curious |
| Unknown | 45% spits it out, otherwise "hm" |
| 3+ words or over 18 characters | Burp |

## Discoveries (21)

Poke, purring pet, picked up, big toss, typing escape, shaken off by scrolling, ledge hang, pull-up, botched leap, tripped mid-hop, wall bonk, unexpected nap, rude awakening, dance break, first snack, spat it out, big bite, read the page, cursor chase, too fast, upside-down landing.

## Open design questions for the Director

1. Puff's look: keep the pink pom-pom, or explore the other four starter silhouettes first?
2. Should Puff ever leave the viewport on its own (walk off screen and come back)?
3. How often may it make noise unprompted before it feels like too much?
4. Should affinities shift Puff's appearance subtly before evolution exists (fur tint, sparkle)?
