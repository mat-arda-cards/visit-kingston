#!/bin/sh
# backup-roundtrip-test.sh — mechanical proof that the encrypt -> decrypt ->
# restore chain actually works. A backup you cannot decrypt is not a backup.
#
# Generates a throwaway age keypair (never touches the real
# BACKUP_AGE_RECIPIENT / the 1Password private key), synthesizes a minimal
# backup bundle (or uses $BUNDLE_FILE if set), runs it through
# fetch-encrypt-backup.sh in BUNDLE_FILE mode, decrypts, restores with
# restore-backup.mjs, and byte-compares every restored file against the
# source. Prints "roundtrip OK" and exits 0 on success.
#
# Requires `age` + `age-keygen` on PATH:
#   brew install age        (macOS)
#   apt-get install -y age  (Debian/Ubuntu)
#
# Usage:
#   sh scripts/backup-roundtrip-test.sh
#   BUNDLE_FILE=./real-bundle.json sh scripts/backup-roundtrip-test.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v age >/dev/null 2>&1 || ! command -v age-keygen >/dev/null 2>&1; then
  echo "backup-roundtrip-test: 'age'/'age-keygen' not found on PATH. Install: brew install age (macOS) or apt-get install -y age (Debian/Ubuntu)." >&2
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# Ephemeral keypair, generated fresh every run — never the real
# BACKUP_AGE_RECIPIENT / 1Password key.
age-keygen -o "$TMPDIR/key.txt" 2>/dev/null
RECIPIENT="$(grep '^# public key:' "$TMPDIR/key.txt" | sed 's/^# public key: *//')"

if [ -n "${BUNDLE_FILE:-}" ]; then
  BUNDLE="$BUNDLE_FILE"
else
  BUNDLE="$TMPDIR/bundle.json"
  # Minimal valid bundle: one utf8 file, one base64 (photo-like) file.
  cat > "$BUNDLE" <<'JSON'
{
  "app": "explore-kingston",
  "version": 1,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "dataDir": "/data",
  "fileCount": 2,
  "files": [
    { "path": "stores/events.json", "encoding": "utf8", "content": "{\"hello\":\"world\"}" },
    { "path": "hunts/photos/example/stop-1/photo.jpg", "encoding": "base64", "content": "aGVsbG8gd29ybGQ=" }
  ]
}
JSON
fi

ENCRYPTED="$TMPDIR/backup.json.age"
BACKUP_AGE_RECIPIENT="$RECIPIENT" OUT="$ENCRYPTED" BUNDLE_FILE="$BUNDLE" \
  sh "$SCRIPT_DIR/fetch-encrypt-backup.sh"

# Assert it's actually an age file, not plaintext that slipped through.
HEADER="$(head -c 22 "$ENCRYPTED")"
if [ "$HEADER" != "age-encryption.org/v1" ]; then
  echo "backup-roundtrip-test: $ENCRYPTED does not start with the age header (got: $HEADER)" >&2
  exit 1
fi

DECRYPTED="$TMPDIR/decrypted.json"
age -d -i "$TMPDIR/key.txt" -o "$DECRYPTED" "$ENCRYPTED"

RESTORE_DIR="$TMPDIR/restore"
mkdir -p "$RESTORE_DIR"
node "$REPO_ROOT/scripts/restore-backup.mjs" "$DECRYPTED" "$RESTORE_DIR"

# Byte-compare every file the bundle described against what restore-backup.mjs
# actually wrote.
node - "$BUNDLE" "$RESTORE_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const [, , bundlePath, restoreDir] = process.argv;
const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
for (const f of bundle.files) {
  const expected = f.encoding === "base64"
    ? Buffer.from(f.content, "base64")
    : Buffer.from(f.content, "utf8");
  const actual = fs.readFileSync(path.join(restoreDir, f.path));
  if (!expected.equals(actual)) {
    console.error(`backup-roundtrip-test: byte mismatch restoring ${f.path}`);
    process.exit(1);
  }
}
NODE

echo "roundtrip OK"
