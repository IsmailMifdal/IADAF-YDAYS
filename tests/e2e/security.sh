#!/usr/bin/env bash
# Internal-token contract (SECURITY.md, « Jetons internes »): nothing in the
# backend answers without a token signed by the frontend.
source "$(dirname "$0")/lib.sh"

section "Sans jeton : tout est refusé"
for url in "$GATEWAY_URL/api/users" "$GATEWAY_URL/api/demarches" "$GATEWAY_URL/api/documents?packSlug=impots" \
           "$GATEWAY_URL/api/analytics/dashboard" \
           "http://127.0.0.1:8081/users" "http://127.0.0.1:8082/demarches" \
           "http://127.0.0.1:8083/documents?packSlug=impots" "http://127.0.0.1:8085/analytics/dashboard"; do
  check "GET $url" "$(status "$url")" 401
done
check "POST gateway /api/ai/chat" "$(status -X POST "$GATEWAY_URL/api/ai/chat" -H 'Content-Type: application/json' -d '{"message":"x"}')" 401
check "POST ai-service direct /ai/chat" "$(status -X POST http://127.0.0.1:8086/ai/chat -H 'Content-Type: application/json' -d '{"message":"x"}')" 401

section "Identité forgée"
check "X-User-Id seul" "$(status http://127.0.0.1:8082/demarches -H 'X-User-Id: victim')" 401
FORGED=$(cd "$REPO/front" && INTERNAL_JWT_SECRET="an-attacker-key-that-is-also-32-bytes-long!!" node scripts/dev-token.mjs victim)
check "jeton signé avec une autre clé" "$(status "$GATEWAY_URL/api/demarches" -H "Authorization: Bearer $FORGED")" 401
check "effacement sans scope" "$(status -X DELETE "$GATEWAY_URL/api/demarches/me" -H "Authorization: Bearer $(token victim)")" 403

section "Healthchecks ouverts"
for url in "$GATEWAY_URL/actuator/health" "http://127.0.0.1:8082/actuator/health" "http://127.0.0.1:8086/ai/health"; do
  check "GET $url" "$(status "$url")" 200
done

section "Jeton valide"
check "démarches via la gateway" "$(status "$GATEWAY_URL/api/demarches" -H "Authorization: Bearer $(token e2e-user)")" 200
check "analytics (propagation du jeton)" "$(status "$GATEWAY_URL/api/analytics/dashboard" -H "Authorization: Bearer $(token e2e-user)")" 200

section "Proxy IA du frontend"
check "endpoint d'effacement inaccessible" "$(status -X DELETE "$BASE_URL/api/ai/users/x/data")" 404

finish
