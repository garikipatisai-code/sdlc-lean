# Dynamic Code Fallback

Status: draft
approved_by:
approved_at:

## Goal

Dispatch-time session-model fallback with no hard-coded `muse` model. When the session's active model is unavailable or unobservable at dispatch, fall back to the session's configured model at dispatch time.

## Scope

- Plugin resolver: dispatch-time session-model fallback.
- Phase quota: respect phase quota when selecting fallback.
- Guard tests: no paid leak, cap/secret guards, determinism.
- Pin→property: replace string pins with property-based selection.

## Acceptance Criteria

- FB-1: Dynamic fallback — fallback target derives from the session model at dispatch time; no hard-coded `muse` model.
- FB-2: No paid leak — denylist plus suffix normalization plus TTL bound prevent leaking to paid models.
- FB-3: Cap/secret guards — quota cap and secret guards block fallback when breached.
- FB-4: Determinism via properties not strings — selection is deterministic on model properties, not exact string pins.
- FB-5: Gates green + critics — all verification gates pass and critic review passes.

## Out-of-scope

- Model endorsement — selecting or endorsing a preferred model as a recommendation.
- Weakening rejections — loosening model rejection rules.
- Auto-spend — automatic spending of paid quota.

## Notes

- Fail-open on unobservable — if observability is unavailable, fail open and proceed without fallback blocking.
- Mirror sync — keep fallback mirror in sync with session model state.
- Zero-dep/V1+V2 — zero-dependency implementation, compatible with V1+V2 plugin APIs.
