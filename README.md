# IA-DAF — Intelligent Assistant for Administrative Formalities

> Plateforme IA pour aider les personnes non-francophones à réussir leurs démarches administratives en France.

---

## 🏗️ Architecture

```
                    Navigateur
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Frontend (Next.js)  :3000   │
        │   · Auth.js (sessions JWT)    │
        │   · Stripe Checkout           │
        │   · Proxy /api/ai/* → gateway │
        └───────┬───────────────┬───────┘
                │               │
                │               ▼
                │      ┌─────────────────┐
                │      │  PostgreSQL     │  :5432
                │      │  1 schéma par   │
                │      │  service        │
                │      └────────▲────────┘
                ▼               │
        ┌──────────────────┐    │
        │   API Gateway    │    │  :8080  (Spring Cloud Gateway)
        └────────┬─────────┘    │
                 │              │
     ┌───────────┼──────────┬───┴───────┬───────────┐
     │ /api/ai   │ /api/    │ /api/     │ /api/     │
     ▼           ▼ users    ▼ demarches ▼ documents ▼ analytics
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
│   AI    │ │  User   │ │Demarches │ │ Document │ │ Analytics │
│ FastAPI │ │ Spring  │ │  Spring  │ │  Spring  │ │  Spring   │
│  :8086  │ │  :8081  │ │  :8082   │ │  :8083   │ │   :8085   │
└────┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
     │           │           │            │             │
     └───────────┴───────────┴─────┬──────┴─────────────┘
                                   ▼
                    ┌──────────────────────┐
                    │  Discovery (Eureka)  │  :8761
                    └──────────────────────┘
```

| Service | Technologie | Port | Schéma PostgreSQL |
|---------|------------|------|-------------------|
| `frontend` | Next.js 16 (App Router) | 3000 | `users` |
| `api-gateway` | Spring Cloud Gateway | 8080 | — |
| `discovery-service` | Spring Boot / Eureka | 8761 | — |
| `ai-service` | Python / FastAPI | 8086 | `ai` |
| `user-service` | Spring Boot / JPA | 8081 | `users` |
| `demarches-service` | Spring Boot / JPA | 8082 | `demarches` |
| `document-service` | Spring Boot | 8083 | `documents` |
| `analytics-service` | Spring Boot | 8085 | `analytics` |
| `postgres` | PostgreSQL 16 | 5432 | — |

---

## 🚀 Démarrage rapide

### Prérequis

- Docker + Docker Compose
- Une clé API OpenAI
- (optionnel) Un compte Stripe en mode test pour le paiement

### 1. Configurer l'environnement

```bash
cp .env.example .env
```

Puis renseigner dans `.env` :

| Variable | Obligatoire | Rôle |
|----------|:-----------:|------|
| `OPENAI_API_KEY` | ✅ | Moteur du chatbot et de l'analyse de documents |
| `AUTH_SECRET` | ✅ | Signature des sessions Auth.js — `openssl rand -base64 32` |
| `INTERNAL_API_TOKEN` | ✅ | Secret partagé frontend ↔ AI Service — `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | ✅ | À changer impérativement hors développement |
| `STRIPE_SECRET_KEY` | ➖ | Sans elle, le bouton de paiement affiche « non configuré » |
| `STRIPE_WEBHOOK_SECRET` | ➖ | Nécessaire pour débloquer les packs après paiement |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ➖ | Sans elles, le bouton « Continuer avec Google » est masqué |

### 2. Lancer la stack

```bash
docker compose up -d --build
```

### 3. Vérifier

```bash
# Frontend
curl http://localhost:3000

# Santé de l'AI Service
curl http://localhost:8086/ai/health

# Dashboard Eureka
open http://localhost:8761

# Chatbot via la gateway
curl -X POST http://localhost:8080/api/ai/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Comment obtenir une carte de séjour ?"}'
```

Documentation Swagger interactive : http://localhost:8086/docs

---

## 🔐 Authentification

Gérée par **Auth.js (NextAuth v5)** côté frontend, avec les comptes stockés dans
le schéma `users` de PostgreSQL.

- **Credentials** — e-mail + mot de passe, haché en bcrypt (12 tours)
- **Google OAuth** — activé automatiquement dès que `AUTH_GOOGLE_ID` et
  `AUTH_GOOGLE_SECRET` sont renseignés

Les sessions sont des JWT (obligatoire avec le provider Credentials). La
protection des routes est appliquée par [`front/src/proxy.ts`](front/src/proxy.ts) :
tout est privé sauf `/`, `/login`, `/register`, `/nosPacks`, `/procedures` et
les routes `/api/*` (qui appliquent chacune leur propre contrôle).

Les tables sont créées automatiquement au premier accès — les scripts de
`docker/postgres/init/` ne s'exécutent que sur un volume PostgreSQL vierge.

### Callback Google

À déclarer dans la Google Cloud Console :

```
http://localhost:3000/api/auth/callback/google
```

---

## 💳 Paiement des packs

**Stripe Checkout** en mode hébergé : aucune donnée bancaire ne transite par nos
serveurs.

Le déblocage d'un pack n'est **jamais** décidé par le navigateur. Le parcours est :

1. `POST /api/checkout` crée une session Stripe. Le montant vient toujours du
   catalogue serveur ([`packsData.ts`](front/src/app/(app)/packs/packsData.ts)),
   jamais de la requête.
2. L'utilisateur paie sur la page hébergée par Stripe.
3. Stripe appelle `POST /api/stripe/webhook`. **C'est le seul endroit qui écrit
   un droit d'accès**, après vérification de la signature.
4. La page `/packs/[slug]` vérifie le droit côté serveur à chaque affichage.

Le pack `pack-complet` débloque tous les autres.

### Webhook en local

Le webhook doit pouvoir joindre l'application. En développement :

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

La commande affiche un secret `whsec_...` à placer dans `STRIPE_WEBHOOK_SECRET`.

Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.

---

## 🤖 Endpoints

Tous les chemins ci-dessous passent par l'API Gateway (`:8080`), qui retire le
préfixe `/api` et route vers le service enregistré dans Eureka.

### AI Service

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/ai/health` | Santé du service |
| POST | `/api/ai/chat` | Chatbot administratif (FR/EN/AR/ES) |
| POST | `/api/ai/translate` | Traduction multilingue |
| POST | `/api/ai/analyze-document` | Analyse de document administratif |
| DELETE | `/api/ai/users/{id}/data` | Effacement des conversations d'un compte — **interne**, exige `X-Internal-Token` |

La collecte d'e-mails du chat d'accueil est portée par le frontend
(`POST /api/leads`), pas par l'AI Service — voir [SECURITY.md](SECURITY.md#-données-personnelles-rgpd).

### User Service

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET / POST | `/api/users` | Lister / créer |
| GET / PUT / DELETE | `/api/users/{id}` | Consulter / modifier / supprimer |
| GET | `/api/users/email/{email}` | Recherche par e-mail |
| GET | `/api/users/langue/{langue}` | Filtrer par langue |
| GET | `/api/users/pays/{pays}` | Filtrer par pays |

### Demarches Service

⚠️ Ces endpoints cloisonnent les données par utilisateur et exigent une
identité. En l'absence de jeton, passez l'en-tête `X-User-Id` :

```bash
curl http://localhost:8080/api/demarches -H "X-User-Id: <uuid>"
```

Cette en-tête n'est pas vérifiée — voir [SECURITY.md](SECURITY.md).

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET / POST | `/api/demarches` | Lister / créer |
| GET / PUT / DELETE | `/api/demarches/{id}` | Consulter / modifier / supprimer |
| PATCH | `/api/demarches/{id}/statut` | Changer le statut |
| GET | `/api/demarches/statut/{statut}` | Filtrer par statut |
| GET | `/api/demarches/type/{type}` | Filtrer par type |
| GET | `/api/demarches/retard` | Démarches en retard |

### Analytics Service

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/analytics/dashboard` | Synthèse générale |
| GET | `/api/analytics/demarches/statut` | Répartition par statut |
| GET | `/api/analytics/demarches/type` | Répartition par type |
| GET | `/api/analytics/demarches/evolution` | Évolution dans le temps |
| GET | `/api/analytics/documents/stats` | Statistiques documents |
| GET | `/api/analytics/users/activity` | Activité des utilisateurs |
| GET | `/api/analytics/performance` | Métriques de performance |

### Document Service

Enregistré dans Eureka, mais n'expose que `/actuator/health` — aucun endpoint
métier n'est encore implémenté.

---

## 🎯 Fonctionnalités

- **Chatbot RAG** — répond sur les démarches françaises via une base de
  connaissances vectorisée (ChromaDB + LangChain)
- **Multilingue** — français, anglais, arabe, espagnol
- **Analyse de documents** — vérifie la conformité d'un dossier
- **Packs payants** — 5 packs de démarches, débloqués par paiement Stripe
- **Mode dégradé** — le chat reste utilisable si le LLM est indisponible

---

## 🏥 Démarches couvertes

| Pack | Organisme | Prix |
|------|-----------|-----:|
| Titre de séjour (ANEF) | Préfecture / ANEF | 30 € |
| Assurance maladie (Ameli) | CPAM | 10 € |
| Aide logement (CAF) | CAF | 15 € |
| Déclaration d'impôts | DGFiP | 10 € |
| Pack complet | — | 50 € |

---

## 🛠️ Développement

### Frontend

```bash
cd front
cp .env.example .env.local     # puis renseigner AUTH_SECRET et DATABASE_URL
npm install
npm run dev                    # http://localhost:3000
```

PostgreSQL doit tourner : `docker compose up -d postgres`.

```bash
npm run build   # build de production
npx eslint src  # lint
```

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
cd discovery-service && mvn spring-boot:run
cd api-gateway       && mvn spring-boot:run
```

---

## 📦 État des microservices Java

Les quatre services Java sont déployés et s'enregistrent dans Eureka. Leur
maturité diffère :

| Service | État | Remarque |
|---------|------|----------|
| `user-service` | Fonctionnel | CRUD utilisateurs. Ne porte **pas** l'authentification — celle-ci vit dans le frontend (Auth.js). |
| `demarches-service` | Fonctionnel | Domaine complet : démarches, étapes, commentaires. |
| `analytics-service` | Fonctionnel | Agrège les données des trois autres via RestClient. |
| `document-service` | Coquille vide | S'enregistre dans Eureka et répond sur `/actuator/health`, mais n'expose **aucun endpoint métier** — le domaine reste à implémenter. |

⚠️ Ces services ne sont **pas** consommés par le frontend, qui n'appelle
aujourd'hui que `/api/ai/*`. Ils complètent l'architecture microservices et sont
appelables directement ou via la gateway.

⚠️ Aucun d'eux n'applique d'authentification (`permitAll`) : Keycloak a été
retiré de l'architecture. Ils ne doivent donc pas être exposés publiquement —
voir [SECURITY.md](SECURITY.md).

---

## ⚠️ Avant une mise en production

- [ ] Régénérer `AUTH_SECRET` et `POSTGRES_PASSWORD` (ne jamais réutiliser ceux du dev)
- [ ] Servir le site en HTTPS et fixer `AUTH_URL` sur le domaine public
- [ ] Basculer les clés Stripe de test vers les clés live, et publier CGV + mentions légales
- [ ] Ne plus exposer les ports `5432`, `8086` et `8761` hors du réseau Docker
- [ ] Ajouter une limitation de débit sur `/api/auth/register` et `/api/auth/callback/credentials`
- [ ] Mettre en place les sauvegardes PostgreSQL
