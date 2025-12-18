# IA-DAF Frontend

Frontend Next.js 15 pour la plateforme IA-DAF.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 20+
- npm ou yarn
- Backend IA-DAF démarré
- Keycloak configuré

### Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 🔧 Configuration

Modifier `.env.local` avec vos valeurs :

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8180
NEXT_PUBLIC_KEYCLOAK_REALM=iadaf
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=iadaf-frontend
```

## 📁 Structure

- `app/` - Pages Next.js (App Router)
  - `(auth)/` - Pages d'authentification
  - `(dashboard)/` - Pages du dashboard protégées
- `components/` - Composants React
  - `ui/` - Composants UI shadcn/ui
  - `dashboard/` - Composants du dashboard
  - `shared/` - Composants partagés
- `lib/` - Logique métier et utilitaires
  - `api/` - Clients API
  - `auth/` - Configuration Keycloak
  - `utils/` - Utilitaires
- `types/` - Types TypeScript

## 🔐 Authentification

L'authentification est gérée par Keycloak OAuth2/OIDC avec PKCE.

### Routes protégées

Toutes les routes sous `/dashboard/*` nécessitent une authentification.

### Utilisateurs de test

| Email | Password | Rôle |
|-------|----------|------|
| admin@iadaf.com | admin123 | ADMIN |
| user@iadaf.com | user123 | USER |
| agent@iadaf.com | agent123 | AGENT |
| support@iadaf.com | support123 | SUPPORT |

## 🎨 Components UI

Le projet utilise shadcn/ui pour les composants :
- Button
- Card
- Input
- Label
- Avatar
- Dropdown Menu

## 📱 Responsive Design

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

La sidebar se transforme en menu hamburger sur mobile.

## 🧪 Tests

```bash
npm run test
```

## 📦 Build

```bash
npm run build
npm start
```

## 📚 Technologies

- **Next.js 15** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **Keycloak** - Authentification OAuth2/OIDC
- **React Query** - State management
- **Axios** - Client HTTP
- **date-fns** - Gestion des dates

## 🔗 API Endpoints

### Users
- `GET /api/users/me` - Profil utilisateur
- `PUT /api/users/me` - Mise à jour profil
- `GET /api/users` - Liste des utilisateurs (ADMIN)

### Démarches
- `GET /api/demarches` - Liste des démarches
- `GET /api/demarches/:id` - Détails d'une démarche
- `POST /api/demarches` - Créer une démarche
- `PUT /api/demarches/:id` - Modifier une démarche
- `DELETE /api/demarches/:id` - Supprimer une démarche

### Documents
- `GET /api/documents` - Liste des documents
- `GET /api/documents/:id` - Détails d'un document
- `POST /api/documents/upload` - Upload un document
- `GET /api/documents/:id/download` - Télécharger un document
- `DELETE /api/documents/:id` - Supprimer un document

## 🐛 Dépannage

### Erreur de connexion Keycloak

Vérifiez que Keycloak est bien démarré sur le port 8180 et que le realm `iadaf` est configuré.

### Erreur d'API

Vérifiez que l'API Gateway est bien démarré sur le port 8080.

### Erreur de token expiré

Le token est automatiquement rafraîchi par l'intercepteur Axios. Si l'erreur persiste, reconnectez-vous.

## 📝 License

MIT
