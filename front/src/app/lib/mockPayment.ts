const UNLOCKED_PACKS_KEY = "unlocked_packs";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function readUnlockedPacks(): string[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(UNLOCKED_PACKS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function saveUnlockedPacks(slugs: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(UNLOCKED_PACKS_KEY, JSON.stringify(slugs));
}

export function isPackUnlocked(slug: string) {
  return readUnlockedPacks().includes(slug);
}

export function unlockPack(slug: string) {
  const current = readUnlockedPacks();
  if (current.includes(slug)) return;

  saveUnlockedPacks([...current, slug]);
}
