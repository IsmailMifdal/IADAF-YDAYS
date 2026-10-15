#!/usr/bin/env bash
# Folders and filed documents: pack folder, upload, step sync, isolation,
# encryption at rest, RGPD erasure across services.
source "$(dirname "$0")/lib.sh"
reset_rate_limits
fixtures

E=$(unique_email); P='Motdepasse123'
signup "$E" "$P" >/dev/null
UID_=$(user_id "$E")
J=$(jar "$E")

section "Achat (droit écrit comme par le webhook Stripe)"
grant_pack "$UID_" titre-sejour
check "pack acheté accessible" "$(status -b "$J" "$BASE_URL/packs/titre-sejour")" 200
check "pack non acheté redirigé" "$(status -b "$J" "$BASE_URL/packs/aide-logement")" 307

section "Mes dossiers"
check "page" "$(status -b "$J" "$BASE_URL/myFolders")" 200
check "dossier du pack créé" "$(sql "select count(*) from demarches.demarches where user_id = '$UID_' and pack_slug = 'titre-sejour'")" 1
check "une étape par pièce" "$(sql "select count(*) from demarches.etapes_demarche e join demarches.demarches d on d.id = e.demarche_id where d.user_id = '$UID_'")" 7
status -b "$J" "$BASE_URL/myFolders" >/dev/null
check "idempotent" "$(sql "select count(*) from demarches.demarches where user_id = '$UID_'")" 1

section "Dépôt"
upload() {  # upload <documentType> <file> [pack]
  curl -s -b "$J" -w '\n%{http_code}' -X POST "$BASE_URL/api/documents" \
    -F "packSlug=${3:-titre-sejour}" -F "documentType=$1" -F "file=@$WORK/$2;type=application/pdf"
}
R=$(upload Passeport passeport.pdf)
check "dépôt" "$(echo "$R" | tail -1)" 201
DOC=$(echo "$R" | head -1 | json "d['id']")
step() { sql "select e.completee from demarches.etapes_demarche e join demarches.demarches d on d.id = e.demarche_id where d.user_id = '$UID_' and e.titre = 'Passeport'"; }
check "étape cochée" "$(step)" t
check "dossier passé en cours" "$(sql "select statut from demarches.demarches where user_id = '$UID_'")" EN_COURS
check "faux PDF (exécutable) refusé" "$(upload Visa virus.pdf | tail -1)" 415
check "pièce inconnue du pack refusée" "$(upload 'Bulletin de notes' passeport.pdf | tail -1)" 400
check "pack non acheté refusé" "$(upload RIB passeport.pdf aide-logement | tail -1)" 403
check "sans session refusé" "$(status -X POST "$BASE_URL/api/documents" -F packSlug=titre-sejour -F documentType=Visa -F "file=@$WORK/passeport.pdf")" 401

section "Lecture et cloisonnement"
curl -s -b "$J" -o "$WORK/back.pdf" "$BASE_URL/api/documents/$DOC"
check "téléchargement identique" "$(cmp -s "$WORK/back.pdf" "$WORK/passeport.pdf" && echo oui)" oui
check "contenu chiffré en base" "$(sql "select position('Specimen' in encode(ciphertext, 'escape')) > 0 from documents.document_contents where document_id = '$DOC'")" f
OTHER=$(unique_email); signup "$OTHER" "$P" >/dev/null
check "un autre utilisateur ne la lit pas" "$(status -b "$(jar "$OTHER")" "$BASE_URL/api/documents/$DOC")" 404
check "ni ne la supprime" "$(status -b "$(jar "$OTHER")" -X DELETE "$BASE_URL/api/documents/$DOC")" 404
check "page Mes documents" "$(curl -s -b "$J" "$BASE_URL/documents" | grep -c 'passeport.pdf' | sed 's/^[1-9][0-9]*$/vu/')" vu

section "Retrait"
check "retrait" "$(status -b "$J" -X DELETE "$BASE_URL/api/documents/$DOC?packSlug=titre-sejour&documentType=Passeport")" 204
check "étape décochée" "$(step)" f
upload Visa passeport.pdf >/dev/null

if [ "$E2E_SKIP_LLM" != 1 ]; then
  section "Historique IA en base"
  for i in 1 2 3; do
    C=$(status -b "$J" -X POST "$BASE_URL/api/ai/chat" -H 'Content-Type: application/json' -d '{"message":"Quel organisme délivre le titre de séjour ? Une phrase.","language":"FR"}')
    [ "$C" = 200 ] && break; sleep 20
  done
  check "chat connecté" "$C" 200
  check "conversation rattachée au compte" "$(sql "select count(*) from ai.conversations where user_id = '$UID_'")" 1
fi

section "Suppression du compte (RGPD)"
check "suppression" "$(delete_account "$E")" 200
check "démarches effacées" "$(sql "select count(*) from demarches.demarches where user_id = '$UID_'")" 0
check "pièces effacées" "$(sql "select count(*) from documents.documents where user_id = '$UID_'")" 0
check "conversations effacées" "$(sql "select count(*) from ai.conversations where user_id = '$UID_'")" 0
check "compte effacé" "$(sql "select count(*) from users.app_users where id = '$UID_'")" 0
delete_account "$OTHER" >/dev/null

finish
