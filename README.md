# IADAF-YDAYS
projet-YDAYS

## 🚀 Démarrage rapide

### Prérequis
- Docker Desktop installé
- Java 17+ et Maven
- Git

### Configuration de l'environnement de développement

1. **Cloner le repository**
```bash
git clone <repository-url>
cd IADAF-YDAYS
```

2. **Démarrer l'environnement Docker**
```bash
# Copier le fichier d'exemple des variables d'environnement
cp .env.example .env

# Démarrer PostgreSQL et pgAdmin
docker compose up -d
```

3. **Démarrer les microservices**
```bash
# Démarrer discovery-service en premier
cd discovery-service && mvn spring-boot:run

# Dans d'autres terminaux, démarrer les autres services
cd user-service && mvn spring-boot:run
cd demarches-service && mvn spring-boot:run
cd document-service && mvn spring-boot:run
cd analytics-service && mvn spring-boot:run
cd api-gateway && mvn spring-boot:run
```

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
