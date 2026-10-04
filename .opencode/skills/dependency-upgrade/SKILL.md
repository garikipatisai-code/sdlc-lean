---
name: dependency-upgrade
description: Use when upgrading a dependency or a major version, or clearing version drift - so a bump cannot silently break the build or runtime
---

# Dependency Upgrade

One bump at a time, with the suite green between steps.

## Checklist

1. **Why** — security, bug, feature, or drift? If none, skip it (YAGNI).
2. **Changelog** — read the release notes; list breaking changes and required migrations.
3. **Range** — check the lockfile and peer ranges; pick the smallest version that satisfies the need.
4. **One at a time** — upgrade a single dependency (or one family) per commit.
5. **Test** — run the full suite; add a test pinning the behavior you depend on if it is missing.
6. **Blast radius** — check transitive deps, native builds, and bundle/runtime size.
7. **Rollback** — record the previous version and any migration down-steps.

## Rules

- Never mix a dependency bump with a feature change in one commit.
- Pin exactly; avoid open ranges in applications.
- If a major is not safe yet, defer it with a trigger in the debt ledger.
