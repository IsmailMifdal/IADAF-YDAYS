# Sous-traitants — IA-DAF

> Article 28 du RGPD : chaque sous-traitant doit être lié par un contrat
> (DPA, *Data Processing Agreement*). Pour les fournisseurs SaaS, ce DPA est
> généralement accepté en ligne depuis leur console ou intégré à leurs
> conditions : il faut le **trouver, l'accepter, et en archiver une copie**.

| Sous-traitant | Rôle | Données | Localisation | DPA | « Pas d'entraînement sur nos données » | Garantie de transfert |
|---|---|---|---|---|---|---|
| Stripe | Paiement | Identité de l'acheteur, paiement | UE / États-Unis | ☐ à archiver | Sans objet | ☐ à vérifier |
| OpenAI | LLM du chat | Messages des utilisateurs | États-Unis | ☐ à accepter | ☐ à vérifier pour l'API | ☐ DPF ou CCT à documenter |
| Google | Connexion OAuth (optionnelle) | Nom, e-mail, photo | États-Unis | ☐ à vérifier | Sans objet | ☐ à vérifier |
| Hébergeur *[recommandé : Scaleway]* | Hébergement (VPS) | Toutes | UE (exigé) | ☐ | Sans objet | Sans objet si UE |
| Fournisseur SMTP *[idem]* | E-mails de réinitialisation du mot de passe | E-mail, lien de réinitialisation | UE (recommandé) | ☐ | Sans objet | Sans objet si UE |
| Stockage objet *[idem]* | Copie hors serveur des sauvegardes | Toutes, chiffrées (T8) | UE (exigé) | ☐ | Sans objet | Sans objet si UE |
| Fournisseur OCR *[Phase 4]* | Lecture des pièces | Pièces d'identité | UE (exigé) | ☐ | ☐ **exigé** | Sans objet si UE |

## Recommandation

Le plus gros risque de transfert est le chat : les utilisateurs y écrivent
librement leur situation. L'AI Service accepte n'importe quelle API
compatible OpenAI (`OPENAI_BASE_URL`, voir `.env.example`) : basculer vers un
fournisseur hébergé dans l'UE supprime ce transfert sans modifier le code.

Une fois les cases cochées, reporter les garanties dans
`front/src/app/lib/legalInfo.ts` (`llmProvider.transferSafeguard`), qui
alimente la politique de confidentialité.
