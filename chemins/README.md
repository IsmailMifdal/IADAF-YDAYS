# Moteur de chemins IADAF

Registre unique Public (et plus tard Pro) : [`registry.json`](registry.json).

Chaque **chemin** = `chemin_id` + `pack_slug` + étapes + pièces + champs préfill + portail.

Consommé par :

- `ai-service` skills (`dossier_state`, `checklist`, `prefill`)
- packs front (`packContent.ts` doit rester aligné sur `required_documents`)
- datasets / eval ML (tags `chemin_id`)

Pas de soumission automatique vers ANEF / Ameli / CAF / ANTS.
