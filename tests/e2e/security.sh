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
check "analytics (propagation du jeton)" "$(status "$GATEWAY_URL/api/analytics/demarches/statut" -H "Authorization: Bearer $(token e2e-user)")" 200

section "Vues d'administration : scope admin exigé"
USER_TOKEN=$(token e2e-user)
ADMIN_TOKEN=$(token e2e-admin 60 admin)
for path in /api/users /api/users/email/someone@test.fr /api/analytics/dashboard /api/analytics/users/activity; do
  check "compte ordinaire refusé : $path" "$(status "$GATEWAY_URL$path" -H "Authorization: Bearer $USER_TOKEN")" 403
done
check "compte ordinaire ne supprime pas une fiche" "$(status -X DELETE "$GATEWAY_URL/api/users/1" -H "Authorization: Bearer $USER_TOKEN")" 403
check "admin : liste des fiches" "$(status "$GATEWAY_URL/api/users" -H "Authorization: Bearer $ADMIN_TOKEN")" 200
check "admin : tableau de bord global" "$(status "$GATEWAY_URL/api/analytics/dashboard" -H "Authorization: Bearer $ADMIN_TOKEN")" 200

section "Base de données : un compte par service"
# as_role <role> <sql> — "lu" or "refusé", through the container's socket.
as_role() {
  case "$(docker exec "$PG_CONTAINER" psql -U "$1" -d "$PG_DB" -tAc "$2" 2>&1)" in
    *"permission denied"*|*"must be superuser"*) echo refusé ;;
    *ERROR*) echo erreur ;;
    *) echo lu ;;
  esac
}
for own in "iadaf_frontend users.app_users" "iadaf_frontend billing.sales" "iadaf_profiles profiles.users" \
           "iadaf_demarches demarches.demarches" "iadaf_documents documents.documents" \
           "iadaf_analytics analytics.document_check_counts" "iadaf_ai ai.messages"; do
  set -- $own
  check "$1 lit $2" "$(as_role "$1" "select count(*) from $2")" lu
done
for foreign in "iadaf_frontend documents.document_contents" "iadaf_frontend ai.messages" \
               "iadaf_demarches users.app_users" "iadaf_documents billing.sales" \
               "iadaf_ai documents.document_contents" "iadaf_analytics users.app_users" \
               "iadaf_profiles users.app_users"; do
  set -- $foreign
  check "$1 ne lit pas $2" "$(as_role "$1" "select count(*) from $2")" refusé
done
check "aucun service ne crée de schéma" "$(as_role iadaf_documents "create schema e2e_intrus")" refusé
check "aucun service n'exécute de commande" "$(as_role iadaf_frontend "copy (select 1) to program 'id'")" refusé
check "aucun compte de service n'est superutilisateur" \
  "$(sql "select count(*) from pg_roles where rolname like 'iadaf\_%' and rolname <> current_user and rolsuper")" 0
check "le superutilisateur ne sert à aucun service" \
  "$(sql "select count(*) from pg_stat_activity where usename = current_user and backend_type = 'client backend' and application_name <> 'psql' and pid <> pg_backend_pid()")" 0
check "les services Java sont connectés avec leur compte" \
  "$(sql "select string_agg(distinct usename, ' ' order by usename) from pg_stat_activity where usename in ('iadaf_profiles', 'iadaf_demarches', 'iadaf_documents', 'iadaf_analytics')")" \
  "iadaf_analytics iadaf_demarches iadaf_documents iadaf_profiles"

section "Proxy IA du frontend"
check "endpoint d'effacement inaccessible" "$(status -X DELETE "$BASE_URL/api/ai/users/x/data")" 404

finish
