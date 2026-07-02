/** Self-check for analytics helpers. Run: npx tsx src/utils/analytics.check.ts */
import type { Transaction } from "../store/transactionStore";
import { monthlySeries, categoryTotals, topMerchants, periodSummary, periodStart } from "./analytics";

let failures = 0;
const eq = (a: unknown, b: unknown, label: string) => {
  if (a !== b) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};

const now = new Date(2026, 5, 15); // 15 Jun 2026
const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(), type: "Expense", amount: 0, category: "Food & Dining",
  merchant: "Swiggy", account: "Cash", bank: "", date: now.toISOString(), note: "",
  source: "manual", status: "confirmed", confidence: "high", ...over,
});

const txns: Transaction[] = [
  tx({ amount: 100, category: "Food & Dining", merchant: "Swiggy" }),
  tx({ amount: 300, category: "Food & Dining", merchant: "Zomato" }),
  tx({ amount: 200, category: "Shopping", merchant: "Amazon" }),
  tx({ amount: 50,  category: "Food & Dining", merchant: "Swiggy" }),
  tx({ type: "Income", amount: 5000, category: "Salary" }),
  tx({ type: "Transfer", amount: 999 }), // ignored everywhere
  tx({ amount: 400, category: "Shopping", date: new Date(2026, 3, 1).toISOString() }), // April
];

// Monthly series: 6 months ending Jun; Jun expense = 100+300+200+50 = 650, income 5000.
const ms = monthlySeries(txns, 6, now);
eq(ms.length, 6, "6 months");
eq(ms[5].label, "Jun", "last month label");
eq(ms[5].expense, 650, "Jun expense");
eq(ms[5].income, 5000, "Jun income");
eq(ms[3].expense, 400, "Apr expense"); // 6 months back from Jun: Jan..Jun, Apr is index 3

// Category totals (Expense, all time): Food 450, Shopping 600 → Shopping first.
const cats = categoryTotals(txns, "Expense", 0);
eq(cats[0].label, "Shopping", "top category");
eq(cats[0].total, 600, "shopping total");
eq(cats.find((c) => c.label === "Food & Dining")?.total, 450, "food total");

// Top merchants: Swiggy 150, Zomato 300, Amazon 200, (Apr shopping merchant Swiggy? no, default)
const merch = topMerchants(txns, 0, 5);
// Swiggy = 100 + 50 (Jun) + 400 (Apr, merchant defaults to Swiggy) = 550, the top.
eq(merch[0].label, "Swiggy", "top merchant");
eq(merch[0].total, 550, "swiggy total");
eq(merch.find((m) => m.label === "Zomato")?.total, 300, "zomato total");

// Summary all-time: income 5000, expense 100+300+200+50+400 = 1050, net 3950, count 6 (excl transfer).
const s = periodSummary(txns, 0);
eq(s.income, 5000, "summary income");
eq(s.expense, 1050, "summary expense");
eq(s.net, 3950, "summary net");
eq(s.count, 6, "summary count excludes transfer");

// periodStart ordering
eq(periodStart("ALL", now), 0, "ALL = 0");
eq(periodStart("1M", now) < now.getTime(), true, "1M in past");
eq(periodStart("6M", now) < periodStart("1M", now), true, "6M older than 1M");

if (failures) throw new Error(`${failures} analytics check(s) failed`);
console.log("analytics: all checks passed");
