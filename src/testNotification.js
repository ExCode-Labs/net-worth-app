import { exec } from "child_process";

// =====================================================
// Add all your SMS messages here
// sender = SMS sender ID
// message = SMS body
// =====================================================

const smsList = [
  // ===========================
  // Kotak Bank
  // ===========================
  {
    sender: "AX-KOTAKB-S",
    message:
      "Sent Rs.120.00 from Kotak Bank AC X2849 to q002814479@ybl on 18-06-26.UPI Ref 653511863999. Not you, https://kotak.com/KBANKT/Fraud",
  },
  {
    sender: "VM-KOTAKB-S",
    message:
      "Rs.1300.00 is credited to Kotak Bank a/c no. 2849 on 14-03-26 as a reversal of debit transaction (UPI Ref no 200144008738).",
  },
  {
    sender: "JD-KOTAKB-S",
    message:
      "Received Rs.550.00 in your Kotak Bank AC X2849 from 8709039275@axl on 25-10-25.UPI Ref:553538758461.",
  },

  // ===========================
  // HDFC Savings Account
  // ===========================
  {
    sender: "VM-HDFCBK-S",
    message:
      "Update! INR 72,209.00 deposited in HDFC Bank A/c XX2590 on 29-MAY-26 for XXXXXXXXXX0015Sal Credit for May26.Avl bal INR 91,951.82. Cheque deposits in A/C are subject to clearing",
  },
  {
    sender: "AX-HDFCBK-S",
    message:
      "Amt Deducted! Rs.5000 from your HDFC Bank A/c XX2590 for NEFT txn via HDFC Bank Online Banking Not you?Call 18002586161/SMS BLOCK OB to 7308080808",
  },
  {
    sender: "JM-HDFCBK-S",
    message:
      "IMPS INR 20,000.00 sent from HDFC Bank A/c XX2590 on 31-03-26 To A/c xxxxxxxxxx4753 Ref-609041670950 Not you?Call 18002586161/SMS BLOCK OB to 7308080808",
  },
  {
    sender: "JK-HDFCBK-S",
    message:
      "Withdrawn Rs.500 From HDFC Bank Card x2207 At SUBRAMANYA SWAMY TEMPL On 2026-02-27:12:05:32 Bal Rs.43142 Not You? Call 18002586161/SMS BLOCK DC 2207 to 7308080808",
  },

  // ===========================
  // HDFC Credit Card
  // ===========================
  {
    sender: "AD-HDFCBK-S",
    message:
      "Alert! Rs.2802 refunded by ASSPL Bangalore IND on 25/APR/2026 & adjusted against HDFC Bank Credit Card 2967.",
  },
  {
    sender: "VD-HDFCBK-S",
    message:
      "HDFC Bank Cardmember, Payment of Rs 7727.22 was credited to your card ending 2967 on 27/APR/2026.",
  },
  {
    sender: "CP-HDFCBK-S",
    message:
      "Cashback Processing! We got your Rs.847.00 cashback request with HDFC Bank card 2967 for 847 RP redemption on 23/05/2026.",
  },
  {
    sender: "JX-HDFCBK-S",
    message:
      "Spent Rs.243 On HDFC Bank Card 2967 At PYU*FLIPKART INTERNET On 2026-05-11:18:49:18.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 2967 to 7308080808",
  },

  // ===========================
  // SBM Novio
  // ===========================
  {
    sender: "JM-SBMIND-S",
    message:
      "Dear Customer, your SBM Novio Credit Card ending with 0653 has been used for a UPI transaction of INR 30.0 at SAMOSAPARTY FOODS PRIVATE LIMITED on 2026-06-24 17:57:16. Ref 671425850.",
  },
  {
    sender: "JX-SBMIND-S",
    message:
      "Dear Customer, your SBM Novio Credit Card ending with 0653 has been used for a UPI transaction of INR 45.0 at K R PRAKASH on 2026-06-21 12:15:51. Ref 644199580.",
  },
  {
    sender: "JM-SBMIND-T",
    message:
      "Dear Customer, your SBM Novio Credit Card ending with 0653 has been used for a UPI transaction of INR 30.0 at PUTTASWAMY M on 2026-06-18 18:30:09. Ref 870399975.",
  },

  // ===========================
  // Airtel Payments Bank
  // ===========================
  {
    sender: "AIRTEL",
    message:
      "Rs.199.00 debited from Airtel Payments Bank a/c Txn ID 104540349964 Bal:0.00 Call 180023400 for help",
  },
  {
    sender: "AIRTEL",
    message:
      "Airtel Payments Bank a/c is credited with Rs.4000.00. Txn ID:100632678779. Call 180023400 for help",
  },

  // ===========================
  // Jio Payments Bank
  // ===========================
  {
    sender: "JPBL",
    message:
      "A/c x4753 credited with Rs.2000.00 on 18-May-2026. Bal: Rs.2366.53.",
  },
  {
    sender: "JPBL",
    message:
      "Rs.690.00 Sent from x4753 on 22-May-2026 Info: UPI/DR/194655699613/Mr Durgesh.",
  },
  {
    sender: "JPBL",
    message:
      "Rs.6300.00 Sent from x4753 on 02-May-2026 Info: UPI/DR/103235263530/MR KIRAN K.",
  },

  // ===========================
  // Punjab National Bank
  // ===========================
  {
    sender: "VM-PNBSMS-S",
    message:
      "Dear Customer,your A/c XX8986 debited with Rs.10.92 towards bank charges on 06-01-2026.Available balance: Rs.1120.80-PNB",
  },
  {
    sender: "AD-PNBSMS-S",
    message:
      "A/c X8986 debited INR 5000.00 Dt 29-05-26 07:54:50 to SBM BANK INDIA thru UPI:075449622956.Bal INR 1177.95.",
  },
  {
    sender: "AX-PNBSMS-S",
    message:
      "A/c X8986 credited for INR 5000.00 on 29-05-26 07:53:42 by RAHULKUMAR thru UPI.AvlBal INR 6177.95.",
  },

  // ===========================
  // IndusInd Bank
  // ===========================
  {
    sender: "VM-INDUSB-S",
    message:
      "A/C XXXXXXXX4103 debited by Rs 500.00 towards 6200881612@ptsbi. RRN:652323144372. Avl Bal:23430.00.",
  },
  {
    sender: "AX-INDUSB-S",
    message:
      "IndusInd A/C **4103 Debited; INR 548.00 Ref-UPI/114006987296/DR/BHIM/INDB/mrecharge@icici/NO R.Bal INR 22,882.00.",
  },
  {
    sender: "CP-INDUSB-S",
    message:
      "IndusInd A/C **4103 Credited; INR 107,978.00 Ref-371000073348 : Closure Proceeds.Bal INR 110,721.00.",
  },
  {
    sender: "VM-INDUSB-S",
    message:
      "IndusInd A/C **4103 Debited; INR 135.00 Ref-UPI/185233417211/DR/SRI/INDB/77362@okbizaxis/NO R.Bal INR 12,110.00.",
  },
  {
    sender: "AX-INDUSB-S",
    message:
      "IndusInd A/C **4103 Credited; INR 290.00 Ref-UPI/093434477527/CR/Rahu/JIOP/7050584103@upi/NO R.Bal INR 890.00.",
  },

  // ===========================
  // SBI
  // ===========================
  {
    sender: "SBIINB",
    message:
      "Dear UPI User, your A/c XXXXXX0050 credited by Rs.10000.00 on 26-01-26 transfer from RahulKumar Ref No 183501606345 -SBI",
  },
  {
    sender: "SBIINB",
    message:
      "Dear UPI user A/C X0050 debited by 1.00 on date 05Jun26 trf to Riya Roy Refno 307481661815.",
  },
  {
    sender: "SBIINB",
    message:
      "Dear UPI user A/C X0050 debited by 104.89 on date 05Apr26 trf to ZOMATO Refno 191809086116.",
  },
  {
    sender: "SBIINB",
    message:
      "Dear UPI User, your A/c XXXXXX0050 credited by Rs.135.00 on 10-05-26 transfer from Ruchi Kumari Ref No 613072689662.",
  },
  {
    sender: "SBIINB",
    message:
      "Dear Customer, Your A/C ending with 0050 has been debited for INR 236.0 on 20-01-26 towards annual maintenance charges for your SBI Debit Card ending with 8030.",
  },

  // ===========================
  // AU Credit Card
  // ===========================
  {
    sender: "AX-AUBANK-T",
    message:
      "INR 65.00 spent at UPI/SPEEDBREAKER THE D on AU Bank Credit Card x6566 24-05-2026 07:17:43 PM.",
  },
  {
    sender: "JD-AUBANK-T",
    message:
      "INR 300.00 spent at UPI/FLIPKART PAYMENTS on AU Bank Credit Card x6566 23-05-2026 01:47:13 PM.",
  },

  // ===========================
  // AU Bank Savings
  // ===========================
  {
    sender: "VD-AUBANK-S",
    message:
      "Credited INR 1.00 to A/c X5024 on 31-MAY-2026 Ref MONTHLY INTEREST PAYOUT. Bal INR 1,001.00.",
  },
  {
    sender: "AUBANK",
    message:
      "Credited INR 1,000.00 to A/c X5024 on 24-MAY-2026 Ref UPI/CR/614498507626/RAHUL KUMAR/INDB/1. Bal INR 1,000.00.",
  },

  // ===========================
  // Axis Bank
  // ===========================
  {
    sender: "AXISBN",
    message:
      "Debit INR 6000.00 Axis Bank A/c XX6127 10-10-25 MOB/TPFT/SHRAVAN KUMAR/917.",
  },
  {
    sender: "AXISBN",
    message:
      "INR 50000.00 credited to A/c on 06-02-26. Info-SAK/CASH DEP/SAK470769260.",
  },

  // ===========================
  // Bihar Gramin Bank
  // ===========================
  {
    sender: "DGBSMS",
    message:
      "BGB: Ac xxxXXXXX050561 Credited with Rs.252.00,03-06-2026 Aval Bal Rs.7340.48 CR. Helpline 18001807777",
  },
  {
    sender: "DGBSMS",
    message:
      "BGB: Ac xxxXXXXX050561 Debited with Rs.17.70,25-06-2026 Aval Bal Rs.17322.78 CR. Helpline 18001807777",
  },
];

const smsLists = [
  {
    sender: "VM-KOTAKB-S",
    message:
      "Received Rs.4.12 in your Kotak Bank AC X2849 from rohit0620@upi on 03-07-26.UPI Ref:142923550637.",
  },
];

// =====================================================

// When true, the transaction reference number in each message (UPI Ref / RRN /
// Txn ID / UPI/DR/… block) is replaced with a fresh random number of the same
// length before sending. The app dedupes notifications by that ref, so keep this
// ON to re-send the same message repeatedly and have each one captured as a new
// transaction. Messages without a ref are left unchanged (the app then falls
// back to a short time-window dedup). Set to false to send verbatim.
const RANDOMISE_REF = true;

// Same patterns the app uses in extractRef() — capture group 1 is the prefix,
// group 2 the ref digits (so we can swap only the digits).
const REF_PATTERNS = [
  /(\bUPI\s*Ref(?:erence)?\s*(?:no\.?)?\s*[:\-]?\s*)(\d{6,})/i,
  /(\b(?:ref(?:erence)?|rrn|utr)\s*(?:no\.?|number)?\s*[:\-]?\s*)(\d{6,})/i,
  /(\btxn\s*id\s*[:\-]?\s*)(\d{6,})/i,
  /(\bUPI[:/](?:[A-Za-z]{2,4}\/)?)(\d{6,})/i,
];

const randDigits = (n) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

function randomiseRef(message) {
  for (const re of REF_PATTERNS) {
    if (re.test(message)) {
      return message.replace(re, (_, prefix, digits) => prefix + randDigits(digits.length));
    }
  }
  return message; // no ref in this message → leave it untouched
}

const INTERVAL = 5000;

let index = 0;
function getRandomMessages(list, count = 5) {
  const arr = [...list];
  // const arr = [...list].filter((l) => l.sender.includes("PNBSMS"));

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.slice(0, count);
}

const messages = getRandomMessages(smsList, 5);

function sendSms(sender, message) {
  const finalMessage = RANDOMISE_REF ? randomiseRef(message) : message;
  const escapedMessage = finalMessage.replace(/"/g, '\\"');

  const command = `adb emu sms send ${sender} "${escapedMessage}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(error.message);
      return;
    }

    console.log("======================================");
    console.log(`SMS ${index + 1}/${messages.length}`);
    console.log(`Sender : ${sender}`);
    console.log(`Message: ${finalMessage}`);
    console.log("======================================");
  });
}

function sendNext() {
  if (index >= messages.length) {
    console.log("\n✅ All SMS sent.");
    process.exit(0);
  }

  const sms = messages[index];

  sendSms(sms.sender, sms.message);

  index++;

  setTimeout(sendNext, INTERVAL);
}

console.log(`Sending ${messages.length} SMS...`);

sendNext();
