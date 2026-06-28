/** Shared number and date formatting utilities */

/** ₹1,23,456 */
export function fmt(n: number): string {
  return `₹${Math.abs(n).toLocaleString("en-IN")}`;
}

/** ₹1.2L or ₹120K */
export function fmtShort(n: number): string {
  return n >= 1_00_000
    ? `₹${(n / 1_00_000).toFixed(1)}L`
    : `₹${(n / 1000).toFixed(0)}K`;
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
