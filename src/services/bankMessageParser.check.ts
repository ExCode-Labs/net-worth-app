/**
 * Minimal self-check for the per-bank parsing rules (BANK_RULES). No framework —
 * run with:  npx tsx src/services/bankMessageParser.check.ts
 * Asserts the counterparty + credit-card detection for each bank whose quirks
 * live in BANK_RULES, so a bad edit to the table fails loudly.
 */
import { parseBankMessage, parseCardMessage } from "./bankMessageParser";

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

if (failures) throw new Error(`${failures} bankMessageParser check(s) failed`);

console.log("bankMessageParser: all checks passed");
