/**
 * Self-check for the notification dedup decision. No framework — run with:
 *   npx tsx src/services/notifDedup.check.ts
 */
import { decideDuplicate } from "./notifDedup";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (!cond) { failures++; console.error(`FAIL ${label}`); }
}

const sig = "com.bank|Rs.500 debited ref 123";

// First sighting is not a duplicate.
const r1 = decideDuplicate({}, sig, 1_000);
ok(!r1.duplicate, "first sighting not duplicate");

// Same signature again within the window IS a duplicate.
const r2 = decideDuplicate(r1.next, sig, 2_000, 5000);
ok(r2.duplicate, "repeat within window is duplicate");

// Same signature after the window expired is NOT a duplicate (old entry pruned).
const r3 = decideDuplicate(r1.next, sig, 1_000 + 6000, 5000);
ok(!r3.duplicate, "repeat after window not duplicate");

// A different signature is never a duplicate of the first.
const r4 = decideDuplicate(r1.next, "com.bank|Rs.999 debited ref 999", 2_000, 5000);
ok(!r4.duplicate, "distinct text not duplicate");

// Size is capped.
let seen = {} as Record<string, number>;
for (let i = 0; i < 250; i++) seen = decideDuplicate(seen, `sig-${i}`, i, 1e9, 100).next;
ok(Object.keys(seen).length <= 100, "size capped at max");

if (failures) throw new Error(`${failures} notifDedup check(s) failed`);
console.log("notifDedup: all checks passed");
