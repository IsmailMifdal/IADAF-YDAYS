# Stack locale IADAF — chat v3.1

Guides : [`RELEASE-V3.1.md`](RELEASE-V3.1.md) · [`TRTLLM-MONO-SCALE.md`](TRTLLM-MONO-SCALE.md) · [`../artifacts/README.md`](../artifacts/README.md)

## Démarrage rapide

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\ml\serving\start-local-v3_1.ps1
```

1. Postgres embarqué via `serving/keep_pgserver.py` → runtime `ml/.tools/` (`pg_uri.txt`, logs)
2. `llama-server` GGUF v3.1 → `http://127.0.0.1:8080/v1` (`-c 32768 -np 4 -b 2048 -ub 512 -fa on -cb`)
3. `ai-service` → `http://127.0.0.1:8086`

Env type : [`../configs/serving.env.example`](../configs/serving.env.example).

**Prod multi-user** : ai-service → TRT IADAF NVFP4 (`OPENAI_BASE_URL=:8000/v1`).

```bash
wsl -d Ubuntu-24.04 -- bash ml/serving/_wsl_serve_iadaf_nvfp4.sh
```

## Scores (2026-11-12)

| Banc | Score |
|------|------:|
| Qualité ai-service (GGUF / NVFP4) | **108/108** |
| Prodlike / Scénarios / Hit@3 / Skills / Smoke | **97,2 %** · **20/20** · **100 %** · **15/15** · **3/3** |
| Mono llama IADAF | **~139** tok/s |
| Burst IADAF NVFP4 1→4096 | peak **~13,7k** agg · C1024 **100 %** · plafond **~2k** |
| Ramp 1→512 | **0** err (direct) · reco prod **≤1024** / ramp **512** |

Résultats : `ml/artifacts/results/current/` (`phase_gates_v3.json`, `bench_iadaf_nvfp4_summary.json`).

## Eval

```powershell
.\ml\.venv\Scripts\Activate.ps1
$env:OPENAI_BASE_URL = "http://127.0.0.1:8080/v1"
$env:OPENAI_API_KEY = "iadaf-dev-local-key"
$env:KMP_DUPLICATE_LIB_OK = "TRUE"
$env:INTERNAL_JWT_SECRET = "iadaf-local-eval-jwt-secret-32b-min!!"
$env:AI_SERVICE_URL = "http://127.0.0.1:8086"

python ml/eval/run_rag_hit.py --threshold 1.0
python ml/eval/run_skills.py
python ml/eval/run_perf.py
python ml/eval/run_docs.py
python ml/eval/run_scenarios_reels.py
python ml/eval/run_quality_prodlike.py
python ml/eval/smoke_ai_service.py
python ml/eval/bench_throughput.py --levels 1,4,8,16,32

$jwt = python -c "from datetime import datetime,timedelta,timezone; import jwt; n=datetime.now(timezone.utc); print(jwt.encode({'iss':'iadaf-frontend','aud':'iadaf-backend','iat':int(n.timestamp()),'exp':int((n+timedelta(hours=2)).timestamp()),'sub':'eval'},'iadaf-local-eval-jwt-secret-32b-min!!',algorithm='HS256'))"
python ml/eval/run_quality.py --target ai-service --base-url http://127.0.0.1:8086 --ai-token $jwt --out ml/artifacts/results/current/eval_quality_aiservice_v3_1.json
```

## Dépendances

- Python 3.12 `ml/.venv` · llama.cpp CUDA · pgserver ou PostgreSQL 16 · WSL TRT-LLM pour NVFP4
