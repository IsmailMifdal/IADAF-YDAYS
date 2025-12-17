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

### 🔗 Accès aux services

- **pgAdmin** : http://localhost:5050
- **Eureka Dashboard** : http://localhost:8761
- **API Gateway** : http://localhost:8080

### 🗄️ Base de données

- **PostgreSQL** : `localhost:5432`
- **Database** : `iadaf_db`
- **Schémas** : users, demarches, documents, analytics

Voir [DOCKER.md](DOCKER.md) pour plus de détails.
