# AI Service API Reference

## Base URL
```
http://localhost:8086
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### 1. Chat Assistant

#### POST /ai/chat
Start or continue a conversation with the AI assistant.

**Request Body:**
```json
{
  "message": "Comment renouveler mon titre de séjour?",
  "conversationId": null,
  "context": "optional additional context"
}
```

**Response:**
```json
{
  "response": "Pour renouveler votre titre de séjour...",
  "conversationId": 123,
  "role": "assistant",
  "tokensUsed": null
}
```

---

### 2. Conversation Management

#### GET /ai/conversations
List all conversations for the authenticated user.

**Response:**
```json
[
  {
    "id": 123,
    "title": "Comment renouveler mon titre...",
    "messages": [...],
    "createdAt": "2026-01-06T15:00:00",
    "updatedAt": "2026-01-06T15:30:00"
  }
]
```

#### GET /ai/conversation/{id}
Get a specific conversation by ID.

**Response:**
```json
{
  "id": 123,
  "title": "Comment renouveler mon titre...",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "Comment renouveler mon titre de séjour?",
      "createdAt": "2026-01-06T15:00:00"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Pour renouveler votre titre de séjour...",
      "createdAt": "2026-01-06T15:00:05"
    }
  ],
  "createdAt": "2026-01-06T15:00:00",
  "updatedAt": "2026-01-06T15:30:00"
}
```

#### DELETE /ai/conversation/{id}
Delete a conversation.

**Response:** 204 No Content

---

### 3. Document Analysis

#### POST /ai/analyze-document
Analyze a document and extract key information.

**Request Body:**
```json
{
  "documentContent": "Carte Nationale d'Identité\nNom: DUPONT\nPrénom: Jean...",
  "documentType": "carte_identite",
  "language": "FR"
}
```

**Response:**
```json
{
  "documentType": "carte_identite",
  "extractedInfo": {
    "nom": "DUPONT",
    "prenom": "Jean",
    "date_naissance": "01/01/1990",
    "adresse": "123 Rue de Paris, 75001 Paris"
  },
  "summary": "Carte d'identité française pour Jean DUPONT...",
  "suggestedActions": [
    "Vérifier la date d'expiration",
    "Préparer les documents pour le renouvellement"
  ],
  "confidence": 0.95
}
```

#### POST /ai/extract-info
Extract structured information from a document (same as analyze-document).

---

### 4. Smart Suggestions

#### POST /ai/suggest-demarche
Get personalized demarche suggestions based on user profile.

**Query Parameters:**
- `userProfile` (optional): User profile information
- `userHistory` (optional): User's previous demarches

**Response:**
```json
[
  {
    "demarcheId": "carte_sejour",
    "demarcheTitle": "Demande de carte de séjour",
    "description": "Obtenir ou renouveler une carte de séjour",
    "reason": "Basé sur votre profil d'immigrant récent",
    "steps": [
      "Prendre rendez-vous en préfecture",
      "Préparer les documents requis",
      "Se présenter au rendez-vous"
    ],
    "priority": 1,
    "difficulty": "moyen"
  }
]
```

---

### 5. Translation

#### POST /ai/translate
Translate text between supported languages.

**Request Body:**
```json
{
  "text": "Bonjour, comment puis-je vous aider?",
  "targetLanguage": "EN",
  "sourceLanguage": "FR"
}
```

**Response:**
```json
{
  "translatedText": "Hello, how can I help you?",
  "sourceLanguage": "FR",
  "targetLanguage": "EN"
}
```

**Supported Languages:**
- FR (Français)
- EN (English)
- AR (العربية)
- ES (Español)

---

## Error Responses

### 404 Not Found
```json
{
  "status": 404,
  "message": "Conversation non trouvé(e) avec id : '123'",
  "timestamp": "2026-01-06T15:00:00"
}
```

### 400 Bad Request (Validation Error)
```json
{
  "status": 400,
  "message": "Erreur de validation",
  "errors": {
    "message": "Le message ne peut pas être vide"
  },
  "timestamp": "2026-01-06T15:00:00"
}
```

### 503 Service Unavailable (OpenAI Error)
```json
{
  "status": 503,
  "message": "Erreur du service OpenAI: Connection timeout",
  "timestamp": "2026-01-06T15:00:00"
}
```

### 429 Too Many Requests
```json
{
  "status": 429,
  "message": "Limite de requêtes dépassée. Veuillez réessayer plus tard.",
  "timestamp": "2026-01-06T15:00:00"
}
```

---

## Examples with cURL

### Chat
```bash
curl -X POST http://localhost:8086/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Comment obtenir une carte vitale?"
  }'
```

### Document Analysis
```bash
curl -X POST http://localhost:8086/ai/analyze-document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentContent": "Passeport français...",
    "documentType": "passeport",
    "language": "FR"
  }'
```

### Translation
```bash
curl -X POST http://localhost:8086/ai/translate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Je voudrais faire une demande de naturalisation",
    "targetLanguage": "EN"
  }'
```

### Get Conversations
```bash
curl -X GET http://localhost:8086/ai/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete Conversation
```bash
curl -X DELETE http://localhost:8086/ai/conversation/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. The `conversationId` field in chat requests is optional. Omit it to start a new conversation.
3. The AI uses GPT-4 model by default (configurable via environment variables)
4. Document analysis supports various document types: `carte_identite`, `passeport`, `justificatif_domicile`, etc.
5. Translation automatically detects source language if not provided
