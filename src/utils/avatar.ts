/**
 * Cosmic avatar generator — a free, no-key initials avatar from DiceBear, themed
 * to the app's cosmic purple palette with a linear gradient background. Returns
 * a PNG URL (works directly in <Image>; we don't bundle react-native-svg).
 *
 * Deterministic: the same first name always yields the same avatar.
 * Docs: https://www.dicebear.com/styles/initials/
 */

// Cosmic purples/indigos (hex without the leading #), used as gradient stops.
const COSMIC_BG = ["a855f7", "7c3aed", "9333ea", "6366f1", "8b5cf6", "c084fc"];

/** A DiceBear "initials" PNG URL for the given name's first word. */
export function cosmicAvatarUrl(name: string | null | undefined, size = 160): string {
  const first = (name ?? "").trim().split(/\s+/)[0] || "User";
  const params = new URLSearchParams({
    seed: first,
    backgroundType: "gradientLinear",
    backgroundColor: COSMIC_BG.join(","),
    fontWeight: "600",
    chars: "1",
    size: String(size),
  });
  return `https://api.dicebear.com/9.x/initials/png?${params.toString()}`;
}
