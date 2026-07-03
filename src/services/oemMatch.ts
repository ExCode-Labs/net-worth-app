/**
 * Pure brand→OEM-key matching, split out of oemAutostart.ts so it's
 * unit-testable without pulling in react-native/expo-device — which fail to
 * parse under tsx (Flow syntax in their bundled entry points).
 */
export const OEM_KEYS = [
  "xiaomi", "redmi", "poco", "vivo", "iqoo", "oppo", "realme", "oneplus", "huawei", "honor",
] as const;

export function matchOemKey(brand: string): string | undefined {
  const b = brand.toLowerCase();
  return OEM_KEYS.find((k) => b.includes(k));
}
