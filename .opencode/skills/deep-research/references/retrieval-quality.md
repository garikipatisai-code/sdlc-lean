# Retrieval quality

Detail behind the `SKILL.md` Search/Compress bullets: diversity,
freshness, and canonical-URL dedup. Stdlib URL rules, no deps.
Complements `source-quality.md` (which sources to trust) and
`citation-check.md` (per-claim entailment after drafting).

## Diversity

- Span independent domains: do not stack one publisher, one syndication
  feed, or one search vertical and call it agreement.
- Prefer a mix of types: at least one primary source per substantive
  theme, plus independent secondary confirmation where the primary
  is silent or contested.
- Treat syndicated copies (same wire story republished) as one source
  for the confidence count, not many.
- Cap any single domain at roughly one third of `sources_reviewed`
  for standard/deep modes; if the topic genuinely lives on one
  domain, name it and say why.
- Disagreement across diverse domains is signal: surface it in
  `## Conflicts and gaps` instead of averaging it away.

## Freshness

- Check published/updated dates on every non-archival claim; record
  the date in `## Sources` (`title — url (YYYY-MM-DD)`).
- Fast-moving topics (releases, prices, policies, tooling): prefer
  sources from the last 12 months; flag anything older as stale and
  re-verify before citing.
- Slow-moving topics (math, settled science, standards): prefer the
  primary source regardless of age; note the vintage so the reader
  can judge currency.
- Undated material is usable only for leads or archived quotes;
  mark it "unverified" as a factual basis (see `source-quality.md`).
- If two sources conflict and freshness differs, prefer the more
  recent primary source and say so in the report.

## Canonical URL dedup (stdlib URL rules, no deps)

Dedupe key: the normalized `href` produced by the built-in `URL` —
no added packages, no custom parser:

1. Parse with `new URL(value)`; if it throws, keep the raw string as
   its own key (invalid URLs never merge).
2. Lowercase scheme and host (the `URL` constructor does this).
   Keep `http` and `https` distinct keys; keep `www` vs non-`www`
   distinct unless a redirect to the same canonical was observed.
3. Drop default ports (`:80` on http, `:443` on https) — `new URL`
   normalizes these away; keep non-default ports.
4. Strip the fragment: `url.hash = ""`.
5. Remove tracking query params only — `utm_*`, `fbclid`, `gclid`,
   `msclkid`, `mc_*` (prefix match, incl. `mc_cid`, `mc_eid`), `_ga` — then
   `url.searchParams.sort()` so remaining keys order by name, then value. Never strip semantic
   params (`id`, `page`, `slug`, `q`).
6. Strip a trailing `/` from the path except for the root `/`;
   keep path case and percent-encoding as `url.href` emits them.
7. Use the resulting `url.href` as the dedup key. Merge duplicates
   to the earliest citation number; never drop a source that
   supports a kept claim; preserve citation numbers (`SKILL.md` §4).
