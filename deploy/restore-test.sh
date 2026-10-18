#!/usr/bin/env bash
# Vérifie qu'une sauvegarde se restaure vraiment : la déchiffre, la charge dans
# un PostgreSQL jetable (sans réseau), contrôle son contenu, puis détruit tout.
# Une sauvegarde qu'on n'a jamais restaurée n'est pas une sauvegarde.
#
#   deploy/restore-test.sh [sauvegarde.dump.gpg]   (défaut : la plus récente)
#
# Code de sortie non nul au moindre écart : à lancer chaque mois par cron, avec
# une alerte en cas d'échec (voir DEPLOYMENT.md). Ne touche pas à la base de
# production, qui n'est lue que pour comparer les volumes.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO/.env}"

env_value() {
  local name="$1" value="${!1:-}"
  if [ -z "$value" ] && [ -f "$ENV_FILE" ]; then
    value="$(grep "^$name=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  fi
  printf '%s' "$value"
}

PASSPHRASE="$(env_value BACKUP_PASSPHRASE)"
BACKUP_DIR="$(env_value BACKUP_DIR)"; BACKUP_DIR="${BACKUP_DIR:-/var/backups/iadaf}"
PG_CONTAINER="${PG_CONTAINER:-iadaf-postgres}"

[ -n "$PASSPHRASE" ] || { echo "BACKUP_PASSPHRASE manquante." >&2; exit 1; }

# Les noms portent un horodatage UTC : l'ordre alphabétique est chronologique.
FILE="${1:-$(find "$BACKUP_DIR" -maxdepth 1 -name 'iadaf-*.dump.gpg' 2>/dev/null | sort | tail -1)}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Aucune sauvegarde trouvée dans $BACKUP_DIR." >&2
  exit 1
fi
echo "Sauvegarde testée : $FILE"

if [ -f "$FILE.sha256" ]; then
  (cd "$(dirname "$FILE")" && sha256sum --check --quiet "$(basename "$FILE").sha256")
  echo "  OK   empreinte SHA-256"
fi

# Même version de PostgreSQL que la production.
PG_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$PG_CONTAINER" 2>/dev/null || echo postgres:16-alpine)"
NAME="iadaf-restore-test-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

docker run -d --name "$NAME" --network none \
  -e POSTGRES_PASSWORD="$(openssl rand -hex 16)" -e POSTGRES_DB=restore \
  "$PG_IMAGE" >/dev/null
# 127.0.0.1 et non le socket : pendant son initialisation, l'image lance un
# serveur temporaire qui n'écoute que sur le socket, puis le redémarre.
for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -q -h 127.0.0.1 -U postgres -d restore && break
  sleep 1
done
docker exec "$NAME" pg_isready -q -h 127.0.0.1 -U postgres -d restore \
  || { echo "Le PostgreSQL jetable n'a pas démarré." >&2; exit 1; }

gpg --batch --quiet --pinentry-mode loopback --decrypt --passphrase-fd 3 "$FILE" 3<<<"$PASSPHRASE" \
  | docker exec -i "$NAME" pg_restore -U postgres -d restore --no-owner --no-privileges --exit-on-error
echo "  OK   déchiffrement et restauration"

FAIL=0
q() { docker exec "$NAME" psql -U postgres -d restore -tAc "$1"; }

for table in users.app_users users.pack_entitlements users.password_reset_tokens \
             demarches.demarches demarches.etapes_demarche \
             documents.documents documents.document_contents \
             billing.sales ai.conversations ai.messages analytics.document_check_counts; do
  if [ "$(q "SELECT to_regclass('$table') IS NOT NULL")" = t ]; then
    printf '  OK   %-36s %s lignes\n' "$table" "$(q "SELECT count(*) FROM $table")"
  else
    echo "  FAIL table absente : $table"; FAIL=1
  fi
done

failed="$(q "SELECT count(*) FROM (
  SELECT success FROM demarches.flyway_schema_history UNION ALL
  SELECT success FROM documents.flyway_schema_history UNION ALL
  SELECT success FROM analytics.flyway_schema_history) h WHERE NOT success")"
if [ "$failed" = 0 ]; then echo "  OK   migrations Flyway complètes"
else echo "  FAIL $failed migration(s) Flyway en échec"; FAIL=1; fi

# Chaque pièce doit avoir son contenu chiffré.
orphans="$(q "SELECT count(*) FROM documents.documents d
  WHERE NOT EXISTS (SELECT 1 FROM documents.document_contents c WHERE c.document_id = d.id)")"
if [ "$orphans" = 0 ]; then echo "  OK   chaque pièce a son contenu"
else echo "  FAIL $orphans pièce(s) sans contenu"; FAIL=1; fi

# Une sauvegarde sans aucun compte alors que la production en a trahit un dump
# de la mauvaise base. Les écarts plus fins sont normaux (la production a
# évolué depuis) : affichés, pas bloquants.
PG_USER="$(env_value POSTGRES_USER)"; PG_USER="${PG_USER:-iadaf_user}"
PG_DB="$(env_value POSTGRES_DB)"; PG_DB="${PG_DB:-iadaf_db}"
live_users="$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tAc \
  "SELECT count(*) FROM users.app_users" 2>/dev/null || true)"
restored_users="$(q "SELECT count(*) FROM users.app_users")"
if [ -n "$live_users" ]; then
  echo "  --   comptes : $restored_users restaurés, $live_users en production"
  if [ "$live_users" -gt 0 ] && [ "$restored_users" -eq 0 ]; then
    echo "  FAIL aucun compte dans la sauvegarde"; FAIL=1
  fi
fi

if [ "$FAIL" != 0 ]; then echo "Restauration en échec." >&2; exit 1; fi
echo "Restauration vérifiée."
