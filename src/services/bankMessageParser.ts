/**
 * Bank-message parsing engine.
 *
 * Two-stage: a notification's sender (title) picks the bank via the sender
 * registry (bankSenders); the body is then parsed by shape. Most fields are
 * extracted generically (amount, account last-4, balance, date, direction) so
 * new layouts mostly parse for free; the per-bank quirks that differ — chiefly
 * how the counterparty/merchant is written and how a credit-card alert is told
 * apart from an account one — live in small, documented rules below.
 *
 * Output is split by the user's mental model:
 *   • account / debit-card alerts → ParsedBankTxn (affects an account balance)
 *   • credit-card alerts          → ParsedCardTxn (affects a card's usage)
 *
 * Pure module (no RN / store imports) so it's unit-testable in isolation.
 */
import { bankFromSender } from "./bankSenders";

export type TxnDirection = "debit" | "credit";

export interface ParsedBankTxn {
  bank:         string;
  accountLast4: string;
  amount:       number;
  direction:    TxnDirection;
  counterparty: string;
  occurredAt:   string;       // ISO string
  balance:      number | null;
  confidence:   "high" | "low";
  raw:          string;
}

/** A card spend / payment parsed from a credit-card alert. */
export interface ParsedCardTxn {
  bank:        string;
  cardLast4:   string;
  amount:      number;
  direction:   "spend" | "payment";   // spend raises usage, payment lowers it
  merchant:    string;
  occurredAt:  string;
  raw:         string;
}

// ── Normalisation ───────────────────────────────────────────────────────────────

/**
 * Map Unicode "Mathematical Bold" letters/digits back to ASCII. Some banks (AU)
 * send styled text like "𝐂𝐫𝐞𝐝𝐢𝐭𝐞𝐝 𝐀/𝐜" that wouldn't match plain regexes.
 */
function deBold(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x1d400 && c <= 0x1d419) out += String.fromCharCode(65 + (c - 0x1d400));       // 𝐀–𝐙
    else if (c >= 0x1d41a && c <= 0x1d433) out += String.fromCharCode(97 + (c - 0x1d41a));  // 𝐚–𝐳
    else if (c >= 0x1d7ce && c <= 0x1d7d7) out += String.fromCharCode(48 + (c - 0x1d7ce));  // 𝟎–𝟗
    else out += ch;
  }
  return out;
}

/** De-style and collapse newlines/runs of whitespace so multi-line alerts parse. */
function normalize(raw: string): string {
  return deBold(raw).replace(/\s+/g, " ").trim();
}

// ── Primitive helpers ─────────────────────────────────────────────────────────

function num(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}
function last4(s: string): string {
  return s.replace(/\D/g, "").slice(-4);
}
function extractVpa(s: string): string | null {
  const m = s.match(/[\w.\-]+@[\w.\-]+/);
  return m ? m[0].replace(/[.\s]+$/, "") : null;
}
function bankSuffix(raw: string): string {
  const m = raw.match(/-\s*([A-Za-z][A-Za-z .]*?)\s*$/);
  return m ? m[1].trim() : "Unknown";
}

/**
 * Per-bank parsing rules, one entry per bank keyed by its canonical name.
 * Everything that differs bank-to-bank lives here so adding or tweaking a bank
 * is a single visible block — no hunting through the extractor functions.
 *
 *   detect       — body signature, used when the sender title is missing.
 *                  Order matters: entries are tested top-to-bottom, specific
 *                  before generic (e.g. "Airtel Payments Bank" before a bare
 *                  bank word). Object key order is preserved.
 *   counterparty — ordered regexes for who money went to / came from. Capture
 *                  group 1 is the name. Tried before the generic fallbacks in
 *                  extractCounterparty. Direction-specific layouts just list
 *                  both variants (e.g. PNB "to … thru" and "by … thru").
 *   creditCard   — extra signal that an alert from this bank is a credit-card
 *                  one (OR-ed into the generic isCreditCard heuristics).
 */
interface BankRule {
  detect?:       RegExp;
  counterparty?: RegExp[];
  creditCard?:   RegExp;
}

const BANK_RULES: Record<string, BankRule> = {
  "Airtel Payments Bank": { detect: /airtel\s*payments\s*bank/i },
  "Jio Payments Bank":    { detect: /\bJPBL\b/i,
    counterparty: [/UPI\/(?:DR|CR)\/\d+\/([^/]+?)(?:\s+Not\b|\/|$)/i] },        // UPI/DR/<rrn>/NAME
  "Bihar Gramin Bank":    { detect: /\bBGB\b|bihar.*gramin/i },
  "IndusInd Bank":        { detect: /indusind/i,
    counterparty: [/Ref-[^:]*:\s*([A-Za-z][A-Za-z ]+)/i] },                     // "Closure Proceeds"
  "SBM Bank India":       { detect: /sbm\s*(?:bank|novio)/i },
  "Kotak Mahindra Bank":  { detect: /kotak/i },                                 // uses generic VPA
  "HDFC Bank":            { detect: /hdfc/i },                                  // uses generic "At X On"
  "ICICI Bank":           { detect: /icici/i },
  "Axis Bank":            { detect: /\baxis\b/i,
    counterparty: [/MOB\/TPFT\/([A-Za-z][A-Za-z .]+?)\//i] },                   // MOB/TPFT/NAME
  "AU Small Finance Bank":{ detect: /\bAU\s*Bank\b/i,
    counterparty: [/UPI\/(?:DR|CR)\/\d+\/([^/]+?)(?:\s+Not\b|\/|$)/i] },        // UPI/DR/<rrn>/NAME
  "Punjab National Bank": { detect: /\bpnb\b|punjab\s*national/i,
    counterparty: [
      /\bto\s+([A-Za-z][A-Za-z .&]+?)\s+thru\b/i,                               // debit:  to NAME thru
      /\bby\s+([A-Za-z][A-Za-z .&]+?)\s+thru\b/i,                               // credit: by NAME thru
    ] },
  "State Bank of India":  { detect: /\bsbi\b|state\s*bank/i,
    counterparty: [
      /\btrf\s+to\s+([A-Za-z][A-Za-z .]+?)\s+Ref/i,                             // debit
      /\btransfer\s+from\s+([A-Za-z][A-Za-z .]+?)\s+Ref/i,                      // credit
    ],
    creditCard: /\bSBI\s+Card\b/i },                                            // SBI Cards & Payment Services
};

/** Body-signature bank detection, for alerts whose sender title we didn't get. */
function detectKnownBank(raw: string): string | null {
  for (const [name, rule] of Object.entries(BANK_RULES))
    if (rule.detect?.test(raw)) return name;
  return null;
}

/** Bank name: sender title (most reliable) → body signature → trailing "-BANK". */
function detectBank(text: string, senderTitle?: string): string {
  const fromSender = senderTitle ? bankFromSender(senderTitle) : null;
  return fromSender?.bank ?? detectKnownBank(text) ?? bankSuffix(text);
}

// ── Field extractors ───────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Build an ISO date from parts. A bank message states its date/time in the
 *  user's LOCAL zone, so construct with the local Date ctor (not Date.UTC) —
 *  toISOString then yields the correct instant and the UI, which renders with
 *  local toLocaleTimeString, shows the time the message actually stated. (#1) */
function isoOf(y: number, mo: number, d: number, hh = 0, mm = 0, ss = 0): string | null {
  if (!mo || isNaN(y) || isNaN(d)) return null;
  if (y < 100) y += 2000;
  const dt = new Date(y, mo - 1, d, hh, mm, ss);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function monthNum(s: string): number {
  return /^\d+$/.test(s) ? parseInt(s, 10) : MONTHS[s.slice(0, 3).toLowerCase()] ?? 0;
}

/**
 * Transaction date (+ time) anywhere in the message; falls back to the
 * received time. Handles dd-mm-yy, dd-Mon-yy(yy), yyyy-mm-dd, dd/Mon/yyyy,
 * compact "05Jun26", optional HH:MM(:SS) after a space/colon/T, and AM/PM.
 */
function extractDate(text: string, fallbackMs: number): string {
  const fallback = new Date(fallbackMs).toISOString();

  // Time (optional), captured once so it can attach to whichever date matches.
  const tm = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  let hh = 0, mm = 0, ss = 0;
  if (tm) {
    hh = parseInt(tm[1], 10); mm = parseInt(tm[2], 10); ss = tm[3] ? parseInt(tm[3], 10) : 0;
    const ap = tm[4]?.toUpperCase();
    if (ap === "PM" && hh < 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
  }

  // 1. Separated date: dd[-/]mm-or-Mon[-/]yy(yy)  OR  yyyy[-/]mm[-/]dd
  let m = text.match(/\b(\d{1,4})[-/]([A-Za-z]{3,}|\d{1,2})[-/](\d{2,4})\b/);
  if (m) {
    const a = m[1], b = m[2], c = m[3];
    if (a.length === 4) {                       // yyyy-mm-dd
      const iso = isoOf(parseInt(a, 10), monthNum(b), parseInt(c, 10), hh, mm, ss);
      if (iso) return iso;
    } else {                                    // dd-mm/Mon-yy(yy)
      const iso = isoOf(parseInt(c, 10), monthNum(b), parseInt(a, 10), hh, mm, ss);
      if (iso) return iso;
    }
  }

  // 2. Compact "05Jun26" / "05Jun2026"
  m = text.match(/\b(\d{1,2})([A-Za-z]{3})(\d{2,4})\b/);
  if (m) {
    const iso = isoOf(parseInt(m[3], 10), monthNum(m[2]), parseInt(m[1], 10), hh, mm, ss);
    if (iso) return iso;
  }

  return fallback;
}

/** Transaction amount (not the balance): first currency-tagged figure, else a
 *  bare figure right after the debit/credit verb (e.g. SBI "debited by 1.00"). */
function extractAmount(text: string): number {
  const m = text.match(/(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);
  if (m) return num(m[1]);
  const b = text.match(/\b(?:debited|credited|debit|credit)\s+(?:by|for|with)\s+([\d,]+(?:\.\d+)?)/i);
  return b ? num(b[1]) : 0;
}

/** Last-4 of the bank account, trying labelled → masked → "ending" → standalone. */
function extractAccountLast4(text: string): string {
  let m = text.match(/\b(?:a\/?c|account)\b[^\dx*]{0,8}[x*]{2,}\s*(\d{3,})/i); // A/c XX2590, A/C **4103
  if (m) return last4(m[1]);
  m = text.match(/\b(?:a\/?c|account)\b\.?\s*(?:no\.?)?\s*x?(\d{3,})/i);       // AC X2849, a/c no. 2849
  if (m) return last4(m[1]);
  m = text.match(/\bending\s*(?:with)?\s*[x*]*\s*(\d{3,})/i);                  // ending with 0050
  if (m) return last4(m[1]);
  m = text.match(/[x*]{2,}\s*(\d{3,})/i);                                      // generic masked
  if (m) return last4(m[1]);
  m = text.match(/\bx(\d{4,})\b/i);                                           // standalone x4753
  return m ? last4(m[1]) : "";
}

/** Available balance after the txn, if stated. */
function extractBalance(text: string): number | null {
  const m = text.match(
    /(?:avl|aval|avail(?:able)?)?\.?\s*bal(?:ance)?\.?\s*:?\s*(?:rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
  );
  return m ? num(m[1]) : null;
}

function extractDirection(text: string): TxnDirection | null {
  if (/\b(credited|received|deposit(?:ed)?)\b/i.test(text)) return "credit";
  if (/\b(debited|deducted|withdrawn|sent|spent|paid|debit)\b/i.test(text)) return "debit";
  return null;
}

/** Tidy a captured name/merchant: trim filler punctuation and a "UPI/" prefix. */
function clean(s: string): string {
  return s.replace(/^UPI\//i, "").replace(/[\s.\-]+$/, "").replace(/\s{2,}/g, " ").trim();
}

/** Run an ordered list of counterparty regexes; first real (non-numeric) capture wins. */
function tryCounterpartyRules(text: string, rules?: RegExp[]): string | null {
  for (const re of rules ?? []) {
    const m = text.match(re);
    if (m?.[1] && !/^\d+$/.test(m[1].trim())) return clean(m[1]);
  }
  return null;
}

/**
 * Who the money went to / came from. The detected bank's own rules (BANK_RULES)
 * win first; then every other bank's rules (covers mis-detection and layouts
 * shared across banks, e.g. UPI/DR); then the bank-agnostic fallbacks below
 * (VPA · "At MERCHANT On" · "towards NAME" · salary/reversal/cash-deposit).
 */
function extractCounterparty(text: string, _direction: TxnDirection, bank: string): string {
  // 1. Detected bank's own layout.
  const own = tryCounterpartyRules(text, BANK_RULES[bank]?.counterparty);
  if (own) return own;

  // 2. Any other bank's layout (mis-detection / shared formats).
  for (const [name, rule] of Object.entries(BANK_RULES)) {
    if (name === bank) continue;
    const hit = tryCounterpartyRules(text, rule.counterparty);
    if (hit) return hit;
  }

  // 3. Bank-agnostic fallbacks.
  const vpa = extractVpa(text);                                            // Kotak, IndusInd, "towards <vpa>"
  if (vpa) return vpa;

  let m = text.match(/\bat\s+(.+?)\s+on\b/i);                              // HDFC debit-card "At X On"
  if (m) return clean(m[1]);

  m = text.match(/\btowards\s+([A-Za-z][A-Za-z .]+?)(?:\s+on\b|\.|$)/i);   // charges
  if (m) return clean(m[1]);

  if (/\bsal(?:ary)?\s+credit\b/i.test(text)) return "Salary";
  if (/\breversal\b/i.test(text)) return "Reversal";
  if (/\bcash\s*dep\b/i.test(text)) return "Cash Deposit";
  return "";
}

// ── Classification ──────────────────────────────────────────────────────────────

/** A non-transaction notice (cashback request, points redemption) — ignore. */
function isIgnorable(text: string): boolean {
  return /cashback\s+(?:request|processing)|being\s+processed|RP\s+redemption/i.test(text);
}

/** Credit-card alert? (vs an account / debit-card one.) */
function isCreditCard(text: string): boolean {
  return (
    /\bcredit\s*card\b/i.test(text) ||
    /\bBLOCK\s+CC\b/i.test(text) ||
    /\bcardmember\b/i.test(text) ||
    /credited to your card ending/i.test(text) ||
    /adjusted against .*card/i.test(text) ||
    // Indian banks that skip the "credit card" phrase in some notification templates:
    /\bavl(?:ailable)?\s+(?:cr(?:edit)?\s+)?limit\b/i.test(text) || // "Avl Limit" / "available credit limit"
    /\bcredit\s+limit\b/i.test(text) ||                       // "credit limit" is exclusive to CC alerts
    /\bmin(?:imum)?\s+(?:amount\s+)?due\b/i.test(text) ||    // "minimum due" on billing statement SMSes
    /\btotal\s+(?:amount\s+)?due\b/i.test(text) ||           // "total due" on billing statement SMSes
    // Per-bank credit-card signals from BANK_RULES (e.g. SBI "SBI Card").
    Object.values(BANK_RULES).some((r) => r.creditCard?.test(text))
  );
}

// ── Public API: account / debit-card alerts ─────────────────────────────────────

export function parseBankMessage(
  raw: string,
  receivedAtMs: number = Date.now(),
  senderTitle?: string,
): ParsedBankTxn | null {
  const text = normalize(raw);
  if (isIgnorable(text) || isCreditCard(text)) return null;

  const direction = extractDirection(text);
  const amount    = extractAmount(text);
  if (!direction || amount <= 0) return null;

  const accountLast4 = extractAccountLast4(text);
  const bank         = detectBank(text, senderTitle);
  if (bank === "Unknown" && !accountLast4) return null; // nothing to anchor on

  const counterparty = extractCounterparty(text, direction, bank);

  return {
    bank,
    accountLast4,
    amount,
    direction,
    counterparty,
    occurredAt: extractDate(text, receivedAtMs),
    balance:    extractBalance(text),
    confidence: counterparty && (accountLast4 || bank !== "Unknown") ? "high" : "low",
    raw:        text,
  };
}

export function parseBankMessages(
  items: { text: string; time?: number; sender?: string }[],
): ParsedBankTxn[] {
  return items
    .map((i) => parseBankMessage(i.text, i.time ?? Date.now(), i.sender))
    .filter((t): t is ParsedBankTxn => t !== null);
}

// ── Public API: credit-card alerts ──────────────────────────────────────────────

/** Last-4 of a credit card from "Credit Card 2967" / "card ending 0653" / "x6566". */
function extractCardLast4(text: string): string {
  const m = text.match(
    /\bcard\b\s*(?:no\.?|number|ending)?\s*(?:with)?\s*(?:[x*]+)?\s*(\d{3,})/i,
  );
  return m ? last4(m[1]) : "";
}

/** Merchant from "at MERCHANT on" / "refunded by MERCHANT on". */
function extractCardMerchant(text: string): string {
  let m = text.match(/\bat\s+(.+?)\s+on\b/i);
  if (m) return clean(m[1]);
  m = text.match(/\b(?:refunded|received)\s+by\s+(.+?)\s+on\b/i);
  return m ? clean(m[1]) : "";
}

export function parseCardMessage(
  raw: string,
  receivedAtMs: number = Date.now(),
  senderTitle?: string,
): ParsedCardTxn | null {
  const text = normalize(raw);
  if (isIgnorable(text) || !isCreditCard(text)) return null;

  const cardLast4 = extractCardLast4(text);
  if (!cardLast4) return null;

  const amount = extractAmount(text);
  if (amount <= 0) return null;

  // Payments / refunds / reversals lower outstanding; everything else is a spend.
  const direction: ParsedCardTxn["direction"] =
    /\b(payment|paid|refund(?:ed)?|reversed|adjusted)\b/i.test(text) ? "payment" : "spend";

  return {
    bank:       detectBank(text, senderTitle),
    cardLast4,
    amount,
    direction,
    merchant:   extractCardMerchant(text),
    occurredAt: extractDate(text, receivedAtMs),
    raw:        text,
  };
}
