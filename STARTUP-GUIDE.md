# 🚀 IA-DAF Startup Guide

## Prérequis

- ☕ **Java 17+** installé
- 📦 **Maven 3.8+** installé
- 🐳 **Docker & Docker Compose** installés
- 💾 **PostgreSQL Client** (optionnel, pour tests)

## 📋 Ordre de Démarrage (CRITIQUE)

### Étape 1 : Infrastructure Docker (5 minutes)

```bash
# 1. Créer le fichier .env
cp .env.example .env

# 2. Démarrer PostgreSQL, Keycloak, pgAdmin
docker compose up -d

# 3. Vérifier que tout est UP
docker ps

# 4. Attendre l'initialisation complète de Keycloak (2 minutes)
sleep 120

# 5. Vérifier Keycloak
curl http://localhost:8180/health/ready
```

### Étape 2 : Vérifications (2 minutes)

```bash
# Test PostgreSQL
psql -h localhost -U iadaf_user -d iadaf_db -c "\dn"
# Doit afficher : users, demarches, documents, analytics, ai

# Test Keycloak
curl http://localhost:8180/realms/iadaf/.well-known/openid-configuration
# Doit retourner JSON de configuration

# Test pgAdmin
# Ouvrir http://localhost:5050
# Login: admin@iadaf.com / admin
```

### Étape 3 : Démarrer les Microservices (ordre strict)

**Terminal 1 - Discovery Service (Eureka)**
```bash
cd discovery-service
mvn clean spring-boot:run
```
✅ Attendre : `Started DiscoveryServiceApplication`  
🌐 Vérifier : http://localhost:8761

**Terminal 2 - API Gateway**
```bash
cd api-gateway
mvn spring-boot:run
```
✅ Attendre : `Started ApiGatewayApplication`  
🌐 Vérifier : http://localhost:8080/actuator/health

**Terminal 3 - User Service**
```bash
cd user-service
mvn spring-boot:run
```
✅ Attendre : `Started UserServiceApplication`

**Terminal 4 - Demarches Service**
```bash
cd demarches-service
mvn spring-boot:run
```
✅ Attendre : `Started DemarchesServiceApplication`

**Terminal 5 - Document Service**
```bash
cd document-service
mvn spring-boot:run
```
✅ Attendre : `Started DocumentServiceApplication`

**Terminal 6 - Analytics Service**
```bash
cd analytics-service
mvn spring-boot:run
```
✅ Attendre : `Started AnalyticsServiceApplication`

**Terminal 7 - AI Service**
```bash
cd ai-service
mvn spring-boot:run
```
✅ Attendre : `Started AiServiceApplication`

### Étape 4 : Validation Finale (2 minutes)

```bash
# 1. Vérifier Eureka - tous les services doivent apparaître
curl http://localhost:8761/eureka/apps | grep -i "application"

# 2. Obtenir un token JWT
export TOKEN=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=admin@iadaf.com' \
  -d 'password=admin123' \
  | jq -r '.access_token')

# 3. Tester chaque service via API Gateway
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/users
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/demarches
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/documents
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/analytics
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/ai/conversations
```

## 🐛 Troubleshooting

### Problème : Port déjà utilisé

```bash
# Trouver et tuer le processus
lsof -ti:8081 | xargs kill -9
```

### Problème : PostgreSQL connection refused

```bash
# Redémarrer Docker
docker compose restart postgres
sleep 10
```

### Problème : Keycloak non accessible

```bash
# Vérifier les logs
docker logs iadaf-keycloak --tail=100

# Redémarrer si nécessaire
docker compose restart keycloak
```

### Problème : Eureka registry vide

- Vérifier que Discovery Service est bien démarré en premier
- Attendre 30 secondes pour l'enregistrement des services
- Vérifier les logs de chaque service

### Problème : 401 Unauthorized sur les APIs

```bash
# Vérifier que Keycloak est accessible
curl http://localhost:8180/realms/iadaf/.well-known/openid-configuration

# Obtenir un nouveau token
export TOKEN=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=admin@iadaf.com' \
  -d 'password=admin123' \
  | jq -r '.access_token')

echo $TOKEN  # Doit afficher un long token JWT
```

## 📊 Ports Utilisés

| Service | Port | URL |
|---------|------|-----|
| Discovery (Eureka) | 8761 | http://localhost:8761 |
| API Gateway | 8080 | http://localhost:8080 |
| User Service | 8081 | http://localhost:8081 |
| Demarches Service | 8082 | http://localhost:8082 |
| Document Service | 8083 | http://localhost:8083 |
| Analytics Service | 8085 | http://localhost:8085 |
| AI Service | 8086 | http://localhost:8086 |
| Keycloak | 8180 | http://localhost:8180 |
| PostgreSQL | 5432 | localhost:5432 |
| pgAdmin | 5050 | http://localhost:5050 |

## 🎯 Script de Démarrage Rapide

```bash
# Utiliser le script fourni
chmod +x start-services.sh
./start-services.sh
```

## ✅ Checklist de Validation

- [ ] Docker containers démarrés (postgres, keycloak, pgadmin)
- [ ] PostgreSQL accessible avec psql
- [ ] Keycloak accessible sur port 8180
- [ ] Fichier .env créé et configuré
- [ ] Discovery Service UP sur port 8761
- [ ] API Gateway UP sur port 8080
- [ ] Tous les 5 microservices enregistrés dans Eureka
- [ ] Token JWT obtenu depuis Keycloak
- [ ] Requêtes authentifiées fonctionnent

## 🔐 Credentials par Défaut (DEV ONLY)

**PostgreSQL:**
- User: `iadaf_user`
- Password: `iadaf_password`
- Database: `iadaf_db`

**Keycloak Admin:**
- User: `admin`
- Password: `admin`

**pgAdmin:**
- Email: `admin@iadaf.com`
- Password: `admin`

**Test Users (Keycloak):**
- Admin: `admin@iadaf.com` / `admin123`
- User: `user@iadaf.com` / `user123`
- Agent: `agent@iadaf.com` / `agent123`
- Support: `support@iadaf.com` / `support123`

⚠️ **IMPORTANT** : Changer ces credentials en production !
