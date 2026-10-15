#!/usr/bin/env bash
# Accounts: sign-up, sign-in, password reset by e-mail (Mailpit), rate
# limiting, consent to e-mails, erasure.
source "$(dirname "$0")/lib.sh"
reset_rate_limits

E=$(unique_email); P='Motdepasse123'; P2='Nouveau456mdp'

section "Inscription et connexion"
check "inscription puis session" "$(signup "$E" "$P")" OK
check "mauvais mot de passe refusé" "$(signin "$E" 'Mauvais123mdp')" REFUSED
check "page protégée sans session redirigée" "$(status "$BASE_URL/dashboard")" 307

section "Mot de passe oublié"
curl -s -X DELETE "$MAILPIT_URL/api/v1/messages" >/dev/null
status -X POST "$BASE_URL/api/auth/password-reset/request" -H 'Content-Type: application/json' -d "{\"email\":\"$E\"}" >/dev/null
status -X POST "$BASE_URL/api/auth/password-reset/request" -H 'Content-Type: application/json' -d '{"email":"inconnu@nowhere.test"}' >/dev/null
sleep 4
MESSAGES=$(curl -s "$MAILPIT_URL/api/v1/messages")
check "un seul e-mail (rien pour l'adresse inconnue)" "$(echo "$MESSAGES" | json "d['total']")" 1
ID=$(echo "$MESSAGES" | json "d['messages'][0]['ID']")
LINK=$(curl -s "$MAILPIT_URL/api/v1/message/$ID" | json "d['Text']" | grep -o 'http[^ ]*token=[0-9a-f]*')
RESET_TOKEN="${LINK##*token=}"
check "lien reçu" "${#RESET_TOKEN}" 64
check "jeton stocké haché" "$(sql "select count(*) from users.password_reset_tokens where token_hash = '$RESET_TOKEN'")" 0
reset() { status -X POST "$BASE_URL/api/auth/password-reset/confirm" -H 'Content-Type: application/json' -d "{\"token\":\"$RESET_TOKEN\",\"password\":\"$1\"}"; }
check "nouveau mot de passe" "$(reset "$P2")" 200
check "lien à usage unique" "$(reset 'Autre789mdp')" 400
check "ancien mot de passe refusé" "$(signin "$E" "$P")" REFUSED
check "nouveau mot de passe accepté" "$(signin "$E" "$P2")" OK

section "E-mails du chat d'accueil"
LEAD=$(unique_email)
check "sans consentement : refusé" "$(status -X POST "$BASE_URL/api/leads" -H 'Content-Type: application/json' -d "{\"email\":\"$LEAD\",\"source\":\"accueil_chat\"}")" 400
check "avec consentement : enregistré" "$(status -X POST "$BASE_URL/api/leads" -H 'Content-Type: application/json' -d "{\"email\":\"$LEAD\",\"source\":\"accueil_chat\",\"consent\":true}")" 200
check "consentement horodaté" "$(sql "select count(*) from users.lead_emails where email = '$LEAD' and consent_version <> ''")" 1

section "Limitation de débit"
reset_rate_limits
for i in 1 2 3 4 5; do status -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"R\",\"email\":\"$(unique_email)\",\"password\":\"$P\"}" >/dev/null; done
check "6e inscription de l'heure bloquée" "$(status -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"R\",\"email\":\"$(unique_email)\",\"password\":\"$P\"}")" 429
check "clés de comptage hachées" "$(sql "select count(*) from ratelimit.counters where bucket like '%.%' or bucket like '%@%'")" 0
reset_rate_limits

section "Suppression du compte"
UID_=$(user_id "$E")
check "suppression" "$(delete_account "$E")" 200
check "compte effacé" "$(sql "select count(*) from users.app_users where id = '$UID_'")" 0

finish
