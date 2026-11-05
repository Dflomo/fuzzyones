# Fuzzy Ones — host platform strategy (engineering recommendation)

Status: **Proposal, not a Director platform decision.** Owner: ChatGPT engineering oversight. Updated 2026-11-04.

## North Star and constraints

One delightful, autonomous, funny buddy that never hijacks input, reads private content without consent, or makes work annoying. Interaction quality precedes species count, monetization, and cross-device synchronization.

## Options

| Host | Advantages | Costs and constraints | Relative effort |
| --- | --- | --- | --- |
| Browser playground | Fast iteration, deterministic tests, easy visual review | Lives only on our test page | Low; already built |
| Opt-in Chromium extension | Page geometry, cursor and word feeding; natural distribution to desktop browsers | Content scripts, permissions, hostile/complex DOM, CSP/shadow DOM, per-site opt-in and privacy review; cannot roam outside browser | Medium |
| Windows desktop overlay | Buddy can roam across desktop and apps, system tray controls, always-on-top transparent window | Packaging/signing, multi-monitor/DPI, hit-testing and focus safety, accessibility APIs, OS privacy permissions; cannot safely inspect arbitrary app content by default | High |
| macOS desktop overlay | Native-feeling companion outside browser | Similar overlay challenges plus accessibility/screen-recording permissions, notarization, separate native host work | High |
| Mobile app | Touch/pet/sanctuary experience and notifications | iOS generally cannot draw a persistent creature over other apps; Android overlays require special permission and are restricted by platform/policy; battery and background execution | High for companion app; very high/impractical for cross-app overlay |
| Web/PWA sanctuary | Cross-platform pet home, collection and backup UI | No persistent system-wide buddy, background restrictions | Low–medium |
| Browser + desktop hybrid | Shared simulation and visual behavior with host-specific capabilities; best long-term reach | Two host adapters, QA matrix, settings/saves coordination | Medium–high after extension |

Effort is relative, not a delivery commitment.

## Recommendation

**Now:** polish the existing browser playground for 5-minute passive watchability and tactile interactions. **Next, subject to Director approval:** a Chromium Manifest V3 extension with site-level allowlist (off by default), one-click pause/hide, no input interception outside the creature, no page-text inspection without explicit consent, and no network transmission of page content. **Later:** Windows desktop overlay proof of concept (single screen, no content inspection) reusing the same DOM-free core. Add macOS only after overlay UX is proven. **Mobile:** a separate touch-first sanctuary/companion rather than promising persistent iOS system overlays.

Do not force the browser and desktop to share one world adapter: share **core simulation, event schema, animations/renderer, and portable save model**, but keep `BrowserHost`, `DesktopHost`, and `MobileHost` independent.

## Architecture seams to preserve

1. Core receives sanitized `WorldSnapshot` and abstract player actions; no DOM, window, OS accessibility, storage or network imports.
2. Hosts control permissions, geometry sampling, pointer/touch capture, window focus, pause/resume, audio policy and persistence.
3. Renderer should support transparent overlay, high-DPI, and independent viewport sizing; do not require access to arbitrary app pixels.
4. Saved state should be versioned, validated on load and migrated explicitly. Do not sync sensitive site words or interaction logs by default.
5. Implement host capability flags (pointer, touch, page surfaces, selected-word feed, system overlay, audio) so behaviors degrade gracefully.
6. On all hosts, provide immediate hide/pause, quiet controls, and robust teardown that restores any changed host state.

## Gates before moving platforms

- 5-minute passive observation demonstrates varied, coherent, surprising behavior, not just more animations.
- Poke/pet/hold/drag/release/toss respond consistently, with convincing recovery and cancellation.
- Optional hide-and-seek is interruptible, rare, and does not obscure controls.
- Typing, scrolling, clicking, selection, and tab switching remain uninterrupted; test on representative real sites.
- Sensitive/editable content never enters the world snapshot, including nested descendants.
- Measure CPU, memory, animation frame time, audio frequency, and performance on long/changing pages.
- Director signs off on creature feel and the next host choice.

## Director decision requested later

Choose **browser extension first** versus **Windows desktop first** only after the interaction quality gate. The browser path is lower-risk for the current implementation, but desktop is likely the stronger eventual expression of a persistent companion.
