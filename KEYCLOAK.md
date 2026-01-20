# Keycloak - Gestion de l'authentification IA-DAF

## Description

Keycloak est utilisé comme Identity and Access Management (IAM) pour gérer l'authentification, l'autorisation et les rôles des utilisateurs du projet IA-DAF.

## Démarrage

### Lancer Keycloak avec Docker Compose

```bash
docker compose up -d keycloak
```

### Accès à l'Admin Console

- **URL** : http://localhost:8180
- **Admin Username** : `admin`
- **Admin Password** : `admin`

## Configuration du Realm

Le realm `iadaf` est automatiquement importé au démarrage avec :
- 4 rôles prédéfinis
- 3 clients OAuth2
- 4 utilisateurs de test

### Rôles disponibles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **USER** | Utilisateur standard | Créer des dossiers, uploader des documents, consulter ses propres données |
| **ADMIN** | Administrateur | Accès complet à toutes les fonctionnalités, gestion des utilisateurs |
| **AGENT** | Agent administratif | Consulter et aider les utilisateurs, accès en lecture aux dossiers |
| **SUPPORT** | Support technique | Accès aux logs, statistiques, monitoring |

### Clients OAuth2

#### 1. iadaf-frontend (Public Client)

Client pour l'application React.

**Configuration** :
- **Client ID** : `iadaf-frontend`
- **Type** : Public
- **Redirect URIs** : 
  - `http://localhost:3000/*`
  - `http://localhost:5173/*`
- **Web Origins** : `http://localhost:3000`, `http://localhost:5173`
- **PKCE** : Activé (S256)

#### 2. iadaf-gateway (Confidential Client)

Client pour l'API Gateway.

**Configuration** :
- **Client ID** : `iadaf-gateway`
- **Type** : Confidential
- **Client Secret** : `iadaf-gateway-secret-change-in-production`
- **Service Accounts** : Enabled

#### 3. iadaf-backend (Bearer-Only)

Client pour les microservices backend.

**Configuration** :
- **Client ID** : `iadaf-backend`
- **Type** : Bearer-Only

## Utilisateurs de test

| Email | Password | Rôles | Description |
|-------|----------|-------|-------------|
| admin@iadaf.com | admin123 | ADMIN, USER | Administrateur système |
| user@iadaf.com | user123 | USER | Utilisateur standard |
| agent@iadaf.com | agent123 | AGENT, USER | Agent administratif |
| support@iadaf.com | support123 | SUPPORT, USER | Support technique |

## Obtenir un token JWT

### Via cURL (Direct Grant / Password Flow)

```bash
curl -X POST http://localhost:8180/realms/iadaf/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=iadaf-frontend" \
  -d "username=user@iadaf.com" \
  -d "password=user123" \
  -d "grant_type=password"
```

**Réponse** :
```json
{
  "access_token": "eyJhbGc...",
  "expires_in": 1800,
  "refresh_expires_in": 3600,
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer"
}
```

### Via Postman

1. Créer une nouvelle requête
2. Onglet **Authorization**
3. Type : **OAuth 2.0**
4. Configuration :
   - **Grant Type** : Password Credentials
   - **Access Token URL** : `http://localhost:8180/realms/iadaf/protocol/openid-connect/token`
   - **Client ID** : `iadaf-frontend`
   - **Username** : `user@iadaf.com`
   - **Password** : `user123`
5. Cliquer sur **Get New Access Token**

## Structure du JWT Token

```json
{
  "exp": 1703001234,
  "iat": 1702997634,
  "jti": "abc-123",
  "iss": "http://localhost:8180/realms/iadaf",
  "sub": "123e4567-e89b-12d3-a456-426614174000",
  "typ": "Bearer",
  "azp": "iadaf-frontend",
  "session_state": "xyz-789",
  "realm_access": {
    "roles": ["USER"]
  },
  "resource_access": {
    "iadaf-frontend": {
      "roles": ["user"]
    }
  },
  "scope": "openid email profile",
  "email_verified": true,
  "name": "John Doe",
  "preferred_username": "user@iadaf.com",
  "given_name": "John",
  "family_name": "Doe",
  "email": "user@iadaf.com"
}
```

## Endpoints Keycloak

### Découverte OpenID Connect

```
GET http://localhost:8180/realms/iadaf/.well-known/openid-configuration
```

### Token Endpoint

```
POST http://localhost:8180/realms/iadaf/protocol/openid-connect/token
```

### Authorization Endpoint

```
GET http://localhost:8180/realms/iadaf/protocol/openid-connect/auth
```

### Logout Endpoint

```
POST http://localhost:8180/realms/iadaf/protocol/openid-connect/logout
```

### UserInfo Endpoint

```
GET http://localhost:8180/realms/iadaf/protocol/openid-connect/userinfo
```

## Gestion des utilisateurs

### Créer un nouvel utilisateur

1. Accéder à l'Admin Console
2. Sélectionner le realm **iadaf**
3. Menu **Users** → **Add user**
4. Remplir les informations :
   - Username (email)
   - Email
   - First Name
   - Last Name
   - Email Verified : ON
5. Onglet **Credentials** → Définir un mot de passe
6. Onglet **Role Mappings** → Assigner les rôles

### Assigner des rôles

1. Users → Sélectionner l'utilisateur
2. Onglet **Role Mappings**
3. **Assign role** → Sélectionner les rôles (USER, ADMIN, etc.)

## Internationalisation

Keycloak supporte 4 langues pour IA-DAF :
- 🇫🇷 Français (par défaut)
- 🇬🇧 Anglais
- 🇪🇸 Espagnol
- 🇸🇦 Arabe

La langue est sélectionnée automatiquement selon les préférences du navigateur.

## Sécurité

### Protection Brute Force

Configurée dans le realm :
- **Max Login Failures** : 5
- **Wait Increment** : 60 secondes
- **Max Wait** : 900 secondes (15 minutes)
- **Failure Reset Time** : 12 heures

### Politique de mots de passe

Par défaut (à personnaliser) :
- Longueur minimale : 8 caractères
- Au moins 1 majuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial

### Tokens

- **Access Token Lifespan** : 30 minutes
- **Refresh Token Lifespan** : 60 minutes
- **SSO Session Idle** : 30 minutes
- **SSO Session Max** : 10 heures

## Troubleshooting

### Keycloak ne démarre pas

Vérifier que PostgreSQL est démarré :
```bash
docker compose ps postgres
```

Vérifier les logs :
```bash
docker compose logs keycloak
```

### Impossible de se connecter

1. Vérifier que le realm est bien `iadaf`
2. Vérifier le client ID
3. Vérifier les credentials de l'utilisateur
4. Consulter les logs Keycloak

### Token invalide

1. Vérifier que le token n'est pas expiré
2. Vérifier l'issuer (`iss`) dans le token
3. Vérifier que le client existe dans Keycloak

## Export / Import du Realm

### Exporter le realm

```bash
docker exec -it iadaf-keycloak /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm iadaf
```

### Importer le realm

Le realm est automatiquement importé au démarrage via le volume monté.

## Monitoring

### Health Check

```bash
curl http://localhost:8180/health
```

### Metrics (si Prometheus est configuré)

```bash
curl http://localhost:8180/metrics
```

## Prochaines étapes

Après avoir configuré Keycloak :

1. **Étape 2** : Sécuriser l'API Gateway avec OAuth2 Resource Server
2. **Étape 3** : Sécuriser les microservices avec Spring Security
3. Implémenter le frontend avec authentification Keycloak

## Ressources

- [Documentation Keycloak](https://www.keycloak.org/documentation)
- [OpenID Connect](https://openid.net/connect/)
- [OAuth 2.0](https://oauth.net/2/)
