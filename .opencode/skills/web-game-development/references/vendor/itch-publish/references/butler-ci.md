# butler: CI/CD, full flag reference, and the update-check API

> **Modified for sdlc-lean (Apache-2.0 §4(b)).** CI credential handling was
> hardened: no `butler_creds` read, SHA-256 pin, temp-dir extraction,
> step-scoped `BUTLER_API_KEY`, no `butler upgrade` in CI, and a
> `--dereference` exfiltration warning. See the suite's `VENDORED.md`.

Depth for `itch-publish`. Read this for automated uploads, the complete `butler push` flag
set, and notifying players of updates. Verify against the primary docs:
[the butler manual](https://itch.io/docs/butler) (installing, login, pushing).

## 1. Authentication for CI (`BUTLER_API_KEY`)

Interactive `butler login` opens a browser — useless in CI. Instead, set the
**`BUTLER_API_KEY`** environment variable and butler uses it automatically.

Where to get the key:
- Create a **wharf**-scoped key at `itch.io/user/settings/api-keys` and write it
  directly into the CI secret store.
- Do **not** open `butler_creds` in an agent or shell session; `butler login` is
  for interactive local use only. A key read into a transcript is compromised —
  revoke it on the API keys page.

## 2. Installing butler in CI (use `broth`, not the page link)

The `itchio.itch.io/butler` download links **expire**, so they can't be hard-coded. Use the
permanent **broth** URLs, which always serve the latest stable build of a channel:

> **Pin before you run.** `LATEST` is mutable. Download to a temp file, verify a
> maintainer-recorded SHA-256, extract into a temp dir, and scope
> `BUTLER_API_KEY` to the push step. Never pipe a download into a shell and never
> execute a just-downloaded binary with a job-wide publish secret.

```bash
# Example: latest stable Linux amd64 butler. Substitute the channel for your runner OS.
# Record the SHA-256 once, commit it, and update it deliberately when you re-pin.
curl -fsSL -o "$RUNNER_TEMP/butler.zip" \
  "https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default"
echo "<pinned-sha256>  $RUNNER_TEMP/butler.zip" | sha256sum -c -
unzip -q "$RUNNER_TEMP/butler.zip" -d "$RUNNER_TEMP/butler"
"$RUNNER_TEMP/butler/butler" -V   # prints version; confirms the verified binary runs
```

Common broth channels: `linux-amd64`, `linux-arm64`, `windows-amd64`, `darwin-amd64`,
`darwin-arm64`, `darwin-universal` (the list at `broth.itch.zone/butler` is authoritative).
The `-head` channels are bleeding-edge; the others are stable. `.../<channel>/LATEST`
returns the current version number as plain text. The zip also contains two 7-zip helper
libraries — harmless, and not required for `butler push`.

## 3. GitHub Actions example

```yaml
name: Publish to itch.io
on:
  push:
    tags: ["v*"]            # publish when you tag a release
jobs:
  butler:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... your build steps produce ./build/windows, ./build/linux, etc. ...
      - name: Install butler
        run: |
          curl -fsSL -o "$RUNNER_TEMP/butler.zip" \
            "https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default"
          echo "<pinned-sha256>  $RUNNER_TEMP/butler.zip" | sha256sum -c -
          unzip -q "$RUNNER_TEMP/butler.zip" -d "$RUNNER_TEMP/butler"
      - name: Push builds
        env:
          BUTLER_API_KEY: ${{ secrets.BUTLER_API_KEY }}   # step-scoped; never echoed
        run: |
          VERSION="${GITHUB_REF_NAME#v}"     # tag v1.2.0 -> 1.2.0
          "$RUNNER_TEMP/butler/butler" push ./build/windows leafy/my-game:windows --userversion "$VERSION"
          "$RUNNER_TEMP/butler/butler" push ./build/linux   leafy/my-game:linux   --userversion "$VERSION"
```

GitLab CI is equivalent: set `BUTLER_API_KEY` as a masked CI/CD variable and run the same
install + `butler push` commands in a push job script; scope the variable to that job only.

## 4. `butler push` flag reference (checked against butler v15.32.0)

| Flag | Purpose |
|---|---|
| `--userversion <v>` | Set an explicit version string instead of itch's auto-incrementing integer. |
| `--userversion-file <f>` | Read the version string from a file (single line, UTF-8, no BOM). |
| `--if-changed` | Skip the push if it would be an empty patch (contents identical to the latest build). |
| `--hidden` | Mark the upload hidden — **only** when the push creates a *new* channel; errors on an existing one. |
| `--ignore '<glob>'` | Exclude matching files; repeatable (`--ignore '*.pdb' --ignore '*.dSYM'`). Two dashes. |
| `--dry-run` | List every file that would be pushed (+ a summary); uploads nothing and needs no login. |
| `--no-auto-unzip` | Push a folder holding a single `.zip` as that one opaque file. By default (`--auto-unzip`) butler pushes the zip's contents instead. |
| `--dereference` | Follow symlinks and upload copies of their targets (larger builds; **never** on untrusted or symlinked build trees — it can publish `~/.ssh`/`.env` contents). |
| `--fix-permissions` | On by default: detects Mac and Linux executables and sets their executable bit. `--no-fix-permissions` turns it off. |
| `--auto-wrap` | On by default: when the source path is a macOS `.app` bundle, keeps the bundle as the top-level folder of the build. |
| `-i, --identity <file>` | Read/save credentials from another file, to use several itch.io accounts on one machine. |

The target may also be given as a numeric game ID or a game page URL
(`butler push ./build https://leafy.itch.io/my-game:windows`).

Related commands:

| Command | Purpose |
|---|---|
| `butler login` / `butler logout` | Authorize / clear local credentials (browser flow). |
| `butler version` | Print butler's version (confirms install + PATH). |
| `butler which` | Print the full path to the running butler binary. |
| `butler status <user>/<game>` | List channels and their latest builds/versions. |
| `butler push-preview <dir> <user>/<game>:<ch>` | Show `NEW/MODIFIED/DELETED/SAME` vs the last build; add `--changes-only` to hide unchanged. Uploads nothing. |
| `butler upgrade` | Update butler itself to the latest version. Do **not** run in CI — it re-downloads unpinned code. |

Notes:
- Processing: after a push the build is immediately live via a fast "default" patch; itch.io
  then regenerates an optimized (smaller) patch in the background — around 30 minutes for a
  large game, with its status in the channel's build list. Players are never blocked on it.
- Working from a remote/SSH host: `butler login` prints a URL; open it locally, copy the
  redirected (non-loading) page's address, and paste it back into the terminal.

## 5. Notify players of updates (no auth required)

Players who download directly (not via the itch app) don't auto-update. Query the latest
user-version for a channel and prompt them in-game:

```text
GET https://api.itch.io/wharf/latest?target=<user>/<game>&channel_name=<channel>
# or by numeric game_id (from the Edit game page URL):
GET https://api.itch.io/wharf/latest?game_id=<id>&channel_name=<channel>

Response: { "latest": "1.2.0" }   // omitted if the latest build has no user-version
```

Compare `latest` to your build's version (push with `--userversion`) and surface an
"update available" message. Private games return an "invalid game" error to avoid leaking
unreleased titles.
