/** Self-check for FD/RD maturity math. Run: npx tsx src/utils/maturity.check.ts */
import { fdMaturity, rdMaturity } from "./maturity";

let failures = 0;
const close = (a: number, b: number, label: string, tol = 0.01) => {
  if (Math.abs(a - b) > tol) { failures++; console.error(`FAIL ${label}: got ${a}, want ~${b}`); }
};
const eq = (a: unknown, b: unknown, label: string) => {
  if (a !== b) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};

// FD: A = P(1 + r/4)^(4t). 1L @ 8% for 12 months → 1.02^4 quarters.
close(fdMaturity(100_000, 8, 12), 100_000 * Math.pow(1.02, 4), "fd 1y @8%");

// FD: fractional-quarter tenure (5 months = 5/3 quarters) still compounds smoothly.
close(fdMaturity(50_000, 6, 5), 50_000 * Math.pow(1.015, 5 / 3), "fd fractional quarters");

// FD: non-positive inputs return the principal untouched (or 0). Note the guard
// is `principal || 0` — a negative principal is falsy-but-nonzero, so it passes
// straight through rather than clamping to 0.
eq(fdMaturity(0, 8, 12), 0, "fd zero principal");
eq(fdMaturity(-100, 8, 12), -100, "fd negative principal passes through (not clamped)");
eq(fdMaturity(1000, 0, 12), 1000, "fd zero rate returns principal");
eq(fdMaturity(1000, 8, 0), 1000, "fd zero months returns principal");

// RD: 1000/month @ 8% for 6 months (exactly two full quarters).
// m3: 3000*1.02=3060; m6: (3060+3000)*1.02 = 6181.2
close(rdMaturity(1000, 8, 6), 6181.2, "rd 6 months @8% (whole quarters)");

// RD: 4 months — one full quarter + a pro-rated trailing partial quarter.
// m3: 3000*1.02=3060; +1000=4060; remainder=1 → *= 1 + 0.02*(1/3)
close(rdMaturity(1000, 8, 4), 4060 * (1 + 0.02 * (1 / 3)), "rd trailing partial quarter");

// RD: non-positive inputs → straight-line sum, no interest.
eq(rdMaturity(0, 8, 6), 0, "rd zero monthly");
eq(rdMaturity(1000, 0, 6), 6000, "rd zero rate is straight sum");
eq(rdMaturity(1000, 8, 0), 0, "rd zero months");
eq(rdMaturity(1000, 8, -3), 0, "rd negative months floors at 0");

if (failures) throw new Error(`${failures} maturity check(s) failed`);
console.log("maturity: all checks passed");
