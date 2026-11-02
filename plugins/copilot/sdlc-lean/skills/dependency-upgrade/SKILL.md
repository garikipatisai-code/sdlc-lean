---
name: dependency-upgrade
description: Use when upgrading a dependency or a major version, or clearing version drift - so a bump cannot silently break the build or runtime
---

# Dependency Upgrade

One bump at a time, with the suite green between steps.

## Checklist

1. **Why** — security, bug, feature, or drift? If none, skip it (YAGNI).
2. **Audit** — run the project's audit command (for example `npm audit --omit=dev`); record the advisory ID, severity, and fixed version for every finding behind the bump.
3. **Changelog** — read the release notes; list breaking changes and required migrations.
4. **Range** — check the lockfile and peer ranges; pick the smallest version that satisfies the need.
5. **One package** — upgrade a single dependency (or one family) per commit; keep the change to one package.
6. **Lockfile diff assertion** — diff the lockfile after install and assert that only the resolved entry for that package moved; fail the bump if an unrelated resolution changed.
7. **Test** — run the full suite; add a test pinning the behavior you depend on if it is missing.
8. **Runtime smoke** — beyond the unit suite, boot the built artifact and exercise one real path (start, request, or CLI call). Unit tests alone do not make the bump green.
9. **Blast radius** — check transitive deps, native builds, and bundle/runtime size.
10. **Rollback path** — before merging, name the tested rollback path: the reverting commit or diff, the previous version, and a runtime smoke run on the restored state.

## Rules

- Never mix a dependency bump with a feature change in one commit.
- Pin exactly; avoid open ranges in applications.
- If a major is not safe yet, defer it with a trigger in the debt ledger.
