#!/bin/sh
# fetch-encrypt-backup.sh — pull the off-site admin backup bundle and encrypt
# it with age before it ever touches disk. Plaintext never persists anywhere:
# the HTTP response is piped straight into `age`. POSIX sh, no external deps
# beyond curl/age/wc/sha256sum (or macOS's shasum).
#
# Usage (normal — pull the live bundle over the network):
#   BASE_URL=https://explore-kingston.onrender.com \
#   BACKUP_TOKEN=... \
#   BACKUP_AGE_RECIPIENT=age1... \
#   ./scripts/fetch-encrypt-backup.sh
#
# Usage (test mode — encrypt an already-fetched/synthetic bundle FILE instead
# of hitting the network; used by scripts/backup-roundtrip-test.sh):
#   BUNDLE_FILE=./bundle.json BACKUP_AGE_RECIPIENT=age1... ./scripts/fetch-encrypt-backup.sh
#
# Requires `age` on PATH:  brew install age  /  apt-get install -y age
#
# Env:
#   BASE_URL              required unless BUNDLE_FILE is set
#   BACKUP_TOKEN           required unless BUNDLE_FILE is set (never echoed)
#   BACKUP_AGE_RECIPIENT   required — an age1... X25519 recipient public key
#   OUT                    optional — output path, default ./backup-<UTC date>.json.age
#   BUNDLE_FILE            optional — encrypt this local file instead of fetching

set -eu

BACKUP_AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required (an age1... public key)}"
OUT="${OUT:-./backup-$(date -u +%F).json.age}"

if ! command -v age >/dev/null 2>&1; then
  echo "fetch-encrypt-backup: 'age' not found on PATH. Install: brew install age (macOS) or apt-get install -y age (Debian/Ubuntu CI runners)." >&2
  exit 1
fi

if [ -n "${BUNDLE_FILE:-}" ]; then
  # Test mode: encrypt a local file. No network fetch, no health probe.
  age -r "$BACKUP_AGE_RECIPIENT" -o "$OUT" < "$BUNDLE_FILE"
else
  BASE_URL="${BASE_URL:?BASE_URL is required}"
  BACKUP_TOKEN="${BACKUP_TOKEN:?BACKUP_TOKEN is required}"

  # Cheap liveness probe before pulling the (potentially large) bundle — fail
  # fast on a dead host rather than burning the backup window on a timeout.
  health_code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 30 "${BASE_URL%/}/api/health")" || {
    echo "fetch-encrypt-backup: /api/health did not respond" >&2
    exit 1
  }
  if [ "$health_code" != "200" ]; then
    echo "fetch-encrypt-backup: /api/health returned $health_code, expected 200" >&2
    exit 1
  fi

  # The bundle streams straight into `age` — plaintext never touches disk on
  # this runner. -f fails curl on HTTP >= 400 (bad/missing token, an
  # undeployed route); --retry rides out transient network/5xx blips.
  #
  # A plain `curl | age` pipeline hides curl's exit status behind age's (the
  # shell only sees the last command in a pipe) — a failed curl would still
  # let age emit a small, VALID-looking encrypted file of empty/garbage
  # input, and the caller would report success on a backup that never
  # happened. Capture curl's real exit code via a side file (POSIX sh has no
  # `pipefail`). The if/else form is required, not just `curl ...; echo "$?"`
  # — under `set -e`, a failing simple command aborts the enclosing `{ }`
  # group before the next line runs, but a command used as an `if` condition
  # is explicitly exempt from that abort.
  CURL_STATUS_FILE="$(mktemp)"
  trap 'rm -f "$CURL_STATUS_FILE"' EXIT
  { if curl -fsS --max-time 300 --retry 3 --retry-all-errors \
        -H "Authorization: Bearer ${BACKUP_TOKEN}" \
        "${BASE_URL%/}/api/admin/backup"; then
      CURL_EXIT=0
    else
      CURL_EXIT=$?
    fi
    echo "$CURL_EXIT" > "$CURL_STATUS_FILE"; } \
    | age -r "$BACKUP_AGE_RECIPIENT" -o "$OUT"
  CURL_EXIT="$(cat "$CURL_STATUS_FILE")"
  rm -f "$CURL_STATUS_FILE"
  if [ "$CURL_EXIT" != "0" ]; then
    rm -f "$OUT"
    echo "fetch-encrypt-backup: curl failed (exit $CURL_EXIT) fetching the backup bundle" >&2
    exit 1
  fi
fi

if [ ! -s "$OUT" ]; then
  echo "fetch-encrypt-backup: $OUT is missing or empty" >&2
  exit 1
fi

# Size guard: a bundle this big means something is wrong upstream (the
# backup route buffers the whole thing in RAM on a 512 MB instance — see the
# route's header comment). Refuse rather than upload/store a runaway bundle.
SIZE_BYTES="$(wc -c < "$OUT" | tr -d ' ')"
MAX_BYTES=$((200 * 1024 * 1024))
if [ "$SIZE_BYTES" -gt "$MAX_BYTES" ]; then
  echo "fetch-encrypt-backup: $OUT is ${SIZE_BYTES} bytes, over the 200 MB guard — refusing to upload; investigate upstream growth before retrying" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  SHA256="$(sha256sum "$OUT" | cut -d' ' -f1)"
else
  SHA256="$(shasum -a 256 "$OUT" | cut -d' ' -f1)" # macOS fallback
fi

echo "fetch-encrypt-backup: wrote $OUT"
echo "fetch-encrypt-backup: size ${SIZE_BYTES} bytes"
echo "fetch-encrypt-backup: sha256 ${SHA256}"
