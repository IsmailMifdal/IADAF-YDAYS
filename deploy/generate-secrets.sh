#!/usr/bin/env bash
# Crée le fichier .env de production, secrets générés au hasard.
#
#   deploy/generate-secrets.sh [fichier]      (défaut : .env à la racine)
#
# Ne remplace jamais un fichier existant : régénérer DOCUMENT_ENCRYPTION_KEY
# rendrait illisibles toutes les pièces stockées, et un nouveau
# POSTGRES_PASSWORD ne s'applique pas à une base déjà initialisée.
#
# Les valeurs laissées vides (domaine, clés Stripe, SMTP…) sont à remplir à la
# main : docker-compose.prod.yml refuse de démarrer tant qu'elles manquent.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-$REPO/.env}"

if [ -e "$TARGET" ]; then
  echo "$TARGET existe déjà : rien n'est modifié." >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl est requis." >&2; exit 1; }

hex() { openssl rand -hex "$1"; }
b64() { openssl rand -base64 "$1" | tr -d '\n'; }

umask 077
cat > "$TARGET" <<EOF
# IA-DAF — production. Généré le $(date -u +%Y-%m-%dT%H:%MZ) par deploy/generate-secrets.sh.
# Ne jamais committer ce fichier. Voir DEPLOYMENT.md.

# --- Déploiement ---
# « docker compose » charge toujours la surcouche de production, jamais
# l'override de développement (qui publie les ports internes). Le nom de projet
# fixe les noms des volumes, quel que soit le dossier du dépôt : le changer
# ferait démarrer sur une base vide.
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
COMPOSE_PROJECT_NAME=iadaf
# Domaine public (enregistrement DNS A/AAAA vers le VPS) et adresse de contact
# Let's Encrypt (avertissements d'expiration).
DOMAIN=
ACME_EMAIL=
# Images publiées par la CI : ghcr.io/<GHCR_OWNER>/iadaf-<service>:<IMAGE_TAG>.
# IMAGE_TAG : le SHA complet d'un commit de main (pas « latest ») pour savoir
# ce qui tourne et pouvoir revenir en arrière.
GHCR_OWNER=
IMAGE_TAG=

# --- PostgreSQL ---
POSTGRES_DB=iadaf_db
POSTGRES_USER=iadaf_user
POSTGRES_PASSWORD=$(hex 24)

# --- Secrets applicatifs ---
AUTH_SECRET=$(b64 32)
AUTH_TRUST_HOST=true
INTERNAL_JWT_SECRET=$(hex 32)
# À sauvegarder À PART (gestionnaire de mots de passe) : sans elle, les pièces
# stockées — et celles des sauvegardes — sont définitivement illisibles.
DOCUMENT_ENCRYPTION_KEY=$(b64 32)
# Chiffre les sauvegardes (deploy/backup.sh). À sauvegarder à part, elle aussi.
BACKUP_PASSPHRASE=$(b64 32)

# --- Durées de conservation (RGPD) ---
CONVERSATION_RETENTION_DAYS=30
DOCUMENT_RETENTION_DAYS=180
BACKUP_RETENTION_DAYS=14

# --- LLM ---
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=1000
OPENAI_TIMEOUT_SECONDS=60

# --- Pré-vérification des pièces : seulement une fois l'AIPD menée ---
DOCUMENT_ANALYSIS_ENABLED=false
OCR_PROVIDER=
OCR_API_KEY=

# --- Stripe (clés live) ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# --- E-mail (réinitialisation du mot de passe) ---
# Exemple : SMTP_URL=smtps://utilisateur:motdepasse@smtp.example.com:465
SMTP_URL=
MAIL_FROM=

# --- Google OAuth (facultatif) ---
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
EOF

echo "Écrit : $TARGET (droits 600)."
echo "À faire :"
echo "  1. remplir les valeurs vides ;"
echo "  2. copier DOCUMENT_ENCRYPTION_KEY et BACKUP_PASSPHRASE dans un coffre hors du serveur."
