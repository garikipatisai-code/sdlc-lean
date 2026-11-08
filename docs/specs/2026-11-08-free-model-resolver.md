# Free Model Resolver

Status: draft
approved_by:
approved_at:

## Goal

Dynamic Go cost-0 discovery of free models. Any miss, denylisted, unsupported, or expired entry fails closed with no paid fallback.

## Acceptance Criteria

- R-1: Only cost-0 candidates are selected; any priced candidate is rejected.
- R-2: Denylisted models are never selected.
- R-3: Candidates lacking tool-call support are rejected.
- R-4: Cached entries expire by TTL and are not reused after expiry.
- R-5: On miss, denial, or expiry, resolution fails closed with no silent fallback.

## Out-of-scope

Runtime routing changes, model approvals, and any approval action.

## Notes

- Draft only; never approve.
- Paraphrase-only capture; zero-dep; respect quota/secret caps.
- Short, non-sensitive wording.
