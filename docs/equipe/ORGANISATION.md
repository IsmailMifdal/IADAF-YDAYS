# Organisation de l'équipe IADAF

Ce document dit qui fait quoi, sur quelle partie du code, et comment nous
travaillons ensemble. À lire en entier avant la première semaine ; il évolue avec
le projet (toute modification passe par une PR, comme le code).

## Le but de l'année

Mettre IADAF en ligne et le faire adopter par ses premiers vrais utilisateurs :
un service fiable, accessible et conforme au RGPD, qui accompagne une personne non
francophone de sa première question jusqu'à un dossier complet, sur le site et sur
une application mobile.

Les objectifs chiffrés (99 % de disponibilité, 100 comptes, 30 dossiers menés à
terme, 8 démarches guidées, 90 % de réponses exactes, 0 faille critique…) sont ceux
du dossier YDAYS ; chaque équipe sait lesquels elle porte (voir plus bas).

## Les rôles

| Rôle | Qui | Ce qu'il décide |
|---|---|---|
| Porteur du projet, product owner et tech lead | Ismail | Les priorités, les arbitrages entre équipes, l'architecture, la fusion dans `main` |
| Référent technique d'équipe | Le développeur le plus expérimenté de chaque équipe | La relecture des PR de son équipe, le découpage des tâches, le lien avec le porteur |
| Développeurs | Équipe Web (deux pôles) et équipe Mobile | La façon de réaliser leurs fonctionnalités, dans le périmètre de leur équipe |
| Rôles transverses | DevOps, cybersécurité, UX/UI, data/IA, marketing | Leur domaine, pour toutes les équipes |

## Deux équipes

- **L'équipe Web finalise le site et ses services** : tout ce qui reste à construire
  pour la mise en ligne. Elle a beaucoup à faire, donc elle travaille en **deux pôles**,
  chacun avec son périmètre de code, sous un seul référent.
- **L'équipe Mobile construit l'application**, en s'appuyant sur les services de
  l'équipe Web.

Chaque équipe, et chaque pôle, livre ses fonctionnalités **de bout en bout**
(interface, API, base, tests) dans **son périmètre de code** : c'est ce qui permet à
plusieurs développeurs d'avancer en même temps sans se bloquer. Toucher le périmètre
d'un autre pôle ou d'une autre équipe est permis, mais sa relecture est alors
obligatoire (voir [CODEOWNERS](../../.github/CODEOWNERS)).

### Équipe Web — pôle Usager et IA

**Membres** : 2 à 3 développeurs, dont au moins un à l'aise en Python, avec le profil
data/IA et le designer UX/UI.
**Périmètre de code** : les pages usager du front (`front/src/app/(app)`), les packs
(`front/src/app/(app)/packs`), les traductions (`front/src/app/i18n`),
`demarches-service`, `ai-service`, `document-service`.
**Indicateurs portés** : 8 démarches guidées, 90 % de réponses exactes sur 100
questions de référence, moins de 10 % de vérifications contestées, accessibilité
WCAG AA (Lighthouse ≥ 90).

Backlog, par priorité :
1. **Rappels et notifications** : une pièce qui expire bientôt, l'échéance d'un
   dossier. Les packs le promettent déjà (« Alertes », « Notifications ») mais rien
   n'est codé. Par e-mail d'abord ; le moteur de rappels est conçu pour envoyer aussi
   des notifications push à l'application mobile.
2. **Lecture des pièces par OCR** (scans, photos) et **écran de correction** où
   l'utilisateur valide ce que l'IA a lu. Prérequis : l'analyse d'impact RGPD (AIPD),
   à lancer dès le premier mois avec le profil cybersécurité. Le mobile s'en sert pour
   les pièces prises en photo.
3. **De 4 à 8 démarches guidées** : nouveaux packs, listes de pièces, textes dans les
   4 langues, fiches relues avec le profil data/IA, base de connaissances étendue.
4. **Banc d'évaluation de l'assistant** : 100 questions de référence avec la réponse
   attendue, un score calculé à chaque PR dans la CI.
5. **Suivi de dossier enrichi** (étapes, échéances, historique) et **accessibilité**
   des parcours clés.

### Équipe Web — pôle Plateforme

**Membres** : 2 à 3 développeurs full-stack Java / TypeScript.
**Périmètre de code** : le nouvel espace `/admin` du front, `analytics-service`,
`user-service`, `api-gateway`, le paiement (`front/src/app/api/checkout`,
`front/src/app/api/stripe`), l'API de l'application mobile.
**Indicateurs portés** : 100 comptes et 30 dossiers menés à terme (mesurés dans le
back-office), premières ventes réelles.

Backlog, par priorité :
1. **API pour l'application mobile**, en premier car elle débloque l'équipe Mobile.
   Le site s'authentifie par cookie, ce qu'une application ne sait pas bien faire : il
   faut une connexion par jeton (jeton court et jeton de renouvellement) et des routes
   documentées (OpenAPI), en réutilisant la logique des routes existantes. À livrer
   d'ici janvier.
2. **Back-office d'administration** : tableau de bord branché sur les statistiques
   qu'`analytics-service` expose déjà sans qu'aucune page ne les affiche, qualité de
   l'IA (taux de vérifications contestées), gestion des contenus.
3. **Paiement en production** : Stripe en mode réel, factures, historique des achats.
4. **Espace accompagnant** : une association suit plusieurs bénéficiaires. C'est la
   condition pour atteindre « une association utilise IADAF ».
5. **Tableau de bord des indicateurs du projet** : ceux du dossier YDAYS, à jour en
   continu.

### Équipe Mobile

**Membres** : 2 à 3 développeurs, avec le designer UX/UI (partagé avec le pôle Usager
et IA).
**Périmètre de code** : un dossier `mobile/` dans ce dépôt, à créer en novembre.
**Technologie** : React Native avec Expo. C'est le même langage que le site (TypeScript,
React) : les développeurs passent d'un projet à l'autre, les dictionnaires des 4 langues
se partagent, l'arabe de droite à gauche est pris en charge, et Expo publie sur
l'App Store et Google Play.
**Indicateurs portés** : application publiée sur les deux stores, part des dossiers
complétés depuis le mobile.

L'application n'est pas une copie du site : elle apporte ce qu'un téléphone fait mieux.
Backlog, par priorité :
1. **Socle** (novembre, sans attendre l'API) : projet Expo, navigation, les 4 langues
   avec l'arabe de droite à gauche, écrans maquettés, données simulées.
2. **Connexion et assistant** : se connecter et discuter avec l'assistant dans sa
   langue, dès que l'API mobile est prête.
3. **Dossiers et pièces par photo** : suivre ses dossiers et photographier une pièce
   directement avec l'appareil, recadrée automatiquement, puis vérifiée par l'IA.
4. **Notifications push** : les rappels du pôle Usager et IA.
5. **Publication** : comptes développeur Apple (environ 99 € par an) et Google Play
   (environ 25 € une fois), fiches des stores dans les 4 langues, politique de
   confidentialité, tests avec TestFlight et le test interne de Google Play.

### Répartition selon le nombre de développeurs

| Développeurs | Web — Usager et IA | Web — Plateforme | Mobile |
|---|---|---|---|
| 6 | 2 | 2 | 2 |
| 7 | 3 | 2 | 2 |
| 8 | 3 | 2 | 3 |
| 9 | 3 | 3 | 3 |

- Jamais plus de 3 développeurs par pôle ou par équipe : au-delà, la coordination
  coûte plus qu'elle ne rapporte.
- Au-delà de 9 : un pôle « Partenaires » reprend l'espace accompagnant (pôle
  Plateforme, point 4) : comptes associations, invitations, statistiques par structure.
- Au moins un développeur de l'équipe Web connaît bien React : il aide l'équipe Mobile
  à partager le code et les traductions avec le site.

## Les rôles transverses

- **DevOps** : mise en production, supervision et alertes, sauvegardes et reprise
  ([DEPLOYMENT.md](../../DEPLOYMENT.md)), environnement de recette où chaque
  fonctionnalité est testée avant `main`, chaîne de build de l'application mobile.
  Indicateurs : 99 % de disponibilité, restauration en moins d'une heure.
- **Cybersécurité** : relecture des PR sensibles (authentification, API mobile,
  paiement, documents), AIPD avec le pôle Usager et IA, audit et tests d'intrusion
  avant le lancement ([SECURITY.md](../../SECURITY.md)). Indicateur : 0 faille critique
  ou élevée.
- **UX/UI** : maquettes Figma avant le code de chaque fonctionnalité visible, sur le
  site et sur le mobile, design system commun, audit d'accessibilité.
- **Data/IA** : rattaché au pôle Usager et IA ; relit aussi les fiches des nouvelles
  démarches.
- **Marketing (stratégie et partenariats)** : trouver les associations partenaires,
  organiser la bêta et les 20 tests utilisateurs, définir l'offre et le prix des packs.
- **Marketing (digital et acquisition)** : réseaux sociaux, contenus, vidéo,
  référencement, fiches des stores, suivi des indicateurs d'acquisition.

Les deux profils marketing remontent chaque retour d'utilisateur en issue, dans
l'équipe concernée.

## Comment nous travaillons

### Le rythme

| Rendez-vous | Quand | Qui | Durée |
|---|---|---|---|
| Planification de sprint | Début de sprint (toutes les 2 semaines) | Tout le monde | 1 h |
| Point quotidien écrit | Chaque jour, sur Discord : hier, aujourd'hui, blocages | Tout le monde | 2 min |
| Point des référents | Chaque semaine | Référents et porteur | 30 min |
| Démo et rétrospective | Fin de sprint | Tout le monde | 1 h |

### Le suivi

- Un tableau **GitHub Projects** pour tout le projet : À faire, En cours, En relecture,
  Terminé.
- Une étiquette par équipe ou pôle : `equipe:web-usager`, `equipe:web-plateforme`,
  `equipe:mobile` (et `transverse` pour le reste).
- Une issue par fonctionnalité ou par bug, créée avec les modèles du dépôt
  ([.github/ISSUE_TEMPLATE](../../.github/ISSUE_TEMPLATE)).

### Les règles de code

- **Une fonctionnalité = une issue = une branche = une PR.** Branche nommée
  `equipe/court-descriptif` (par exemple `web-usager/rappels-email`,
  `mobile/connexion`).
- **Des PR petites** : une PR relisible en 20 minutes. Une grosse fonctionnalité se
  découpe en plusieurs PR.
- **Avant de fusionner** : la CI est verte et le référent de l'équipe (ou le
  propriétaire du code touché) a approuvé. `main` est protégée : personne n'y pousse
  directement.
- **Le modèle de PR** ([.github/pull_request_template.md](../../.github/pull_request_template.md))
  contient la définition de « terminé » ci-dessous, à cocher.

### La définition de « terminé »

Une fonctionnalité est terminée quand :
- elle est testée (tests de bout en bout dans `tests/e2e` pour une API, tests unitaires
  pour la logique) et la CI est verte ;
- ses textes existent dans les 4 langues (`front/src/app/i18n/messages/*.ts` :
  TypeScript refuse une clé manquante) et l'écran a été vérifié en arabe, de droite à
  gauche ([front/README.md](../../front/README.md)) ;
- sur le site, la vérification CSP passe (`tests/browser/csp-check.mjs`) ;
- la documentation concernée est à jour ;
- elle a été montrée à la démo de fin de sprint.

## La première semaine

Chaque nouveau membre :
1. lit ce document, le [README](../../README.md) et [DOCKER.md](../../DOCKER.md) ;
2. installe la stack sur son poste (l'équipe Mobile aussi : l'application parle à ces
   services) :
   ```bash
   cp .env.example .env
   docker compose up -d --build
   ```
   puis ouvre http://localhost:3000 ;
3. lance les tests de bout en bout, qui doivent être tous verts :
   ```bash
   bash tests/e2e/run-all.sh
   ```
4. prend une première petite issue réelle (étiquette `premiere-issue`), la livre en
   PR et passe par la relecture : c'est le meilleur moyen de découvrir le circuit
   complet.

## Le calendrier

Hypothèse : de novembre à juin. Chaque ligne est un objectif, pas une date ferme ;
les sprints l'ajustent.

| Période | Web — Usager et IA | Web — Plateforme | Mobile | Transverse |
|---|---|---|---|---|
| Novembre | Prise en main, maquettes, lancement de l'AIPD | Prise en main, début de l'API mobile | Socle Expo, maquettes, 4 langues | Mise en production en bêta privée |
| Décembre – janvier | Rappels et notifications | API mobile livrée, back-office v1 | Connexion et assistant | Supervision, environnement de recette |
| Février | Prototype OCR et écran de correction | Stripe en mode réel, factures | Dossiers, pièces par photo | Bêta avec une première association |
| Mars | 2 nouvelles démarches, banc d'évaluation | Espace accompagnant | Notifications push | 20 tests utilisateurs |
| Avril | 8 démarches, OCR en production, accessibilité | Tableau de bord des indicateurs | Bêta TestFlight et Google Play | Audits de sécurité et d'accessibilité |
| Mai – juin | Corrections, lancement | Corrections | Publication sur les stores | Lancement public, démo YDAYS |

## Pour aller plus loin

- Architecture et lancement local : [README.md](../../README.md), [DOCKER.md](../../DOCKER.md)
- Mise en production : [DEPLOYMENT.md](../../DEPLOYMENT.md)
- Sécurité : [SECURITY.md](../../SECURITY.md)
- Interface, design et traductions : [front/README.md](../../front/README.md)
- RGPD : [docs/rgpd](../rgpd)
