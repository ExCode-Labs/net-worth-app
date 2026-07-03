/**
 * Shared, type-aware asset input. Used by BOTH the standalone Add Asset screen
 * and onboarding so the experience is identical everywhere.
 *
 * Controlled via an `AssetDraft` (all raw string inputs) + `onChange`. The pure
 * `buildAsset(draft)` helper turns a draft into the saved shape ({ name, value,
 * details, valid }) so callers don't duplicate the value/maturity maths.
 *
 * Per type:
 *   gold        → grams × live ₹/g (goldprice.org), refreshable
 *   stocks      → shares × current price (manual)
 *   mutual_fund → units × live NAV (mfapi.in scheme search)
 *   fd / rd     → bank + principal/monthly + rate + tenure → maturity
 *   lic         → current value (+ optional policy no., premium, sum assured)
 *   property/cash → plain current value
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MfSchemePicker from "@/components/assets/MfSchemePicker";
import BankPicker from "@/components/onboarding/BankPicker";
import { PersonField } from "@/components/ui/PersonField";
import { LedgerLink } from "@/components/ui/LedgerLink";
import { DateField } from "@/components/ui/DateField";
import { type AssetDetails } from "@/store/accountStore";
import { toast } from "@/store/toastStore";
import { fetchGoldRatePerGram, fetchMfNav } from "@/services/rates";
import { fdMaturity, rdMaturity } from "@/utils/maturity";
import { fmt } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";
import { ASSET_TYPES } from "@/app/assets";

export interface AssetDraft {
  type: string;
  name: string;
  value: string;       // property / cash / lic current value
  qty: string;         // grams / shares / units
  rate: string;        // ₹/g, ₹/share, NAV
  schemeCode?: number;
  bank: string;
  principal: string;   // FD lump sum / RD monthly
  interest: string;
  tenure: string;
  policyNumber: string;
  premium: string;
  sumAssured: string;
  phone: string;       // lent: borrower's mobile
  // lent: ledger links (which account it was paid from / returned to + txns).
  // `to*` are set by the settle flow, not this form — kept here so a re-edit
  // round-trips them instead of dropping them.
  fromAccountId?: string;
  fromTxnId?: string;
  toAccountId?: string;
  toTxnId?: string;
  startDate?: string;  // ISO; acquired / invested
  period: string;      // months (raw input) — non-deposit types only; FD/RD derive this from tenure
  tenureUnit: "days" | "months" | "years"; // unit for `tenure` (FD/RD only); always converted to months for storage
  maturityDate?: string; // ISO; FD/RD only — auto-filled from startDate+tenure, user-editable
}

export const EMPTY_ASSET_DRAFT: AssetDraft = {
  type: "mutual_fund", name: "", value: "", qty: "", rate: "",
  bank: "", principal: "", interest: "", tenure: "",
  policyNumber: "", premium: "", sumAssured: "", phone: "",
  period: "", tenureUnit: "months",
};

const str = (n?: number) => (n != null ? String(n) : "");
const FAR_FUTURE = new Date(2099, 0, 1); // maturity dates are in the future, unlike "Start date"

/** Rebuild an editable draft from a saved asset (inverse of buildAsset). */
export function draftFromAsset(a: { type: string; name: string; value: number; details?: AssetDetails; startDate?: string; periodMonths?: number }): AssetDraft {
  const d = a.details ?? {};
  return {
    type:         a.type,
    name:         a.name,
    value:        str(a.value),
    qty:          str(d.quantity),
    rate:         str(d.rate),
    schemeCode:   d.schemeCode,
    bank:         d.bank ?? "",
    principal:    str(d.principal),
    interest:     str(d.interestRate),
    tenure:       str(d.tenureMonths),
    policyNumber: d.policyNumber ?? "",
    premium:      str(d.premium),
    sumAssured:   str(d.sumAssured),
    phone:        d.phone ?? "",
    fromAccountId: d.fromAccountId,
    fromTxnId:     d.fromTxnId,
    toAccountId:   d.toAccountId,
    toTxnId:       d.toTxnId,
    startDate:     a.startDate,
    period:        str(a.periodMonths),
    // The unit isn't persisted (only the month-equivalent is) — re-editing an
    // existing deposit always shows tenure in months, regardless of how it was
    // originally entered.
    tenureUnit:    "months",
    maturityDate:  d.maturityDate,
  };
}

const num = (s: string) => parseFloat(s) || 0;

/** Raw `tenure` converted to months, honoring `tenureUnit` (FD/RD only). */
export function tenureInMonths(d: AssetDraft): number {
  const t = num(d.tenure);
  if (d.tenureUnit === "days") return t / 30;
  if (d.tenureUnit === "years") return t * 12;
  return t;
}

export function maturityOf(d: AssetDraft): number {
  const p = num(d.principal), r = num(d.interest), t = tenureInMonths(d);
  if (d.type === "fd") return fdMaturity(p, r, t);
  if (d.type === "rd") return rdMaturity(p, r, t);
  return 0;
}

/** Start date + tenure → maturity date (ISO), for FD/RD. */
export function maturityDateOf(d: AssetDraft): string | undefined {
  if (!d.startDate) return undefined;
  const months = tenureInMonths(d);
  if (months <= 0) return undefined;
  const date = new Date(d.startDate);
  date.setDate(date.getDate() + Math.round(months * 30)); // avoids calendar month-length drift for fractional months
  return date.toISOString();
}

export function assetValueOf(d: AssetDraft): number {
  switch (d.type) {
    case "gold":
    case "stocks":
    case "mutual_fund": return num(d.qty) * num(d.rate);
    case "fd":          return num(d.principal);                 // current ≈ principal
    case "rd":          return num(d.principal) * num(d.tenure); // total deposited
    default:            return num(d.value);                     // lic / property / cash
  }
}

/** Turn a draft into the saved Asset shape, with a validity flag. */
export function buildAsset(d: AssetDraft): {
  valid: boolean;
  name: string;
  value: number;
  details?: AssetDetails;
  startDate?: string;
  periodMonths?: number;
} {
  const name =
    d.name.trim() ||
    (d.type === "fd" ? `${d.bank || "Bank"} FD` : d.type === "rd" ? `${d.bank || "Bank"} RD` : "");
  const value = Math.round(assetValueOf(d));

  const details: AssetDetails = {};
  if (d.type === "gold" || d.type === "stocks" || d.type === "mutual_fund") {
    details.quantity = num(d.qty);
    details.rate = num(d.rate);
    if (d.type === "mutual_fund" && d.schemeCode) details.schemeCode = d.schemeCode;
  }
  if (d.type === "fd" || d.type === "rd") {
    details.bank = d.bank || undefined;
    details.principal = num(d.principal);
    details.interestRate = num(d.interest);
    details.tenureMonths = tenureInMonths(d);
    details.maturityAmount = Math.round(maturityOf(d));
    details.maturityDate = d.maturityDate || maturityDateOf(d);
  }
  if (d.type === "lic") {
    if (d.policyNumber.trim()) details.policyNumber = d.policyNumber.trim();
    if (num(d.premium)) details.premium = num(d.premium);
    if (num(d.sumAssured)) details.sumAssured = num(d.sumAssured);
  }
  if (d.type === "lent" && d.phone.trim()) details.phone = d.phone.trim();
  // Ledger links (which account funded it / proceeds went to) apply to every type.
  if (d.fromAccountId) details.fromAccountId = d.fromAccountId;
  if (d.fromTxnId)     details.fromTxnId = d.fromTxnId;
  if (d.toAccountId)   details.toAccountId = d.toAccountId;
  if (d.toTxnId)       details.toTxnId = d.toTxnId;

  return {
    valid: !!name && value > 0,
    name,
    value,
    details: Object.keys(details).length ? details : undefined,
    startDate: d.startDate,
    periodMonths: (d.type === "fd" || d.type === "rd") ? (Math.round(tenureInMonths(d)) || undefined) : (num(d.period) || undefined),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AssetForm({
  draft,
  onChange,
}: {
  draft: AssetDraft;
  onChange: (d: AssetDraft) => void;
}) {
  useAmountVisibilitySync();
  const [rateLoading, setRateLoading] = useState(false);
  const goldInFlight = useRef(false);

  const set = (patch: Partial<AssetDraft>) => onChange({ ...draft, ...patch });

  // Switching type clears type-specific inputs so values can't bleed across.
  const changeType = (t: string) =>
    onChange({ ...EMPTY_ASSET_DRAFT, type: t });

  // Auto-fetch gold rate when gold is selected with no rate yet.
  useEffect(() => {
    if (draft.type !== "gold" || draft.rate || goldInFlight.current) return;
    void refreshGoldRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type]);

  const refreshGoldRate = async () => {
    goldInFlight.current = true;
    setRateLoading(true);
    const r = await fetchGoldRatePerGram();
    setRateLoading(false);
    goldInFlight.current = false;
    if (r) set({ rate: String(r) });
    else toast.error("Couldn't fetch gold rate. Enter it manually.");
  };

  const onPickScheme = async (scheme: { schemeCode: number; schemeName: string }) => {
    set({ name: scheme.schemeName, schemeCode: scheme.schemeCode });
    setRateLoading(true);
    const nav = await fetchMfNav(scheme.schemeCode);
    setRateLoading(false);
    if (nav) onChange({ ...draft, name: scheme.schemeName, schemeCode: scheme.schemeCode, rate: String(nav) });
    else toast.error("Couldn't fetch NAV. Enter it manually.");
  };

  const isDeposit = draft.type === "fd" || draft.type === "rd";
  const maturity  = maturityOf(draft);
  const value     = assetValueOf(draft);

  return (
    <View className="gap-5">
      {/* Type picker */}
      <View className="gap-[10px]">
        <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Type</Text>
        <View className="flex-row gap-2 flex-wrap">
          {Object.entries(ASSET_TYPES).map(([key, meta]) => {
            const active = draft.type === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => changeType(key)}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border"
                style={{
                  borderColor: active ? "#4ade80" : "rgba(255,255,255,0.1)",
                  backgroundColor: active ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
                }}
              >
                <Ionicons name={meta.icon} size={15} color={active ? "#4ade80" : "#9ca3af"} />
                <Text className="text-xs font-semibold" style={{ color: active ? "#4ade80" : "#9ca3af" }}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Lent: link the transaction right after Type so every field below (name,
          amount, date) can auto-fill from it. */}
      {draft.type === "lent" && (
        <LedgerLink
          label="Paid from"
          accountId={draft.fromAccountId}
          txnId={draft.fromTxnId}
          amount={assetValueOf(draft)}
          onChange={({ accountId, txnId, txn }) => set({
            fromAccountId: accountId,
            fromTxnId: txnId,
            name: txn && !draft.name.trim() ? txn.merchant : draft.name,
            value: txn && !draft.value.trim() ? String(txn.amount) : draft.value,
            startDate: txn && !draft.startDate ? txn.date : draft.startDate,
          })}
        />
      )}

      {/* Name / scheme / person */}
      {draft.type === "mutual_fund" ? (
        <Labeled label="Scheme">
          <MfSchemePicker value={draft.name} onSelect={onPickScheme} />
        </Labeled>
      ) : draft.type === "lent" ? (
        <PersonField
          label="Lent To"
          name={draft.name}
          phone={draft.phone}
          onChangeName={(v) => set({ name: v })}
          onChangePhone={(v) => set({ phone: v })}
          onPick={(name, phone) => set({ name, phone })}
          namePlaceholder="e.g., Raj Sharma"
        />
      ) : (
        <Labeled label={draft.type === "stocks" ? "Company / Symbol" : "Name"}>
          <Input
            value={draft.name}
            onChangeText={(v) => set({ name: v })}
            placeholder={
              draft.type === "stocks" ? "e.g., Reliance Industries" :
              draft.type === "gold"   ? "e.g., Sovereign Gold / Jewellery" :
              draft.type === "lic"    ? "e.g., LIC Jeevan Anand" :
              isDeposit               ? "Optional — defaults to “Bank FD”" :
              "e.g., Flat in Pune"
            }
          />
        </Labeled>
      )}

      {/* Quantity × rate (gold / stocks / mutual_fund) */}
      {(draft.type === "gold" || draft.type === "stocks" || draft.type === "mutual_fund") && (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Labeled label={draft.type === "gold" ? "Grams" : draft.type === "stocks" ? "Quantity" : "Units"}>
              <Input value={draft.qty} onChangeText={(v) => set({ qty: v.replace(/[^0-9.]/g, "") })} placeholder="0" keyboardType="decimal-pad" />
            </Labeled>
          </View>
          <View className="flex-1">
            <Labeled
              label={draft.type === "gold" ? "₹/gram" : draft.type === "stocks" ? "Price" : "NAV"}
              right={
                draft.type === "gold" ? (
                  <TouchableOpacity onPress={refreshGoldRate} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    {rateLoading ? <ActivityIndicator size="small" color="#6b7280" /> : <Ionicons name="refresh" size={14} color="#a855f7" />}
                  </TouchableOpacity>
                ) : draft.type === "mutual_fund" && rateLoading ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : undefined
              }
            >
              <Input value={draft.rate} onChangeText={(v) => set({ rate: v.replace(/[^0-9.]/g, "") })} placeholder="0.00" keyboardType="decimal-pad" />
            </Labeled>
          </View>
        </View>
      )}

      {/* Fixed / Recurring deposit */}
      {isDeposit && (
        <>
          <Labeled label="Bank">
            <BankPicker value={draft.bank} onSelect={(b) => set({ bank: b })} placeholder="Search your bank" />
          </Labeled>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Labeled label={draft.type === "fd" ? "Principal" : "Monthly Amount"}>
                <Input value={draft.principal} onChangeText={(v) => set({ principal: v.replace(/[^0-9.]/g, "") })} placeholder="0.00" keyboardType="decimal-pad" />
              </Labeled>
            </View>
            <View className="flex-1">
              <Labeled label="Interest %">
                <Input value={draft.interest} onChangeText={(v) => set({ interest: v.replace(/[^0-9.]/g, "") })} placeholder="e.g., 7.1" keyboardType="decimal-pad" />
              </Labeled>
            </View>
          </View>
          <Labeled
            label="Tenure"
            right={
              <View className="flex-row gap-1.5">
                {(["days", "months", "years"] as const).map((u) => {
                  const active = draft.tenureUnit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      onPress={() => set({ tenureUnit: u })}
                      className="px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor: active ? "#a855f7" : "rgba(255,255,255,0.1)",
                        backgroundColor: active ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                      }}
                    >
                      <Text className="text-[10px] font-semibold capitalize" style={{ color: active ? "#c084fc" : "#9ca3af" }}>{u}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            }
          >
            <Input value={draft.tenure} onChangeText={(v) => set({ tenure: v.replace(/[^0-9]/g, "") })} placeholder="e.g., 12" keyboardType="number-pad" />
          </Labeled>

          {maturity > 0 && (
            <View className="rounded-[14px] p-4 border border-accent-purple/25" style={{ backgroundColor: "rgba(168,85,247,0.1)" }}>
              <Text className="text-xs text-secondary font-bold uppercase mb-1">Maturity Amount</Text>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>{fmt(maturity)}</Text>
              <Text className="text-[11px] text-dim mt-1">
                Quarterly compounding · {draft.type === "rd"
                  ? "total deposited " + fmt(num(draft.principal) * tenureInMonths(draft))
                  : "principal " + fmt(num(draft.principal))}
              </Text>
            </View>
          )}
        </>
      )}

      {/* LIC extras */}
      {draft.type === "lic" && (
        <>
          <Labeled label="Current Value">
            <CurrencyInput value={draft.value} onChangeText={(v) => set({ value: v.replace(/[^0-9.]/g, "") })} />
          </Labeled>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Labeled label="Annual Premium" optional>
                <Input value={draft.premium} onChangeText={(v) => set({ premium: v.replace(/[^0-9.]/g, "") })} placeholder="0.00" keyboardType="decimal-pad" />
              </Labeled>
            </View>
            <View className="flex-1">
              <Labeled label="Sum Assured" optional>
                <Input value={draft.sumAssured} onChangeText={(v) => set({ sumAssured: v.replace(/[^0-9.]/g, "") })} placeholder="0.00" keyboardType="decimal-pad" />
              </Labeled>
            </View>
          </View>
          <Labeled label="Policy Number" optional>
            <Input value={draft.policyNumber} onChangeText={(v) => set({ policyNumber: v })} placeholder="e.g., 1234567890" />
          </Labeled>
        </>
      )}

      {/* Plain value (property / cash / lent) */}
      {(draft.type === "property" || draft.type === "cash" || draft.type === "lent") && (
        <Labeled label={draft.type === "lent" ? "Amount Lent" : "Current Value"}>
          <CurrencyInput value={draft.value} onChangeText={(v) => set({ value: v.replace(/[^0-9.]/g, "") })} />
        </Labeled>
      )}

      {/* Which account funded this asset + optional transaction link (all other types). */}
      {draft.type !== "cash" && draft.type !== "lent" && (
        <LedgerLink
          label="Invested from"
          accountId={draft.fromAccountId}
          txnId={draft.fromTxnId}
          amount={assetValueOf(draft)}
          onChange={({ accountId, txnId }) => set({ fromAccountId: accountId, fromTxnId: txnId })}
        />
      )}

      {/* Start date + period — applies to every asset type; FD/RD replace the
          generic "Period" with an editable Maturity Date instead (tenure above
          already determines duration, so a second duration field was redundant). */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <DateField
            label={isDeposit ? "Deposit Date" : draft.type === "lent" ? "Lent Date" : "Start date"}
            value={draft.startDate}
            onChange={(iso) => set({ startDate: iso })}
          />
        </View>
        <View className="flex-1">
          {isDeposit ? (
            <DateField
              label="Maturity Date"
              value={draft.maturityDate ?? maturityDateOf(draft)}
              maximumDate={FAR_FUTURE}
              onChange={(iso) => set({ maturityDate: iso })}
            />
          ) : (
            <Labeled label="Period (months)" optional>
              <Input value={draft.period} onChangeText={(v) => set({ period: v.replace(/[^0-9]/g, "") })} placeholder="e.g., 60" keyboardType="number-pad" />
            </Labeled>
          )}
        </View>
      </View>

      {/* Live computed value */}
      {value > 0 && !isDeposit && (
        <View className="rounded-[14px] p-4 border border-accent-green/20" style={{ backgroundColor: "rgba(74,222,128,0.08)" }}>
          <Text className="text-xs text-secondary font-bold uppercase mb-1">Value</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#4ade80" }}>{fmt(value)}</Text>
        </View>
      )}
    </View>
  );
}

// ── Small building blocks ─────────────────────────────────────────────────────
function Labeled({
  label, optional, right, children,
}: {
  label: string;
  optional?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
          {label} {optional && <Text className="text-dim">(optional)</Text>}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#374151"
      {...props}
      className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

function CurrencyInput({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  return (
    <View className="flex-row items-center rounded-[12px] px-4 gap-2 border border-white/10" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
      <Text style={{ fontSize: 20, color: "#a855f7", fontWeight: "700" }}>₹</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor="#374151"
        keyboardType="decimal-pad"
        style={{ flex: 1, paddingVertical: 14, fontSize: 20, fontWeight: "700", color: "#fff" }}
      />
    </View>
  );
}

