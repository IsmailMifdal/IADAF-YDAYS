# 🔒 Sécurité — IA-DAF

Ce document décrit le modèle de sécurité réellement implémenté.

> **Historique** — une version antérieure reposait sur Keycloak (OAuth2 /
> OIDC) devant quatre microservices Java. Keycloak a été retiré :
> l'authentification est désormais portée par le frontend Next.js via Auth.js.
> Les services Java restent déployés, mais sans authentification — voir
> « Limites actuelles ».

---

## 🏗️ Vue d'ensemble

```
┌──────────────┐
│  Navigateur  │
└──────┬───────┘
       │ cookie de session (JWT signé, httpOnly)
       ▼
┌─────────────────────────────────────────────┐
│  Frontend Next.js  :3000                    │
│                                             │
│  proxy.ts ......... protège les routes      │
│  Auth.js .......... sessions + providers    │
│  /api/checkout .... crée la session Stripe  │
│  /api/stripe/... .. reçoit le webhook       │
└──────┬──────────────────────────┬───────────┘
       │                          │
       │ SQL (pool pg)            │ HTTP serveur-à-serveur
       ▼                          ▼
┌──────────────┐          ┌──────────────┐
│  PostgreSQL  │          │ API Gateway  │
│ schéma users │          │    :8080     │
└──────────────┘          └──────┬───────┘
                                 │  aucune authentification
             ┌─────────┬─────────┼──────────┬──────────┐
             ▼         ▼         ▼          ▼          ▼
          ┌──────┐ ┌──────┐ ┌─────────┐ ┌────────┐ ┌─────────┐
          │  AI  │ │ User │ │Demarches│ │Document│ │Analytics│
          │ 8086 │ │ 8081 │ │  8082   │ │  8083  │ │  8085   │
          └──────┘ └──────┘ └─────────┘ └────────┘ └─────────┘
                        tous en permitAll
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

> ⚠️ **Limite connue.** Le catalogue `packsData.ts` est importé par une page
> cliente (`/nosPacks`), donc la liste des documents requis part dans le bundle
> navigateur pour tout le monde. Le paywall protège **l'espace de travail** du
> pack (assistant IA contextualisé, dépôt de pièces, suivi), pas cette liste.
> Pour la protéger réellement, il faudrait séparer le catalogue public des
> contenus réservés et ne servir ces derniers que depuis le serveur.

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

## 🧾 Données personnelles (RGPD)

### Liaison frontend → AI Service

Le proxy `/api/ai/*` du frontend ne transmet que `Content-Type`, `Accept` et
`Accept-Language` — jamais les cookies de session. Pour un utilisateur
connecté, il ajoute `X-User-Id` (tiré de la session vérifiée) et
`X-Internal-Token` (`INTERNAL_API_TOKEN`).

L'AI Service n'accorde foi à `X-User-Id` **que si le jeton est valide** : un
appel direct à la gateway avec un `X-User-Id` forgé est traité comme anonyme.
Le proxy n'expose que `chat`, `translate`, `analyze-document` et `health` —
l'endpoint d'effacement n'est pas joignable depuis le navigateur.

Une conversation n'est reprise que par son propriétaire : connaître son
identifiant ne suffit pas à lire ou compléter l'historique d'un autre.

### Droit à l'effacement

La suppression d'un compte efface, dans cet ordre :

1. ses conversations IA (`DELETE /ai/users/{id}/data`, protégé par le jeton) ;
2. puis, dans une transaction : ses e-mails de prospection et le compte, avec
   ses droits d'accès aux packs (`ON DELETE CASCADE`).

Si l'AI Service ne confirme pas l'effacement, le compte n'est pas supprimé et
l'utilisateur peut réessayer — on ne lui annonce jamais une suppression
partielle comme complète.

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
| `INTERNAL_API_TOKEN` | `.env` / `.env.local` / `ai-service/.env` | Même valeur partout — `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `.env` | La valeur de dev ne doit jamais atteindre la production |
| `OPENAI_API_KEY` | `.env` | |
| `STRIPE_SECRET_KEY` | `.env` | Clé `sk_test_` en développement |
| `STRIPE_WEBHOOK_SECRET` | `.env` | Fourni par `stripe listen` ou le dashboard |

`.env` et `.env.local` sont couverts par `.gitignore`. Les fichiers
`.env.example` documentent les variables sans valeur réelle.

`docker-compose.yml` échoue au démarrage si `AUTH_SECRET` ou
`INTERNAL_API_TOKEN` est absent, plutôt que
de démarrer avec une configuration d'authentification incomplète.

---

## ⚠️ Limites actuelles

À traiter avant une exposition publique :

| Point | Détail |
|-------|--------|
| **Aucune authentification côté back** | `SecurityConfig` autorise tout (`permitAll`) sur la gateway **et sur les quatre services Java**. Aucun JWT n'est validé : c'est le frontend qui porte l'auth. Toute exposition directe des ports 8080–8086 rend ces services librement appelables — y compris `/api/users`, qui expose des données personnelles. |
| **Ports des services Java publiés** | `8081`, `8082`, `8083` et `8085` sont mappés sur l'hôte pour faciliter les tests. À retirer du mapping en production : seule la gateway devrait joindre ces services, sur le réseau Docker interne. |
| **Identité non vérifiée sur `demarches-service`** | Ce service cloisonne les démarches par utilisateur. Faute de jeton depuis le retrait de Keycloak, il accepte l'en-tête **`X-User-Id`**, qui n'est **pas vérifiée** : tout appelant peut se déclarer n'importe quel utilisateur et lire ou modifier ses démarches. C'est un raccourci de développement assumé — voir ci-dessous. |
| **Pas de limitation de débit** | `/api/auth/register` et `/api/auth/callback/credentials` acceptent un nombre illimité de tentatives — bruteforce et création de comptes en masse possibles. |
| **Ports internes exposés** | `5432`, `8086` et `8761` sont publiés sur l'hôte dans `docker-compose.yml`. À restreindre au réseau Docker en production. |
| **HTTP en développement** | Les cookies de session ne prennent l'attribut `Secure` que derrière HTTPS. Le déploiement doit être en TLS. |
| **Pas de réinitialisation de mot de passe** | Un utilisateur ayant perdu son mot de passe n'a aucun recours en libre-service. |
| **Contenu des packs côté client** | Voir la limite décrite plus haut. |

---

## 🪪 L'en-tête `X-User-Id`

`demarches-service` a besoin d'un identifiant d'utilisateur pour cloisonner les
données. Il le cherche dans cet ordre :

1. le sujet (`sub`) d'un JWT présent dans le `SecurityContext` ;
2. l'en-tête `X-User-Id`, sinon.

```bash
curl http://localhost:8082/demarches -H "X-User-Id: <uuid>"
```

Le second chemin existe uniquement parce que Keycloak a été retiré et qu'aucun
jeton n'atteint plus ce service. **Il ne constitue pas une authentification.**

Deux façons de refermer la brèche avant une mise en production :

- **Isolement réseau** — retirer le mapping du port `8082` et n'autoriser que
  l'API Gateway sur le réseau Docker interne. La gateway devient alors le seul
  point où l'en-tête peut être posée, à partir d'une identité qu'elle a validée.
- **Vraie validation** — décoder dans le service le JWT Auth.js signé avec
  `AUTH_SECRET` (HS256) et reprendre le chemin n°1. Plus coûteux, mais c'est la
  seule option qui rend l'identité vérifiable de bout en bout.

---

## 📋 Checklist avant mise en production

- [ ] `AUTH_SECRET` et `POSTGRES_PASSWORD` régénérés
- [ ] HTTPS actif, `AUTH_URL` pointant sur le domaine public
- [ ] Clés Stripe live, webhook déclaré sur l'URL publique
- [ ] Ports `5432` / `8086` / `8761` retirés du mapping hôte
- [ ] Limitation de débit sur les endpoints d'authentification
- [ ] Sauvegardes PostgreSQL configurées et restauration testée
- [ ] CGV et mentions légales publiées (obligatoire pour encaisser)
