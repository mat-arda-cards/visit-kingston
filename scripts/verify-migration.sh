#!/bin/sh
# verify-migration.sh — one-command post-migration assertion suite (E03 Part
# B). Prints PASS/FAIL per check; exits nonzero if ANY check fails.
#
# Reads GH_TOKEN from the gitignored .env.git itself — never pass it on the
# command line, never echo it. Every `gh` call below uses this explicit
# GH_TOKEN, never the ambient arda-authenticated `gh auth login`.
#
# Usage:
#   sh scripts/verify-migration.sh
#   STAGING_URL=https://explore-kingston-staging.onrender.com sh scripts/verify-migration.sh
#   OLD_SLUG=owner/old-repo sh scripts/verify-migration.sh   # else read from docs/MIGRATION.md

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

TARGET_REPO="matthager12-collab/ExploreKingstonChamberApp"
TARGET_REMOTE="https://github.com/${TARGET_REPO}.git"
EXPECTED_EMAIL="matt.hager12@gmail.com"
FORBIDDEN_EMAIL="mat@arda.cards"

FAIL_COUNT=0
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

if [ ! -f .env.git ]; then
  echo "verify-migration: .env.git not found — cannot source GH_TOKEN" >&2
  exit 1
fi
GH_TOKEN="$(grep -m1 '^GITHUB_TOKEN=' .env.git | cut -d= -f2)"
if [ -z "$GH_TOKEN" ]; then
  echo "verify-migration: GITHUB_TOKEN not found in .env.git" >&2
  exit 1
fi
export GH_TOKEN

# 1. Remote URL points at the new repo.
ACTUAL_REMOTE="$(git remote get-url origin)"
if [ "$ACTUAL_REMOTE" = "$TARGET_REMOTE" ]; then
  pass "origin remote is $TARGET_REMOTE"
else
  fail "origin remote is '$ACTUAL_REMOTE', expected '$TARGET_REMOTE'"
fi

# 2. Git identity is the personal identity, never the arda work identity.
ACTUAL_EMAIL="$(git config user.email || echo '')"
if [ "$ACTUAL_EMAIL" = "$EXPECTED_EMAIL" ] && [ "$ACTUAL_EMAIL" != "$FORBIDDEN_EMAIL" ]; then
  pass "git config user.email is $EXPECTED_EMAIL"
else
  fail "git config user.email is '$ACTUAL_EMAIL', expected '$EXPECTED_EMAIL' (never $FORBIDDEN_EMAIL)"
fi

# 3. Repo exists at the new home and is public.
REPO_JSON="$(gh api "repos/$TARGET_REPO" 2>/dev/null)" && REPO_OK=1 || REPO_OK=0
if [ "$REPO_OK" = "1" ] && echo "$REPO_JSON" | grep -q '"private": *false'; then
  pass "repos/$TARGET_REPO exists and is public"
else
  fail "repos/$TARGET_REPO did not return 200 + private:false"
fi

# 4. Branch protection survived (or was re-applied).
if gh api "repos/$TARGET_REPO/branches/main/protection" >/dev/null 2>&1; then
  pass "branch protection active on main"
else
  fail "branch protection missing on main"
fi

# 5. Secrets + variables survived the cross-account transfer.
SECRETS="$(gh secret list -R "$TARGET_REPO" 2>/dev/null)" || SECRETS=""
for s in FERRY_OBSERVE_TOKEN BACKUP_TOKEN; do
  if echo "$SECRETS" | grep -q "^$s"; then
    pass "secret $s exists"
  else
    fail "secret $s missing"
  fi
done

VARS="$(gh variable list -R "$TARGET_REPO" 2>/dev/null)" || VARS=""
for v in FERRY_OBSERVE_URL BACKUP_AGE_RECIPIENT; do
  if echo "$VARS" | grep -q "^$v"; then
    pass "variable $v exists"
  else
    fail "variable $v missing"
  fi
done

# 6. All four workflows are present and active (matched by file path, not by
# each workflow's human-readable `name:`, which doesn't contain the filename).
for path in .github/workflows/ci.yml .github/workflows/ferry-observe.yml \
            .github/workflows/ferry-accuracy.yml .github/workflows/backup-offsite.yml; do
  state="$(gh workflow list -R "$TARGET_REPO" --json path,state \
    --jq ".[] | select(.path == \"$path\") | .state" 2>/dev/null)" || state=""
  case "$state" in
    active) pass "workflow $path is active" ;;
    "") fail "workflow $path not found" ;;
    *) fail "workflow $path found but state is '$state', expected active" ;;
  esac
done

# 7. Latest ferry-observe run succeeded (the crons kept firing post-migration).
LATEST_RUN="$(gh run list --workflow ferry-observe.yml -R "$TARGET_REPO" -L 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null)" || LATEST_RUN=""
if [ "$LATEST_RUN" = "success" ]; then
  pass "latest ferry-observe.yml run succeeded"
else
  fail "latest ferry-observe.yml run conclusion is '${LATEST_RUN:-<none>}', expected 'success'"
fi

# 8. Health checks — production always; staging if STAGING_URL is set.
PROD_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 https://explore-kingston.onrender.com/api/health || echo 000)"
if [ "$PROD_CODE" = "200" ]; then
  pass "production /api/health is 200"
else
  fail "production /api/health returned $PROD_CODE"
fi

if [ -n "${STAGING_URL:-}" ]; then
  STAGING_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "${STAGING_URL%/}/api/health" || echo 000)"
  if [ "$STAGING_CODE" = "200" ]; then
    pass "staging /api/health is 200"
  else
    fail "staging /api/health returned $STAGING_CODE"
  fi

  STAGING_ROBOTS="$(curl -s --max-time 30 "${STAGING_URL%/}/robots.txt" || echo '')"
  if echo "$STAGING_ROBOTS" | grep -qx "Disallow: /"; then
    pass "staging /robots.txt disallows everything (NOINDEX=1)"
  else
    fail "staging /robots.txt has no bare 'Disallow: /' line"
  fi
else
  echo "SKIP: staging checks (STAGING_URL not set)"
fi

# 9. Old repo slug fully scrubbed from tracked files (docs/MIGRATION.md is
# the one deliberate exception — it records the slug as a historical fact).
OLD_SLUG="${OLD_SLUG:-}"
if [ -z "$OLD_SLUG" ] && [ -f docs/MIGRATION.md ]; then
  OLD_SLUG="$(grep -m1 -oiE '[A-Za-z0-9_.-]+/visit-kingston' docs/MIGRATION.md || true)"
fi
if [ -z "$OLD_SLUG" ]; then
  fail "could not determine OLD_SLUG (set OLD_SLUG env, or record it in docs/MIGRATION.md)"
else
  MATCHES="$(git grep -c "$OLD_SLUG" -- . ':(exclude)docs/MIGRATION.md' 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$MATCHES" = "0" ]; then
    pass "old repo slug '$OLD_SLUG' has 0 matches in tracked files"
  else
    fail "old repo slug '$OLD_SLUG' still appears in $MATCHES tracked file(s)"
  fi
fi

echo
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "verify-migration: all checks PASS"
  exit 0
else
  echo "verify-migration: $FAIL_COUNT check(s) FAILED"
  exit 1
fi
