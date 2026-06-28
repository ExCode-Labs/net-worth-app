/**
 * SMS-sender → bank identification.
 *
 * Bank alerts that surface as notifications from the SMS app carry the sender ID
 * in the notification title, e.g. "VM-HDFCBK", "AD-SBIINB-S", "JD-KOTAKB". The
 * format is "<carrier prefix>-<6-char bank code>[-route]". We strip the prefix
 * and match the bank code against this registry to know which bank's rule to use.
 *
 * This is the primary targeting signal ("only bank notifications"): a title that
 * resolves to no known sender is ignored by the parser dispatcher.
 */

export interface BankSender {
  bank:      string;   // canonical display name (matches our Bank reference name)
  short:     string;
  senderIds: string[]; // 6-char DLT header codes (without the carrier prefix)
}

export const BANK_SENDERS: BankSender[] = [
  { bank: "State Bank of India",        short: "SBI",        senderIds: ["SBIINB", "SBIPSG", "SBIUPI", "SBIYONO", "ATMSBI", "SBI"] },
  { bank: "HDFC Bank",                  short: "HDFC",       senderIds: ["HDFCBK"] },
  { bank: "ICICI Bank",                 short: "ICICI",      senderIds: ["ICICIB", "ICICIT", "ICICIN"] },
  { bank: "Axis Bank",                  short: "AXIS",       senderIds: ["AXISBK", "AXISBN"] },
  { bank: "Kotak Mahindra Bank",        short: "KOTAK",      senderIds: ["KOTAKB"] },
  { bank: "Punjab National Bank",       short: "PNB",        senderIds: ["PNBSMS", "PNB"] },
  { bank: "Bank of Baroda",             short: "BOB",        senderIds: ["BOBSMS", "BANKBD"] },
  { bank: "Canara Bank",                short: "CANARA",     senderIds: ["CANBNK"] },
  { bank: "Union Bank of India",        short: "UNION",      senderIds: ["UNIONB"] },
  { bank: "Indian Bank",                short: "INDIAN",     senderIds: ["INDIAN"] },
  { bank: "Bank of India",              short: "BOI",        senderIds: ["BKID", "BKINDI"] },
  { bank: "Central Bank of India",      short: "CBI",        senderIds: ["CBIN", "CENTBK"] },
  { bank: "UCO Bank",                   short: "UCO",        senderIds: ["UCBA", "UCOBNK"] },
  { bank: "Indian Overseas Bank",       short: "IOB",        senderIds: ["IOBA", "IOBANK"] },
  { bank: "Punjab & Sind Bank",         short: "PSB",        senderIds: ["PSIB"] },
  { bank: "IDBI Bank",                  short: "IDBI",       senderIds: ["IBKL", "IDBIBK"] },
  { bank: "Federal Bank",               short: "FEDERAL",    senderIds: ["FEDBNK", "FEDBANK"] },
  { bank: "IndusInd Bank",              short: "INDUSIND",   senderIds: ["INDUSB"] },
  { bank: "Yes Bank",                   short: "YES",        senderIds: ["YESBNK"] },
  { bank: "AU Small Finance Bank",      short: "AU",         senderIds: ["AUBANK"] },
  { bank: "Equitas Small Finance Bank", short: "EQUITAS",    senderIds: ["EQUITAS", "ESFBNK"] },
  { bank: "Ujjivan Small Finance Bank", short: "UJJIVAN",    senderIds: ["UJVN", "UJJIVAN"] },
  { bank: "Jana Small Finance Bank",    short: "JANA",       senderIds: ["JANABK", "JSFB"] },
  { bank: "Bandhan Bank",               short: "BANDHAN",    senderIds: ["BANDHN", "BDBL"] },
  { bank: "DBS Bank India",             short: "DBS",        senderIds: ["DBSBNK", "DBSS"] },
  { bank: "HSBC India",                 short: "HSBC",       senderIds: ["HSBCIN", "HSBC"] },
  { bank: "Standard Chartered",         short: "SCB",        senderIds: ["SCBANK", "SCBL"] },
  { bank: "SBM Bank India",             short: "SBM",        senderIds: ["SBMIND"] },
  { bank: "RBL Bank",                   short: "RBL",        senderIds: ["RBLBNK"] },
  { bank: "IDFC FIRST Bank",            short: "IDFC FIRST", senderIds: ["IDFCBK", "IDFCFB"] },
  { bank: "CSB Bank",                   short: "CSB",        senderIds: ["CSBANK"] },
  { bank: "South Indian Bank",          short: "SIB",        senderIds: ["SIBLTD"] },
  { bank: "Citi India",                 short: "CITI",       senderIds: ["CITIBK"] },
];

// Exact senderId → sender, built once. Codes are unique across banks.
const BY_CODE: Record<string, BankSender> = {};
for (const s of BANK_SENDERS) for (const id of s.senderIds) BY_CODE[id] = s;

/**
 * Identify the bank from a notification title / SMS sender. Handles the
 * "XX-CODE", "XX-CODE-S" and bare "CODE" header shapes by checking each
 * alphanumeric token (longest first, so "SBIINB" wins over a stray "SBI").
 * Returns null when nothing matches — the dispatcher treats that as "not a
 * targeted bank".
 */
export function bankFromSender(title: string): BankSender | null {
  if (!title) return null;
  const tokens = title
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 3)
    .sort((a, b) => b.length - a.length);
  for (const t of tokens) {
    if (BY_CODE[t]) return BY_CODE[t];
  }
  // Some carriers glue the prefix on ("VMHDFCBK") — fall back to substring.
  const up = title.toUpperCase();
  for (const code in BY_CODE) {
    if (up.includes(code)) return BY_CODE[code];
  }
  return null;
}
