#!/usr/bin/env bash
# Shared helpers of the end-to-end suite. Sourced, never run directly.
#
# Configuration (environment):
#   BASE_URL       frontend            default http://127.0.0.1:3000
#   GATEWAY_URL    API gateway         default http://127.0.0.1:8080 (dev override)
#   MAILPIT_URL    Mailpit API         default http://127.0.0.1:8025
#   ENV_FILE       compose .env        default <repo>/.env
#   PG_CONTAINER   Postgres container  default iadaf-postgres
#   E2E_SKIP_LLM   1 = skip checks that call the LLM (no OpenAI key in CI)

set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8080}"
MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:8025}"
ENV_FILE="${ENV_FILE:-$REPO/.env}"
PG_CONTAINER="${PG_CONTAINER:-iadaf-postgres}"
E2E_SKIP_LLM="${E2E_SKIP_LLM:-0}"

WORK="$(mktemp -d)"
# Git Bash on Windows: curl and python are native programs that cannot read
# /tmp paths. A no-op on Linux (CI).
command -v cygpath >/dev/null 2>&1 && WORK="$(cygpath -m "$WORK")"
trap 'rm -rf "$WORK"' EXIT

env_value() { grep "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }
PG_USER="$(env_value POSTGRES_USER)"; PG_USER="${PG_USER:-iadaf_user}"
PG_DB="$(env_value POSTGRES_DB)"; PG_DB="${PG_DB:-iadaf_db}"
JWT_SECRET="$(env_value INTERNAL_JWT_SECRET)"

PASS=0
FAIL=0

check() {  # check <label> <actual> <expected>
  if [ "$2" = "$3" ]; then
    echo "  OK   $1"; PASS=$((PASS + 1))
  else
    echo "  FAIL $1 — attendu [$3], obtenu [$2]"; FAIL=$((FAIL + 1))
  fi
}

section() { echo "== $1"; }

finish() {
  echo "== $(basename "$0") : $PASS OK, $FAIL FAIL"
  [ "$FAIL" -eq 0 ]
}

sql() { docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tAc "$1"; }

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

json() {  # json <python expression on d> < body
  python -c "import json,sys; d=json.load(sys.stdin); print($1)"
}

# Internal token, as the frontend signs it: token [user-id] [ttl] [scope]
token() {
  (cd "$REPO/front" && INTERNAL_JWT_SECRET="$JWT_SECRET" node scripts/dev-token.mjs "${1:-}" "${2:-60}" ${3:+"$3"})
}

# signup <email> <password> — registers and signs in; cookie jar in $WORK/<email>.jar
signup() {
  local jar="$WORK/$1.jar"
  status -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"E2E Test\",\"email\":\"$1\",\"password\":\"$2\"}" >/dev/null
  signin "$1" "$2"
}

# signin <email> <password> — prints OK when a session was obtained
signin() {
  local jar="$WORK/$1.jar"; rm -f "$jar"
  local csrf
  csrf=$(curl -s -c "$jar" -b "$jar" "$BASE_URL/api/auth/csrf" | json "d['csrfToken']")
  curl -s -c "$jar" -b "$jar" -o /dev/null -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$1" --data-urlencode "password=$2"
  if curl -s -b "$jar" "$BASE_URL/api/account" | grep -q '"id"'; then echo OK; else echo REFUSED; fi
}

jar() { echo "$WORK/$1.jar"; }

user_id() { curl -s -b "$(jar "$1")" "$BASE_URL/api/account" | json "d['id']"; }

delete_account() {  # delete_account <email> — prints the HTTP status
  status -b "$(jar "$1")" -X DELETE "$BASE_URL/api/account" \
    -H 'Content-Type: application/json' -d "{\"confirmEmail\":\"$1\"}"
}

# Grants a pack the way the Stripe webhook does (no Stripe in tests).
grant_pack() {  # grant_pack <user-id> <pack-slug>
  sql "INSERT INTO users.pack_entitlements (user_id, pack_slug, amount_cents, stripe_session_id)
       VALUES ('$1', '$2', 1000, 'cs_e2e_$1_$2') ON CONFLICT DO NOTHING" >/dev/null
}

unique_email() { echo "e2e$(date +%s%N | cut -c1-15)$RANDOM@test.fr"; }

fixtures() { python "$REPO/tests/e2e/fixtures.py" "$WORK"; }

# Test stacks only: the suite creates more accounts than the registration
# limit allows from one IP. Never run against a production database.
reset_rate_limits() { sql "DELETE FROM ratelimit.counters" >/dev/null 2>&1 || true; }
