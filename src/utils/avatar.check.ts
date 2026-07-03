/** Self-check for the cosmic avatar URL builder. Run: npx tsx src/utils/avatar.check.ts */
import { cosmicAvatarUrl } from "./avatar";

let failures = 0;
const eq = (a: unknown, b: unknown, label: string) => {
  if (a !== b) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};
const ok = (cond: boolean, label: string) => {
  if (!cond) { failures++; console.error(`FAIL ${label}`); }
};

// Only the first word of the name is used as the seed.
eq(new URL(cosmicAvatarUrl("Jane Doe")).searchParams.get("seed"), "Jane", "first word only");

// Deterministic: same input → same URL.
eq(cosmicAvatarUrl("Jane Doe"), cosmicAvatarUrl("Jane Doe"), "deterministic for same name");

// Different first names → different seeds (and thus different URLs).
ok(cosmicAvatarUrl("Jane") !== cosmicAvatarUrl("John"), "different names differ");

// null/undefined/blank all fall back to "User".
eq(new URL(cosmicAvatarUrl(null)).searchParams.get("seed"), "User", "null falls back to User");
eq(new URL(cosmicAvatarUrl(undefined)).searchParams.get("seed"), "User", "undefined falls back to User");
eq(new URL(cosmicAvatarUrl("   ")).searchParams.get("seed"), "User", "whitespace-only falls back to User");

// Size param is threaded through and defaults to 160.
eq(new URL(cosmicAvatarUrl("Jane")).searchParams.get("size"), "160", "default size 160");
eq(new URL(cosmicAvatarUrl("Jane", 64)).searchParams.get("size"), "64", "custom size");

// Points at the expected DiceBear initials PNG endpoint.
ok(cosmicAvatarUrl("Jane").startsWith("https://api.dicebear.com/9.x/initials/png?"), "correct endpoint");

if (failures) throw new Error(`${failures} avatar check(s) failed`);
console.log("avatar: all checks passed");
