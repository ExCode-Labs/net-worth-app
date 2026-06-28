/**
 * Indian banks used by the account form's searchable picker.
 *
 * `code` is the 4-letter IFSC bank code (the first 4 chars of any IFSC for that
 * bank). The 5th IFSC char is always 0; the last 6 are the branch code — so an
 * example IFSC is `${code}0XXXXXX`. `acct` is a representative account-number
 * example (lengths differ per bank); falls back to a generic when absent.
 */
export interface IndianBank {
  name: string;
  code: string; // 4-letter IFSC bank code
  // Below are authoritative in the server/DB list and fetched into bankStore.
  // The bundled constant is only an offline seed, so they're optional here —
  // the helpers default gracefully when a seed entry omits them.
  acct?: string; // example account number
  acctMin?: number; // min account-number digits (from the server list)
  acctMax?: number; // max account-number digits
  category?: "public" | "private" | "sfb" | "payments" | "foreign" | "coop";
}

export const INDIAN_BANKS: IndianBank[] = [
  // ── Public sector ──────────────────────────────────────────────────────────
  { name: "State Bank of India", code: "SBIN", acct: "30123456789" },
  { name: "Punjab National Bank", code: "PUNB", acct: "0123000100123456" },
  { name: "Bank of Baroda", code: "BARB", acct: "12340100012345" },
  { name: "Canara Bank", code: "CNRB", acct: "0123101012345" },
  { name: "Union Bank of India", code: "UBIN", acct: "123401010012345" },
  { name: "Bank of India", code: "BKID", acct: "123430110012345" },
  { name: "Indian Bank", code: "IDIB", acct: "1234567890" },
  { name: "Central Bank of India", code: "CBIN", acct: "1234567890" },
  { name: "Indian Overseas Bank", code: "IOBA", acct: "123401000012345" },
  { name: "UCO Bank", code: "UCBA", acct: "01230100012345" },
  { name: "Bank of Maharashtra", code: "MAHB", acct: "60123456789" },
  { name: "Punjab & Sind Bank", code: "PSIB", acct: "01231000012345" },
  { name: "IDBI Bank", code: "IBKL", acct: "0123104000012345" },

  // ── Private sector ─────────────────────────────────────────────────────────
  { name: "HDFC Bank", code: "HDFC", acct: "50100123456789" },
  { name: "ICICI Bank", code: "ICIC", acct: "123401500001" },
  { name: "Axis Bank", code: "UTIB", acct: "912010012345678" },
  { name: "Kotak Mahindra Bank", code: "KKBK", acct: "1234567890" },
  { name: "IndusInd Bank", code: "INDB", acct: "123456789012" },
  { name: "Yes Bank", code: "YESB", acct: "001234567890" },
  { name: "IDFC First Bank", code: "IDFB", acct: "10012345678" },
  { name: "Federal Bank", code: "FDRL", acct: "12340100123456" },
  { name: "RBL Bank", code: "RATN", acct: "123456789012" },
  { name: "Bandhan Bank", code: "BDBL", acct: "10012345678" },
  { name: "South Indian Bank", code: "SIBL", acct: "0123012345678" },
  { name: "Karur Vysya Bank", code: "KVBL", acct: "1234123456789" },
  { name: "City Union Bank", code: "CIUB", acct: "123456789012345" },
  { name: "Karnataka Bank", code: "KARB", acct: "1234500012345" },
  { name: "DCB Bank", code: "DCBL", acct: "12340012345678" },
  { name: "Dhanlaxmi Bank", code: "DLXB", acct: "001234567890" },
  { name: "Jammu & Kashmir Bank", code: "JAKA", acct: "0012010012345" },
  { name: "Tamilnad Mercantile Bank", code: "TMBL", acct: "001234567890" },
  { name: "CSB Bank", code: "CSBK", acct: "012345678901" },
  { name: "Nainital Bank", code: "NTBL" },

  // ── Small finance banks ────────────────────────────────────────────────────
  { name: "AU Small Finance Bank", code: "AUBL", acct: "1234123456789" },
  { name: "Equitas Small Finance Bank", code: "ESFB", acct: "100012345678" },
  { name: "Ujjivan Small Finance Bank", code: "UJVN", acct: "1234012345678" },
  { name: "Jana Small Finance Bank", code: "JSFB" },
  { name: "Suryoday Small Finance Bank", code: "SURY" },
  { name: "ESAF Small Finance Bank", code: "ESMF" },
  { name: "Utkarsh Small Finance Bank", code: "UTKS" },
  { name: "Capital Small Finance Bank", code: "CLBL" },
  { name: "Fincare Small Finance Bank", code: "FSFB" },
  { name: "Shivalik Small Finance Bank", code: "SMCB" },
  { name: "Unity Small Finance Bank", code: "UNTY" },
  { name: "North East Small Finance Bank", code: "NESF" },

  // ── Payments banks ─────────────────────────────────────────────────────────
  { name: "Paytm Payments Bank", code: "PYTM" },
  { name: "Airtel Payments Bank", code: "AIRP" },
  { name: "India Post Payments Bank", code: "IPOS" },
  { name: "Fino Payments Bank", code: "FINO" },
  { name: "Jio Payments Bank", code: "JIOP" },
  { name: "NSDL Payments Bank", code: "NSPB" },

  // ── Foreign banks (India operations) ───────────────────────────────────────
  { name: "Standard Chartered Bank", code: "SCBL" },
  { name: "Citibank", code: "CITI" },
  { name: "HSBC Bank", code: "HSBC" },
  { name: "Deutsche Bank", code: "DEUT" },
  { name: "DBS Bank India", code: "DBSS" },
  { name: "Barclays Bank", code: "BARC" },
  { name: "Bank of America", code: "BOFA" },
  { name: "JPMorgan Chase Bank", code: "CHAS" },

  // ── Co-operative banks ─────────────────────────────────────────────────────
  { name: "Saraswat Co-operative Bank", code: "SRCB" },
  { name: "Cosmos Co-operative Bank", code: "COSB" },
  { name: "SVC Co-operative Bank", code: "SVCB" },
  { name: "Abhyudaya Co-operative Bank", code: "ABHY" },
  { name: "TJSB Sahakari Bank", code: "TJSB" },
  { name: "Bharat Co-operative Bank", code: "BCBM" },
  { name: "Janata Sahakari Bank", code: "JSBP" },
];

const GENERIC_ACCT = "1234567890";

/**
 * The helpers below default to the bundled list but accept a `banks` argument so
 * callers can pass the live, server-fetched list (see store/bankStore).
 */

/** Look up a bank by its display name (case-insensitive exact match). */
export function findBank(
  name: string,
  banks: IndianBank[] = INDIAN_BANKS,
): IndianBank | undefined {
  const n = name.trim().toLowerCase();
  return banks.find((b) => b.name.toLowerCase() === n);
}

/** Example account-number placeholder for a bank name (generic fallback). */
export function exampleAccountNumber(
  name: string,
  banks: IndianBank[] = INDIAN_BANKS,
): string {
  return findBank(name, banks)?.acct ?? GENERIC_ACCT;
}

/** Example IFSC placeholder for a bank name, e.g. "HDFC0001234". */
export function exampleIfsc(
  name: string,
  banks: IndianBank[] = INDIAN_BANKS,
): string {
  const code = findBank(name, banks)?.code;
  return code ? `${code}0001234` : "ABCD0001234";
}

/** Allowed account-number digit range for a bank, or null if unknown. */
export function accountLenRange(
  name: string,
  banks: IndianBank[] = INDIAN_BANKS,
): { min: number; max: number } | null {
  const b = findBank(name, banks);
  if (!b || b.acctMin == null || b.acctMax == null) return null;
  return { min: b.acctMin, max: b.acctMax };
}

/** Substring search over bank names, ranked: prefix matches first. */
export function searchBanks(
  query: string,
  banks: IndianBank[] = INDIAN_BANKS,
): IndianBank[] {
  const q = query.trim().toLowerCase();
  if (!q) return banks;
  const starts: IndianBank[] = [];
  const contains: IndianBank[] = [];
  for (const b of banks) {
    const n = b.name.toLowerCase();
    if (n.startsWith(q)) starts.push(b);
    else if (n.includes(q)) contains.push(b);
  }
  return [...starts, ...contains];
}
