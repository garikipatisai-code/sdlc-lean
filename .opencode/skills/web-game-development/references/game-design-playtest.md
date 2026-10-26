# Game design, feel, playtest, accessibility

A game is a loop of verbs, feedback, and escalating constraints. Content and
meta come after the verb is fun. S-tier design is measured by player behavior,
not by feature count.

## 1. Core loop and MDA

- **Mechanics → Dynamics → Aesthetics** (MDA): design the mechanics, observe the
  dynamics, target the aesthetic (challenge, expression, discovery, sensation,
  narrative, fellowship).
- Write the **30-second loop** in one sentence: what the player does, what
  responds, why they do it again. If it needs a paragraph, it is not a loop yet.
- Prototype the verb with greybox primitives before art, story, progression, or
  monetization. Kill or keep within a fixed timebox (`vendor/prototype-fast/`).
- Define **kill criteria** before playtesting: what result means stop, pivot, or
  continue. Do not rationalize a failed loop with more content.

## 2. Game feel / juice

One satisfying action is 5–8 tiny responses within ~100 ms: sound, particles,
hit-stop, flash, knockback, shake, number pop, animation cancel.

| Technique | Starting point | Guardrail |
|---|---|---|
| Input buffer | 100–150 ms | Buffer jump/attack, not menu actions |
| Coyote time | ~100 ms | Check before the buffer; block double-jump with a flag |
| Hit-stop | 40–120 ms, scaled by damage | Real-time timer; audio continues; once per impact |
| Screen shake | trauma² decay, fast | Move camera/visual, never the simulated body; slider + motion option |
| Squash/stretch | 0.1–0.2 s ease-out/back | Return to rest; conserve volume |
| Knockback | impulse scaled by damage | Do not destabilize physics; clamp |
| Flash | 1–3 frames | Avoid rapid flashing; add non-flash cue |
| SFX layering | transient + body + tail, ±5% pitch | Duck music; separate volume |

- Ease motion (ease-out for settle, back/elastic for pop); linear feels robotic.
- Scale juice to event importance; over-juicing routine actions causes nausea and
  hides real impacts.
- Never let feedback block input or stall gameplay logic.

## 3. Balance and difficulty

- Expose tuning values in data/config, not hard-coded constants.
- Balance by **time-to-kill, time-to-traverse, and resource economy**, not by
  intuition; log the numbers.
- Offer difficulty options (including assist mode) and allow mid-run changes;
  adapt only when the player opts in.
- Use dynamic difficulty sparingly and invisibly; never punish the player for
  doing well without telling them.
- Test the difficulty curve at 30 fps and on low-end hardware — frame drops
  change perceived difficulty.

## 4. Playtesting protocol

1. **Question first**: write the one thing this session must answer (is the verb
   readable? is the difficulty fair? do players understand the goal?).
2. **Recruit the target player**, including people with impairments; do not only
   test with the team.
3. **Observe, do not guide**: give the build and the goal, then stay quiet. Note
   where they hesitate, what they misread, and when they quit.
4. **Measure**: time to first success, deaths per level, retries, quit point,
   input errors, and verbal confusion. Record video/session where consented.
5. **Fix one thing** per round; re-test the same question. Keep a decision log.
6. **Scale**: demo/playtest builds (Steam Playtest, portal basic launch, itch
   devlog) before paid launch; instrument the funnel.

Telemetry is evidence, not a substitute for watching a player. Never collect
personal data without consent.

## 5. Accessibility

- Remap all controls; keyboard, mouse, touch, gamepad; sensitivity and deadzone.
- Subtitles for important speech: speaker ID, size/background, separate volume.
- Colorblind-safe palette; never color-only information; shapes/icons/text.
- Motion/flash reduction: screen shake slider, camera motion toggle, flash
  reduction; respect `prefers-reduced-motion`.
- Difficulty/assist options; no mandatory quick-time events; allow pause.
- DOM/ARIA for menus and text outside the canvas; canvas content is invisible to
  screen readers.
- Test with keyboard only, one hand, low vision, and reduced motion. Include
  people with impairments in playtests.

## 6. S-tier design checklist

- [ ] 30-second verb loop written and prototyped before content.
- [ ] Kill criteria defined; playtest rounds answer one question each.
- [ ] Input latency ≤100 ms; buffer/coyote/hit-stop tuned on real hardware.
- [ ] Feedback is layered, proportional, and returns to rest.
- [ ] Difficulty options + assist mode; tuning values data-driven.
- [ ] Onboarding teaches by doing; goal and failure are readable without text.
- [ ] Accessibility menu: remap, subtitles, color cues, motion/flash, volumes.
- [ ] Telemetry funnel + retention; no unnecessary personal data.
- [ ] Playtested with target players and people with impairments.
- [ ] Game is fun at 30 fps and on a 4 GB Chromebook.

## Sources

- https://aaai.org/papers/ws04-04-001-mda-a-formal-approach-to-game-design-and-game-research/
- https://gamemaker.io/en/blog/flynn-advanced-jump-mechanics
- https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design
- https://gameaccessibilityguidelines.com/full-list/
- https://learn.microsoft.com/en-us/gaming/accessibility/guidelines
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://partner.steamgames.com/doc/features/playtest
