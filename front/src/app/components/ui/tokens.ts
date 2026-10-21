/**
 * Jetons de design d'IA-DAF.
 *
 * Source unique des rayons, ombres et couleurs d'état. Le dépôt mélangeait
 * six rayons différents et deux palettes de gris ; tout passe désormais par
 * ces constantes pour que l'ajout d'une page ne puisse pas réintroduire la
 * dérive.
 */

/** Rayons : `xl` pour ce qui se clique, `2xl` pour les surfaces. */
export const RADIUS = {
  control: "rounded-xl",
  surface: "rounded-2xl",
  pill: "rounded-full",
} as const;

/** Conteneur standard d'une page, sous le PageHeader. */
export const PAGE_SHELL = "bg-gray-50 min-h-full px-4 md:px-8 py-8";
export const PAGE_INNER = "max-w-6xl mx-auto";

/** Surface de carte au repos, et sa variante interactive. */
export const CARD_BASE = `bg-white border border-gray-200/80 ${RADIUS.surface} shadow-soft`;

/**
 * Carte cliquable : elle se soulève au survol et s'enfonce au clic.
 * Le retour au clic manquait partout — sans lui, rien ne confirme que le geste
 * a été pris en compte avant que la page suivante n'arrive.
 */
export const CARD_INTERACTIVE =
  "transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift " +
  "hover:border-brand-200 active:translate-y-0 active:shadow-soft " +
  "motion-reduce:hover:translate-y-0";

/** Enfoncement au clic, pour les boutons. */
export const PRESS = "active:scale-[0.97] motion-reduce:active:scale-100";

/**
 * Champs de saisie — partagés par tous les formulaires. Le focus garde la
 * bordure et ajoute un halo : le champ actif se repère sans « sauter ».
 */
export const INPUT_BASE =
  `w-full ${RADIUS.control} border border-gray-300 bg-white px-4 py-2.5 text-gray-900 ` +
  "shadow-xs transition placeholder:text-gray-400 focus:outline-none " +
  "focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 " +
  "disabled:bg-gray-50 disabled:text-gray-500";

/**
 * Anneau de focus clavier, appliqué à tout élément interactif.
 *
 * `focus-visible` et non `focus` : l'anneau n'apparaît qu'à la navigation au
 * clavier, sans polluer le clic à la souris.
 */
export const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Transition standard pour tout élément qui réagit au pointeur. */
export const INTERACTIVE = "transition duration-200 ease-out";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Couleurs d'état, déclinées pour les badges et les encarts. */
export const TONE_STYLES: Record<Tone, { soft: string; solid: string; text: string }> = {
  neutral: {
    soft: "bg-gray-100 text-gray-700 border-gray-200",
    solid: "bg-gray-600 hover:bg-gray-700 text-white",
    text: "text-gray-700",
  },
  info: {
    soft: "bg-brand-50 text-brand-700 border-brand-200",
    solid: "bg-brand-600 hover:bg-brand-700 text-white",
    text: "text-brand-700",
  },
  success: {
    soft: "bg-emerald-50 text-emerald-700 border-emerald-200",
    solid: "bg-emerald-600 hover:bg-emerald-700 text-white",
    text: "text-emerald-700",
  },
  warning: {
    soft: "bg-amber-50 text-amber-800 border-amber-200",
    solid: "bg-amber-500 hover:bg-amber-600 text-white",
    text: "text-amber-800",
  },
  danger: {
    soft: "bg-red-50 text-red-700 border-red-200",
    solid: "bg-red-600 hover:bg-red-700 text-white",
    text: "text-red-700",
  },
};

/** Concatène des classes en ignorant les valeurs vides. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
