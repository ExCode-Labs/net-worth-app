/** Self-check for tier selection. Run: npx tsx src/constants/networthTiers.check.ts */
import { tierForNetWorth } from "./networthTiers";

let failures = 0;
const eq = (a: unknown, b: unknown, label: string) => {
  if (a !== b) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};

eq(tierForNetWorth(-5000).tier.key, "explorer", "negative → explorer");
eq(tierForNetWorth(0).tier.key, "explorer", "zero → explorer");
eq(tierForNetWorth(99_999).tier.key, "explorer", "below 1L → explorer");
eq(tierForNetWorth(100_000).tier.key, "lakhpati", "1L → lakhpati");
eq(tierForNetWorth(1_000_000).tier.key, "millionaire", "10L → millionaire");
eq(tierForNetWorth(9_999_999).tier.key, "millionaire", "just below 1Cr → millionaire");
eq(tierForNetWorth(10_000_000).tier.key, "crorepati", "1Cr → crorepati");
eq(tierForNetWorth(5_000_000_000).tier.key, "arabpati", "5 Arab → arabpati");

// Progress: halfway from lakhpati (1e5) to millionaire (1e6) floor.
const mid = tierForNetWorth(550_000);
eq(mid.tier.key, "lakhpati", "mid tier");
eq(Math.round(mid.progress * 100), 50, "mid progress ~50%");

// Top tier has no next and progress 1.
eq(tierForNetWorth(2_000_000_000).next, null, "arabpati has no next");
eq(tierForNetWorth(2_000_000_000).progress, 1, "arabpati progress 1");

if (failures) throw new Error(`${failures} networthTiers check(s) failed`);
console.log("networthTiers: all checks passed");
