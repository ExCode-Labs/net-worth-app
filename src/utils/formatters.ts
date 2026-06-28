/** Shared number and date formatting utilities */

/** ₹1,23,456 */
export function fmt(n: number): string {
  return `₹${Math.abs(n).toLocaleString("en-IN")}`;
}

/** ₹1.2L · ₹4.5K · ₹500 (one decimal, trailing .0 trimmed; keeps sign) */
const trimDec = (v: number) => v.toFixed(1).replace(/\.0$/, "");
export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_00_000) return `${sign}₹${trimDec(abs / 1_00_000)}L`;
  if (abs >= 1000) return `${sign}₹${trimDec(abs / 1000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/** "Good Morning" / "Good Afternoon" / "Good Evening" */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/** Format a JS Date → "12 June 2024" */
export function fmtDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
