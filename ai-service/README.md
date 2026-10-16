# AI Service — Python / FastAPI

Service d'intelligence artificielle pour IA-DAF, réécrit en Python avec FastAPI, LangChain et ChromaDB.

## Stack technique

| Composant | Technologie |
|-----------|------------|
| API | FastAPI + Uvicorn |
| LLM | Ollama (Mistral 7B) avec fallback OpenAI |
| RAG | LangChain + ChromaDB |
| Embeddings | sentence-transformers multilingue |
| DB | PostgreSQL, schéma `ai` (asyncpg, migrations Alembic) |
| Discovery | py-eureka-client |

## Endpoints

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/ai/health` | Santé du service |
| GET | `/actuator/health` | Compatibilité Eureka |
| POST | `/ai/chat` | Chatbot administratif |
| POST | `/ai/translate` | Traduction (FR/EN/AR/ES) |
| POST | `/ai/analyze-document` | Analyse de document administratif |

## Démarrage rapide (local)

```bash
# 1. Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Copier et configurer les variables d'environnement
cp .env.example .env

# 4. Démarrer Ollama (optionnel, nécessaire pour le LLM local)
# https://ollama.ai — puis : ollama pull mistral

# 5. Lancer le service
uvicorn app.main:app --host 0.0.0.0 --port 8086 --reload
```

La documentation interactive est accessible sur http://localhost:8086/docs

## Démarrage avec Docker

```bash
docker compose up ai-service
```

## Variables d'environnement

Voir `.env.example` pour la liste complète des variables.

## Indexation de la base de connaissances

Pour ré-indexer manuellement les données dans ChromaDB :

```bash
python scripts/ingest_data.py
```

L'indexation se fait au démarrage : si le vector store est vide, ou si les fiches
(ou le modèle d'embeddings) ont changé depuis la dernière indexation — une
empreinte SHA-256 est conservée à côté de l'index (`knowledge-base.sha256`).
Une mise à jour de la base de connaissances est donc prise en compte au
redéploiement, sans vider le volume.

### Fiches officielles (service-public.gouv.fr)

`app/data/knowledge_base/service_public.json` est **généré** : ne pas le
modifier à la main. Il reprend les fiches listées dans
`app/data/service_public_fiches.json`, découpées en passages courts (le modèle
d'embeddings ne lit que ~128 tokens par passage), chacun avec le lien de la
fiche, sa date de mise à jour et la mention de la source (DILA, Licence
Ouverte 2.0).

```bash
python scripts/sync_service_public.py                   # télécharge le flux du jour (~25 Mo)
python scripts/sync_service_public.py --archive f.zip   # ou une copie locale
```

Le workflow `.github/workflows/kb-sync.yml` le lance chaque lundi et ouvre une
pull request si le texte a changé. Pour suivre une nouvelle fiche, ajouter son
identifiant `F…` (fin de son URL) à la liste. Une fiche retirée ou renumérotée
par la DILA fait échouer la synchronisation plutôt que de disparaître en
silence.

## Architecture

```
app/
├── main.py              # Point d'entrée FastAPI + enregistrement Eureka
├── core/
│   ├── config.py        # Configuration (pydantic-settings)
│   └── security.py      # Validation JWT (optionnel)
├── api/routes/
│   ├── chat.py          # POST /ai/chat
│   ├── translate.py     # POST /ai/translate
│   ├── document.py      # POST /ai/analyze-document
│   └── health.py        # GET /ai/health
├── services/
│   ├── llm_service.py   # Interface LLM (Ollama / OpenAI)
│   ├── rag_service.py   # Pipeline RAG (LangChain + ChromaDB)
│   ├── chat_service.py  # Gestion conversations
│   └── translation_service.py
├── models/
│   ├── schemas.py       # Schémas Pydantic
│   └── database.py      # Modèles SQLAlchemy
└── data/
    ├── knowledge_base/  # JSON des démarches et FAQ
    └── vectorstore/     # ChromaDB (ignoré par git)
```
