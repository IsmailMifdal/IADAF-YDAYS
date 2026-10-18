/**
 * App icons, drawn at build time — no image files to keep in sync with the
 * brand. Served at /icon/<id>; listed in the web app manifest and as the
 * page favicon.
 */

import { appIcon } from "./components/brand/appIcon";

const VARIANTS = {
  "192": { size: 192, mark: 0.5 },
  "512": { size: 512, mark: 0.5 },
  // Maskable: the phone crops the icon to its own shape (circle, squircle)
  // and keeps only the central 80 % — the mark is drawn smaller.
  maskable: { size: 512, mark: 0.38 },
} as const;

type VariantId = keyof typeof VARIANTS;

export function generateImageMetadata() {
  return Object.entries(VARIANTS).map(([id, { size }]) => ({
    id,
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const { size, mark } = VARIANTS[(await id) as VariantId];
  return appIcon(size, mark);
}
