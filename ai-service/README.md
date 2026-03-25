# AI Service — Python / FastAPI

Service d'intelligence artificielle pour IA-DAF, réécrit en Python avec FastAPI, LangChain et ChromaDB.

## Stack technique

| Composant | Technologie |
|-----------|------------|
| API | FastAPI + Uvicorn |
| LLM | Ollama (Mistral 7B) avec fallback OpenAI |
| RAG | LangChain + ChromaDB |
| Embeddings | sentence-transformers multilingue |
| DB | SQLite (aiosqlite) |
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

L'indexation automatique se fait au démarrage si le vector store est vide.

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
