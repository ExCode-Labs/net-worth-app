/**
 * Thin wrapper around expo-local-authentication that degrades gracefully when
 * the native module isn't present (Expo Go / a build made before the module was
 * added). Importing the package statically throws "Cannot find native module
 * 'ExpoLocalAuthentication'" in those cases, so we lazy-require it and fall back
 * to "no biometrics available".
 */
type LocalAuth = typeof import("expo-local-authentication");

let mod: LocalAuth | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require("expo-local-authentication") as LocalAuth;
} catch {
  mod = null;
}

/** True only when the native module is linked into this build. */
export const biometricsAvailable = !!mod;

/** Whether the device has biometric hardware AND the user has enrolled. */
export async function canUseBiometrics(): Promise<boolean> {
  if (!mod) return false;
  try {
    const [hasHardware, enrolled] = await Promise.all([
      mod.hasHardwareAsync(),
      mod.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export interface BiometricCheck {
  hasHardware: boolean;
  enrolled: boolean;
}

export async function inspectBiometrics(): Promise<BiometricCheck> {
  if (!mod) return { hasHardware: false, enrolled: false };
  try {
    const [hasHardware, enrolled] = await Promise.all([
      mod.hasHardwareAsync(),
      mod.isEnrolledAsync(),
    ]);
    return { hasHardware, enrolled };
  } catch {
    return { hasHardware: false, enrolled: false };
  }
}

/** Prompt the device biometric/credential. Returns true on success. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  if (!mod) return false;
  try {
    const res = await mod.authenticateAsync({ promptMessage, fallbackLabel: "Use PIN" });
    return res.success;
  } catch {
    return false;
  }
}
