# 🚀 IA-DAF — Guide de démarrage

Deux façons de lancer le projet : **tout en Docker** (recommandé) ou **en mode
développement** avec rechargement à chaud sur le frontend.

---

## Prérequis

| Outil | Requis pour |
|-------|-------------|
| 🐳 Docker + Docker Compose | Toute la stack |
| 📦 Node.js 24 LTS | Développement frontend (Node 20 est en fin de vie) |
| 🐍 Python 3.12+ | Développement de l'AI Service |
| ☕ Java 17 + Maven 3.8+ | Développement des services Spring |

---

## Option A — Tout en Docker

### 1. Configurer l'environnement

```bash
cp .env.example .env
```

Renseigner au minimum dans `.env` :

```bash
OPENAI_API_KEY=sk-...                  # sans elle, le chatbot tourne en mode dégradé
AUTH_SECRET=$(openssl rand -base64 32) # obligatoire, la stack refuse de démarrer sans
POSTGRES_PASSWORD=...                  # à changer hors développement
```

Optionnel — sans ces variables, le bouton de paiement affiche « non configuré » :

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Démarrer

```bash
docker compose up -d --build
```

Le premier build est long : l'AI Service installe PyTorch et ses dépendances.

### 3. Vérifier

```bash
docker compose ps                      # les 5 services doivent être "healthy"
bash tests/health-checks/check-all-services.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080/actuator/health |
| AI Service (Swagger) | http://localhost:8086/docs |
| Eureka | http://localhost:8761 |

---

## Option B — Mode développement

Infrastructure en Docker, frontend en local.

### 1. Base de données

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
docker compose up -d discovery-service api-gateway ai-service
```

Ou en local, dans cet ordre (le gateway a besoin d'Eureka) :

```bash
cd discovery-service && mvn spring-boot:run   # terminal 1
cd api-gateway       && mvn spring-boot:run   # terminal 2

cd ai-service                                  # terminal 3
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8086
```

### 3. Frontend

```bash
cd front
cp .env.example .env.local    # renseigner AUTH_SECRET et DATABASE_URL
npm install
npm run dev                   # http://localhost:3000
```

### 4. Webhook Stripe (si vous testez le paiement)

Pour la stack Docker, renseigner une clé **de test** dans `STRIPE_SECRET_KEY`
du `.env` racine, puis depuis la racine du dépôt :

```bash
command -v stripe
stripe version
stripe login list
stripe login                    # seulement si l'authentification manque
./scripts/stripe-webhook-dev.sh  # laisser actif dans un terminal dédié
```

Le script utilise Python 3 sans dépendance supplémentaire. Il refuse les clés
live et les comptes CLI/applicatif différents. Il récupère le secret de
signature sans l'afficher, met à jour uniquement `STRIPE_WEBHOOK_SECRET` du
`.env` et recrée le frontend si nécessaire avec :

```bash
docker compose up -d --no-deps --force-recreate frontend
```

Compose injecte ces deux variables à l'exécution. Une modification du `.env`
exige une **recréation** du conteneur, un simple `restart` ne suffit pas.
Une modification du code exige d'abord un build de l'image :
`docker compose build frontend`, puis la recréation ci-dessus.

Pour un frontend lancé avec `npm run dev`, utiliser `front/.env.local` pour les
deux variables, puis relancer Next.js. Lancer manuellement la CLI :

```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded \
  --forward-to localhost:3000/api/stripe/webhook
```

Cette commande manuelle affiche un secret : le reporter uniquement dans
`front/.env.local`, sans le copier dans un ticket ou des logs partagés. Le
script Docker masque ce secret. La CLI 1.55.3 exige un choix explicite des
événements (`--events`) ; la commande sans ce paramètre échoue.

Depuis un second terminal :

```bash
curl -I http://localhost:3000
stripe trigger checkout.session.completed
```

Un événement générique teste le transport et la signature ; sans `userId` et
`packSlug`, il est acquitté sans attribuer de pack. Pour vérifier le métier,
acheter un pack depuis l'application avec un compte de test, puis contrôler
`users.pack_entitlements` et `billing.sales` dans PostgreSQL. Un retour avec
`?checkout=success` ne donne aucun droit à lui seul.

Le test ciblé suivant crée un compte temporaire, envoie des événements signés
localement et vérifie en base les refus, paiements différés, doublons et accès.
Il nettoie uniquement ses propres données synthétiques ; il ne constitue pas
un paiement Checkout réel, même en mode test :

```bash
python3 tests/e2e/stripe-webhook.py
```

Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.

---

## 📊 Ports utilisés

| Service | Port | URL |
|---------|------|-----|
| Frontend (Next.js) | 3000 | http://localhost:3000 |
| API Gateway | 8080 | http://localhost:8080 |
| AI Service | 8086 | http://localhost:8086 |
| Discovery (Eureka) | 8761 | http://localhost:8761 |
| PostgreSQL | 5432 | localhost:5432 |

---

## 🐛 Problèmes courants

### `AUTH_SECRET is required`

`docker compose` refuse de démarrer le frontend sans ce secret. Générez-le :

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
```

### Port déjà utilisé

```bash
# Linux / macOS
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### PostgreSQL inaccessible

```bash
docker compose restart postgres
docker exec iadaf-postgres pg_isready -U iadaf_user
```

### Les tables `app_users` / `pack_entitlements` n'existent pas

Les scripts de `docker/postgres/init/` ne s'exécutent **que sur un volume
vierge**. Sur une base existante, le frontend crée les tables tout seul au
premier accès — ouvrez http://localhost:3000 une fois.

### Registre Eureka vide

Le Discovery Service doit démarrer en premier ; comptez ~30 s pour que les
autres s'enregistrent. `docker compose up` respecte l'ordre via les
`healthcheck`.

### Le chatbot répond en mode dégradé

`OPENAI_API_KEY` est absente ou invalide :

```bash
docker compose logs ai-service | grep -i openai
```

---

## ✅ Checklist de validation

- [ ] `.env` créé, `AUTH_SECRET` et `OPENAI_API_KEY` renseignés
- [ ] `docker compose ps` — les 5 services sont `healthy`
- [ ] http://localhost:3000 répond
- [ ] Création de compte puis connexion fonctionnelles
- [ ] Une route privée (`/myFolders`) redirige vers `/login` en navigation privée
- [ ] http://localhost:8086/ai/health renvoie `200`
- [ ] Eureka liste `API-GATEWAY` et `AI-SERVICE`

---

## 🔐 Identifiants par défaut (DÉVELOPPEMENT UNIQUEMENT)

**PostgreSQL** — `iadaf_user` / `iadaf_password` / base `iadaf_db`

Il n'y a **pas de compte applicatif par défaut** : les utilisateurs se créent
via `/register`.

⚠️ Régénérer `AUTH_SECRET` et `POSTGRES_PASSWORD` avant toute mise en ligne —
voir [SECURITY.md](SECURITY.md).
