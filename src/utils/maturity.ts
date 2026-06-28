/**
 * FD / RD maturity calculators using quarterly compounding — the standard
 * convention Indian banks use to quote returns.
 */

/**
 * Fixed deposit maturity. A = P(1 + r/4)^(4t), with t in years.
 * @param principal   lump-sum deposited
 * @param annualRate  annual interest rate, as a percentage (e.g. 7.1)
 * @param months      tenure in months
 */
export function fdMaturity(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return principal || 0;
  const q = annualRate / 100 / 4;       // quarterly rate
  const quarters = months / 3;          // may be fractional
  return principal * Math.pow(1 + q, quarters);
}

/**
 * Recurring deposit maturity, quarterly compounding. Simulates a deposit at the
 * start of each month, applying quarterly interest at the end of each quarter
 * (and a pro-rated stub for any trailing partial quarter).
 * @param monthly     instalment deposited each month
 * @param annualRate  annual interest rate, as a percentage
 * @param months      number of instalments
 */
export function rdMaturity(monthly: number, annualRate: number, months: number): number {
  if (monthly <= 0 || annualRate <= 0 || months <= 0) return monthly * Math.max(months, 0);
  const q = annualRate / 100 / 4;
  let balance = 0;
  for (let m = 1; m <= months; m++) {
    balance += monthly;
    if (m % 3 === 0) balance *= 1 + q;          // full quarter compounded
  }
  const remainder = months % 3;
  if (remainder) balance *= 1 + q * (remainder / 3); // trailing partial quarter
  return balance;
}
