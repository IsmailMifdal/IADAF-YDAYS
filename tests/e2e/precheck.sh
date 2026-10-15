#!/usr/bin/env bash
# Automated pre-check of filed documents (needs DOCUMENT_ANALYSIS_ENABLED=true,
# set by the dev override): rules, isolation, anonymous statistics.
source "$(dirname "$0")/lib.sh"
reset_rate_limits
fixtures

A=$(unique_email); B=$(unique_email); P='Motdepasse123'
signup "$A" "$P" >/dev/null; signup "$B" "$P" >/dev/null
UA=$(user_id "$A"); JA=$(jar "$A"); JB=$(jar "$B")
grant_pack "$UA" pack-complet

file() {  # file <documentType> <fixture> → document id
  curl -s -b "$JA" -X POST "$BASE_URL/api/documents" -F packSlug=titre-sejour \
    -F "documentType=$1" -F "file=@$WORK/$2;type=application/pdf" | json "d['id']"
}
analyze() {  # analyze <jar> <id> <documentType>
  curl -s -b "$1" -w '\n%{http_code}' -X POST "$BASE_URL/api/documents/$2/analyze" \
    -H 'Content-Type: application/json' -d "{\"documentType\":\"$3\"}"
}

TITRE=$(file Passeport titre-expire.pdf)
FACTURE=$(file 'Justificatif de domicile' facture.pdf)
BEFORE=$(sql "select coalesce(sum(count), 0) from analytics.document_check_counts")

section "Règles"
R=$(analyze "$JA" "$TITRE" Passeport)
check "service activé" "$(echo "$R" | tail -1)" 200
check "titre expiré : statut" "$(echo "$R" | head -1 | json "d['status']")" error
check "titre expiré : validité" "$(echo "$R" | head -1 | json "{c['id']: c['status'] for c in d['checks']}['expiry']")" error
check "justificatif récent : conforme" "$(analyze "$JA" "$FACTURE" 'Justificatif de domicile' | head -1 | json "d['status']")" ok

section "Cloisonnement"
check "pièce d'un autre utilisateur" "$(analyze "$JB" "$TITRE" Passeport | tail -1)" 404
check "sans session" "$(status -X POST "$BASE_URL/api/documents/$TITRE/analyze" -H 'Content-Type: application/json' -d '{"documentType":"Passeport"}')" 401

section "Statistiques anonymes"
AFTER=$(sql "select coalesce(sum(count), 0) from analytics.document_check_counts")
check "comptes incrémentés (2 + 2 contrôles)" "$((AFTER - BEFORE))" 4
check "aucune colonne d'identité" "$(sql "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'analytics' and table_name = 'document_check_counts'")" "day,category,check_id,status,count"
check "lecture sans scope refusée" "$(status "$GATEWAY_URL/api/analytics/document-checks" -H "Authorization: Bearer $(token ops)")" 403
check "lecture avec analytics:read" "$(status "$GATEWAY_URL/api/analytics/document-checks" -H "Authorization: Bearer $(token ops 60 analytics:read)")" 200

section "Nettoyage"
check "suppression A" "$(delete_account "$A")" 200
check "suppression B" "$(delete_account "$B")" 200
check "pièces effacées" "$(sql "select count(*) from documents.documents where user_id = '$UA'")" 0

finish
