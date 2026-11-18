# Plan de tests — architecture NVIDIA multi-user (256 / 512)

But : **choisir l’archi (modèle × engine × quant × ctx)** qui scale le mieux sur GPU NVIDIA, avec SLA **≥ 50–60 tok/s / user** quand c’est le critère QoS, et mesurer aussi le **débit agrégé** à **C=256** et **C=512** (admission / burst, comme les benches TRT v3.1).

Réf. existantes : `bench_throughput.py`, `bench_load_ramp.py`, `serving/TRTLLM-MONO-SCALE.md`, `serving/ENGINES-V5.md`.

## 1. Axes à croiser

| Axe | Valeurs |
|-----|---------|
| **Track modèle** | `v5a` Ministral 8B · `v5b` Ministral 14B · baseline `v3_1` Qwen3-8B NVFP4 |
| **Engine** | `vllm` · `trtllm` (si dispo) · `llama.cpp` |
| **Quant / artefact** | FP8 / NVFP4 / GGUF Q4_K_M |
| **Profil prompt** | `short` (chat) · `docs` (extrait OCR + precheck JSON) |
| **Concurrence** | `1,2,4,8,16,32,64,128,256,512` |

Un run = une cellule `(track, engine, quant, profile)` balayant tous les niveaux C.

## 2. Métriques (par niveau C)

| Métrique | Usage |
|----------|--------|
| `ok` / `err` | Fiabilité sous burst |
| `agg_tok_s` | Throughput cluster (pic 256/512) |
| `per_user_median_tps` | QoS flux usager |
| `per_user_p95_lat_s` | Latence queue |
| `max_C_sla50` | Plus grand C avec median ≥ **50** tok/s/user |
| `max_C_sla60` | Idem seuil **60** |
| `agg_at_256` / `agg_at_512` | Comparatif scale « type TRT » |

## 3. Interprétation (ne pas confondre)

1. **QoS produit** : combien d’users à ≥ 50–60 tok/s/user (souvent **petit N** sur 16 Go).
2. **Scale admission** : C=256/512 avec `ok≈C` et agg tok/s — utile pour dimensionner file d’attente / GPU farm, **pas** « 512 users à 60 t/s ».
3. Sur 1× RTX 5080 16 Go, 256×60 est **impossible** ; le test sert à comparer **engines** (qui tient le burst, qui sature, qui erreur).

## 4. Ordre d’exécution

1. Démarrer **un** serveur (vLLM / TRT / llama) pour une cellule.
2. Warm-up inclus dans le script.
3. `python ml/eval/bench_arch_scale.py --track v5a --engine vllm --profile short --levels 1,2,4,8,16,32,64,128,256,512`
4. Même commande `--profile docs`.
5. Arrêter le serveur → cellule suivante.
6. Fin : `python ml/eval/summarize_arch_scale.py` → matrice + reco.

Orchestrateur (rappels + boucle si URL déjà up) : `run_arch_scale_matrix.ps1`.

## 5. Décision

Remplir [`../datasets/COMPARE-V5A-V5B.md`](../datasets/COMPARE-V5A-V5B.md) avec :

- Gagnant **QoS** (max users @ ≥ 50 t/s, profil docs inclus)
- Gagnant **agg @256/@512** (engine le plus robuste)
- Reco laptop 1 GPU vs plan **2–3 GPU réplicas** si N users produit > capacité 1 GPU

## 6. Gates minimales avant ship

- [ ] Au moins **v5a×vLLM** et **v5a×llama** mesurés short+docs jusqu’à 256 (512 si tient)
- [ ] Baseline **v3_1 TRT NVFP4** rejouée aux mêmes levels (référence)
- [ ] v5b mesuré au moins jusqu’à C où err>0 ou tps/user < 10
- [ ] `summarize_arch_scale.py` produit `arch_scale_summary.json` sans cellule critique manquante
