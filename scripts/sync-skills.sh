#!/usr/bin/env bash
#
# Re-sync the vendored upstream skills under vendor/skills/.
#
# These are a pinned REFERENCE COPY, never edited by hand and never published from this repo —
# they belong to angular/angular and spartan-ng/spartan, and consumers install them from there.
# We keep a pinned copy so `.agents/skills/angular-standards/references/` can cite specific
# upstream files and so an upgrade shows up as a reviewable diff. A stale copy has agents writing
# last year's Angular, which is the failure mode
# .agents/skills/angular-standards/references/longevity.md exists to prevent.
#
# Only vendor what the standards actually cite. A skill we tell people NOT to install does not
# belong here: the conflict table in spartan-ui.md pins an upstream permalink, which is immutable
# and verifiable without a local copy.
#
# Run this:
#   - after every Angular major or minor upgrade
#   - after every Spartan minor upgrade
#   - quarterly, as a matter of course
#
# Our own skill (.agents/skills/angular-standards/) is a separate tree and is never touched here.
#
# Reproducibility: each source's ref is resolved to a commit SHA once, then the tree and every
# blob are fetched by that SHA — never from the moving branch. Files are staged in a temp
# directory and only swapped in once every download succeeds, so an interrupted run leaves the
# previous copy intact.
#
# Usage:
#   ./scripts/sync-skills.sh            # sync every source
#   ./scripts/sync-skills.sh --check    # report drift, change nothing (use in CI)
#   ./scripts/sync-skills.sh <name>     # sync one source by key

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/vendor/skills"
UPSTREAM_FILE="$SKILLS_DIR/UPSTREAM.txt"

# ── Sources ────────────────────────────────────────────────────────────────────────────────────
# key|repo|branch|path-within-repo|space-separated skill dirs to replace
SOURCES=(
  "angular|angular/angular|main|skills/dev-skills|angular-developer angular-new-app"
  "spartan|spartan-ng/spartan|main|skills/spartan|spartan"
)

CHECK_ONLY=false
ONLY_KEY=""
case "${1:-}" in
  --check) CHECK_ONLY=true ;;
  "")      ;;
  *)       ONLY_KEY="$1" ;;
esac

command -v curl >/dev/null || { echo "error: curl is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "error: python3 is required" >&2; exit 1; }

recorded_sha() {  # $1 = source key
  awk -v k="$1" '$1=="source:" && $2==k {found=1} found && $1=="commit:" {print $2; exit}' \
    "$UPSTREAM_FILE" 2>/dev/null || true
}

drift=0
changed=0
declare -a RESULTS=()

for entry in "${SOURCES[@]}"; do
  IFS='|' read -r key repo branch src_path skills <<< "$entry"
  [[ -n "$ONLY_KEY" && "$ONLY_KEY" != "$key" ]] && continue

  api="https://api.github.com/repos/$repo"
  echo "── $key ($repo @ $src_path)"

  # Resolve the moving ref to a concrete commit ONCE. Everything below uses this SHA.
  remote_sha="$(curl -fsSL "$api/commits?sha=$branch&path=$src_path&per_page=1" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["sha"])')"
  local_sha="$(recorded_sha "$key")"
  local_sha="${local_sha:-none}"

  echo "   local:  ${local_sha:0:12}"
  echo "   remote: ${remote_sha:0:12}"

  if [[ "$local_sha" == "$remote_sha" ]]; then
    echo "   up to date."
    RESULTS+=("$key|$repo|$src_path|$remote_sha|$skills")
    continue
  fi

  drift=1
  if $CHECK_ONLY; then
    echo "   DRIFT" >&2
    RESULTS+=("$key|$repo|$src_path|$local_sha|$skills")
    continue
  fi

  files="$(curl -fsSL "$api/git/trees/$remote_sha?recursive=1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('truncated'):
    sys.exit('error: tree response truncated; cannot sync reliably')
prefix = '$src_path/'
for e in data.get('tree', []):
    if e['type'] == 'blob' and e['path'].startswith(prefix):
        print(e['path'])
")"
  [[ -n "$files" ]] || { echo "error: no files found for $key — aborting" >&2; exit 1; }

  staging="$(mktemp -d)"
  count=0
  while IFS= read -r path; do
    dest="$staging/${path#"$src_path"/}"
    mkdir -p "$(dirname "$dest")"
    curl -fsSL "https://raw.githubusercontent.com/$repo/$remote_sha/$path" -o "$dest"
    count=$((count + 1))
  done <<< "$files"

  # Only now touch the working tree. Replace whole dirs so upstream deletions propagate.
  for skill in $skills; do
    rm -rf "${SKILLS_DIR:?}/$skill"
    if [[ -d "$staging/$skill" ]]; then
      cp -R "$staging/$skill" "$SKILLS_DIR/$skill"
    else
      # Source path IS the skill directory (no nesting).
      mkdir -p "$SKILLS_DIR/$skill"
      cp -R "$staging/." "$SKILLS_DIR/$skill/"
    fi
  done
  rm -rf "$staging"

  echo "   synced $count files."
  changed=1
  RESULTS+=("$key|$repo|$src_path|$remote_sha|$skills")
done

if $CHECK_ONLY; then
  if [[ $drift -eq 1 ]]; then
    echo
    echo "Vendored skills are behind upstream. Run ./scripts/sync-skills.sh" >&2
    exit 1
  fi
  echo
  echo "All sources up to date."
  exit 0
fi

# Rewrite the provenance file from the results of this run.
if [[ -n "$ONLY_KEY" ]]; then
  echo
  echo "Synced '$ONLY_KEY' only — UPSTREAM.txt left untouched for other sources."
else
  {
    echo "# Pinned upstream skills. Do not edit these files by hand — see vendor/skills/README.md."
    echo "# Regenerate with ./scripts/sync-skills.sh"
    echo
    for r in "${RESULTS[@]}"; do
      IFS='|' read -r key repo src_path sha skills <<< "$r"
      echo "source: $key"
      echo "repo: $repo"
      echo "path: $src_path"
      echo "commit: $sha"
      echo "skills: $skills"
      echo
    done
    echo "synced: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$UPSTREAM_FILE"
fi

if [[ $changed -eq 0 ]]; then
  echo
  echo "Nothing changed."
  exit 0
fi

cat <<'EOF'

Next:
  1. git diff vendor/skills/ — read what changed upstream.
  2. If Angular deprecated something new, add it to the banned table in
     .agents/skills/angular-standards/references/longevity.md.
  3. If a peer-dependency ceiling moved (e.g. Spartan now supports the next Angular major),
     update the dependency-ceiling table in .agents/skills/angular-standards/references/longevity.md.
  4. If upstream guidance now contradicts .agents/skills/angular-standards/references/, reconcile deliberately.
     Known divergence to re-check: the null rule in .agents/skills/angular-standards/references/forms.md.
EOF
