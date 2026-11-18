# Scale capacité v5 (1 → 2–3 GPU) — SLA **50–60 tok/s / user**

Contexte : hardware **accessible** (pas de MoE 119B). Objectif = chaque usager a un **flux constant et rapide**, y compris avec **document en contexte**.

**Engine multi-user :** **vLLM** (pas TRT-LLM en premier pour Ministral 3) — voir [`../serving/ENGINES-V5.md`](../serving/ENGINES-V5.md).

## Principe

| Levier | Effet |
|--------|--------|
| Taille modèle (8B vs 14B) | tok/s unitaire |
| Quant (Q4 / NVFP4) | VRAM → place pour KV docs + batch |
| Nb GPU | **users concurrents** (souvent 1 réplica / GPU) |
| Longueur contexte docs | mange la KV → baisse N users si mal borné |

Formule simple :  
`users ≈ floor( (budget_tok_s_cluster) / 55 )` en visant 55 tok/s/user de marge.

## Scénarios réalistes (à valider par bench)

### 1 GPU (RTX 5080 16 Go — aujourd’hui)

| Track | Hypothèse | Action si KO SLA |
|-------|-----------|------------------|
| V5A 8B | 1–3 users @ ≥ 50 t/s (NVFP4) | Borner ctx docs, chunks |
| V5B 14B | souvent **1** user confortable | Ne pas forcer 3 users |

### 2 GPU

- **Réplicas indépendants** (recommandé) : 2× même modèle Q4/NVFP4 + load-balancer ai-service  
  → ~2× users iso-SLA (ex. 2×2 ou 2×3 selon mesure).
- Tensor-parallel sur 14B : utile surtout si **un** gros ctx ; moins simple pour multi-user chat.

### 3 GPU

- 3 réplicas → viser **N≈ 6–9** users si V5A tient ~2–3/GPU.  
- Ou mix : 2× V5A (prod rapide) + 1× V5B (file « dossiers complexes / docs lourds »).

## Documents + scale

1. **Chunker** les pièces (pages / sections) ; n’injecter que l’extrait + JSON `precheck`.
2. Plafond ctx par requête (ex. 4–8k tokens utiles) pour protéger le tok/s.
3. Validation **avant** le LLM (code) → moins de tokens de raisonnement inutiles.
4. Ne pas charger 3 PDF complets en vision BF16 sur le même GPU que le chat multi-user.

## Go / no-go scale

- [ ] Bench 1 GPU A et B avec **prompt docs**
- [ ] Si besoin de plus d’users **sans** baisser sous 50 t/s → ajouter GPU en **réplicas**, pas MoE
- [ ] Mesurer p95 latence + tok/s/user sous charge (`bench_load_ramp` / capacité 60 t/s)
