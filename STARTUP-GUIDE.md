# 🚀 Guide de Démarrage IA-DAF

## Prérequis

- Java 17+
- Maven 3.8+
- Docker & Docker Compose
- PostgreSQL client (optionnel)

## Ordre de Démarrage

### 1. Infrastructure Docker

```bash
# Démarrer PostgreSQL, Keycloak, pgAdmin
docker compose up -d

# Vérifier que tout est UP
docker ps

# Attendre 2 minutes pour l'initialisation complète de Keycloak
```

### 2. Vérifications

```bash
# Test PostgreSQL
psql -h localhost -U iadaf_user -d iadaf_db -c "\dn"

# Test Keycloak
curl http://localhost:8180/health/ready

# Test pgAdmin
# Ouvrir http://localhost:5050 (admin@iadaf.com / admin)
```

### 3. Créer le fichier .env

```bash
cp .env.example .env
# Éditer .env si nécessaire
```

### 4. Démarrer les Microservices (dans l'ordre)

**Terminal 1 - Discovery Service (Eureka)**
```bash
cd discovery-service
mvn clean spring-boot:run
```
Attendre: `Started DiscoveryServiceApplication`
Vérifier: http://localhost:8761

**Terminal 2 - API Gateway**
```bash
cd api-gateway
mvn spring-boot:run
```
Attendre: `Started ApiGatewayApplication`
Vérifier: http://localhost:8080/actuator/health

**Terminal 3 - User Service**
```bash
cd user-service
mvn spring-boot:run
```

**Terminal 4 - Demarches Service**
```bash
cd demarches-service
mvn spring-boot:run
```

**Terminal 5 - Document Service**
```bash
cd document-service
mvn spring-boot:run
```

**Terminal 6 - Analytics Service**
```bash
cd analytics-service
mvn spring-boot:run
```

**Terminal 7 - AI Service**
```bash
cd ai-service
mvn spring-boot:run
```

### 5. Vérification Finale

```bash
# Tous les services doivent apparaître dans Eureka
curl http://localhost:8761/eureka/apps | grep -i "application"

# Test de santé
curl http://localhost:8080/actuator/health
```

## Troubleshooting

### Port déjà utilisé
```bash
# Trouver le processus
lsof -ti:8081 | xargs kill -9
```

### PostgreSQL connection refused
```bash
# Redémarrer Docker
docker compose restart postgres

# Attendre 10 secondes
sleep 10
```

### Keycloak non accessible
```bash
# Vérifier les logs
docker logs iadaf-keycloak --tail=100

# Redémarrer si nécessaire
docker compose restart keycloak
```

### Eureka registry vide
```bash
# Vérifier que les services ont bien démarré
# Regarder les logs de chaque service

# Si nécessaire, redémarrer dans l'ordre
```

## Script de Démarrage Automatique

```bash
# Utiliser le script fourni
chmod +x start-services.sh
./start-services.sh
```

## Ports Utilisés

| Service | Port |
|---------|------|
| Discovery (Eureka) | 8761 |
| API Gateway | 8080 |
| User Service | 8081 |
| Demarches Service | 8082 |
| Document Service | 8083 |
| Analytics Service | 8085 |
| AI Service | 8086 |
| Keycloak | 8180 |
| PostgreSQL | 5432 |
| pgAdmin | 5050 |
