---
description: Draft release notes and a version bump from the diff - read-only, never publishes
agent: build
---

Draft release notes for: $ARGUMENTS (default: current diff / merged PRs since the last tag).

Invoke `writing-release-notes`. Read the diff and merged PRs `read-only`; change nothing in the working tree.

1. **Draft** — sections `Breaking` (with migration), `Added`, `Fixed`, `Deprecated` (with removal date). Reader-change entries only; no internals or file lists.
2. **Version bump** — propose major for breaking, minor for added, patch for fixes, with a one-line justification.
3. **Hand off** — print the notes and the copy-pasteable release command. Do not tag, publish, push, or edit source.

Publishing requires `explicit human approval`. Never infer consent from a request to draft; wait for the human to say publish.
