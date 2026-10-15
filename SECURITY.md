# 🔒 Sécurité — IA-DAF

Ce document décrit le modèle de sécurité réellement implémenté.

> **Historique** — une version antérieure reposait sur Keycloak (OAuth2 /
> OIDC) devant quatre microservices Java. Keycloak a été retiré :
> l'authentification est désormais portée par le frontend Next.js via Auth.js.
> Le backend valide désormais un jeton interne signé par le frontend — voir
> « Jetons internes ».

---

## 🏗️ Vue d'ensemble

```
┌──────────────┐
│  Navigateur  │
└──────┬───────┘
       │ HTTPS · cookie de session (JWT Auth.js, httpOnly)
       ▼
┌──────────────────┐
│  Reverse proxy   │  seul point publié (Phase 6 : Caddy)
└──────┬───────────┘
       ▼
┌─────────────────────────────────────────────┐
│  Frontend Next.js  127.0.0.1:3000           │
│  proxy.ts ........ protège les pages        │
│  Auth.js ......... sessions + providers     │
│  rateLimit ....... quotas (Postgres)        │
│  aiService ....... signe un JWT interne     │
└──────┬──────────────────────────┬───────────┘
       │ SQL                      │ Authorization: Bearer <JWT 60 s>
       ▼                          ▼
┌──────────────┐          ┌──────────────────────────────┐
│  PostgreSQL  │          │ API Gateway                  │
│              │          │ · rejette tout appel sans    │
└──────────────┘          │   jeton valide (401)         │
                          │ · réécrit X-User-Id depuis   │
                          │   le jeton                   │
                          └──────────────┬───────────────┘
                     réseau Docker interne uniquement
             ┌─────────┬─────────┼──────────┬──────────┐
             ▼         ▼         ▼          ▼          ▼
          ┌──────┐ ┌──────┐ ┌─────────┐ ┌────────┐ ┌─────────┐
          │  AI  │ │ User │ │Demarches│ │Document│ │Analytics│
          └──────┘ └──────┘ └─────────┘ └────────┘ └─────────┘
              chacun revalide le même jeton
```

---

## 🔑 Authentification

**Auth.js (NextAuth v5)**, sessions **JWT** (imposé par le provider Credentials
— il n'y a pas de ligne de session en base à consulter).

### Providers

| Provider | Activation | Stockage |
|----------|-----------|----------|
| Credentials | toujours | `users.app_users`, mot de passe haché **bcrypt, 12 tours** |
| Google OAuth | si `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` | même table, `password_hash` à NULL |

Le cookie de session est signé avec `AUTH_SECRET`, en `httpOnly`, et expire au
bout de 7 jours.

### Points de vigilance implémentés

- **Normalisation des e-mails** — stockés en minuscules, contrainte d'unicité :
  `Amina@X.com` et `amina@x.com` ne peuvent pas créer deux comptes.
- **Pas d'énumération de comptes** — `/api/auth/register` renvoie le même
  message générique qu'une adresse soit déjà prise ou non.
- **Pas d'open redirect** — le paramètre `callbackUrl` est réduit à un chemin de
  même origine ; `//evil.com`, `http://evil.com/x` et `javascript:` retombent
  sur `/`.
- **Politique de mot de passe** — 8 caractères minimum, au moins une lettre et
  un chiffre (validée côté serveur avec Zod, pas seulement dans le formulaire).

### Protection des routes

Appliquée par [`front/src/proxy.ts`](front/src/proxy.ts) sur **toutes** les
requêtes. Sont publiques :

```
/  /login  /register  /nosPacks  /procedures  /api/*
```

Les routes `/api/*` traversent le proxy sans être bloquées et appliquent
**chacune leur propre contrôle**, afin de renvoyer un JSON 401 plutôt qu'une
redirection HTML vers la page de connexion — et pour que Stripe puisse joindre
le webhook sans session.

Tout le reste (`/myFolders`, `/profil`, `/settings`, `/packs/*`, `/payment/*`,
`/dashboard`, `/documents`, `/chatIa`) exige une session.

---

## 💳 Sécurité du paiement

**Stripe Checkout hébergé** : aucune donnée bancaire n'atteint nos serveurs, ce
qui maintient le code hors périmètre PCI-DSS.

Trois garanties, dans cet ordre :

1. **Le montant vient du serveur.** `/api/checkout` ignore tout prix envoyé par
   le client et lit `priceCents` dans le catalogue serveur. Un payload trafiqué
   ne peut pas changer ce qui est facturé.
2. **Seul le webhook accorde l'accès.** La redirection vers `success_url` est
   purement cosmétique. Le droit n'est écrit que par
   `/api/stripe/webhook`, après vérification de la **signature HMAC** Stripe.
   Une signature invalide est rejetée en 400.
3. **L'écriture est idempotente.** Stripe rejoue les webhooks ; les contraintes
   d'unicité sur `stripe_session_id` et sur `(user_id, pack_slug)` empêchent
   tout doublon.

Le webhook ignore également les sessions dont `payment_status` n'est pas `paid`.

### Contrôle d'accès aux packs

Vérifié **côté serveur** à chaque affichage de `/packs/[slug]`, contre la table
`users.pack_entitlements`. Une absence de droit redirige vers `/payment/[slug]`.

Le contenu payant est séparé du catalogue public :

- [`packsData.ts`](front/src/app/(app)/packs/packsData.ts) — titre, prix,
  description : importé par des composants clients (footer, chat d'accueil),
  donc présent dans le bundle navigateur ;
- [`packContent.ts`](front/src/app/(app)/packs/packContent.ts) — les pièces à
  réunir, marqué `server-only` : l'importer depuis un composant client fait
  échouer la compilation. Il n'atteint le navigateur qu'en props de l'espace de
  travail, une fois le droit vérifié.

Vérifié sur le build de production : aucune pièce réservée dans `.next/static`.

---

## 🌐 CORS

L'AI Service n'accepte que les origines listées dans `CORS_ORIGINS`
(par défaut `http://localhost:3000`), avec les méthodes `GET`, `POST`, `OPTIONS`.

La configuration précédente (`allow_origins=["*"]` combiné à
`allow_credentials=True`) était à la fois rejetée par les navigateurs et
permissive dans son intention.

En fonctionnement normal, le frontend appelle l'AI Service **serveur à serveur**
via `/api/ai/*` → gateway, donc CORS ne concerne que les accès directs depuis un
navigateur (débogage, Swagger).

---

## 🎫 Jetons internes

Le frontend porte l'authentification des personnes ; le backend, lui, doit
savoir qu'un appel **vient du frontend**, et pour quel utilisateur. Pour chaque
appel, le frontend signe un JWT ([`lib/aiService.ts`](front/src/app/lib/aiService.ts)) :

| Claim | Valeur |
|-------|--------|
| `alg` | HS256, clé `INTERNAL_JWT_SECRET` (32 octets minimum) |
| `iss` / `aud` | `iadaf-frontend` / `iadaf-backend` |
| `exp` | 60 secondes |
| `sub` | Identifiant du compte connecté — **absent** pour un visiteur |
| `scope` | `account:erase` pour l'effacement d'un compte, jamais sur un appel relayé depuis le navigateur |

**Vérifié deux fois** : par la gateway, qui rejette en 401 tout appel sans
jeton valide, puis par chaque service (Spring Security OAuth2 Resource Server
pour les services Java, PyJWT pour l'AI Service). Un appel direct à un
service, sans passer par le frontend, n'aboutit donc nulle part — et ne
contourne plus la limitation de débit. Seuls `/actuator/health` et
`/ai/health` répondent sans jeton.

**L'identité vient du jeton, et de lui seul.** `demarches-service` prend
l'utilisateur dans `sub` ; l'ancien repli sur l'en-tête `X-User-Id`, que
n'importe qui pouvait forger, est supprimé. La gateway retire tout `X-User-Id`
envoyé par l'appelant et le réécrit à partir du jeton.

Chaque service **refuse de démarrer** sans clé ou avec une clé de moins de
32 octets. Les tests couvrent : jeton absent, signature forgée, expiré,
mauvais émetteur, mauvaise audience, `alg: none`, `X-User-Id` forgé.

Pour appeler un service à la main en développement :

```bash
TOKEN=$(INTERNAL_JWT_SECRET=<valeur du .env> node front/scripts/dev-token.mjs <user-id>)
curl http://localhost:8080/api/demarches -H "Authorization: Bearer $TOKEN"
```

> **Limite.** Le frontend détient la clé et peut signer pour n'importe quel
> compte : c'est lui la frontière de confiance. Une compromission du serveur
> frontend compromet tout le backend ; sans elle, plus rien n'est appelable.

---

## 🔁 Réinitialisation du mot de passe

`/mot-de-passe-oublie` envoie un lien par e-mail (SMTP, `SMTP_URL`) :

- jeton aléatoire de 256 bits, dont **seule l'empreinte SHA-256** est stockée
  (`users.password_reset_tokens`) : une fuite de la base ne livre aucun lien ;
- **usage unique** (consommé par un `DELETE … RETURNING` atomique), valable
  **30 minutes** ; une nouvelle demande annule le lien précédent ;
- le lien est construit avec `AUTH_URL`, jamais avec l'en-tête `Host` de la
  requête, qu'un attaquant pourrait falsifier pour recevoir le lien ;
- réponse identique et **immédiate** que le compte existe ou non (l'e-mail
  part en arrière-plan) : ni le message ni le temps de réponse ne révèlent
  quelles adresses sont inscrites ;
- limité à 5 demandes / h par IP et 3 / h par adresse, 10 essais / 15 min sur
  la confirmation ;
- comptes Google : aucun e-mail (pas de mot de passe à réinitialiser).

> **Limite.** Les sessions sont des JWT sans état : changer de mot de passe ne
> déconnecte pas une session déjà ouverte ailleurs (elle expire au plus tard
> au bout de 7 jours).

En développement, `docker-compose.override.yml` branche le frontend sur
**Mailpit**, qui capture tous les e-mails sans rien envoyer : ils sont lisibles
sur http://127.0.0.1:8025. Avec `npm run dev` sans `SMTP_URL`, le lien est
affiché dans la console. En production, sans `SMTP_URL`, la demande échoue
(journalisée) plutôt que de prétendre avoir envoyé un e-mail.

---

## 🚦 Limitation de débit

Compteurs à fenêtre fixe stockés dans PostgreSQL (schéma `ratelimit`) : ils
survivent aux redémarrages et sont partagés entre instances, sans ajouter
Redis. Les clés (IP, e-mail) sont stockées **hachées en HMAC**, jamais en
clair, et purgées après 48 h. Les règles vivent dans
[`lib/rateLimit.ts`](front/src/app/lib/rateLimit.ts).

| Point d'entrée | Limite |
|----------------|--------|
| `/api/ai/*` anonyme | 30 / h par IP, **et 1 000 / jour au total** (plafond de coût LLM) |
| `/api/ai/*` connecté | 200 / h par compte |
| Connexion (Credentials) | 20 / 15 min par IP, 10 / 15 min par adresse e-mail |
| `/api/auth/register` | 5 / h par IP |
| `/api/account/password` | 10 / 15 min par compte |
| `/api/leads` | 5 / h par IP |

Une limite atteinte renvoie **429** avec `Retry-After`. Les règles sont
évaluées dans l'ordre et s'arrêtent au premier refus : une IP déjà bloquée ne
peut pas épuiser à elle seule le quota global anonyme.

À connaître :

- **IP du client** — lue dans la dernière entrée de `X-Forwarded-For`, celle
  écrite par le reverse proxy. Si le port `3000` est joignable directement,
  un client peut forger cet en-tête.
- **Verrouillage par e-mail** — la limite par adresse empêche de deviner un
  mot de passe depuis de nombreuses IP, mais permet à un attaquant de bloquer
  la connexion d'un compte pendant 15 minutes.
- **Échec ouvert** — si PostgreSQL est injoignable, la requête passe (et
  l'erreur est journalisée) plutôt que de bloquer tous les visiteurs.
- **Quota global anonyme** — quand il est épuisé, le chat d'accueil cesse de
  répondre aux visiteurs non connectés jusqu'au lendemain ; c'est le prix du
  plafond de coût.

---

## 📎 Pièces déposées

Gérées par `document-service`, stockées dans PostgreSQL (schéma `documents`) :

- **Chiffrées par le service** (AES-256-GCM, IV aléatoire par fichier) avant
  écriture : la base, ses sauvegardes et l'hébergeur ne voient que du chiffré.
  L'identifiant du document est lié au chiffré (AAD) : un contenu recopié sous
  une autre ligne est rejeté au déchiffrement. Empreinte SHA-256 vérifiée à
  chaque lecture.
- **Clé `DOCUMENT_ENCRYPTION_KEY`** hors base, à sauvegarder **séparément** de
  la base : sa perte rend les pièces illisibles, sa fuite avec une sauvegarde
  les expose. Le service refuse de démarrer sans clé valide.
- **Type réel** lu dans les premiers octets (PDF, JPEG, PNG) : ni l'extension
  ni le `Content-Type` du navigateur ne sont crus. 10 Mo maximum.
- **Cloisonnement** : la pièce d'un autre utilisateur répond 404, comme une
  pièce inexistante. Le frontend vérifie en plus que le pack est acheté.
- **Téléchargement** toujours en pièce jointe, avec `nosniff` et `no-store` :
  un fichier déposé ne s'exécute jamais dans l'origine du site.
- **Conservation** : 180 jours après le dépôt (`DOCUMENT_RETENTION_DAYS`),
  purge quotidienne ; effacement immédiat au retrait et à la suppression du
  compte.

> **Limites.** Pas d'antivirus sur les fichiers déposés (ils ne sont jamais
> exécutés ni affichés dans le site, mais l'utilisateur les retélécharge) ;
> pas de journal des accès. Ce traitement requiert l'AIPD avant ouverture.

---

## 🔍 Pré-vérification automatique des pièces

`POST /ai/documents/{id}/analyze` (ai-service, [`app/documents`](ai-service/app/documents)) :

- **Déterministe, sans modèle de langage** : qualité de l'image (netteté,
  lumière, résolution), texte des PDF, bande MRZ (OACI 9303, sommes de
  contrôle), dates de validité et d'émission, clé IBAN. Messages fixes,
  testés ; « non vérifiable » n'est jamais présenté comme conforme.
- **Cloisonnée par document-service** : ai-service récupère la pièce avec le
  jeton de l'appelant, donc un utilisateur n'analyse que ses propres pièces ;
  aucun fichier ne transite par le frontend.
- **Minimisée** : seuls le type, l'état de la MRZ et une date sont retenus ;
  rien n'est stocké. Les statistiques envoyées à analytics-service sont des
  comptes anonymes au vocabulaire fermé (validé côté serveur).
- **Désactivée par défaut** (`DOCUMENT_ANALYSIS_ENABLED=false`) : traitement
  automatisé de pièces d'identité, à n'activer qu'après l'AIPD.
- **OCR** (`OCR_PROVIDER`) désactivé : il enverrait l'image des pièces à un
  tiers. Sans lui, les photos sont seulement contrôlées en qualité.

---

## 🧾 Données personnelles (RGPD)

### Liaison frontend → AI Service

Le proxy `/api/ai/*` du frontend ne transmet que `Content-Type`, `Accept` et
`Accept-Language` — jamais les cookies de session ni un `Authorization` venu
du navigateur. Il y joint un jeton interne (voir « Jetons internes ») dont le
sujet est l'utilisateur connecté, ce qui rattache ses conversations à son
compte. Le proxy n'expose que `chat`, `translate`, `analyze-document` et
`health` : l'endpoint d'effacement n'est pas joignable depuis le navigateur,
et exige de toute façon le scope `account:erase` pour ce même compte.

Une conversation n'est reprise que par son propriétaire : connaître son
identifiant ne suffit pas à lire ou compléter l'historique d'un autre.

### Droit à l'effacement

La suppression d'un compte efface, dans cet ordre :

1. en parallèle, ses conversations IA (`DELETE /ai/users/{id}/data`), ses
   démarches, étapes et commentaires compris (`DELETE /demarches/me`), et ses
   pièces déposées (`DELETE /documents/me`) — tous exigent un jeton de scope
   `account:erase` pour ce compte ;
2. puis, dans une transaction : ses e-mails de prospection et le compte, avec
   ses droits d'accès aux packs (`ON DELETE CASCADE`).

Si un service ne confirme pas l'effacement, le compte n'est pas supprimé et
l'utilisateur peut réessayer (les deux effacements sont idempotents) — on ne
lui annonce jamais une suppression partielle comme complète. Le registre des
ventes (`billing.sales`), sans identité, est conservé pour la comptabilité.

### Durées de conservation

| Donnée | Durée | Mécanisme |
|--------|-------|-----------|
| Conversations IA | 30 jours d'inactivité (`CONVERSATION_RETENTION_DAYS`) | Purge quotidienne dans l'AI Service — seule voie d'effacement des conversations anonymes |
| E-mails de prospection | 3 ans après le dernier consentement | Purge à chaque nouvel enregistrement |

### E-mails du chat d'accueil

- **Facultatifs** — le chat fonctionne sans, un bouton « Passer » est toujours
  proposé (un consentement conditionnant le service ne serait pas libre).
- **Consentement explicite** — case non cochée par défaut, refusée côté serveur
  si absente. Chaque enregistrement conserve la version du texte accepté
  (`consent_version`) et sa date.
- **Désinscription** — chaque adresse porte un jeton unique ; la page
  `/desinscription?token=…` supprime l'adresse. Tout e-mail envoyé **doit**
  contenir ce lien. La suppression passe par un bouton (POST) et non par
  l'ouverture du lien, que les clients mail ouvrent parfois seuls.

> ⚠️ **Anciennes adresses.** Avant cette refonte, l'AI Service stockait les
> adresses dans `public.lead_emails`, sans preuve de consentement. Elles ne
> doivent pas servir à la prospection. La suppression de compte les couvre,
> mais la table elle-même est à purger :
> `DROP TABLE IF EXISTS public.lead_emails;`

### Reste à faire

- Politique de confidentialité et mentions légales (aucune page n'existe).
- Conservation des pièces comptables : la cascade supprime aujourd'hui les
  achats avec le compte, alors qu'ils doivent être gardés 10 ans
  (art. L123-22 du Code de commerce).
- Transfert hors UE : les messages du chat partent chez OpenAI.

---

## 🔐 Secrets

| Secret | Où | Remarque |
|--------|-----|----------|
| `AUTH_SECRET` | `.env` / `.env.local` | **Régénérer par environnement** — `openssl rand -base64 32` |
| `INTERNAL_JWT_SECRET` | `.env` / `.env.local` / `ai-service/.env` | Même valeur partout, 32 octets minimum — `openssl rand -hex 32` |
| `SMTP_URL` | `.env` | Fournisseur d'e-mails transactionnels (réinitialisation du mot de passe) |
| `POSTGRES_PASSWORD` | `.env` | La valeur de dev ne doit jamais atteindre la production |
| `OPENAI_API_KEY` | `.env` | |
| `STRIPE_SECRET_KEY` | `.env` | Clé `sk_test_` en développement |
| `STRIPE_WEBHOOK_SECRET` | `.env` | Fourni par `stripe listen` ou le dashboard |

`.env` et `.env.local` sont couverts par `.gitignore`. Les fichiers
`.env.example` documentent les variables sans valeur réelle.

`docker-compose.yml` échoue au démarrage si `AUTH_SECRET` ou
`INTERNAL_JWT_SECRET` est absent, plutôt que
de démarrer avec une configuration d'authentification incomplète.

---

## ⚠️ Limites actuelles

À traiter avant une exposition publique :

| Point | Détail |
|-------|--------|
| **Ports en développement** | `docker-compose.override.yml` publie les ports internes, sur `127.0.0.1` uniquement. En production, lancer `docker compose -f docker-compose.yml up` : seul le frontend est publié, et sur la loopback. |
| **HTTP en développement** | Les cookies de session ne prennent l'attribut `Secure` que derrière HTTPS. Le déploiement doit être en TLS. |
| **Sessions non révocables** | Voir « Réinitialisation du mot de passe ». |
| **Dépendances** | `npm audit` : 2 alertes modérées restantes (`@tailwindcss/typography` → `postcss-selector-parser`, CPU à la compilation d'un CSS non fiable). Seul notre propre CSS est compilé ; le correctif proposé est une rétrogradation. Accepté. |

---

## 📋 Checklist avant mise en production

- [ ] `AUTH_SECRET` et `POSTGRES_PASSWORD` régénérés
- [ ] HTTPS actif, `AUTH_URL` pointant sur le domaine public
- [ ] Clés Stripe live, webhook déclaré sur l'URL publique
- [ ] Lancement avec `docker compose -f docker-compose.yml` (sans l'override de dev)
- [ ] `INTERNAL_JWT_SECRET` propre à la production, différent du dev
- [ ] `SMTP_URL` et `MAIL_FROM` configurés (réinitialisation du mot de passe)
- [ ] Frontend joignable uniquement via le reverse proxy (sinon `X-Forwarded-For` peut être forgé)
- [ ] Sauvegardes PostgreSQL configurées et restauration testée
- [ ] CGV et mentions légales publiées (obligatoire pour encaisser)
