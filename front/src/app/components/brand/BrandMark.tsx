/**
 * Logo d'IA-DAF dans l'interface : la même feuille lignée que l'icône de
 * l'application (appIcon.tsx), pour qu'on reconnaisse le site installé sur
 * l'écran d'accueil.
 */

const SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", sheet: 14 },
  md: { box: "h-9 w-9 rounded-xl", sheet: 16 },
  lg: { box: "h-12 w-12 rounded-2xl", sheet: 22 },
} as const;

export function BrandMark({ size = "md" }: { size?: keyof typeof SIZES }) {
  const { box, sheet } = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow ring-1 ring-inset ring-white/20 ${box}`}
    >
      <svg width={sheet} height={sheet * 1.2} viewBox="0 0 20 24" fill="none">
        <rect width="20" height="24" rx="3.5" fill="white" />
        <rect x="4" y="7" width="12" height="2" rx="1" fill="#4f46e5" />
        <rect x="4" y="11" width="12" height="2" rx="1" fill="#4f46e5" />
        <rect x="4" y="15" width="7.5" height="2" rx="1" fill="#4f46e5" />
      </svg>
    </span>
  );
}

/** Logo et nom, avec ou sans la ligne de description. */
export function BrandLogo({
  size = "md",
  tagline = true,
}: {
  size?: keyof typeof SIZES;
  tagline?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark size={size} />
      <span className="min-w-0">
        <span className="block truncate font-bold leading-tight tracking-tight text-gray-900">
          IA-DAF
        </span>
        {tagline && (
          <span className="block truncate text-xs text-gray-500">
            Assistant administratif
          </span>
        )}
      </span>
    </span>
  );
}
