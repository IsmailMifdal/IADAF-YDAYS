# IA-DAF — Vision produit & commerciale

> Plateforme d’aide automatisée aux démarches administratives en France.  
> Deux produits, un moteur commun : **IA-DAF** (public) et **IA-DAF Pro**.

---

## 1. Problème

Les démarches administratives françaises sont complexes, fragmentées et stressantes :

- jargon et portails peu guidés (ANEF, Ameli, CAF, impôts, permis, etc.) ;
- dossiers incomplets → retards, refus, allers-retours ;
- barrière linguistique pour les non-francophones ;
- pour les structures (associations, TPE, RH) : volume de dossiers suivi à la main.

**IA-DAF** accompagne l’usager (ou l’accompagnant) de la première question jusqu’à un dossier complet et vérifié.

---

## 2. Solution en une phrase

Plusieurs **chemins** de démarches + une **aide automatisée** (chat, checklists, dépôt et pré-vérification de pièces, suivi, rappels), en français et en plusieurs langues — pour les particuliers (**Public**) et pour les organisations (**Pro**).

---

## 3. Architecture : 2 produits, 1 moteur

```
                 ┌──────────────────────────────┐
                 │  Moteur commun               │
                 │  RAG · documents · règles ·  │
                 │  parcours · paiements        │
                 └──────────────┬───────────────┘
                     ┌──────────┴──────────┐
                     ▼                     ▼
            ┌────────────────┐    ┌────────────────┐
            │  IA-DAF        │    │  IA-DAF Pro    │
            │  (Public / B2C)│    │  (B2B / orga)  │
            └────────────────┘    └────────────────┘
```

| Commun (une fois) | Séparé (par produit) |
|-------------------|----------------------|
| Base de connaissances / RAG / modèles | Landing, pricing, auth organisation |
| Analyse et règles sur les pièces | Comptes multi-utilisateurs, invitations |
| Moteur de parcours (« chemins ») | Facturation abonnement / sièges |
| Traductions et UI de base | SLA, back-office, exports, API |

---

## 4. Produit Public (particuliers)

### Promesse

> Je choisis ma démarche, on me guide jusqu’au dossier prêt.

### Cible

- Personnes non francophones (cœur historique : FR / EN / AR / ES).
- **Tous les particuliers** ayant besoin d’aide admin : aides, permis, impôts, santé, logement, etc.

### Chemins (parcours guidés)

Exemples de chemins, étendus progressivement :

| Chemin | Organisme / domaine | Maturité actuelle |
|--------|---------------------|-------------------|
| Titre de séjour | Préfecture / ANEF | Pack existant |
| Assurance maladie | CPAM / Ameli | Pack existant |
| Aide au logement | CAF | Pack existant |
| Déclaration d’impôts | DGFiP | Pack existant |
| Permis / carte grise | ANTS | À ouvrir |
| Autres (retraite, mutuelle…) | Selon priorisation | Roadmap |

Un **chemin** = étapes + liste de pièces + textes multilingues + règles de validation + suivi.

### Offres d’aide automatisée (Public)

| Offre | Contenu | Prix indicatif |
|-------|---------|----------------|
| Découverte | Chat + checklist | Gratuit |
| Pack parcours | Étapes, pièces, dépôt, pré-vérif IA | 10–40 € |
| Pack complet | Plusieurs parcours | ~50 € |
| Abonnement « vie admin » (option) | Rappels, coffre docs, multi-dossiers | 5–10 € / mois |

Tarifs packs actuels (référence produit) : séjour 30 € · Ameli 10 € · CAF 15 € · impôts 10 € · complet 50 €.

### Automatisation côté usager

1. Question → réponse RAG (sources officielles).
2. Choix d’un chemin → état du dossier.
3. Pièces à réunir → dépôt chiffré.
4. Lecture / pré-vérification IA + règles métier.
5. Rappels d’échéances (roadmap).

---

## 5. Produit Pro (entreprises & organisations)

### Promesse

> On suit et on traite les dossiers de nos bénéficiaires ou clients, sans tout refaire à la main.

### Cibles

| Segment | Besoin typique |
|---------|----------------|
| Associations / accompagnants | N dossiers usagers, suivi partagé |
| TPE / freelances | URSSAF, TVA, aides, création |
| RH / cabinets | Onboarding, titres de séjour, pièces récurrentes |
| Partenaires (assurance, banque, collectivité) | Intégration, white-label, volume |

### Offres (Pro)

| Offre | Contenu | Prix indicatif |
|-------|---------|----------------|
| Pro Starter | X sièges, Y dossiers / mois, parcours standards | ~79–149 € / mois |
| Pro Orga | Multi-bénéficiaires, rôles, statistiques | ~200–500 € / mois |
| Pro API / white-label | Intégration partenaire | Sur devis |

### Automatisation côté organisation

- Attribution de dossiers, checklist partagée, alertes équipe.
- Tableau de bord (taux de pièces OK, litiges IA, dossiers aboutis).
- (Plus tard) API et espace accompagnant multi-structures.

---

## 6. Comment ça fonctionne techniquement (vue d’ensemble)

Stack actuelle (microservices) :

- **Frontend** Next.js (Auth.js, Stripe, PWA, 4 langues).
- **API Gateway** + Discovery (Eureka).
- **AI Service** (FastAPI) : chat, traduction, analyse docs, RAG (ChromaDB).
- **Services Java** : users, démarches, documents (chiffrement AES-256-GCM), analytics.
- **PostgreSQL** : un schéma par domaine.
- **ML (v3)** : spécialisation locale multi-chemins Public + préparation Pro (chat + vision documents), règles métier en filet de sécurité — voir [`ml/README.md`](../ml/README.md).

Parcours type bout-en-bout :

```
Question → Chat RAG → Déblocage chemin/pack → Pièces
        → Dépôt → IA (lecture) + règles (validation)
        → Suivi → Dossier complet
```

---

## 7. Intérêt commercial & plus-value

### Pourquoi c’est vendable

- Le coût d’un dossier raté (temps, refus, stress, parfois avocat) est élevé.
- On monétise la **réduction d’échec administratif**, pas seulement de l’information.
- Différenciation : parcours guidés + pré-vérif de pièces + multilingue + conformité RGPD — pas un ChatGPT générique.

### Leviers de valeur

| Leviers | Effet |
|---------|--------|
| Packs B2C à l’acte | Revenus transactionnels, panier 10–50 € |
| Abonnement « vie admin » | LTV particulière plus élevée |
| Pro (abo sièges / orga) | Ticket et récurrence bien plus forts |
| API / white-label | Scale via partenaires |
| Modèles spécialisés locaux | Coûts API maîtrisés, argument souveraineté / privacy |

### Ordres de grandeur indicatifs (hypothèses)

- ~1 000 packs complets / an ≈ 50 k€ CA brut B2C.
- ~20 organisations à 200–500 € / mois ≈ 50–120 k€ ARR B2B.

Le levier de valorisation principal à moyen terme : **Pro + mobile** (photo de pièce, notifications), pas uniquement le chat.

### Risques à intégrer au pitch

- Responsabilité : information / accompagnement, pas conseil juridique.
- Concurrence des assistants génériques et des sites officiels.
- Coût d’acquisition B2C large et coût de maintenance réglementaire des chemins.
- Cycle de vente B2B plus long (support, SLA, multi-comptes).

---

## 8. Positionnement recommandé

1. **Public** : démarches à fort stress / fort enjeu (séjour, santé, logement, impôts, permis…) pour tous les particuliers, avec le multilingue comme avantage — pas comme seule identité.
2. **Pro** : même moteur, marque ou tunnel distinct, pour les structures qui gèrent des dossiers à l’échelle.
3. Éviter le « on fait tout l’administratif français » d’un coup : **5–8 chemins solides**, puis extension.

---

## 9. Feuille de route produit (priorités)

1. **Public** — consolider 4–8 chemins + packs (socle déjà en place).
2. **Moteur de chemin générique** — un parcours = étapes + pièces + règles + textes, réutilisable Public / Pro.
3. **Pro v1** — espace accompagnant (associations) : le B2B le plus proche du DNA actuel.
4. **Pro v2** — TPE / RH / API selon premiers partenaires payants.
5. **Mobile** — photo de pièces, notifications push (complément des deux produits).

---

## 10. Messages pitch (une ligne)

| Produit | Message |
|---------|---------|
| **IA-DAF** | Plusieurs chemins de vie administrative, aide automatisée du premier clic au dossier complet. |
| **IA-DAF Pro** | Le même moteur, pour les structures qui gèrent des dossiers à l’échelle. |

---

## Références dans le dépôt

- Architecture & démarrage : [`README.md`](../README.md)
- Organisation équipe / objectifs YDAYS : [`docs/equipe/ORGANISATION.md`](equipe/ORGANISATION.md)
- Pipeline ML : [`ml/README.md`](../ml/README.md)
- RGPD : [`docs/rgpd/`](rgpd/)
- Déploiement : [`DEPLOYMENT.md`](../DEPLOYMENT.md)
