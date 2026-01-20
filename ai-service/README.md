# AI Service

Service d'intelligence artificielle pour IA-DAF utilisant l'intégration OpenAI GPT-4.

## Fonctionnalités

### 1. Assistant de Chat
- **Endpoint**: `POST /ai/chat`
- **Description**: Assistant conversationnel intelligent pour aider avec les démarches administratives
- **Body**:
```json
{
  "message": "Comment obtenir une carte de séjour?",
  "conversationId": null,
  "context": "optional context"
}
```

### 2. Analyse de Documents
- **Endpoint**: `POST /ai/analyze-document`
- **Description**: Analyse de documents et extraction d'informations
- **Body**:
```json
{
  "documentContent": "Contenu du document...",
  "documentType": "carte_identite",
  "language": "FR"
}
```

### 3. Extraction d'Informations
- **Endpoint**: `POST /ai/extract-info`
- **Description**: Extraction structurée d'informations depuis un document
- **Body**: Même format que analyze-document

### 4. Suggestions de Démarches
- **Endpoint**: `POST /ai/suggest-demarche`
- **Description**: Suggère des démarches pertinentes basées sur le profil utilisateur
- **Query Params**:
  - `userProfile`: Profil de l'utilisateur
  - `userHistory`: Historique des démarches

### 5. Traduction
- **Endpoint**: `POST /ai/translate`
- **Description**: Traduction multilingue (FR, EN, AR, ES)
- **Body**:
```json
{
  "text": "Bonjour",
  "targetLanguage": "EN",
  "sourceLanguage": "FR"
}
```

### 6. Gestion des Conversations
- **GET** `/ai/conversations` - Liste toutes les conversations de l'utilisateur
- **GET** `/ai/conversation/{id}` - Récupère une conversation spécifique
- **DELETE** `/ai/conversation/{id}` - Supprime une conversation

## Configuration

### Variables d'Environnement

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000
OPENAI_TIMEOUT=30000

# Database
POSTGRES_USER=iadaf_user
POSTGRES_PASSWORD=iadaf_password

# OAuth2
KEYCLOAK_ISSUER_URI=http://localhost:8180/realms/iadaf
KEYCLOAK_JWK_SET_URI=http://localhost:8180/realms/iadaf/protocol/openid-connect/certs
```

### application.yml

Le fichier `application.yml` contient la configuration par défaut:
- Port: 8086
- Database schema: ai
- Eureka registration

## Sécurité

- **Authentification**: OAuth2 Resource Server avec JWT
- **Session**: Stateless (JWT tokens)
- **CSRF**: Désactivé (API REST stateless)
- **Isolation**: Contexte utilisateur isolé par JWT

## Architecture

### Entités
- **Conversation**: Stocke les conversations utilisateur
- **Message**: Stocke les messages individuels (user/assistant/system)

### Services
- **ChatService**: Gestion des conversations et chat
- **DocumentAnalysisService**: Analyse de documents
- **SuggestionService**: Suggestions de démarches
- **TranslationService**: Traduction multilingue
- **OpenAIClient**: Client pour communiquer avec OpenAI API

### Contrôleurs
- **ChatController**: Endpoints de chat
- **DocumentAnalysisController**: Endpoints d'analyse
- **SuggestionController**: Endpoints de suggestions
- **TranslationController**: Endpoints de traduction

## Dépendances

- Spring Boot 3.2+
- Spring Data JPA
- Spring Security OAuth2
- OpenAI Java SDK 0.18.2
- PostgreSQL Driver
- Eureka Client
- Lombok

## Développement

### Compilation
```bash
mvn clean compile
```

### Tests
```bash
mvn test
```

### Exécution
```bash
mvn spring-boot:run
```

## Notes Importantes

1. **Clé API OpenAI**: Vous devez fournir une clé API OpenAI valide via la variable d'environnement `OPENAI_API_KEY`
2. **Base de données**: Le service nécessite PostgreSQL avec le schéma `ai`
3. **Authentification**: Tous les endpoints (sauf actuator) nécessitent un token JWT valide
4. **Eureka**: Le service s'enregistre automatiquement auprès d'Eureka sur le port 8761

## Support Multilingue

Le service supporte les langues suivantes:
- Français (FR)
- Anglais (EN)
- Arabe (AR)
- Espagnol (ES)

## Gestion des Erreurs

Le service inclut une gestion complète des erreurs:
- **ResourceNotFoundException**: 404 - Ressource non trouvée
- **OpenAIException**: 503 - Erreur de communication avec OpenAI
- **RateLimitException**: 429 - Limite de taux dépassée
- **ValidationException**: 400 - Erreur de validation des données

## Exemples d'Utilisation

### Chat Simple
```bash
curl -X POST http://localhost:8086/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Comment renouveler mon titre de séjour?"
  }'
```

### Analyser un Document
```bash
curl -X POST http://localhost:8086/ai/analyze-document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentContent": "Carte Nationale d\'Identité...",
    "documentType": "carte_identite",
    "language": "FR"
  }'
```

### Traduire du Texte
```bash
curl -X POST http://localhost:8086/ai/translate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, comment puis-je vous aider?",
    "targetLanguage": "EN"
  }'
```
