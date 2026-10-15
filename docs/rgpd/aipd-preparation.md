# Préparation de l'AIPD — IA-DAF

> Analyse d'impact relative à la protection des données (art. 35 RGPD).
> Ce document **prépare** l'AIPD : il rassemble les éléments factuels à saisir
> dans l'outil gratuit **PIA de la CNIL**, qui produit l'AIPD formelle. Il ne
> la remplace pas, et l'analyse doit être menée **avant** la mise en
> production de l'analyse de documents.

## Pourquoi une AIPD est requise

Plusieurs critères des lignes directrices européennes sont réunis — deux
suffisent en principe :

- **Personnes vulnérables** : personnes étrangères, souvent en situation
  administrative précaire, parfois non francophones.
- **Usage innovant** : intelligence artificielle (LLM, OCR, modèle affiné).
- **Données à caractère hautement personnel** : pièces d'identité, titres de
  séjour, avis d'imposition, données de santé (Ameli).
- **Données susceptibles de révéler la nationalité ou la situation au regard
  du séjour**, avec un risque d'atteinte grave en cas de fuite.

## Description du traitement (Phase 4)

```
Upload ─► document-service ─► MinIO (chiffré)
               │ événement
               ▼
        worker document-ai ─► OCR (sous-traitant UE)
               │                  │
               │                  ▼
               │        champs extraits (minimisés)
               ▼
        règles de conformité (code) ─► LLM (sans données d'identité)
               │
               ▼
        résultat ─► statistiques anonymisées (analytics-service)
```

## Mesures prévues — à vérifier une par une avant la mise en service

| Risque | Mesure | État |
|---|---|---|
| Fuite des pièces | Chiffrement AES-256-GCM par le service avant écriture en base, clé hors base ; accès réservé au titulaire ; téléchargement en pièce jointe | Fait — journalisation des accès à faire |
| Conservation excessive | Purge 180 jours après le dépôt, effacement au retrait et à la suppression du compte | Fait — à resserrer à 30 jours après la fin de la démarche |
| Collecte excessive | N'extraire que les champs utiles aux règles (pas le numéro de document) | À faire |
| Transfert hors UE | OCR chez un prestataire hébergé en UE ; le LLM ne reçoit aucune identité | À faire |
| Décision automatisée (art. 22) | Résultat présenté comme indicatif ; l'utilisateur peut passer outre et contester | À faire |
| Réutilisation pour l'entraînement | Consentement séparé, décoché par défaut, horodaté, retirable ; retrait ⇒ exclusion du jeu et ré-entraînement périodique | À faire |
| Mémorisation par le modèle | Entraînement uniquement sur des champs pseudonymisés ; tests d'extraction de données mémorisées | À faire |
| Exactitude | Mesure du taux de faux « conforme » sur un jeu de référence avant chaque mise en production du modèle | À faire |
| Droits des personnes | Effacement complet à la suppression du compte (déjà en place pour comptes, conversations et e-mails) | Partiel |

## Parties à consulter

- DPO ou juriste (validation finale)
- Un échantillon d'utilisateurs ou une association d'aide aux étrangers
  (art. 35.9 : avis des personnes concernées, « le cas échéant »)

## Résultat attendu

AIPD formelle exportée depuis l'outil PIA, versionnée dans `docs/rgpd/`, et
consultation préalable de la CNIL si un risque élevé résiduel subsiste
(art. 36).
