/**
 * Safe wrapper around expo-haptics. Lazy-require so a binary without the native
 * module (Expo Go, or a build predating the dependency) degrades to a silent
 * no-op instead of crashing on import.
 */
type Mod = typeof import("expo-haptics");
let mod: Mod | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require("expo-haptics") as Mod;
} catch {
  mod = null;
}

/** A light tactile tap (e.g. a PIN key press). Never throws. */
export function hapticTap(): void {
  try {
    void mod?.impactAsync?.(mod.ImpactFeedbackStyle.Light)?.catch(() => {});
  } catch {
    /* native missing — ignore */
  }
}
