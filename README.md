# IADAF-YDAYS
projet-YDAYS

## 🚀 Démarrage Rapide (Quick Start)

### Prérequis
- ✅ Docker Desktop installé et démarré
- ✅ Java 17+ (`java -version`)
- ✅ Maven 3.8+ (`mvn -version`)
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
