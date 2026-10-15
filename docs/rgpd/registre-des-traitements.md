# Registre des activités de traitement — IA-DAF

> Article 30 du RGPD. Document **interne**, à tenir à jour et à présenter à la
> CNIL sur demande. Il décrit ce que le code fait réellement : toute évolution
> du code qui touche aux données doit mettre ce registre à jour dans la même PR.
>
> **Statut : brouillon à valider** par le responsable de traitement et relu
> par un DPO ou un juriste.

| | |
|---|---|
| Responsable de traitement | *[raison sociale — voir `front/src/app/lib/legalInfo.ts`]* |
| Contact RGPD | *[adresse `privacyEmail`]* |
| DPO | *[désigné / non désigné — à décider]* |
| Dernière mise à jour | 14 octobre 2026 |

---

## T1 — Gestion des comptes

| Rubrique | Contenu |
|---|---|
| Finalité | Créer un compte, s'authentifier, gérer son profil |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Personnes concernées | Utilisateurs inscrits |
| Données | Nom, e-mail, mot de passe haché (bcrypt, 12 tours), photo et identifiant Google si connexion Google |
| Stockage | PostgreSQL, table `users.app_users` |
| Destinataires | Équipe IA-DAF ; Google (connexion Google uniquement) |
| Transferts hors UE | Google — selon le mode de connexion choisi |
| Durée | Durée de vie du compte ; effacement à la suppression (`deleteAccount`) |
| Sécurité | Cookie de session httpOnly signé, 7 jours ; limitation de débit sur la connexion et l'inscription |

## T2 — Vente des packs

| Rubrique | Contenu |
|---|---|
| Finalité | Encaisser, ouvrir l'accès aux packs, tenir la comptabilité |
| Base légale | Exécution du contrat ; obligation légale (comptabilité) |
| Données | Pack, montant, identifiant de session Stripe, version des CGV acceptée, date de renonciation au droit de rétractation |
| Stockage | `users.pack_entitlements` (droits, liés au compte) ; `billing.sales` (registre des ventes, sans identité) ; métadonnées Stripe |
| Destinataires | Stripe (sous-traitant pour le paiement) |
| Transferts hors UE | Stripe — *[mécanisme à vérifier dans le DPA Stripe]* |
| Durée | Droits : jusqu'à la suppression du compte. Registre des ventes : 10 ans (art. L123-22 C. com.), purge automatique |
| Sécurité | Paiement hébergé par Stripe (aucune donnée bancaire chez nous) ; droits écrits uniquement par le webhook signé |

## T3 — Assistant IA

| Rubrique | Contenu |
|---|---|
| Finalité | Répondre aux questions sur les démarches administratives |
| Base légale | Exécution du contrat (connectés) ; intérêt légitime (chat d'accueil anonyme) |
| Personnes concernées | Utilisateurs et visiteurs |
| Données | Contenu des messages (peut contenir des données personnelles saisies librement, y compris sensibles : situation administrative, nationalité, santé) ; langue |
| Stockage | PostgreSQL, schéma `ai` (`conversations`, `messages`), liées au compte si connecté |
| Destinataires | Fournisseur LLM (OpenAI par défaut, ou fournisseur UE via `OPENAI_BASE_URL`) |
| Transferts hors UE | **Oui avec OpenAI (États-Unis)** — *[garantie à documenter : DPF ou CCT]* |
| Durée | 30 jours d'inactivité (`CONVERSATION_RETENTION_DAYS`), purge quotidienne ; effacement immédiat à la suppression du compte |
| Sécurité | Proxy limité aux endpoints publics, cookies non transmis ; conversation lisible par son seul propriétaire ; limitation de débit |

## T3 bis — Suivi des dossiers

| Rubrique | Contenu |
|---|---|
| Finalité | Suivre l'avancement de chaque démarche du compte (un dossier par pack, une étape par pièce) |
| Base légale | Exécution du contrat |
| Données | Titre et type de démarche, organisme, statut, échéances, étapes, commentaires |
| Stockage | PostgreSQL, schéma `demarches` (demarches-service) |
| Durée | Durée de vie du compte ; effacement à la suppression (`DELETE /demarches/me`) |

## T4 — Prospection par e-mail

| Rubrique | Contenu |
|---|---|
| Finalité | Envoyer conseils et offres |
| Base légale | Consentement (art. 6.1.a) — case non cochée par défaut, facultatif |
| Données | E-mail, version du texte de consentement, date |
| Stockage | `users.lead_emails` |
| Durée | 3 ans après le dernier consentement, purge automatique |
| Droits | Désinscription par jeton unique (`/desinscription`) |
| ⚠️ Héritage | Table `public.lead_emails` : adresses collectées sans preuve de consentement — **à supprimer** |

## T5 — Sécurité du service

| Rubrique | Contenu |
|---|---|
| Finalité | Prévenir les abus (force brute, création de comptes en masse, coût LLM) |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Données | Empreintes HMAC de l'adresse IP et de l'e-mail de connexion |
| Stockage | `ratelimit.counters` |
| Durée | 48 heures |

## T6 — Analyse de documents *(non encore en production)*

À compléter **avant** la mise en service de l'analyse réelle des pièces
(Phase 4 de la roadmap) : pièces d'identité et titres de séjour, OCR par un
sous-traitant, consentement séparé pour l'entraînement du modèle. Ce traitement
déclenche une **AIPD** — voir [`aipd-preparation.md`](aipd-preparation.md).
