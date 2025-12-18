# API Gateway - Spring Cloud Gateway

## Description

Point d'entrée unique pour tous les microservices de l'application IA-DAF. Gère le routage, le load balancing, la résilience et la sécurité.

## Fonctionnalités

- ✅ Routage dynamique vers les microservices
- ✅ Load balancing automatique via Eureka
- ✅ Circuit Breaker (Resilience4J)
- ✅ Configuration CORS
- ✅ Logging des requêtes
- ✅ Gestion des fallbacks
- ✅ Monitoring via Actuator

## Démarrage

### Prérequis

**Le Discovery Service (Eureka) doit être démarré** sur le port 8761.

### Mode développement

```bash
cd api-gateway
mvn spring-boot:run
```

### Mode production

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Accès

- **API Gateway** : http://localhost:8080
- **Health check** : http://localhost:8080/actuator/health
- **Routes disponibles** : http://localhost:8080/actuator/gateway/routes

## Routes API

Toutes les routes passent par le préfixe `/api` :

### User Service

```
GET    /api/users         → http://localhost:8081/users
POST   /api/users         → http://localhost:8081/users
GET    /api/users/{id}    → http://localhost:8081/users/{id}
PUT    /api/users/{id}    → http://localhost:8081/users/{id}
DELETE /api/users/{id}    → http://localhost:8081/users/{id}
```

### Demarches Service

```
GET    /api/demarches         → http://localhost:8082/demarches
POST   /api/demarches         → http://localhost:8082/demarches
GET    /api/demarches/{id}    → http://localhost:8082/demarches/{id}
```

### Document Service

```
POST   /api/documents/upload  → http://localhost:8083/documents/upload
GET    /api/documents/{id}    → http://localhost:8083/documents/{id}
DELETE /api/documents/{id}    → http://localhost:8083/documents/{id}
```

### AI Service

```
POST   /api/ia/ask            → http://localhost:8084/ia/ask
POST   /api/ia/detect-langue  → http://localhost:8084/ia/detect-langue
```

### Analytics Service

```
GET    /api/analytics/stats   → http://localhost:8085/analytics/stats
GET    /api/analytics/demarches → http://localhost:8085/analytics/demarches
```

## Architecture

```
┌─────────────┐
│   Client    │
│ (Frontend)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│      API Gateway            │
│     (Port 8080)             │
│                             │
│  - Routage                  │
│  - Load Balancing           │
│  - Circuit Breaker          │
│  - CORS                     │
└──────┬──────────────────────┘
       │
       ├─────────────┬──────────────┬──────────────┬──────────────┐
       ▼             ▼              ▼              ▼              ▼
  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐
  │  User   │  │Demarches │  │Document  │  │   AI   │  │Analytics  │
  │Service  │  │ Service  │  │ Service  │  │Service │  │ Service   │
  │  :8081  │  │  :8082   │  │  :8083   │  │ :8084  │  │  :8085    │
  └─────────┘  └──────────┘  └──────────┘  └────────┘  └───────────┘
       │             │              │            │            │
       └─────────────┴──────────────┴────────────┴────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Discovery Service    │
                        │   (Eureka :8761)      │
                        └───────────────────────┘
```

## Exemples d'utilisation

### Appeler le User Service via la Gateway

```bash
# Au lieu de http://localhost:8081/users
curl http://localhost:8080/api/users

# Créer un utilisateur
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"nom": "Doe", "prenom": "John", "email": "john@example.com"}'
```

### Appeler l'AI Service via la Gateway

```bash
curl -X POST http://localhost:8080/api/ia/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Comment obtenir un titre de séjour?", "langue": "fr"}'
```

## Circuit Breaker

Si un microservice est indisponible, le circuit breaker s'ouvre et renvoie une réponse de fallback :

```json
{
  "timestamp": "2025-12-17T10:30:00",
  "status": 503,
  "error": "Service Unavailable",
  "message": "User Service is currently unavailable. Please try again later.",
  "service": "User Service"
}
```

### États du Circuit Breaker

- **CLOSED** : Fonctionnement normal
- **OPEN** : Service indisponible, fallback activé
- **HALF_OPEN** : Test de récupération du service

## Configuration CORS

Les origines autorisées par défaut :
- `http://localhost:3000` (React)
- `http://localhost:5173` (Vite)

Pour ajouter d'autres origines, définir la propriété `cors.allowed-origins` dans `application.yml` :

```yaml
cors:
  allowed-origins: http://localhost:3000,http://localhost:5173,https://mon-app.com
```

## Monitoring

### Voir toutes les routes

```bash
curl http://localhost:8080/actuator/gateway/routes | jq
```

### Voir les métriques

```bash
curl http://localhost:8080/actuator/metrics
```

### Health check

```bash
curl http://localhost:8080/actuator/health
```

## Troubleshooting

### La gateway ne démarre pas

Vérifier que :
- Le port 8080 est disponible
- Eureka Server est démarré sur 8761

### Un service n'est pas accessible

1. Vérifier que le service est enregistré dans Eureka : http://localhost:8761
2. Vérifier les logs de la gateway
3. Tester directement le service sans passer par la gateway

### Erreur CORS

Vérifier que l'origine du frontend est dans `CorsConfig.java`.

## Logs utiles

Les logs montrent :
- Les requêtes entrantes avec méthode et URI
- Les réponses sortantes avec code de statut
- Les erreurs de routage
- Les activations du circuit breaker

## Sécurité OAuth2

L'API Gateway est sécurisé avec Spring Security OAuth2 Resource Server et valide les tokens JWT émis par Keycloak.

### Prérequis

- Keycloak démarré sur http://localhost:8180
- Realm `iadaf` configuré

### Authentification

Toutes les requêtes (sauf `/actuator/health` et `/actuator/info`) nécessitent un token JWT valide dans le header Authorization :

```bash
Authorization: Bearer <JWT_TOKEN>
```

### Obtenir un token JWT

1. **Via l'API Keycloak** :
```bash
curl -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-gateway' \
  -d 'client_secret=<YOUR_CLIENT_SECRET>' \
  -d 'grant_type=password' \
  -d 'username=<USERNAME>' \
  -d 'password=<PASSWORD>'
```

2. **Utiliser le token** :
```bash
# Récupérer le token de la réponse JSON (champ "access_token")
export TOKEN="<ACCESS_TOKEN>"

# Faire une requête authentifiée
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### Rôles et permissions

L'API Gateway supporte les rôles suivants (définis dans Keycloak) :

| Rôle | Description | Accès |
|------|-------------|-------|
| **USER** | Utilisateur standard | `/api/users/**`, `/api/demarches/**`, `/api/documents/**`, `/api/ia/**` |
| **AGENT** | Agent administratif | Tous les endpoints USER + `/api/agent/**` |
| **SUPPORT** | Support technique | `/api/analytics/**` |
| **ADMIN** | Administrateur | Tous les endpoints |

### Exemples de requêtes authentifiées

#### Appel avec authentification
```bash
# Utilisateur standard (rôle USER)
curl http://localhost:8080/api/demarches \
  -H "Authorization: Bearer $TOKEN"

# Agent (rôle AGENT)
curl http://localhost:8080/api/agent/pending-requests \
  -H "Authorization: Bearer $TOKEN"

# Admin (rôle ADMIN)
curl http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

#### Réponses d'erreur

**401 Unauthorized** - Token manquant ou invalide :
```json
{
  "timestamp": "2025-12-18T10:30:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Authentication required. Please provide a valid JWT token.",
  "path": "/api/users"
}
```

**403 Forbidden** - Permissions insuffisantes :
```json
{
  "timestamp": "2025-12-18T10:30:00",
  "status": 403,
  "error": "Forbidden",
  "message": "You don't have permission to access this resource.",
  "path": "/api/admin/users"
}
```

### Configuration

Les URLs Keycloak sont configurables via des variables d'environnement :

```bash
KEYCLOAK_ISSUER_URI=http://localhost:8180/realms/iadaf
KEYCLOAK_JWK_SET_URI=http://localhost:8180/realms/iadaf/protocol/openid-connect/certs
```

### TokenRelay

Le filtre `TokenRelay` propage automatiquement le token JWT aux microservices en aval. Les microservices peuvent ainsi valider l'authentification et récupérer les informations utilisateur.

### Tests de sécurité

Pour tester la sécurité :

1. **Sans token** (doit renvoyer 401) :
```bash
curl http://localhost:8080/api/users
```

2. **Avec token valide** (doit fonctionner) :
```bash
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN"
```

3. **Avec rôle insuffisant** (doit renvoyer 403) :
```bash
# Utilisateur avec rôle USER essayant d'accéder à un endpoint ADMIN
curl http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Évolutions futures

- Ajouter un rate limiter
- Configurer HTTPS
- Implémenter le refresh token
- Ajouter des métriques de sécurité

## Dépendances

- Spring Boot 3.2.0
- Spring Cloud Gateway
- Spring Cloud Netflix Eureka Client
- Resilience4J Circuit Breaker

## Performance

- Timeout de connexion : 5 secondes
- Timeout de réponse : 10 secondes
- Basé sur Netty (non-bloquant, réactif)
