# 🎨 Design system — IA-DAF

Référence des règles visuelles et d'interaction. **Toute nouvelle page compose
avec les primitives existantes** plutôt que de réécrire ses propres cartes et
boutons : c'est ce qui empêche la dérive.

---

## Où vivent les choses

| Fichier | Rôle |
|---------|------|
| [`components/ui/tokens.ts`](front/src/app/components/ui/tokens.ts) | Rayons, ombres, couleurs d'état, classes d'interaction |
| [`components/ui/primitives.tsx`](front/src/app/components/ui/primitives.tsx) | `Card`, `Button`, `Badge`, `Alert`, `StatCard`, `EmptyState`, `Field`, `Skeleton`… |
| [`components/ui/Toast.tsx`](front/src/app/components/ui/Toast.tsx) | Notifications éphémères (`useToast`) |
| [`components/ui/PageHeader.tsx`](front/src/app/components/ui/PageHeader.tsx) | Bandeau de tête commun |
| [`app/globals.css`](front/src/app/globals.css) | Animations, défilement, accessibilité |

---

## Règles visuelles

**Rayons** — deux valeurs, pas plus :

| Usage | Classe |
|-------|--------|
| Ce qui se clique (boutons, champs, pastilles) | `rounded-xl` |
| Les surfaces (cartes, panneaux) | `rounded-2xl` |
| Avatars, badges | `rounded-full` |

`rounded-md` et `rounded-3xl` sont proscrits — ils avaient produit six rayons
concurrents dans le dépôt.

**Couleurs** — palette `gray` uniquement pour les neutres (jamais `zinc` ni
`neutral`). Le bleu porte la marque et les actions principales. Les autres
teintes sont réservées aux états :

| Ton | Couleur | Sens |
|-----|---------|------|
| `info` | bleu | Information, état par défaut |
| `success` | emerald | Réussite, élément acquis |
| `warning` | amber | Attention, action requise |
| `danger` | red | Erreur, action destructrice |

Le rouge ne sert **jamais** de couleur d'action principale — uniquement les
erreurs et les suppressions.

**Ombres** — `shadow-sm` au repos, `shadow-md` au survol d'un élément cliquable.
`shadow-lg` est réservé aux couches flottantes (toasts, menus).

---

## Règles d'interaction

Tout élément cliquable doit donner **trois retours** :

```tsx
import { FOCUS_RING, PRESS, INTERACTIVE } from "@/components/ui/tokens";
```

| Retour | Classe | Pourquoi |
|--------|--------|----------|
| Survol | `hover:` + `INTERACTIVE` | Signale que c'est cliquable |
| Focus clavier | `FOCUS_RING` | `focus-visible`, donc invisible à la souris |
| Clic | `PRESS` | Confirme le geste avant que la page ne change |

Les primitives `Button`, `ButtonLink` et `Card interactive` les appliquent déjà.

### Animations

| Classe | Usage |
|--------|-------|
| `animate-fade-up` | Entrée d'un bloc de contenu |
| `animate-fade-in` | Apparition d'un menu, d'une couche |
| `animate-slide-in-right` | Toasts |
| `stagger` | Sur un conteneur : décale l'entrée de ses enfants (plafonné à 6) |
| `skeleton-shimmer` | Balayage lumineux d'un squelette de chargement |

### Accessibilité — non négociable

`globals.css` neutralise **toutes** les animations sous
`prefers-reduced-motion: reduce`. Ne jamais contourner ce garde-fou : animer
malgré ce réglage déclenche vertiges et migraines chez les personnes concernées.

Les classes `motion-reduce:` accompagnent chaque transformation
(`motion-reduce:hover:translate-y-0`, `motion-reduce:active:scale-100`).

---

## Retours à l'utilisateur

**Toast** pour confirmer une action réussie — visible où que soit l'œil :

```tsx
const { toast } = useToast();
toast("Profil mis à jour.");          // success par défaut
toast("Champ obligatoire.", "danger");
```

**Alert** pour une erreur liée à un formulaire précis, affichée dans ce
formulaire.

**Skeleton** plutôt qu'un écran vide ou un spinner isolé : reproduire la forme
du contenu à venir évite que la page saute à l'arrivée des données.

**EmptyState** systématique — un écran sans données explique pourquoi et
propose une suite.

---

## Contrôles morts : la règle

Un bouton qui ne fait rien est pire que pas de bouton — il promet une action et
trahit la confiance. Avant de livrer un écran, vérifier que chaque `<button>`
porte un `onClick` ou un `type="submit"` :

```bash
grep -rn "<button" front/src/app --include="*.tsx" -A3 | grep -B3 -L "onClick"
```

Si l'action n'existe pas encore, deux issues acceptables : retirer le bouton, ou
le remplacer par un lien vers ce qui fonctionne réellement. Jamais le laisser
inerte.

---

## Ajouter une page

```tsx
export default function MaPage() {
  return (
    <div>
      <PageHeader title="Titre" subtitle="Une phrase de contexte." />
      <PageContainer>
        <SectionTitle title="Section" description="…" />
        <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} interactive className="p-6">…</Card>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
```

Si un état vide est possible, prévoir `<EmptyState>`. Si la page charge des
données côté client, prévoir `<Skeleton>`.
