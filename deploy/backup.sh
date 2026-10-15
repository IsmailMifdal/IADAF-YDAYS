#!/usr/bin/env bash
# Sauvegarde chiffrée de la base (tous les schémas : comptes, dossiers, pièces,
# conversations, registre des ventes).
#
#   deploy/backup.sh                 (cron quotidien, voir DEPLOYMENT.md)
#
# Le dump (format custom de pg_dump, déjà compressé) est chiffré avec GnuPG
# (AES-256, intégrité vérifiée au déchiffrement) par BACKUP_PASSPHRASE, sans
# jamais toucher le disque en clair. Les pièces y restent en plus chiffrées par
# DOCUMENT_ENCRYPTION_KEY, qui n'est PAS dans la sauvegarde.
#
# Configuration (.env à la racine, ou environnement) :
#   BACKUP_PASSPHRASE       obligatoire
#   BACKUP_DIR              défaut /var/backups/iadaf
#   BACKUP_RETENTION_DAYS   défaut 14 — au-delà, les copies locales sont
#                           supprimées (RGPD : un compte effacé disparaît des
#                           sauvegardes à cette échéance)
#   BACKUP_RCLONE_REMOTE    facultatif, ex. « scw:iadaf-backups » : copie hors
#                           du serveur avec rclone (stockage objet en UE, règle
#                           de cycle de vie à la même durée côté bucket)
#   PG_CONTAINER            défaut iadaf-postgres
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO/.env}"

# Lit une valeur du .env sans l'exécuter (MAIL_FROM contient des < >).
env_value() {
  local name="$1" value="${!1:-}"
  if [ -z "$value" ] && [ -f "$ENV_FILE" ]; then
    value="$(grep "^$name=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  fi
  printf '%s' "$value"
}

PASSPHRASE="$(env_value BACKUP_PASSPHRASE)"
PG_USER="$(env_value POSTGRES_USER)"; PG_USER="${PG_USER:-iadaf_user}"
PG_DB="$(env_value POSTGRES_DB)"; PG_DB="${PG_DB:-iadaf_db}"
BACKUP_DIR="$(env_value BACKUP_DIR)"; BACKUP_DIR="${BACKUP_DIR:-/var/backups/iadaf}"
RETENTION="$(env_value BACKUP_RETENTION_DAYS)"; RETENTION="${RETENTION:-14}"
REMOTE="$(env_value BACKUP_RCLONE_REMOTE)"
PG_CONTAINER="${PG_CONTAINER:-iadaf-postgres}"

[ -n "$PASSPHRASE" ] || { echo "BACKUP_PASSPHRASE manquante." >&2; exit 1; }
command -v gpg >/dev/null || { echo "gpg est requis (apt install gnupg)." >&2; exit 1; }

umask 077
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/iadaf-$STAMP.dump.gpg"
PARTIAL="$FILE.partial"
trap 'rm -f "$PARTIAL"' EXIT

# Les compteurs de limitation de débit sont éphémères : structure seulement.
docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" --format=custom \
    --exclude-table-data=ratelimit.counters \
  | gpg --batch --quiet --yes --pinentry-mode loopback \
        --symmetric --cipher-algo AES256 --compress-algo none \
        --passphrase-fd 3 --output "$PARTIAL" 3<<<"$PASSPHRASE"

# Un dump vide ou tronqué ne doit jamais remplacer une bonne sauvegarde.
[ "$(wc -c < "$PARTIAL")" -gt 1024 ] || { echo "Sauvegarde anormalement petite." >&2; exit 1; }
mv "$PARTIAL" "$FILE"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$FILE")" > "$(basename "$FILE").sha256")
echo "Sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"

if [ -n "$REMOTE" ]; then
  command -v rclone >/dev/null || { echo "BACKUP_RCLONE_REMOTE défini mais rclone absent." >&2; exit 1; }
  rclone copy --quiet "$FILE" "$REMOTE"
  rclone copy --quiet "$FILE.sha256" "$REMOTE"
  echo "Copie hors serveur : $REMOTE"
fi

find "$BACKUP_DIR" -maxdepth 1 -name 'iadaf-*.dump.gpg*' -mtime +"$RETENTION" -delete
