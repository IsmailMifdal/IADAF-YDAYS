# IA-DAF — Intelligent Assistant for Administrative Formalities

> Plateforme IA pour aider les personnes non-francophones à réussir leurs démarches administratives en France.

---

## 🏗️ Architecture

```
                    Navigateur
                        │  HTTPS — en production, par Caddy (deploy/Caddyfile)
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

| Service | Technologie | Port | Schéma PostgreSQL (compte) |
|---------|------------|------|-------------------|
| `frontend` | Next.js 16 (App Router) | 3000 | `users`, `billing`, `ratelimit`, `erasures` (`iadaf_frontend`) |
| `api-gateway` | Spring Cloud Gateway | 8080 | — |
| `discovery-service` | Spring Boot / Eureka | 8761 | — |
| `ai-service` | Python / FastAPI | 8086 | `ai` (`iadaf_ai`) |
| `user-service` | Spring Boot / JPA | 8081 | `profiles` (`iadaf_profiles`) |
| `demarches-service` | Spring Boot / JPA | 8082 | `demarches` (`iadaf_demarches`) |
| `document-service` | Spring Boot | 8083 | `documents` (`iadaf_documents`) |
| `analytics-service` | Spring Boot | 8085 | `analytics` (`iadaf_analytics`) |
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
| `DOCUMENT_ENCRYPTION_KEY` | ✅ | Chiffrement des pièces déposées — `openssl rand -base64 32`. **À sauvegarder à part** : sans elle, les pièces sont illisibles |
| `INTERNAL_JWT_SECRET` | ✅ | Clé des jetons internes frontend → backend (32 octets min.) — `openssl rand -hex 32` |
| `SMTP_URL` / `MAIL_FROM` | ➖ | E-mails de réinitialisation du mot de passe ; en dev, le lien s'affiche dans les logs |
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

# Chatbot via la gateway — tout appel exige un jeton interne
TOKEN=$(INTERNAL_JWT_SECRET=<valeur du .env> node front/scripts/dev-token.mjs)
curl -X POST http://localhost:8080/api/ai/chat \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message": "Comment obtenir une carte de séjour ?"}'
```

En développement, `docker-compose.override.yml` (chargé automatiquement) publie
les ports internes sur `127.0.0.1`, et ajoute Mailpit, qui capture les e-mails
envoyés (réinitialisation du mot de passe) : http://127.0.0.1:8025. La production
utilise la surcouche `docker-compose.prod.yml` (Caddy en HTTPS, images GHCR,
limites mémoire) : voir [DEPLOYMENT.md](DEPLOYMENT.md).

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
stripe login  # une seule fois, si la CLI n'est pas déjà authentifiée
./scripts/stripe-webhook-dev.sh
```

Prérequis : Stripe CLI, Python 3, Docker Compose et une `STRIPE_SECRET_KEY` de
test valide dans le `.env` racine. Le script vérifie que la CLI et la clé
applicative utilisent le même compte de test, configure `STRIPE_WEBHOOK_SECRET`
sans afficher sa valeur et recrée **uniquement le frontend** si ses variables
diffèrent. Les autres clés existantes sont conservées. Le `.env` reste ignoré
par Git et ses permissions sont restreintes au propriétaire.

Garder le terminal ouvert : arrêter l'écoute interrompt la réception des
événements locaux. Pour le détail des tests et le frontend hors Docker, voir
le [guide de démarrage](STARTUP-GUIDE.md#4-webhook-stripe-si-vous-testez-le-paiement).

Événements traités : `checkout.session.completed` et
`checkout.session.async_payment_succeeded`, uniquement si `payment_status=paid`
et si les métadonnées `userId` / `packSlug` sont exploitables. Les contraintes
uniques PostgreSQL empêchent de doubler une vente ou un droit lors d'un rejeu.

Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.

---

## 🤖 Endpoints

Tous les chemins ci-dessous passent par l'API Gateway (`:8080`), qui retire le
préfixe `/api` et route vers le service enregistré dans Eureka.

### AI Service

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/ai/health` | Santé du service |
| POST | `/api/ai/chat` | Chatbot administratif (FR/EN/AR/ES) — message de 4 000 caractères au plus |
| POST | `/api/ai/chat/stream` | Même réponse, envoyée au fil de la génération (Server-Sent Events : `meta`, `token`, `done` ou `error`) — utilisée par les deux chats du site |
| POST | `/api/ai/translate` | Traduction multilingue |
| POST | `/api/ai/analyze-document` | Conseils de complétude d'un dossier (LLM, sur la liste des pièces) |
| POST | `/api/ai/documents/{id}/analyze` | Pré-vérification automatique d'une pièce déposée — désactivée par défaut (`DOCUMENT_ANALYSIS_ENABLED`) |
| DELETE | `/api/ai/users/{id}/data` | Effacement des conversations d'un compte — **interne**, exige un jeton de scope `account:erase` pour ce compte |

La collecte d'e-mails du chat d'accueil est portée par le frontend
(`POST /api/leads`), pas par l'AI Service — voir [SECURITY.md](SECURITY.md#-données-personnelles-rgpd).

### User Service

Administration des fiches `users.users` (les comptes de connexion sont dans
`users.app_users`, gérés par le frontend). **Toutes ces routes exigent le
scope `admin`**, qu'aucun jeton ne porte aujourd'hui : sans propriétaire par
fiche, elles laissaient n'importe quel compte lire ou supprimer celles des
autres.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET / POST | `/api/users` | Lister / créer |
| GET / PUT / DELETE | `/api/users/{id}` | Consulter / modifier / supprimer |
| GET | `/api/users/email/{email}` | Recherche par e-mail |
| GET | `/api/users/langue/{langue}` | Filtrer par langue |
| GET | `/api/users/pays/{pays}` | Filtrer par pays |

### Demarches Service

Ces endpoints cloisonnent les données par utilisateur : l'identité est le
sujet du jeton interne, jamais un en-tête.

```bash
TOKEN=$(INTERNAL_JWT_SECRET=<valeur du .env> node front/scripts/dev-token.mjs <user-id>)
curl http://localhost:8080/api/demarches -H "Authorization: Bearer $TOKEN"
```

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
| GET | `/api/analytics/demarches/statut` | Répartition par statut (dossiers de l'appelant) |
| GET | `/api/analytics/demarches/type` | Répartition par type (dossiers de l'appelant) |
| GET | `/api/analytics/demarches/evolution` | Évolution dans le temps (dossiers de l'appelant) |
| GET | `/api/analytics/dashboard` | Synthèse générale — scope `admin` |
| GET | `/api/analytics/users/activity` | Activité des utilisateurs — scope `admin` |
| POST | `/api/analytics/document-checks` | Comptes anonymes de pré-vérification (envoyés par l'AI Service) |
| POST | `/api/analytics/document-checks/disputes` | Résultat signalé comme faux (relayé par le frontend) |
| GET | `/api/analytics/document-checks` | Totaux et résultats contestés par contrôle — scope `analytics:read` |

### Document Service

Pièces cloisonnées par utilisateur (sujet du jeton). Le frontend vérifie en
amont que le pack appartient bien à l'utilisateur.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| POST | `/api/documents` | Dépôt (multipart : `packSlug`, `documentType`, `file`) — remplace la pièce du même type |
| GET | `/api/documents?packSlug=` | Pièces d'un pack (métadonnées seules) |
| GET | `/api/documents/{id}/content` | Téléchargement, toujours en pièce jointe |
| DELETE | `/api/documents/{id}` | Retrait d'une pièce |
| DELETE | `/api/documents/me` | Effacement du compte — scope `account:erase` |

---

## 🎯 Fonctionnalités

- **Chatbot RAG** — répond sur les démarches françaises via une base de
  connaissances vectorisée (sentence-transformers + ChromaDB), dont 32 fiches officielles
  de service-public.gouv.fr actualisées chaque semaine ; réponses affichées au
  fil de la génération
- **Application installable** — ajout à l'écran d'accueil du téléphone, page
  hors ligne (rien de personnel n'est gardé sur l'appareil)
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
| `demarches-service` | Fonctionnel, branché | Démarches, étapes, commentaires. Alimente « Mes dossiers » et le tableau de bord : un dossier par pack débloqué, une étape par pièce à réunir. Schéma géré par Flyway. |
| `analytics-service` | Fonctionnel | Agrège les données des trois autres via RestClient. |
| `document-service` | Fonctionnel, branché | Pièces des dossiers, chiffrées (AES-256-GCM) dans PostgreSQL. Type réel vérifié, 10 Mo max, purge à 180 jours. Schéma géré par Flyway. |

Le frontend appelle `/api/ai/*` et `/api/demarches/*`. `user-service` et
`analytics-service` (statistiques tous utilisateurs confondus, destinées à
l'administration) ne sont pas encore consommés.

Chacun exige un jeton interne signé par le frontend et revalide sa signature,
même derrière la gateway — voir [SECURITY.md](SECURITY.md#-jetons-internes).

---

## ✅ Tests et intégration continue

| | Commande |
|---|---|
| Java | `mvn verify` |
| Python | `cd ai-service && pip install -r requirements-dev.txt && pytest` |
| Frontend | `cd front && npx tsc --noEmit && npx eslint src && npm run build` |
| Bout en bout | stack lancée, puis `bash tests/e2e/run-all.sh` |

La CI GitHub Actions joue les trois premiers à chaque PR, puis construit et
scanne (Trivy) les 8 images ; la suite de bout en bout tourne chaque nuit.
Détails dans [tests/README.md](tests/README.md).

---

## ⚠️ Avant une mise en production

Tout est dans [DEPLOYMENT.md](DEPLOYMENT.md) : préparation du VPS, secrets
(`deploy/generate-secrets.sh`), HTTPS par Caddy, Stripe live, sauvegardes
chiffrées et test de restauration, mises à jour et retour arrière, et la
liste de contrôle avant l'ouverture au public.
