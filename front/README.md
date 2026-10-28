# Front IA-DAF (Next.js)

Application Next.js 16 (App Router) : pages, BFF (`src/app/api`) et
authentification Auth.js. Elle tourne normalement dans la stack Docker
(voir [DOCKER.md](../DOCKER.md)) ; pour travailler sur l'interface seule :

```bash
npm ci
npm run dev        # http://localhost:3000, avec la stack Docker pour la base et les services
npx tsc --noEmit && npx eslint src
```

## Design

- **Couleur de marque** : le bleu d'IA-DAF, celui du drapeau français,
  défini une fois dans `src/app/globals.css` (`--color-brand-50` à `950`).
  Les pages utilisent `brand-*`, jamais `blue-*` directement.
- **Composants partagés** : `src/app/components/ui/primitives.tsx`
  (boutons, cartes, alertes…) et les jetons de `tokens.ts`. Une nouvelle
  page compose avec eux plutôt que de réécrire ses propres styles.
- **Polices** : Inter pour l'alphabet latin, IBM Plex Sans Arabic pour
  l'arabe, auto-hébergées par `next/font` (la CSP n'autorise que
  `font-src 'self'`).

## Langues

L'interface existe en français, anglais, arabe et espagnol. La langue est
lue dans le cookie `iadaf_lang` côté serveur : chaque page arrive
directement dans la bonne langue.

- **Ajouter un texte** : l'écrire dans `src/app/i18n/messages/fr.ts` (la
  référence), puis dans `en.ts`, `ar.ts` et `es.ts`. TypeScript refuse la
  compilation tant qu'une langue n'a pas exactement les mêmes clés.
- **L'utiliser** : `const { m } = useLanguage()` dans un composant client,
  `const m = await getMessages()` (`i18n/server.ts`) dans une page ou une
  route d'API. Les `{nom}` se remplacent avec `fmt()`.
- **Arabe, de droite à gauche** : la page entière passe en `dir="rtl"`.
  Utiliser les classes logiques de Tailwind (`ms-`, `me-`, `ps-`, `pe-`,
  `start-`, `end-`, `text-start`, `rounded-s-`…) au lieu de `ml-`, `left-`,
  `text-left` ; retourner les flèches avec `rtl:-scale-x-100`. Les champs
  e-mail et mot de passe restent en `dir="ltr"`.
- **Noms propres** (Préfecture, CAF, URSSAF…) : en français dans toutes les
  langues, c'est ce que l'utilisateur lit sur ses courriers.
- **Pages légales** : en français seulement (c'est la version qui fait foi),
  avec un bandeau traduit qui le dit.
- **Contenu payant** : les noms des pièces à fournir sont traduits dans
  `i18n/documents.ts`, module serveur, utilisé seulement après vérification
  de l'accès au pack. Ils ne doivent jamais entrer dans les dictionnaires
  `messages/*.ts`, envoyés à chaque page (la CI vérifie le JavaScript public).

Les traductions ont été rédigées sans relecture par des locuteurs natifs :
une relecture reste à faire avant l'ouverture au public.
