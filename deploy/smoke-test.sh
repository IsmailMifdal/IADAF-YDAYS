#!/usr/bin/env bash
# Contrôle d'un déploiement, de l'extérieur, comme un visiteur : HTTPS,
# redirection, en-têtes de sécurité, santé, limites, webhook Stripe.
#
#   deploy/smoke-test.sh iadaf.fr
#
# À lancer après chaque mise en production ou mise à jour (DEPLOYMENT.md).
# SMOKE_INSECURE=1 accepte un certificat auto-signé (test local, DOMAIN=localhost).
# N'écrit rien : aucune requête ne crée de compte ni de donnée.
set -uo pipefail

DOMAIN="${1:?usage: deploy/smoke-test.sh <domaine>}"
CURL=(curl -s --max-time 20)
[ "${SMOKE_INSECURE:-0}" = 1 ] && CURL+=(-k)

PASS=0
FAIL=0
check() {  # check <libellé> <obtenu> <attendu>
  if [ "$2" = "$3" ]; then
    echo "  OK   $1"; PASS=$((PASS + 1))
  else
    echo "  FAIL $1 — attendu [$3], obtenu [$2]"; FAIL=$((FAIL + 1))
  fi
}
header() {  # header <nom> < en-têtes
  grep -i "^$1:" | head -1 | cut -d: -f2- | sed 's/^ *//' | tr -d '\r'
}

HEADERS="$("${CURL[@]}" -D - -o /dev/null "https://$DOMAIN/")"

echo "== HTTPS"
check "certificat valide et page d'accueil" "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "https://$DOMAIN/")" 200
check "HTTP redirigé vers HTTPS" \
  "$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "http://$DOMAIN/")" \
  "308 https://$DOMAIN/"

echo "== En-têtes"
check "HSTS" "$(header strict-transport-security <<<"$HEADERS")" "max-age=31536000; includeSubDomains"
check "nosniff" "$(header x-content-type-options <<<"$HEADERS")" nosniff
check "Referrer-Policy" "$(header referrer-policy <<<"$HEADERS")" strict-origin-when-cross-origin
check "CSP : pas de mise en cadre" \
  "$(header content-security-policy <<<"$HEADERS" | grep -c "frame-ancestors 'none'")" 1
check "Permissions-Policy" "$(header permissions-policy <<<"$HEADERS" | grep -c 'camera=()')" 1
check "pas d'en-tête Server" "$(header server <<<"$HEADERS")" ""
check "pas d'en-tête X-Powered-By" "$(header x-powered-by <<<"$HEADERS")" ""

echo "== Application"
check "santé" "$("${CURL[@]}" "https://$DOMAIN/api/health")" '{"status":"ok"}'
check "santé jamais en cache" \
  "$("${CURL[@]}" -D - -o /dev/null "https://$DOMAIN/api/health" | header cache-control)" no-store
# 400 = Stripe configuré, et le webhook refuse ce qui n'est pas signé.
# 503 = clés Stripe absentes du .env.
check "webhook Stripe joignable, non signé refusé" \
  "$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X POST "https://$DOMAIN/api/stripe/webhook" -d '{}')" 400
check "espace connecté protégé" \
  "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "https://$DOMAIN/dashboard")" 307

echo "== Limites"
# 13 Mo : au-delà des 12 Mo acceptés par le proxy, refusé avant l'application.
check "requête de plus de 12 Mo refusée" \
  "$(head -c 13000000 /dev/zero | "${CURL[@]}" -o /dev/null -w '%{http_code}' \
      -X POST -H 'Content-Type: application/octet-stream' --data-binary @- \
      "https://$DOMAIN/api/documents")" 413

echo "== $PASS OK, $FAIL FAIL"
[ "$FAIL" -eq 0 ]
