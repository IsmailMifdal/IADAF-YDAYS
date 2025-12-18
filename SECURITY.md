# 🔒 SECURITY - Documentation de Sécurité IA-DAF

## 📖 Vue d'ensemble

Ce document décrit l'architecture de sécurité du système IA-DAF, basée sur OAuth2 et JWT (JSON Web Tokens) via Keycloak.

## 🏗️ Architecture de Sécurité

### Composants

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │ 1. Login Request
       ▼
┌─────────────┐
│  Keycloak   │ ◄── Identity Provider (IdP)
│   Server    │
└──────┬──────┘
       │ 2. JWT Token
       ▼
┌─────────────┐
│ API Gateway │ ◄── Validates JWT & Routes
└──────┬──────┘
       │ 3. Forwards JWT
       ▼
┌─────────────────────────────────────┐
│         Microservices               │
│  ┌──────────┐  ┌──────────┐        │
│  │  User    │  │Demarches │        │
│  │ Service  │  │ Service  │        │
│  │  :8081   │  │  :8082   │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │ Document │  │Analytics │        │
│  │ Service  │  │ Service  │        │
│  │  :8083   │  │  :8085   │        │
│  └──────────┘  └──────────┘        │
│         ▲                           │
│         │ 4. Validates JWT          │
│         │    (OAuth2 Resource       │
│         │     Server)               │
└─────────────────────────────────────┘
```

### Flow d'Authentification JWT

1. **Authentification initiale**
   - L'utilisateur se connecte via le frontend
   - Le frontend envoie les credentials à Keycloak
   - Keycloak valide et retourne un JWT token

2. **Requête authentifiée**
   - Le client inclut le JWT dans le header `Authorization: Bearer <token>`
   - L'API Gateway valide le token
   - La requête est routée vers le microservice approprié

3. **Validation par le microservice**
   - Chaque microservice valide indépendamment le JWT
   - Utilise la configuration OAuth2 Resource Server
   - Vérifie la signature avec les clés publiques de Keycloak (JWK Set)

## 🔐 Configuration des Microservices

Tous les microservices (user-service, demarches-service, document-service, analytics-service) sont configurés comme **OAuth2 Resource Servers**.

### Configuration Spring Security

Chaque service possède :

#### 1. Dépendances Maven

```xml
<!-- OAuth2 Resource Server -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>

<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JWT Support -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-oauth2-jose</artifactId>
</dependency>
```

#### 2. Configuration OAuth2 (application.yml)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${KEYCLOAK_ISSUER_URI:http://localhost:8180/realms/iadaf}
          jwk-set-uri: ${KEYCLOAK_JWK_SET_URI:http://localhost:8180/realms/iadaf/protocol/openid-connect/certs}

logging:
  level:
    org.springframework.security: DEBUG
```

#### 3. SecurityConfig

Chaque service implémente une configuration de sécurité qui :
- Désactive CSRF (API stateless)
- Configure les sessions comme STATELESS
- Permet l'accès public aux endpoints `/actuator/health` et `/actuator/info`
- Requiert une authentification pour tous les autres endpoints
- Active la validation JWT OAuth2

### Endpoints Publics vs Protégés

#### ✅ Endpoints Publics (sans token)
- `GET /actuator/health` - Health check
- `GET /actuator/info` - Information du service

#### 🔒 Endpoints Protégés (avec token JWT)
- Tous les autres endpoints de l'API
- Exemples :
  - `GET /users` (user-service)
  - `GET /demarches` (demarches-service)
  - `GET /documents` (document-service)
  - `GET /analytics` (analytics-service)

## 🧪 Tests et Exemples

### 1. Obtenir un Token JWT

```bash
TOKEN=$(curl -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=user@iadaf.com' \
  -d 'password=user123' \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

### 2. Tester User Service (Port 8081)

#### Sans token (doit échouer avec 401)
```bash
curl http://localhost:8081/users
# Attendu: 401 Unauthorized
```

#### Avec token valide
```bash
curl http://localhost:8081/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. Tester Demarches Service (Port 8082)

#### Sans token (doit échouer avec 401)
```bash
curl http://localhost:8082/demarches
# Attendu: 401 Unauthorized
```

#### Avec token valide
```bash
curl http://localhost:8082/demarches \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 4. Tester Document Service (Port 8083)

#### Sans token (doit échouer avec 401)
```bash
curl http://localhost:8083/documents
# Attendu: 401 Unauthorized
```

#### Avec token valide
```bash
curl http://localhost:8083/documents \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 5. Tester Analytics Service (Port 8085)

#### Sans token (doit échouer avec 401)
```bash
curl http://localhost:8085/analytics
# Attendu: 401 Unauthorized
```

#### Avec token valide
```bash
curl http://localhost:8085/analytics \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 6. Tester Health Endpoints (Publics)

```bash
# Tous ces endpoints doivent être accessibles sans token
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health
curl http://localhost:8085/actuator/health
```

## 🔍 Inspection du Token JWT

### Décoder le Token

```bash
# Installer jq si nécessaire
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq
```

### Contenu typique du Token

```json
{
  "exp": 1703174400,
  "iat": 1703170800,
  "jti": "uuid-here",
  "iss": "http://localhost:8180/realms/iadaf",
  "aud": ["iadaf-frontend"],
  "sub": "user-uuid",
  "typ": "Bearer",
  "azp": "iadaf-frontend",
  "session_state": "session-uuid",
  "preferred_username": "user@iadaf.com",
  "email": "user@iadaf.com",
  "email_verified": true,
  "name": "User Name",
  "given_name": "User",
  "family_name": "Name"
}
```

## 🐛 Troubleshooting

### Erreur 401 - Unauthorized

**Symptômes :**
```json
{
  "timestamp": "2024-12-18T11:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Token JWT invalide ou expiré"
}
```

**Causes possibles :**
1. Token expiré - Obtenir un nouveau token
2. Token invalide - Vérifier le format `Authorization: Bearer <token>`
3. Keycloak inaccessible - Vérifier que Keycloak est démarré
4. Configuration incorrecte - Vérifier `KEYCLOAK_ISSUER_URI` et `KEYCLOAK_JWK_SET_URI`

**Solutions :**
```bash
# Vérifier que Keycloak est accessible
curl http://localhost:8180/realms/iadaf/.well-known/openid-configuration

# Obtenir un nouveau token
TOKEN=$(curl -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=user@iadaf.com' \
  -d 'password=user123' \
  | jq -r '.access_token')

# Vérifier l'expiration du token
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'
```

### Erreur 403 - Forbidden

**Symptômes :**
```json
{
  "timestamp": "2024-12-18T11:00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Accès refusé - Permissions insuffisantes"
}
```

**Causes possibles :**
1. L'utilisateur n'a pas les rôles/permissions requis
2. Configuration des rôles dans Keycloak incorrecte

**Solutions :**
1. Vérifier les rôles dans Keycloak Admin Console
2. Vérifier les claims dans le token JWT
3. Ajuster les règles d'autorisation dans `SecurityConfig`

### Problème de connexion à Keycloak

**Symptômes :**
```
org.springframework.security.oauth2.jwt.JwtException: 
An error occurred while attempting to decode the Jwt
```

**Solutions :**
```bash
# Vérifier que Keycloak est démarré
docker-compose ps keycloak

# Vérifier les variables d'environnement
echo $KEYCLOAK_ISSUER_URI
echo $KEYCLOAK_JWK_SET_URI

# Tester la connectivité
curl http://localhost:8180/realms/iadaf/protocol/openid-connect/certs
```

### Logs de débogage

Pour activer les logs détaillés, le niveau de log est déjà configuré dans `application.yml` :

```yaml
logging:
  level:
    org.springframework.security: DEBUG
```

Les logs montrent :
- Les tentatives d'authentification
- La validation des tokens JWT
- Les informations extraites du token (username, email)
- Les erreurs de sécurité

## 🔧 Variables d'Environnement

Les services utilisent ces variables d'environnement (définies dans `.env`) :

```bash
# Keycloak OAuth2 Configuration
KEYCLOAK_ISSUER_URI=http://localhost:8180/realms/iadaf
KEYCLOAK_JWK_SET_URI=http://localhost:8180/realms/iadaf/protocol/openid-connect/certs
KEYCLOAK_AUTH_URI=http://localhost:8180/realms/iadaf/protocol/openid-connect/auth
KEYCLOAK_TOKEN_URI=http://localhost:8180/realms/iadaf/protocol/openid-connect/token
KEYCLOAK_USER_INFO_URI=http://localhost:8180/realms/iadaf/protocol/openid-connect/userinfo
```

## 🔒 Security Considerations

### CSRF Protection

CSRF (Cross-Site Request Forgery) protection is **intentionally disabled** in all microservices. This is a standard and secure practice for stateless REST APIs using JWT tokens because:

1. **JWT tokens are stored in HTTP headers** (not cookies), so they are not automatically sent by browsers
2. **Sessions are stateless** (SessionCreationPolicy.STATELESS) - no session state is maintained
3. **CSRF attacks rely on automatic cookie submission**, which does not apply to bearer token authentication
4. **All authentication is explicit** via the `Authorization: Bearer <token>` header

This configuration follows Spring Security best practices for OAuth2 Resource Servers and is documented in the [Spring Security documentation](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html#csrf-when-stateless).

### Token Security

- JWT tokens are validated on every request using public keys from Keycloak (JWK Set)
- Tokens have expiration times (exp claim) to limit their validity period
- Token validation includes signature verification, issuer verification, and expiration checks
- All communication should use HTTPS in production to prevent token interception

## 📚 Références

- [Spring Security OAuth2 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
- [Spring Security CSRF Protection](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
- [JWT (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)

## 🆘 Support

Pour toute question ou problème de sécurité :
1. Consulter les logs des services
2. Vérifier la configuration Keycloak
3. Consulter ce document de troubleshooting
4. Contacter l'équipe de développement
