#!/usr/bin/env bash
# Assistant chat, streamed: SSE framing through the frontend proxy, answer
# stored with its question, delivered as it is generated, request limits,
# erasure with the account.
source "$(dirname "$0")/lib.sh"
reset_rate_limits

E=$(unique_email); P='Motdepasse123'
signup "$E" "$P" >/dev/null
UID_=$(user_id "$E")
J=$(jar "$E")

# stream <cookie-jar> <json> <out> — SSE lines into <out>, each prefixed with
# the millisecond it arrived; response headers into <out>.headers.
stream() {
  curl -sN -b "$1" -D "$3.headers" -X POST "$BASE_URL/api/ai/chat/stream" \
    -H 'Content-Type: application/json' -H 'Accept: text/event-stream' -d "$2" \
    | while IFS= read -r line; do [ -n "$line" ] && echo "$(date +%s%3N) $line"; done > "$3"
}
events() { awk '$2 == "event:" {print $3}' "$1" | uniq | tr '\n' ' '; }
conversation() { grep -m1 'data: {"conversation_id"' "$1" | sed 's/^[0-9]* data: //' | json "d['conversation_id']"; }
# Bytes in, bytes out: on Windows, Python's text streams would re-encode the
# accents (cp1252) and turn newlines into CRLF.
streamed_text() {
  grep 'data: {"text"' "$1" | sed 's/^[0-9]* data: //' | python -c "
import json, sys
lines = sys.stdin.buffer.read().decode('utf-8').splitlines()
sys.stdout.buffer.write(''.join(json.loads(line)['text'] for line in lines).encode('utf-8'))"
}

section "Flux SSE"
S="$WORK/stream.txt"
stream "$J" '{"message":"Comment obtenir une carte vitale ?","language":"fr"}' "$S"
check "type text/event-stream" "$(grep -ci '^content-type: text/event-stream' "$S.headers")" 1
check "aucune compression en route (no-transform)" "$(grep -ci '^cache-control:.*no-transform' "$S.headers")" 1
check "meta, puis les fragments, puis done" "$(events "$S")" "meta token done "
CID=$(conversation "$S")
check "question et réponse enregistrées" "$(sql "select count(*) from ai.messages where conversation_id = '$CID'")" 2
check "conversation rattachée au compte" "$(sql "select user_id from ai.conversations where id = '$CID'")" "$UID_"
STORED=$(sql "select content from ai.messages where conversation_id = '$CID' and role = 'assistant'")
check "réponse enregistrée = réponse diffusée" "$([ "$STORED" = "$(streamed_text "$S")" ] && echo identiques)" identiques

if [ "$E2E_SKIP_LLM" != 1 ]; then
  FIRST=$(awk '$3 == "token" {print $1; exit}' "$S")
  DONE=$(awk '$3 == "done" {print $1}' "$S")
  # Buffered anywhere on the way (gateway, Next.js, compression), every
  # event would arrive at the same moment.
  GAP=$((DONE - FIRST))
  check "texte reçu au fil de la génération" "$([ "$GAP" -ge 300 ] && echo oui || echo "non (${GAP} ms)")" oui
  check "en plusieurs fragments" "$([ "$(grep -c ' event: token' "$S")" -gt 5 ] && echo oui)" oui
fi

section "Anonyme"
A="$WORK/anonymous.txt"
stream /dev/null '{"message":"Bonjour","language":"fr"}' "$A"
check "flux complet sans compte" "$(events "$A")" "meta token done "
check "conversation sans compte rattaché" "$(sql "select coalesce(user_id, 'aucun') from ai.conversations where id = '$(conversation "$A")'")" aucun

section "Limites"
post() { status -b "$J" -X POST "$BASE_URL/api/ai/$1" -H 'Content-Type: application/json' -d "$2"; }
LONG=$(python -c "print('x' * 4001)")
check "message trop long refusé" "$(post chat/stream "{\"message\":\"$LONG\"}")" 422
check "message vide refusé" "$(post chat/stream '{"message":""}')" 422
check "langue inconnue refusée" "$(post chat/stream '{"message":"q","language":"de"}')" 422
check "même limite sans streaming" "$(post chat "{\"message\":\"$LONG\"}")" 422
check "sous-chemin inconnu" "$(post chat/stream/x '{}')" 404
check "effacement interne inaccessible" "$(status -b "$J" -X DELETE "$BASE_URL/api/ai/users/$UID_/data")" 404

section "Suppression du compte"
check "suppression" "$(delete_account "$E")" 200
check "conversation effacée" "$(sql "select count(*) from ai.conversations where id = '$CID'")" 0

finish
