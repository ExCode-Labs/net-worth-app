/**
 * Safe wrapper around expo-screen-capture. Importing the package throws at module
 * eval when its native module isn't in the running binary (Expo Go, or a build
 * made before the dependency was added) — and that crash also blocks the host
 * screen's default export. Lazy-require it and degrade to a no-op instead;
 * capture protection lights up automatically once a build including the module
 * is installed. Same graceful-degradation pattern as the notification listener.
 */
import { useEffect } from "react";

type Mod = typeof import("expo-screen-capture");
let mod: Mod | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require("expo-screen-capture") as Mod;
} catch {
  mod = null;
}

export const screenCaptureAvailable = !!mod?.preventScreenCaptureAsync;

/** Block screenshots / recording / screen-share while mounted (Android
 *  FLAG_SECURE). No-ops when the native module is absent. */
export function usePreventScreenCapture(key = "default"): void {
  useEffect(() => {
    if (!mod?.preventScreenCaptureAsync) return;
    try {
      void mod.preventScreenCaptureAsync(key);
    } catch {
      /* native missing — ignore */
    }
    return () => {
      try {
        void mod?.allowScreenCaptureAsync?.(key);
      } catch {
        /* ignore */
      }
    };
  }, [key]);
}
