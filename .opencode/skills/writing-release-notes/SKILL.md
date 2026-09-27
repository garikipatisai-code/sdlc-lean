---
name: writing-release-notes
description: Use when preparing a release, changelog entry, or version bump. Reader-change entries only - never code descriptions
---

# Writing Release Notes

**Refusal: an entry that describes the code instead of the reader's change.**

Each entry answers: what changes for the reader (upgrade? action? break?).
Sections: Breaking (with migration), Added, Fixed, Deprecated (with removal date).
Derive from merged diffs/PRs, propose a version bump (breaking → major), and
provide the copy-pasteable release command. No internals, no file lists.
