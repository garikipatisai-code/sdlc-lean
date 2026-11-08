# Dependency upgrade method (reference)

Paraphrased guidance. Non-sensitive. Attribution: Renovate (Mend), CycloneDX
(OWASP CycloneDX project), OSV (Google/OpenSSF), plus the one-package,
lockfile-diff, runtime-smoke, and rollback discipline already in this skill.
Do not copy source text; apply the ideas.

## Renovate posture

Renovate automates the proposal of dependency updates; it does not replace the
judgment in the 10-step. Treat it as a generator of one-package change
proposals, not as an approver.

- One update per pull request. Disable grouping that would hide a second
  package behind a single reviewed diff; a grouped PR is not one bump even if
  it is one commit.
- Lockfile maintenance is its own reviewed change. Run it separately, with the
  same lockfile diff assertion, and never mixed with a feature or a version
  bump.
- Automerge is optional and only after the full suite and the runtime smoke
  pass on the proposed change. Automerge never waives the rollback path or the
  smoke check; if smoke cannot run in CI, automerge stays off.
- Keep Renovate's release notes/changelog link in the PR body so the breaking
  changes from step 3 are visible to reviewers.
- Defer a major with a trigger in the debt ledger rather than letting Renovate
  auto-merge it.

## CycloneDX SBOM posture

A CycloneDX software bill of materials is a machine-readable inventory of the
components in a build. Use it as evidence of scope, not as a substitute for
tests.

- Generate an SBOM before the bump and again after, using the same generator,
  format, and component scope both times.
- Diff the two SBOMs. The only component whose version may change is the
  target package (plus the transitive closure it legitimately pulls in, which
  must be named in the blast-radius note).
- An SBOM diff that touches an unrelated component fails the bump even when
  the lockfile diff looks clean; resolve the resolution drift first.
- Keep the SBOM pair with the change record so rollback can verify the
  restored inventory matches the pre-bump SBOM.
- SBOMs reveal dependency inventory. Treat them as internal artifacts: no
  secrets, tokens, or credentials belong in them, and redact or withhold
  private registry URLs when sharing outside the team.

## OSV posture

OSV (Open Source Vulnerabilities) is the advisory source for "why bump". Use it
to name and size the risk, then verify with the project's own audit command.

- Scan the lockfile with an OSV scanner in CI and locally; cross-check the
  result against `npm audit`/`pip-audit`/equivalent rather than trusting one
  source.
- Record the OSV ID (OSV-...), plus any CVE/GHSA alias, severity, and fixed
  version for every finding behind the bump. Advisory ID is required evidence.
- A vulnerability-driven bump is still one package at a time with the full
  10-step. OSV severity does not justify skipping tests, smoke, or rollback.
- Re-scan after the bump to confirm the finding is gone; a stale advisory in
  the report fails the bump.
- Prefer OSV IDs in notes because they are ecosystem-specific and unambiguous;
  CVE/GHSA aliases are supplementary.

## How the tools fit the 10-step

| Step | Tool contribution | Still required |
|---|---|---|
| 1 Why | OSV/advisory or feature need names the reason | YAGNI skip if none |
| 2 Audit | OSV scan + project audit command | advisory ID, severity, fixed version |
| 3 Changelog | release notes of the chosen version | breaking changes, migrations |
| 4 Range | lockfile and peer ranges | smallest satisfying version |
| 5 One package | Renovate one-update-per-PR discipline | one package (or one family) per commit |
| 6 Lockfile diff | CycloneDX SBOM diff alongside lockfile diff | only target resolution moves |
| 7 Test | full suite; pin missing behavior | new/changed test as needed |
| 8 Smoke | boot built artifact, one real path | unit suite alone is insufficient |
| 9 Blast radius | SBOM diff, transitive deps, native builds, size | name any added closure |
| 10 Rollback | revert commit or previous version + smoke | tested on restored state |

## Guardrails

- Renovate, CycloneDX, and OSV strengthen evidence and automation; none of
  them weakens one-package, lockfile diff assertion, runtime smoke, or the
  tested rollback path.
- A green OSV scan or a clean SBOM diff is not a passing bump by itself.
- Automation proposals still require the same review, tests, and smoke.
- Keep the change non-sensitive: no secrets in SBOMs, audit logs, or evidence
  rows; redact tokens/URLs/PII before sharing.