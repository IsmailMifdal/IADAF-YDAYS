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

## Sécurité

> ⚠️ **L'API Gateway n'applique aucune authentification.**
>
> [`SecurityConfig`](src/main/java/com/iadaf/gateway/config/SecurityConfig.java)
> autorise toutes les requêtes (`permitAll`). Le modèle OAuth2 / Keycloak décrit
> dans les versions précédentes de ce document a été retiré : l'authentification
> est désormais portée par le frontend Next.js via Auth.js.

### Conséquences

- Toute requête atteignant le port 8080 est routée vers les services en aval
  sans contrôle d'identité.
- Le port 8080 **ne doit pas être exposé publiquement** : en production, seul le
  frontend doit joindre la gateway, sur le réseau Docker interne.
- Le chat d'accueil appelle `/api/ai/chat` sans session (collecte de leads).
  C'est intentionnel, mais cela signifie qu'aucune route AI n'est protégée au
  niveau de la gateway.

### Ce qui reste actif

- **CORS** — `CorsConfig`, et la variable
  `SPRING_CLOUD_GATEWAY_GLOBALCORS_..._ALLOWED-ORIGINS` fixée sur l'origine du
  frontend dans `docker-compose.yml`
- **Circuit breakers** Resilience4J par service
- **Actuator** restreint à `health,info` sous le profil `prod`

### Si l'authentification doit remonter au niveau gateway

Deux pistes, selon la source de vérité retenue :

1. **Valider les JWT Auth.js** — en partageant `AUTH_SECRET`, la gateway devient
   Resource Server HS256.
2. **Réintroduire un fournisseur d'identité** (Keycloak ou autre) et repasser sur
   OAuth2 Resource Server + filtre `TokenRelay`.

Voir [SECURITY.md](../SECURITY.md) pour le modèle de sécurité global.

### Évolutions futures

- Ajouter un rate limiter
- Configurer HTTPS
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
