# IA-DAF — Intelligent Assistant for Administrative Formalities

> Plateforme IA pour aider les personnes non-francophones à réussir leurs démarches administratives en France.

---

## 🏗️ Architecture

```
Client (Next.js / curl)
        │
        ▼
┌──────────────────┐
│   API Gateway    │  :8080  (Spring Cloud Gateway)
│  (Spring Boot)   │
└────────┬─────────┘
         │ route /api/ai/**  →  AI-SERVICE:8086
         │
         ▼
┌──────────────────┐        ┌──────────────────────┐
│   AI Service     │        │  Discovery Service   │
│  (Python/FastAPI)│◀──────▶│  (Eureka) :8761      │
│  :8086           │        └──────────────────────┘
└──────────────────┘
         │
   ┌─────┴──────┐
   │  LangChain │
   │  ChromaDB  │
   │  Mistral   │
   └────────────┘
```

| Service | Technologie | Port |
|---------|------------|------|
| `discovery-service` | Spring Boot / Eureka | 8761 |
| `api-gateway` | Spring Cloud Gateway | 8080 |
| `ai-service` | Python / FastAPI | 8086 |
| `ollama` | Ollama (Mistral 7B) | 11434 |

---

## 🚀 Démarrage rapide

### Prérequis

- Docker + Docker Compose
- 8 Go RAM minimum (pour Mistral 7B)

### Démarrer tous les services

```bash
# Option 1 — Script automatisé
bash start-services.sh

# Option 2 — Docker Compose directement
docker compose up -d
```

### Vérifier que tout fonctionne

```bash
# Eureka Dashboard
open http://localhost:8761

# Santé de l'AI Service
curl http://localhost:8086/ai/health

# Test du chatbot via l'API Gateway
curl -X POST http://localhost:8080/api/ai/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Comment obtenir une carte de séjour ?"}'

# Test de traduction
curl -X POST http://localhost:8080/api/ai/translate \
     -H "Content-Type: application/json" \
     -d '{"text": "Bonjour", "target_language": "EN"}'
```

---

## 🤖 Endpoints AI Service

| Méthode | Chemin (via Gateway) | Description |
|---------|---------------------|-------------|
| GET | `/api/ai/health` | Santé du service |
| POST | `/api/ai/chat` | Chatbot administratif (FR/EN/AR/ES) |
| POST | `/api/ai/translate` | Traduction multilingue |
| POST | `/api/ai/analyze-document` | Analyse de document administratif |

Documentation Swagger interactive : http://localhost:8086/docs

---

## 📦 Services désactivés

Les services Java suivants sont temporairement désactivés (voir leurs README respectifs) :

- `user-service` — Gestion utilisateurs
- `demarches-service` — Catalogue des démarches
- `document-service` — Gestion des documents
- `analytics-service` — Analyses et statistiques

---

## 🎯 Fonctionnalités IA

- **Chatbot RAG** — Répond aux questions sur les démarches administratives françaises en s'appuyant sur une base de connaissances vectorisée (ChromaDB + LangChain)
- **Traduction multilingue** — Français, Anglais, Arabe, Espagnol
- **Analyse de documents** — Vérifie la conformité d'un dossier et donne des recommandations
- **Mode dégradé** — Fonctionne même si Ollama/Mistral n'est pas encore disponible

---

## 🏥 Démarches couvertes

| Démarche | Organisme |
|----------|-----------|
| Assurance maladie (CPAM) | CPAM / Ameli |
| Allocations (CAF) | CAF |
| Titre de séjour | Préfecture |
| Déclaration impôts | DGFiP |
| Ouverture compte bancaire | Banques |
| Inscription université | Campus France / Universités |

---

## 🛠️ Développement

### AI Service (Python)

```bash
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8086
```

### Services Java

```bash
# Discovery Service
cd discovery-service && mvn spring-boot:run

# API Gateway
cd api-gateway && mvn spring-boot:run
```
