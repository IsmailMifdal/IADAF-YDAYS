#!/usr/bin/env bash
# Après une restauration : efface de nouveau les comptes supprimés depuis la
# sauvegarde restaurée. Une sauvegarde ramène les comptes supprimés après
# elle ; le journal erasures.journal les liste (identifiant seul, 30 jours).
#
#   deploy/replay-erasures.sh export > journal.csv
#       AVANT la restauration, base encore en service : son journal est le
#       plus récent.
#   deploy/replay-erasures.sh export-from <sauvegarde.dump.gpg> > journal.csv
#       Base perdue : le journal de la sauvegarde la plus récente.
#   deploy/replay-erasures.sh replay journal.csv
#       APRÈS la restauration, stack démarrée.
#
# Le rejeu refait ce que fait la suppression d'un compte dans le frontend
# (front/src/app/lib/users.ts, deleteAccount) : données de l'AI Service, des
# dossiers et des pièces par leurs routes d'effacement (scope account:erase),
# puis le compte, ses e-mails de prospect et son entrée au journal. Le
# registre des ventes est conservé, comme à la suppression (obligation
# légale). Effacer un compte déjà effacé ne fait rien : rejouer est sans
# risque.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO/.env}"
PG_CONTAINER="${PG_CONTAINER:-iadaf-postgres}"
GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-iadaf-gateway}"

env_value() {
  local name="$1" value="${!1:-}"
  if [ -z "$value" ] && [ -f "$ENV_FILE" ]; then
    value="$(grep "^$name=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  fi
  printf '%s' "$value"
}

PG_USER="$(env_value POSTGRES_USER)"; PG_USER="${PG_USER:-iadaf_user}"
PG_DB="$(env_value POSTGRES_DB)"; PG_DB="${PG_DB:-iadaf_db}"
UUID='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

psql_super() { docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 "$@"; }

# Jeton interne, signé comme le fait le frontend (lib/aiService.ts).
erase_token() {
  local secret now header payload signature
  secret="$(env_value INTERNAL_JWT_SECRET)"
  [ -n "$secret" ] || { echo "INTERNAL_JWT_SECRET manquant." >&2; exit 1; }
  now="$(date +%s)"
  b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
  header="$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)"
  payload="$(printf '{"iss":"iadaf-frontend","aud":"iadaf-backend","sub":"%s","scope":"account:erase","iat":%d,"exp":%d}' \
    "$1" "$now" "$((now + 60))" | b64url)"
  signature="$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)"
  printf '%s.%s.%s' "$header" "$payload" "$signature"
}

# DELETE par la gateway, depuis son conteneur : elle n'est pas publiée.
erase_via_gateway() {  # <chemin> <jeton>
  docker exec "$GATEWAY_CONTAINER" curl -s -o /dev/null -w '%{http_code}' -X DELETE \
    -H "Authorization: Bearer $2" "http://localhost:8080$1"
}

replay_one() {  # <user-id> <erased-at>
  local id="$1" erased_at="$2" token path code
  token="$(erase_token "$id")"
  for path in "/api/ai/users/$id/data" /api/demarches/me /api/documents/me; do
    code="$(erase_via_gateway "$path" "$token")"
    case "$code" in
      2??) ;;
      *) echo "  ÉCHEC $id : $path a répondu $code" >&2; return 1 ;;
    esac
  done
  psql_super -q -v id="$id" -v erased_at="$erased_at" <<'SQL'
BEGIN;
CREATE TEMP TABLE gone ON COMMIT DROP AS
  SELECT lower(trim(email)) AS email FROM users.app_users WHERE id = :'id';
-- Droits sur les packs et jetons de réinitialisation suivent (ON DELETE CASCADE).
DELETE FROM users.app_users WHERE id = :'id';
DELETE FROM users.lead_emails WHERE email IN (SELECT email FROM gone);
SELECT 'DELETE FROM public.lead_emails WHERE lower(email) IN (SELECT email FROM gone)'
 WHERE to_regclass('public.lead_emails') IS NOT NULL \gexec
INSERT INTO erasures.journal (user_id, erased_at) VALUES (:'id', :'erased_at')
ON CONFLICT (user_id) DO NOTHING;
COMMIT;
SQL
  echo "  OK   $id (supprimé le $erased_at)"
}

case "${1:-}" in
  export)
    psql_super -tA -F, -c "SELECT user_id, erased_at FROM erasures.journal ORDER BY erased_at"
    ;;
  export-from)
    backup="${2:?usage: replay-erasures.sh export-from <sauvegarde.dump.gpg>}"
    passphrase="$(env_value BACKUP_PASSPHRASE)"
    [ -n "$passphrase" ] || { echo "BACKUP_PASSPHRASE manquante." >&2; exit 1; }
    # Le dump ne passe que par la mémoire ; seules les lignes du journal sortent.
    gpg --batch --quiet --pinentry-mode loopback --decrypt --passphrase-fd 3 "$backup" 3<<<"$passphrase" \
      | docker exec -i "$PG_CONTAINER" pg_restore --data-only --schema=erasures --table=journal --file=- \
      | awk '/^COPY erasures\.journal/ { inside = 1; next } /^\\\.$/ { inside = 0 } inside { print $1 "," $2 " " $3 }'
    ;;
  replay)
    journal="${2:?usage: replay-erasures.sh replay <journal.csv>}"
    total=0; failed=0
    while IFS=, read -r id erased_at; do
      [ -n "$id" ] || continue
      [[ "$id" =~ $UUID ]] || { echo "  ignoré : ligne invalide « $id »" >&2; continue; }
      total=$((total + 1))
      replay_one "$id" "$erased_at" || failed=$((failed + 1))
    done < "$journal"
    echo "== $total compte(s) rejoué(s), $failed échec(s)"
    [ "$failed" -eq 0 ]
    ;;
  *)
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
