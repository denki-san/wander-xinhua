#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVIDENCE_ROOT="${WANDER_XINHUA_EVIDENCE_ROOT:-/Volumes/plugin/Wander_Xinhua_Dynamic_Evidence}"
DATE_STAMP="${WANDER_XINHUA_EVIDENCE_DATE:-$(date +%F)}"
GIT_SHA="$(git -C "$PROJECT_ROOT" rev-parse --short=7 HEAD)"
SNAPSHOT_ID="${DATE_STAMP}-${GIT_SHA}"
SNAPSHOT_ROOT="$EVIDENCE_ROOT/snapshots/$SNAPSHOT_ID"
REPOSITORY_ROOT="$SNAPSHOT_ROOT/repository"

if [[ ! -d "$(dirname "$EVIDENCE_ROOT")" ]]; then
  print -u2 "外置硬盘未挂载：$(dirname "$EVIDENCE_ROOT")"
  exit 1
fi

if [[ -e "$SNAPSHOT_ROOT" ]]; then
  print -u2 "快照已存在，禁止覆盖：$SNAPSHOT_ROOT"
  exit 1
fi

mkdir -p "$REPOSITORY_ROOT"

for relative_path in test_artifacts research/references research/previews; do
  if [[ -e "$PROJECT_ROOT/$relative_path" ]]; then
    mkdir -p "$REPOSITORY_ROOT/${relative_path:h}"
    rsync -aH "$PROJECT_ROOT/$relative_path" "$REPOSITORY_ROOT/${relative_path:h}/"
  fi
done

mkdir -p "$REPOSITORY_ROOT/docs/research"
rsync -aH \
  --exclude='*.md' \
  "$PROJECT_ROOT/docs/research/" \
  "$REPOSITORY_ROOT/docs/research/"

mkdir -p "$REPOSITORY_ROOT/assets/models/source/character/references"
for relative_path in \
  assets/models/source/character/kaykit-rogue-preview.png \
  assets/models/source/character/urban-wanderer-preview.png \
  assets/models/source/character/references/ultimate-modular-men-preview.jpg; do
  if [[ -f "$PROJECT_ROOT/$relative_path" ]]; then
    mkdir -p "$REPOSITORY_ROOT/${relative_path:h}"
    cp -p "$PROJECT_ROOT/$relative_path" "$REPOSITORY_ROOT/$relative_path"
  fi
done

(
  cd "$SNAPSHOT_ROOT"
  find repository -type f -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS
)

FILE_COUNT="$(find "$REPOSITORY_ROOT" -type f | wc -l | tr -d ' ')"
BYTE_COUNT="$(du -sk "$REPOSITORY_ROOT" | awk '{print $1 * 1024}')"
DIRTY_STATE="$(git -C "$PROJECT_ROOT" status --porcelain)"
if [[ -n "$DIRTY_STATE" ]]; then
  DIRTY=true
else
  DIRTY=false
fi

node - "$SNAPSHOT_ROOT/manifest.json" "$SNAPSHOT_ID" "$GIT_SHA" "$FILE_COUNT" "$BYTE_COUNT" "$DIRTY" <<'NODE'
const fs = require("node:fs");
const [output, snapshotId, gitSha, fileCount, byteCount, dirty] = process.argv.slice(2);
const manifest = {
  schemaVersion: 1,
  project: "wander-xinhua",
  snapshotId,
  createdAt: new Date().toISOString(),
  gitSha,
  sourceWorktreeDirty: dirty === "true",
  fileCount: Number(fileCount),
  byteCount: Number(byteCount),
  checksumFile: "SHA256SUMS",
  contentRoot: "repository",
  wikiEligible: false,
};
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

(
  cd "$SNAPSHOT_ROOT"
  shasum -a 256 -c SHA256SUMS >/dev/null
)

print "动态证据快照完成：$SNAPSHOT_ROOT"
print "文件数：$FILE_COUNT"
print "字节数：$BYTE_COUNT"
print "SHA-256：全部通过"
