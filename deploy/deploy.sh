#!/usr/bin/env bash
# Déploie, sur ce serveur, le commit extrait (git checkout) : images GHCR de ce
# commit, sauvegarde avant la mise à jour, démarrage, contrôle de l'extérieur.
#
#   cd /opt/iadaf
#   git fetch --tags origin && git checkout <sha-ou-version>
#   deploy/deploy.sh
#
# La CI l'appelle ainsi sur la recette et sur la production
# (.github/workflows/deploy.yml) ; à la main, c'est aussi le retour arrière
# (DEPLOYMENT.md § 8). Rien ne change si les images du commit n'existent pas.
#
# Configuration (.env à la racine) :
#   DOMAIN             domaine contrôlé après le démarrage
#   IMAGE_TAG          réécrit ici avec le SHA déployé
#   DEPLOY_BACKUP      défaut 1 ; 0 saute la sauvegarde (recette, données fictives)
#   SMOKE_BASIC_AUTH   facultatif, « utilisateur:mot-de-passe » de la recette
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"
ENV_FILE="$REPO/.env"
[ -f "$ENV_FILE" ] || { echo "deploy: $ENV_FILE manquant (deploy/generate-secrets.sh)" >&2; exit 1; }

# Lit une valeur du .env sans l'exécuter (MAIL_FROM contient des < >).
env_value() {
  grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true
}

TARGET="$(git rev-parse HEAD)"
PREVIOUS="$(env_value IMAGE_TAG)"
DOMAIN="$(env_value DOMAIN)"
[ -n "$DOMAIN" ] || { echo "deploy: DOMAIN est vide dans .env" >&2; exit 1; }

set_tag() {
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$1/" "$ENV_FILE"
}

rollback_hint() {
  if [ -z "$PREVIOUS" ] || [ "$PREVIOUS" = "$TARGET" ]; then
    return 0
  fi
  echo "Retour arrière vers la version précédente :" >&2
  echo "  git checkout $PREVIOUS && deploy/deploy.sh" >&2
  echo "Si la version retirée a modifié le schéma de la base, restaurer la" >&2
  echo "sauvegarde prise juste avant la mise à jour (DEPLOYMENT.md § 9)." >&2
}

echo "== Déploiement de $TARGET sur $DOMAIN (précédent : ${PREVIOUS:-aucun})"
set_tag "$TARGET"

echo "== Images"
if ! docker compose pull --quiet; then
  echo "deploy: images introuvables pour $TARGET (CI en cours ou en échec) : rien n'a changé" >&2
  set_tag "$PREVIOUS"
  if [ -n "$PREVIOUS" ]; then
    git checkout --quiet "$PREVIOUS"
  fi
  exit 1
fi

# Pas de sauvegarde au tout premier déploiement : il n'y a pas encore de base.
if [ "$(env_value DEPLOY_BACKUP)" != 0 ] && [ -n "$PREVIOUS" ]; then
  echo "== Sauvegarde avant la mise à jour"
  deploy/backup.sh
fi

echo "== Démarrage"
if ! docker compose up -d --wait --wait-timeout 900 --remove-orphans; then
  docker compose ps
  echo "deploy: des services ne sont pas « healthy » : docker compose logs --tail=200 <service>" >&2
  rollback_hint
  exit 1
fi

echo "== Contrôle de l'extérieur"
if ! SMOKE_BASIC_AUTH="$(env_value SMOKE_BASIC_AUTH)" deploy/smoke-test.sh "$DOMAIN"; then
  rollback_hint
  exit 1
fi

echo "== $TARGET déployé sur $DOMAIN"
