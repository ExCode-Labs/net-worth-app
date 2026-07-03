/**
 * Minimal self-check for the per-bank parsing rules (BANK_RULES). No framework —
 * run with:  npx tsx src/services/bankMessageParser.check.ts
 * Asserts the counterparty + credit-card detection for each bank whose quirks
 * live in BANK_RULES, so a bad edit to the table fails loudly.
 */
import { parseBankMessage, parseCardMessage, extractRef } from "./bankMessageParser";

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); }
}

const cp = (raw: string) => parseBankMessage(raw)?.counterparty;

// SBI: trf to / transfer from … Ref
eq(cp("Dear Customer Rs.500 debited from A/c X1234 trf to JOHN DOE Ref 998 -SBI"), "JOHN DOE", "SBI debit");
eq(cp("Rs.700 credited to A/c X1234 transfer from ACME LTD Ref 12 -SBI"), "ACME LTD", "SBI credit");

// PNB: to/by NAME thru (direction-specific layouts both live in the rule)
eq(cp("Rs.200 debited A/c XX5678 to ACME CORP thru UPI -PNB"), "ACME CORP", "PNB debit");
eq(cp("Rs.200 credited A/c XX5678 by JANE ROE thru UPI -PNB"), "JANE ROE", "PNB credit");

// Axis: MOB/TPFT/NAME
eq(cp("INR 300 debited A/c 1234 MOB/TPFT/JANE SMITH/xyz -Axis Bank"), "JANE SMITH", "Axis");

// Jio: UPI/DR/<rrn>/NAME
eq(cp("Rs 150 debited JPBL A/c X1234 UPI/DR/123456/RAVI KUMAR Not you?"), "RAVI KUMAR", "Jio");

// IndusInd: Ref-…: NAME
eq(cp("IndusInd Bank Rs.1000 credited to A/c XX1234 Ref-CLS: Closure Proceeds"), "Closure Proceeds", "IndusInd");

// SBI Card → credit-card alert: not an account txn, IS a card txn
eq(parseBankMessage("Rs.400 spent on SBI Card ending 1234 at AMAZON on 05-Jun-26"), null, "SBI Card not account");
eq(parseCardMessage("Rs.400 spent on SBI Card ending 1234 at AMAZON on 05-Jun-26")?.merchant, "AMAZON", "SBI Card merchant");

// Generic fallbacks still work when no bank rule matches (VPA).
eq(cp("Rs.90 debited A/c X1234 to someone@okaxis on 05-Jun-26"), "someone@okaxis", "generic VPA");

// #1 time: the message's stated local date/time must round-trip through
// occurredAt as local Date components, in ANY runner timezone (not UTC-shifted).
{
  const iso = parseBankMessage("Rs.500 debited A/c X1234 to JOHN on 05-Jun-26 14:30 Ref 1")?.occurredAt;
  const d = iso ? new Date(iso) : null;
  eq(d?.getHours(), 14, "occurredAt local hour");
  eq(d?.getMinutes(), 30, "occurredAt local minute");
  eq(d?.getDate(), 5, "occurredAt local date");
  eq(d?.getMonth(), 5, "occurredAt local month (Jun=5)");
}

// Reference extraction — the cross-source dedup key. Cover the label variants
// and the ref-less messages that must fall back to the time heuristic (null).
eq(extractRef("Received Rs.4.12 in your Kotak Bank AC X2849 from rohit0620@upi on 03-07-26.UPI Ref:142923550637."), "142923550637", "UPI Ref: colon");
eq(extractRef("IMPS INR 20,000.00 sent from HDFC Bank A/c XX2590 To A/c xxxxxxxxxx4753 Ref-609041670950"), "609041670950", "Ref- hyphen");
eq(extractRef("credited by Rs.10000.00 transfer from RahulKumar Ref No 183501606345 -SBI"), "183501606345", "Ref No");
eq(extractRef("A/C XXXXXXXX4103 debited by Rs 500.00 towards x@ptsbi. RRN:652323144372."), "652323144372", "RRN");
eq(extractRef("Rs.199.00 debited from Airtel Payments Bank a/c Txn ID 104540349964 Bal:0.00"), "104540349964", "Txn ID");
eq(extractRef("Rs.690.00 Sent from x4753 Info: UPI/DR/194655699613/Mr Durgesh."), "194655699613", "UPI/DR/ block");
eq(extractRef("Credited INR 1.00 to A/c X5024 Ref MONTHLY INTEREST PAYOUT. Bal INR 1,001.00."), null, "no numeric ref → null (time fallback)");
eq(extractRef("Debit INR 6000.00 Axis Bank A/c XX6127 MOB/TPFT/SHRAVAN KUMAR/917."), null, "short trailing digits are not a ref → null");

if (failures) throw new Error(`${failures} bankMessageParser check(s) failed`);

console.log("bankMessageParser: all checks passed");
