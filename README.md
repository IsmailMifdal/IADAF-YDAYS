# IADAF-YDAYS
projet-YDAYS

## 🚀 Démarrage Rapide (Quick Start)

### Prérequis
- ✅ Docker Desktop installé et démarré
- ✅ Java 17+ (`java -version`)
- ✅ Maven 3.8+ (`mvn -version`)
- ✅ Node.js 20+ (`node --version`) - Pour le frontend
- ✅ npm 10+ (`npm --version`) - Pour le frontend
- ✅ Git

### Configuration initiale (une seule fois)

```bash
# 1. Cloner le repository
git clone <repository-url>
cd IADAF-YDAYS

# 2. Créer le fichier .env depuis le template
cp .env.example .env

# 3. Démarrer l'infrastructure Docker
docker compose up -d

# 4. Attendre que PostgreSQL soit prêt (30 secondes)
echo "⏳ Attente de PostgreSQL..."
sleep 30

# 5. Vérifier que PostgreSQL fonctionne
docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "SELECT 1;"
```

### Démarrer les microservices

**Option 1 : Script automatique** (recommandé)
```bash
./start-services.sh
```

**Option 2 : Manuel** (dans des terminaux séparés)

```bash
# Terminal 1 - Discovery Service (OBLIGATOIRE EN PREMIER)
cd discovery-service
mvn spring-boot:run

# Attendre le message "Started DiscoveryServiceApplication"
# Ouvrir http://localhost:8761 pour vérifier

# Terminal 2 - User Service
export POSTGRES_USER=iadaf_user
export POSTGRES_PASSWORD=iadaf_password
cd user-service
mvn spring-boot:run

# Terminal 3 - API Gateway
cd api-gateway
mvn spring-boot:run

# Terminal 4 - Frontend (optionnel)
cd frontend
./start-frontend.sh
# Ou manuellement: npm install && npm run dev
```

### Vérification de l'installation

```bash
# Tester Eureka Dashboard
curl http://localhost:8761

# Tester User Service via API Gateway
curl http://localhost:8080/api/users

# Tester Keycloak
curl http://localhost:8180/realms/iadaf/.well-known/openid-configuration
```

### En cas de problème

Consulter **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** pour les solutions aux problèmes courants.

### 📚 Documentation

- **[frontend/README.md](frontend/README.md)** - Documentation du Frontend Next.js 15
  - Configuration et installation
  - Structure du projet
  - Composants UI et pages
  - Intégration Keycloak
  - API endpoints
- **[DOCKER.md](DOCKER.md)** - Documentation complète de l'environnement Docker
  - Configuration PostgreSQL et pgAdmin
  - Commandes Docker Compose
  - Gestion de la base de données
  - Dépannage
- **[KEYCLOAK.md](KEYCLOAK.md)** - Documentation complète de l'authentification Keycloak
  - Configuration des rôles et clients OAuth2
  - Gestion des utilisateurs
  - Obtenir des tokens JWT
  - API et endpoints

### 🔗 Accès aux services

- **Frontend** : http://localhost:3000
- **pgAdmin** : http://localhost:5050
- **Eureka Dashboard** : http://localhost:8761
- **API Gateway** : http://localhost:8080
- **Keycloak Admin** : http://localhost:8180

### 🗄️ Base de données

- **PostgreSQL** : `localhost:5432`
- **Database** : `iadaf_db`
- **Schémas** : users, demarches, documents, analytics

Voir [DOCKER.md](DOCKER.md) pour plus de détails.

## 🔐 Authentification (Keycloak)

Le projet utilise Keycloak pour la gestion de l'authentification et des autorisations.

### Accès Keycloak

- **Admin Console** : http://localhost:8180
- **Username** : `admin`
- **Password** : `admin`
- **Realm** : `iadaf`

### Utilisateurs de test

| Email | Password | Rôle |
|-------|----------|------|
| admin@iadaf.com | admin123 | ADMIN |
| user@iadaf.com | user123 | USER |
| agent@iadaf.com | agent123 | AGENT |
| support@iadaf.com | support123 | SUPPORT |

Voir [KEYCLOAK.md](KEYCLOAK.md) pour plus de détails.

### 🔑 Obtenir un token JWT

Pour accéder aux endpoints protégés, vous devez d'abord obtenir un token JWT depuis Keycloak :

```bash
# Obtenir un token pour l'utilisateur admin
export TOKEN=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=admin@iadaf.com' \
  -d 'password=admin123' \
  | jq -r '.access_token')

# Vérifier le token
echo $TOKEN
```

### 📡 Exemples de requêtes authentifiées

Une fois le token obtenu, utilisez-le dans le header `Authorization: Bearer <token>` :

```bash
# Obtenir les informations de l'utilisateur connecté
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Tester l'endpoint admin (uniquement pour ADMIN)
curl http://localhost:8080/api/auth/admin/test \
  -H "Authorization: Bearer $TOKEN" | jq

# Tester l'endpoint agent (pour AGENT ou ADMIN)
curl http://localhost:8080/api/auth/agent/test \
  -H "Authorization: Bearer $TOKEN" | jq
```

### ⚠️ Codes d'erreur d'authentification

| Code | Description |
|------|-------------|
| **401 Unauthorized** | Token manquant ou invalide. Obtenez un nouveau token. |
| **403 Forbidden** | Token valide mais rôle insuffisant. Utilisez un compte avec les permissions appropriées. |

**Exemple sans token (401):**
```bash
# Cette requête retournera une erreur 401
curl http://localhost:8080/api/auth/me
```

**Exemple avec rôle insuffisant (403):**
```bash
# Un utilisateur USER ne peut pas accéder aux endpoints admin
export USER_TOKEN=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=user@iadaf.com' \
  -d 'password=user123' \
  | jq -r '.access_token')

# Cette requête retournera une erreur 403
curl http://localhost:8080/api/auth/admin/test \
  -H "Authorization: Bearer $USER_TOKEN"
```

## 🏗️ Architecture du Projet

### Structure des Modules

```
IADAF-YDAYS/
├── frontend/                  # 🎨 Frontend Next.js 15 + TypeScript
│   ├── app/                  # Pages et routes (App Router)
│   ├── components/           # Composants React réutilisables
│   ├── lib/                  # Logique métier, API, auth
│   └── types/                # Types TypeScript
├── api-gateway/              # 🚪 API Gateway (Spring Cloud Gateway)
├── discovery-service/        # 🔍 Service Discovery (Eureka)
├── user-service/             # 👤 Gestion des utilisateurs
├── demarches-service/        # 📋 Gestion des démarches
├── document-service/         # 📎 Gestion des documents
├── ai-service/               # 🤖 Service IA
├── analytics-service/        # 📊 Service Analytics
└── docker/                   # 🐳 Configuration Docker
    ├── postgres/
    └── keycloak/
```

### Flux de Communication

```
[Frontend Next.js] 
       ↓
[Keycloak OAuth2] ← JWT Token
       ↓
[API Gateway :8080]
       ↓
[Eureka Discovery :8761]
       ↓
[Microservices]
       ↓
[PostgreSQL :5432]
```

### Technologies

#### Frontend
- **Next.js 15** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utility-first
- **Keycloak-js** - Client OAuth2/OIDC
- **Axios** - Client HTTP avec intercepteurs JWT
- **React Query** - State management et cache
- **shadcn/ui** - Composants UI réutilisables

#### Backend
- **Spring Boot 3.4** - Framework Java
- **Spring Cloud Gateway** - API Gateway
- **Spring Cloud Netflix Eureka** - Service Discovery
- **Spring Security** - Sécurité et OAuth2
- **PostgreSQL** - Base de données relationnelle
- **Keycloak** - Serveur d'authentification OAuth2/OIDC

## 🚀 Démarrer le Frontend

### Installation

```bash
cd frontend
npm install
cp .env.example .env.local
```

### Configuration

Modifier `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8180
NEXT_PUBLIC_KEYCLOAK_REALM=iadaf
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=iadaf-frontend
```

### Démarrage

```bash
# Avec le script
./start-frontend.sh

# Ou manuellement
npm run dev
```

Le frontend sera accessible sur **http://localhost:3000**

### Build de Production

```bash
npm run build
npm start
```

## 🎯 Fonctionnalités Frontend

### Pages Publiques
- **Landing Page** (`/`) - Page d'accueil avec présentation
- **Login** (`/login`) - Connexion via Keycloak OAuth2

### Pages Protégées (nécessitent authentification)
- **Dashboard** (`/dashboard`) - Tableau de bord principal
- **Démarches** (`/dashboard/demarches`) - Gestion des démarches
- **Documents** (`/dashboard/documents`) - Upload et gestion de documents
- **Profil** (`/dashboard/profile`) - Profil utilisateur

### Fonctionnalités
- ✅ Authentification OAuth2 avec Keycloak
- ✅ Routes protégées avec redirection automatique
- ✅ Refresh automatique des tokens JWT
- ✅ Sidebar responsive avec navigation
- ✅ Composants UI réutilisables (shadcn/ui)
- ✅ Gestion des rôles (ADMIN, USER, AGENT, SUPPORT)
- ✅ Design responsive (Mobile, Tablet, Desktop)
- ✅ Mode sombre (optionnel)
- ✅ Gestion d'état avec React Query

## 📱 Interface Utilisateur

### Design System
- **Couleurs primaires** : Blue (#2563eb)
- **Police** : System fonts (Inter alternative)
- **Composants** : shadcn/ui
- **Icônes** : Emojis et lucide-react

### Responsive Breakpoints
- Mobile : < 768px
- Tablet : 768px - 1024px
- Desktop : > 1024px
