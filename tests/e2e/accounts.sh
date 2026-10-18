#!/usr/bin/env bash
# Accounts: sign-up, sign-in, password reset by e-mail (Mailpit), rate
# limiting, consent to e-mails, erasure.
source "$(dirname "$0")/lib.sh"
reset_rate_limits

E=$(unique_email); P='Motdepasse123'; P2='Nouveau456mdp'; P3='Troisieme789mdp'

section "Inscription et connexion"
check "inscription puis session" "$(signup "$E" "$P")" OK
# A session opened before the reset below, on "another device".
cp "$(jar "$E")" "$WORK/before-reset.jar"
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
check "session d'avant la réinitialisation fermée" "$(status -b "$WORK/before-reset.jar" "$BASE_URL/api/account")" 401
# The middleware keeps its own 5-second cache of the check (src/app/lib/users.ts).
sleep 6
check "… et renvoyée vers la connexion" "$(status -b "$WORK/before-reset.jar" "$BASE_URL/dashboard")" 307

section "Fermeture des sessions"
reset_rate_limits  # many sign-ins on one address: under the 10-per-15-min limit
# Two devices: two sign-ins, two different sessions.
signin "$E" "$P2" >/dev/null; cp "$(jar "$E")" "$WORK/device1.jar"
signin "$E" "$P2" >/dev/null; cp "$(jar "$E")" "$WORK/device2.jar"
check "deux appareils connectés" "$(status -b "$WORK/device1.jar" "$BASE_URL/api/account") $(status -b "$WORK/device2.jar" "$BASE_URL/api/account")" "200 200"
check "changement du mot de passe" "$(status -b "$WORK/device2.jar" -X POST "$BASE_URL/api/account/password" -H 'Content-Type: application/json' -d "{\"currentPassword\":\"$P2\",\"newPassword\":\"$P3\"}")" 200
check "toutes les sessions fermées, la sienne comprise" "$(status -b "$WORK/device1.jar" "$BASE_URL/api/account") $(status -b "$WORK/device2.jar" "$BASE_URL/api/account")" "401 401"
check "reconnexion avec le nouveau" "$(signin "$E" "$P3")" OK
signin "$E" "$P3" >/dev/null; cp "$(jar "$E")" "$WORK/device1.jar"
signin "$E" "$P3" >/dev/null
check "« se déconnecter partout »" "$(status -b "$(jar "$E")" -X DELETE "$BASE_URL/api/account/sessions")" 204
check "l'autre appareil aussi" "$(status -b "$WORK/device1.jar" "$BASE_URL/api/account")" 401
check "sans session : refusé" "$(status -X DELETE "$BASE_URL/api/account/sessions")" 401

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
signin "$E" "$P3" >/dev/null
UID_=$(user_id "$E")
check "suppression" "$(delete_account "$E")" 200
check "compte effacé" "$(sql "select count(*) from users.app_users where id = '$UID_'")" 0

finish
