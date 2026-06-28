/**
 * Free, no-key market-rate lookups used by the asset form.
 *
 *  • Gold — goldprice.org public feed (price per troy ounce in INR). We convert
 *    to ₹ per gram of 24K.
 *  • Mutual funds — mfapi.in (community AMFI mirror): scheme search + latest NAV.
 *
 * All calls fail soft: callers should fall back to manual entry on null.
 */

const TROY_OUNCE_GRAMS = 31.1034768;

/** Current 24K gold price in ₹ per gram, or null if the feed is unreachable. */
export async function fetchGoldRatePerGram(): Promise<number | null> {
  try {
    const res = await fetch("https://data-asg.goldprice.org/dbXRates/INR");
    if (!res.ok) return null;
    const json: { items?: { xauPrice?: number }[] } = await res.json();
    const perOunce = json.items?.[0]?.xauPrice;
    if (!perOunce || perOunce <= 0) return null;
    return Math.round(perOunce / TROY_OUNCE_GRAMS);
  } catch {
    return null;
  }
}

export interface MfScheme {
  schemeCode: number;
  schemeName: string;
}

/** Search mutual-fund schemes by name (mfapi.in). Empty array on error. */
export async function searchMutualFunds(query: string): Promise<MfScheme[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const json: MfScheme[] = await res.json();
    return Array.isArray(json) ? json.slice(0, 40) : [];
  } catch {
    return [];
  }
}

/** Latest NAV for a scheme, or null on error. */
export async function fetchMfNav(schemeCode: number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`);
    if (!res.ok) return null;
    const json: { data?: { nav?: string }[] } = await res.json();
    const nav = json.data?.[0]?.nav;
    const n = nav ? parseFloat(nav) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
