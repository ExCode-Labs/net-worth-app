/**
 * Pure spending-analytics helpers derived from the transaction list. No store or
 * currency coupling — amounts stay in INR (the stored unit); the UI formats them.
 * Used by the Analytics screen and the dashboard chart.
 */
import type { Transaction } from "@/store/transactionStore";

export type Period = "1M" | "3M" | "6M" | "ALL";

/** Epoch-ms cutoff for a named period (0 = all time). */
export function periodStart(period: Period, now: Date = new Date()): number {
  if (period === "ALL") return 0;
  const n = period === "1M" ? 1 : period === "3M" ? 3 : 6;
  const d = new Date(now.getFullYear(), now.getMonth() - n, now.getDate());
  return d.getTime();
}

export interface MonthPoint {
  key: string;
  label: string;   // "Jun"
  income: number;
  expense: number;
}

/** Last `count` calendar months (oldest→newest) with income + expense totals. */
export function monthlySeries(txns: Transaction[], count = 6, now: Date = new Date()): MonthPoint[] {
  const months: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      income: 0,
      expense: 0,
    });
  }
  const idx = new Map(months.map((m, i) => [m.key, i]));
  for (const t of txns) {
    if (t.type === "Transfer") continue;
    const d = new Date(t.date);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i === undefined) continue;
    if (t.type === "Income") months[i].income += t.amount;
    else months[i].expense += t.amount;
  }
  return months;
}

export interface Slice {
  label: string;
  total: number;
}

/** Category totals for one tx type since a cutoff, largest first. */
export function categoryTotals(
  txns: Transaction[],
  type: "Expense" | "Income",
  sinceMs = 0,
): Slice[] {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== type) continue;
    if (new Date(t.date).getTime() < sinceMs) continue;
    const c = t.category || "Others";
    map.set(c, (map.get(c) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);
}

/** Top merchants by spend since a cutoff. */
export function topMerchants(txns: Transaction[], sinceMs = 0, limit = 5): Slice[] {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "Expense") continue;
    if (new Date(t.date).getTime() < sinceMs) continue;
    const m = (t.merchant || t.category || "Unknown").trim() || "Unknown";
    map.set(m, (map.get(m) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface Summary {
  income: number;
  expense: number;
  net: number;    // income − expense (savings)
  count: number;
}

export function periodSummary(txns: Transaction[], sinceMs = 0): Summary {
  let income = 0, expense = 0, count = 0;
  for (const t of txns) {
    if (t.type === "Transfer") continue;
    if (new Date(t.date).getTime() < sinceMs) continue;
    count++;
    if (t.type === "Income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense, count };
}
