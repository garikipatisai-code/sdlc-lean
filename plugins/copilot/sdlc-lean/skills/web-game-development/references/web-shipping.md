# Shipping a web game

A build that runs locally is not shippable. Portals gate on load time, size,
file count, SDK events, and sometimes exclusivity. Mobile browsers gate on audio,
saves, memory, and screen shape.

## Portal requirements (verify current docs before upload)

| Portal | Hard limits / rules | Notes |
|---|---|---|
| **CrazyGames** | 250 MB total, 1500 files, initial download ≤50 MB (≤20 MB mobile home), ≤20 s to first gameplay; Chrome/Edge; must run on 4 GB Chromebook | Basic Launch 7–21 days or 500 plays; promoted on playtime, conversion, retention |
| **Poki** | 100M+ MAU; web exclusivity is the preferred/default deal (typically ~5 years; web only, Steam/console apps unaffected). Non-exclusive is a one-time flat license fee with no revenue share. Direct users: 100% to you; Poki-sourced revenue split is typically 50/50 | Confirm current terms at https://developers.poki.com/guide/revenue-deal-types; use the Poki SDK; an exclusive deal rules out the same build on competing web portals |
| **itch.io** | 500 MB, 1000 files; `index.html`; relative paths; HTTPS assets; case-sensitive filenames; `.br`/`.gz` via content-encoding | Butler CLI for channels; HTML5 builds run in an iframe |
| **Newgrounds / Kongregate** | Verify current rules | Legacy portals still value small, fast builds |

**Build for the iframe:** relative asset paths, no top-level navigation, no
`window.open` without a gesture, no service worker assumptions that break
embedding, and safe-area padding for notches.

## Performance budgets

| Metric | Target | Why |
|---|---|---|
| LCP | ≤2.5 s (p75) | Portal first impression / Core Web Vital |
| INP | ≤200 ms (p75) | Input responsiveness |
| CLS | ≤0.1 (p75) | Layout stability |
| First gameplay | ≤20 s (CrazyGames), aim ≤10 s | Portal ranking and player drop-off |
| Initial download | ≤50 MB desktop, ≤20 MB mobile home | Portal limits |
| Frame time | p95 ≤16.7 ms at 60 fps on mid-tier hardware | Playability |
| Bundle (JS) | Budget per scene; measure gzip/Brotli | Parse/compile cost on mobile |

Measure on a throttled connection and a mid-tier device, not localhost.

## Saves and offline

- Use **IndexedDB** for structured saves; Cache Storage for assets. `localStorage`
  is small and synchronous — avoid for game state.
- Call `navigator.storage.persist()` and handle eviction; export/import a save
  file so players do not lose progress.
- Version the save schema and write migrations. Never ship a schema change
  without a migration test from the previous release.
- Autosave plus manual slots; atomic writes (write temp then swap) where possible.
- PWA: manifest + service worker for offline/cached play; be careful with portal
  iframes and cache invalidation. Provide a visible update path.

## Audio

- Browsers block autoplay: create/resume `AudioContext` on the first user gesture
  (`pointerdown`/`touchend`/`keydown`/`click`); iOS may interrupt on background/
  route change — resume and rebuild sources. Test keyboard-only unlock.
- Use Web Audio for mixing/ducking; audio sprites for short SFX; stream music.
- Separate music/SFX/voice volumes; persist settings; provide mono/reduced audio
  options where relevant.

## Accessibility (non-negotiable)

- Canvas is a bitmap: screen readers cannot see drawn text or menus. Put menus,
  settings, subtitles, and pause screens in **DOM/ARIA**, layered over the canvas.
- Remap all controls; support keyboard, mouse, touch, and gamepad; show device
  prompts that match the active device.
- Never encode information by color alone; provide shapes/icons/text and a
  colorblind-safe palette.
- Subtitles for important speech with speaker ID, size/background options;
  separate volume controls.
- Offer motion reduction (screen shake, flashes, camera motion) and respect
  `prefers-reduced-motion`; avoid rapid flashing.
- Difficulty options and mid-run changes; include people with impairments in
  playtests. Xbox XAG is a design checklist, not a compliance standard.
- Remember settings and safe areas; support portrait/landscape or declare one.

## Analytics and live ops

- Funnel events: load start/complete, gameplay start/stop, level start/complete/
  fail/quit, purchase/ad events, error/context loss.
- Track D1/D7 retention, session length, first-gameplay time, and progression
  bottlenecks; avoid collecting personal data you do not need.
- Portal SDK events are required for ranking/revenue; test them in the portal's
  sandbox before launch.
- Ethical monetization: opt-in rewarded ads only, reward stated in the label,
  daily caps/diminishing returns, ad-blocker fallback, no ads during gameplay
  pre-launch.

## Launch checklist

- [ ] Portal build passes size/file/load limits on a throttled connection.
- [ ] First gameplay ≤20 s; LCP/INP/CLS at p75 within budget.
- [ ] Relative paths, HTTPS externals, case-exact filenames, Brotli/gzip.
- [ ] Audio unlocks on first gesture; iOS interruption handled.
- [ ] IndexedDB save + `persist()` + export/import + schema migration test.
- [ ] Keyboard/mouse/touch/gamepad; remap; safe areas; device prompts.
- [ ] DOM/ARIA menus; subtitles; color-independent cues; motion/flash options;
      difficulty options; separate volumes.
- [ ] Service worker/manifest if offline is supported; update path visible.
- [ ] Analytics funnel + portal SDK events verified in sandbox.
- [ ] Error reporting for context loss, asset failures, and unhandled rejections.
- [ ] Rollback: previous build artifact and save-compatible version available.
- [ ] Store page assets, trailer, screenshots, and privacy/terms in place.

## Sources

- https://docs.crazygames.com/requirements/technical/ ; https://docs.crazygames.com/
- https://developers.poki.com/guide/revenue-deal-types ; https://sdk.poki.com/guide/working-with-poki
- https://itch.io/docs/creators/html5
- https://web.dev/articles/vitals ; https://web.dev/articles/rail
- https://web.dev/learn/pwa/offline-data
- https://gameaccessibilityguidelines.com/full-list/
- https://learn.microsoft.com/en-us/gaming/accessibility/guidelines
- https://docs.crazygames.com/resources/rewarded-ads-deep-dive/
