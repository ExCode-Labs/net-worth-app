/**
 * Card products for the Add Card form's searchable dropdown. Bundled as an
 * offline seed; the live list is fetched from the backend (GET /card-products)
 * and cached (see store/cardProductStore). Ids are derived from issuer+name so
 * the list stays easy to edit. Mirrors the bank reference list.
 */
export interface CardProduct {
  id: string;
  name: string;
  issuer: string;
  network: string;
  type: string;
  cardType: "credit" | "debit";
}

type Raw = Omit<CardProduct, "id" | "cardType"> & { cardType?: "credit" | "debit" };

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RAW: Raw[] = [
  { name: "Millennia Credit Card", issuer: "HDFC Bank", network: "Visa", type: "Cashback" },
  { name: "Regalia Gold Credit Card", issuer: "HDFC Bank", network: "Visa", type: "Travel" },
  { name: "Regalia Credit Card", issuer: "HDFC Bank", network: "Visa", type: "Travel" },
  { name: "Infinia Metal Edition", issuer: "HDFC Bank", network: "Visa", type: "Premium" },
  { name: "Diners Club Black", issuer: "HDFC Bank", network: "Diners Club", type: "Premium" },
  { name: "Diners Club Privilege", issuer: "HDFC Bank", network: "Diners Club", type: "Lifestyle" },
  { name: "MoneyBack+", issuer: "HDFC Bank", network: "Visa", type: "Rewards" },
  { name: "Swiggy HDFC Credit Card", issuer: "HDFC Bank", network: "Mastercard", type: "Cashback" },
  { name: "Tata Neu Plus", issuer: "HDFC Bank", network: "Visa", type: "Co-branded" },
  { name: "Tata Neu Infinity", issuer: "HDFC Bank", network: "Visa", type: "Co-branded" },
  { name: "Marriott Bonvoy HDFC", issuer: "HDFC Bank", network: "Visa", type: "Travel" },
  { name: "IndianOil HDFC Credit Card", issuer: "HDFC Bank", network: "Visa", type: "Fuel" },
  { name: "Paytm HDFC Credit Card", issuer: "HDFC Bank", network: "Visa", type: "Co-branded" },
  { name: "Paytm HDFC Select", issuer: "HDFC Bank", network: "Visa", type: "Co-branded" },
  { name: "IRCTC HDFC Credit Card", issuer: "HDFC Bank", network: "RuPay", type: "Travel" },
  { name: "IndiGo 6E Rewards XL", issuer: "HDFC Bank", network: "Visa", type: "Travel" },
  { name: "IndiGo 6E Rewards", issuer: "HDFC Bank", network: "Visa", type: "Travel" },

  { name: "SimplyCLICK", issuer: "SBI Card", network: "Visa", type: "Shopping" },
  { name: "SimplySAVE", issuer: "SBI Card", network: "Visa", type: "Rewards" },
  { name: "Cashback SBI Card", issuer: "SBI Card", network: "Visa", type: "Cashback" },
  { name: "Elite Credit Card", issuer: "SBI Card", network: "Visa", type: "Premium" },
  { name: "Prime Credit Card", issuer: "SBI Card", network: "Visa", type: "Lifestyle" },
  { name: "Pulse Credit Card", issuer: "SBI Card", network: "Visa", type: "Health" },
  { name: "BPCL SBI Card", issuer: "SBI Card", network: "Visa", type: "Fuel" },
  { name: "BPCL SBI Octane", issuer: "SBI Card", network: "Visa", type: "Fuel" },
  { name: "IRCTC SBI Premier", issuer: "SBI Card", network: "RuPay", type: "Travel" },
  { name: "Air India SBI Signature", issuer: "SBI Card", network: "Visa", type: "Travel" },
  { name: "Air India SBI Platinum", issuer: "SBI Card", network: "Visa", type: "Travel" },
  { name: "Reliance SBI Card", issuer: "SBI Card", network: "Visa", type: "Shopping" },
  { name: "Reliance SBI Prime", issuer: "SBI Card", network: "Visa", type: "Shopping" },
  { name: "Apollo SBI Card", issuer: "SBI Card", network: "Visa", type: "Healthcare" },
  { name: "FabIndia SBI Card", issuer: "SBI Card", network: "Visa", type: "Shopping" },
  { name: "Titan SBI Card", issuer: "SBI Card", network: "Visa", type: "Lifestyle" },

  { name: "Amazon Pay ICICI Credit Card", issuer: "ICICI Bank", network: "Visa", type: "Cashback" },
  { name: "Coral Credit Card", issuer: "ICICI Bank", network: "Visa", type: "Lifestyle" },
  { name: "Rubyx Credit Card", issuer: "ICICI Bank", network: "Mastercard", type: "Premium" },
  { name: "Sapphiro Credit Card", issuer: "ICICI Bank", network: "Visa", type: "Premium" },
  { name: "Emeralde Credit Card", issuer: "ICICI Bank", network: "Visa", type: "Premium" },
  { name: "HPCL Super Saver", issuer: "ICICI Bank", network: "Visa", type: "Fuel" },
  { name: "MakeMyTrip Signature", issuer: "ICICI Bank", network: "Visa", type: "Travel" },
  { name: "Emirates Skywards Sapphiro", issuer: "ICICI Bank", network: "Visa", type: "Travel" },
  { name: "Emirates Skywards Emeralde", issuer: "ICICI Bank", network: "Visa", type: "Travel" },

  { name: "ACE Credit Card", issuer: "Axis Bank", network: "Visa", type: "Cashback" },
  { name: "Atlas Credit Card", issuer: "Axis Bank", network: "Visa", type: "Travel" },
  { name: "Magnus Credit Card", issuer: "Axis Bank", network: "Visa", type: "Premium" },
  { name: "Magnus Burgundy", issuer: "Axis Bank", network: "Visa", type: "Premium" },
  { name: "Flipkart Axis Bank", issuer: "Axis Bank", network: "Visa", type: "Cashback" },
  { name: "Airtel Axis Bank", issuer: "Axis Bank", network: "Mastercard", type: "Cashback" },
  { name: "IndianOil Axis Bank", issuer: "Axis Bank", network: "Visa", type: "Fuel" },
  { name: "Neo Credit Card", issuer: "Axis Bank", network: "Visa", type: "Rewards" },
  { name: "My Zone Credit Card", issuer: "Axis Bank", network: "Mastercard", type: "Lifestyle" },
  { name: "Samsung Axis Signature", issuer: "Axis Bank", network: "Visa", type: "Co-branded" },
  { name: "Samsung Axis Infinite", issuer: "Axis Bank", network: "Visa", type: "Premium" },
  { name: "LIC Signature", issuer: "Axis Bank", network: "Visa", type: "Insurance" },
  { name: "LIC Platinum", issuer: "Axis Bank", network: "Visa", type: "Insurance" },
  { name: "Vistara Infinite", issuer: "Axis Bank", network: "Visa", type: "Travel" },
  { name: "Vistara Signature", issuer: "Axis Bank", network: "Visa", type: "Travel" },

  { name: "FIRST Wealth", issuer: "IDFC FIRST Bank", network: "Visa", type: "Premium" },
  { name: "FIRST Select", issuer: "IDFC FIRST Bank", network: "Visa", type: "Lifestyle" },
  { name: "FIRST Millennia", issuer: "IDFC FIRST Bank", network: "Visa", type: "Rewards" },
  { name: "FIRST Classic", issuer: "IDFC FIRST Bank", network: "Visa", type: "Rewards" },
  { name: "FIRST WOW", issuer: "IDFC FIRST Bank", network: "Visa", type: "Secured" },
  { name: "FIRST SWYP", issuer: "IDFC FIRST Bank", network: "Visa", type: "Lifestyle" },
  { name: "Club Vistara FIRST", issuer: "IDFC FIRST Bank", network: "Visa", type: "Travel" },
  { name: "Ashva Credit Card", issuer: "IDFC FIRST Bank", network: "Visa", type: "Premium" },

  { name: "LIT Credit Card", issuer: "AU Small Finance Bank", network: "Visa", type: "Customizable" },
  { name: "AU ixigo Credit Card", issuer: "AU Small Finance Bank", network: "Visa", type: "Travel" },
  { name: "Zenith Credit Card", issuer: "AU Small Finance Bank", network: "Visa", type: "Premium" },
  { name: "Zenith+", issuer: "AU Small Finance Bank", network: "Visa", type: "Premium" },
  { name: "Altura Plus", issuer: "AU Small Finance Bank", network: "Visa", type: "Rewards" },
  { name: "Vetta Credit Card", issuer: "AU Small Finance Bank", network: "Visa", type: "Lifestyle" },

  { name: "Legend Credit Card", issuer: "IndusInd Bank", network: "Visa", type: "Lifestyle" },
  { name: "Tiger Credit Card", issuer: "IndusInd Bank", network: "Visa", type: "Travel" },
  { name: "Pioneer Heritage", issuer: "IndusInd Bank", network: "Visa", type: "Premium" },
  { name: "Nexxt Credit Card", issuer: "IndusInd Bank", network: "Mastercard", type: "Rewards" },

  { name: "OneCard Metal", issuer: "OneCard", network: "Visa", type: "Rewards" },
  { name: "Scapia Federal Credit Card", issuer: "Federal Bank", network: "Visa", type: "Travel" },
  { name: "SBM Novio Credit Card", issuer: "SBM Bank India", network: "Visa", type: "Rewards" },
  { name: "Niyo SBM Credit Card", issuer: "SBM Bank India", network: "Visa", type: "Travel" },
  { name: "Jupiter Edge CSB Credit Card", issuer: "CSB Bank", network: "RuPay", type: "Cashback" },
  { name: "Kiwi RuPay Credit Card", issuer: "Yes Bank", network: "RuPay", type: "UPI" },
  { name: "CRED IndusInd RuPay Credit Card", issuer: "IndusInd Bank", network: "RuPay", type: "Premium" },

  // ── Debit cards ─────────────────────────────────────────────────────────────
  { name: "Visa Classic Debit Card",           issuer: "Multiple Banks",         network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Visa Platinum Debit Card",          issuer: "Multiple Banks",         network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Visa Signature Debit Card",         issuer: "Multiple Banks",         network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Visa Infinite Debit Card",          issuer: "Multiple Banks",         network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "RuPay Classic Debit Card",          issuer: "Multiple Banks",         network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "RuPay Platinum Debit Card",         issuer: "Multiple Banks",         network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "RuPay Select Debit Card",           issuer: "Multiple Banks",         network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "RuPay Platinum NCMC Debit Card",    issuer: "Multiple Banks",         network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "Mastercard Standard Debit Card",    issuer: "Multiple Banks",         network: "Mastercard",        type: "Debit", cardType: "debit" },
  { name: "Mastercard Platinum Debit Card",    issuer: "Multiple Banks",         network: "Mastercard",        type: "Debit", cardType: "debit" },
  { name: "Mastercard World Debit Card",       issuer: "Multiple Banks",         network: "Mastercard",        type: "Debit", cardType: "debit" },
  { name: "Maestro Debit Card",                issuer: "Multiple Banks",         network: "Maestro",           type: "Debit", cardType: "debit" },
  { name: "SBI Global Debit Card",             issuer: "State Bank of India",    network: "Visa / Mastercard", type: "Debit", cardType: "debit" },
  { name: "SBI Platinum International Debit Card", issuer: "State Bank of India", network: "Visa / RuPay",   type: "Debit", cardType: "debit" },
  { name: "SBI Pride Debit Card",              issuer: "State Bank of India",    network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "HDFC EasyShop Debit Card",          issuer: "HDFC Bank",              network: "Visa / Mastercard / RuPay", type: "Debit", cardType: "debit" },
  { name: "HDFC Platinum Debit Card",          issuer: "HDFC Bank",              network: "Visa / RuPay",      type: "Debit", cardType: "debit" },
  { name: "HDFC Millennia Debit Card",         issuer: "HDFC Bank",              network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "HDFC Imperia Platinum Debit Card",  issuer: "HDFC Bank",              network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "ICICI Coral Paywave Debit Card",    issuer: "ICICI Bank",             network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "ICICI Expressions Debit Card",      issuer: "ICICI Bank",             network: "Visa / Mastercard", type: "Debit", cardType: "debit" },
  { name: "ICICI Titanium Debit Card",         issuer: "ICICI Bank",             network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "ICICI Sapphiro Debit Card",         issuer: "ICICI Bank",             network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Axis Prime Debit Card",             issuer: "Axis Bank",              network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Axis Burgundy Debit Card",          issuer: "Axis Bank",              network: "Visa Signature",    type: "Debit", cardType: "debit" },
  { name: "Axis Prestige Debit Card",          issuer: "Axis Bank",              network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Axis Delight Debit Card",           issuer: "Axis Bank",              network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "Kotak Platinum Debit Card",         issuer: "Kotak Mahindra Bank",    network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Kotak Privy League Platinum Debit Card", issuer: "Kotak Mahindra Bank", network: "Visa",           type: "Debit", cardType: "debit" },
  { name: "IndusInd Platinum Debit Card",      issuer: "IndusInd Bank",          network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "IndusInd Signature Exclusive Debit Card", issuer: "IndusInd Bank",   network: "Visa Signature",    type: "Debit", cardType: "debit" },
  { name: "IDFC FIRST Visa Signature Debit Card", issuer: "IDFC FIRST Bank",    network: "Visa Signature",    type: "Debit", cardType: "debit" },
  { name: "IDFC FIRST Visa Platinum Debit Card",  issuer: "IDFC FIRST Bank",    network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "AU Royale Debit Card",              issuer: "AU Small Finance Bank",  network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "AU Signature Debit Card",           issuer: "AU Small Finance Bank",  network: "Visa Signature",    type: "Debit", cardType: "debit" },
  { name: "Yes Bank Platinum Debit Card",      issuer: "Yes Bank",               network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Yes Bank Prosperity Debit Card",    issuer: "Yes Bank",               network: "Mastercard",        type: "Debit", cardType: "debit" },
  { name: "Federal Bank Visa Platinum Debit Card",  issuer: "Federal Bank",      network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "Federal Bank RuPay Platinum Debit Card", issuer: "Federal Bank",      network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "Canara Platinum Debit Card",        issuer: "Canara Bank",            network: "RuPay / Visa",      type: "Debit", cardType: "debit" },
  { name: "Punjab National Bank Platinum Debit Card", issuer: "Punjab National Bank", network: "RuPay / Visa", type: "Debit", cardType: "debit" },
  { name: "Bank of Baroda Platinum Debit Card", issuer: "Bank of Baroda",        network: "RuPay / Visa",      type: "Debit", cardType: "debit" },
  { name: "Union Bank Platinum Debit Card",    issuer: "Union Bank of India",    network: "RuPay / Visa",      type: "Debit", cardType: "debit" },
  { name: "Indian Bank Platinum Debit Card",   issuer: "Indian Bank",            network: "RuPay / Visa",      type: "Debit", cardType: "debit" },
  { name: "Bank of India Platinum Debit Card", issuer: "Bank of India",          network: "RuPay / Visa",      type: "Debit", cardType: "debit" },
  { name: "UCO Bank RuPay Platinum Debit Card", issuer: "UCO Bank",              network: "RuPay",             type: "Debit", cardType: "debit" },
  { name: "Central Bank of India Platinum Debit Card", issuer: "Central Bank of India", network: "RuPay",    type: "Debit", cardType: "debit" },
  { name: "Punjab & Sind Bank Platinum Debit Card", issuer: "Punjab & Sind Bank", network: "RuPay",           type: "Debit", cardType: "debit" },
  { name: "South Indian Bank Platinum Debit Card", issuer: "South Indian Bank",  network: "Visa / RuPay",      type: "Debit", cardType: "debit" },
  { name: "Karnataka Bank Platinum Debit Card", issuer: "Karnataka Bank",        network: "Visa / RuPay",      type: "Debit", cardType: "debit" },
  { name: "Karur Vysya Bank Platinum Debit Card", issuer: "Karur Vysya Bank",    network: "Visa / RuPay",      type: "Debit", cardType: "debit" },
  { name: "RBL Bank Platinum Debit Card",      issuer: "RBL Bank",               network: "Visa",              type: "Debit", cardType: "debit" },
  { name: "DBS Bank Visa Platinum Debit Card", issuer: "DBS Bank India",          network: "Visa",             type: "Debit", cardType: "debit" },
  { name: "Standard Chartered Platinum Debit Card", issuer: "Standard Chartered Bank India", network: "Visa", type: "Debit", cardType: "debit" },
  { name: "HSBC Visa Platinum Debit Card",     issuer: "HSBC India",              network: "Visa",             type: "Debit", cardType: "debit" },
  { name: "Citi Debit Card",                   issuer: "Citibank India",          network: "Visa",             type: "Debit", cardType: "debit" },
];

export const CARD_PRODUCTS: CardProduct[] = RAW.map((c) => ({
  id: slug(`${c.issuer}-${c.name}`),
  cardType: "credit" as const,
  ...c,
}));

/** Substring search over card name + issuer, ranked: prefix matches first. */
export function searchCardProducts(
  query: string,
  list: CardProduct[] = CARD_PRODUCTS,
  cardType?: "credit" | "debit",
): CardProduct[] {
  const pool = cardType ? list.filter((c) => c.cardType === cardType) : list;
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  const starts: CardProduct[] = [];
  const contains: CardProduct[] = [];
  for (const c of pool) {
    const name = c.name.toLowerCase();
    const hay = `${name} ${c.issuer.toLowerCase()}`;
    if (name.startsWith(q)) starts.push(c);
    else if (hay.includes(q)) contains.push(c);
  }
  return [...starts, ...contains];
}
