import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BankPicker from "@/components/onboarding/BankPicker";
import { exampleAccountNumber, exampleIfsc, accountLenRange } from "@/constants/indianBanks";
import { useBankStore } from "@/store/bankStore";

export interface AccountForm {
  type: string;
  bank: string;
  nickname: string;        // account name (optional)
  accountNumber: string;   // full account number (vault) — masked outside vault
  ifsc: string;            // optional
  branch: string;          // optional
  balance: string;
}

interface AccountStepProps {
  account: AccountForm;
  onAccountChange: (account: AccountForm) => void;
  hideHeader?: boolean;
}

const ACCOUNT_TYPES: {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { id: "bank",   label: "Bank",   icon: "business-outline" },
  { id: "wallet", label: "Wallet", icon: "wallet-outline"   },
  { id: "cash",   label: "Cash",   icon: "cash-outline"     },
];

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
type IfscStatus = "idle" | "loading" | "found" | "notfound";

export default function AccountStep({ account, onAccountChange, hideHeader }: AccountStepProps) {
  const [ifscStatus, setIfscStatus] = useState<IfscStatus>("idle");
  const lastLookedUp = useRef<string>("");
  const banks = useBankStore((s) => s.banks);

  // Choosing a type. Cash needs no name — we label it "Cash" automatically so
  // it still has a title; switching away from Cash clears that placeholder.
  const setType = (id: string) => {
    const next = { ...account, type: id };
    if (id === "cash") next.bank = "Cash";
    else if (account.bank === "Cash") next.bank = "";
    onAccountChange(next);
  };

  // Auto-detect branch from a complete, well-formed IFSC via Razorpay's free
  // public IFSC API (no key). Only fills an empty branch so manual edits stick.
  useEffect(() => {
    const ifsc = account.ifsc.trim().toUpperCase();
    if (account.type !== "bank" || !IFSC_RE.test(ifsc)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIfscStatus("idle");
      return;
    }
    if (ifsc === lastLookedUp.current) return;
    lastLookedUp.current = ifsc;

    let cancelled = false;
    setIfscStatus("loading");
    fetch(`https://ifsc.razorpay.com/${ifsc}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((data: { BRANCH?: string; CITY?: string }) => {
        if (cancelled) return;
        setIfscStatus("found");
        // Razorpay's BRANCH often packs the whole address ("RAJGIR, DISTT.
        // NALANDA, BIHAR …") — keep just the first comma-segment as the branch.
        const branch = (data.BRANCH ?? "").split(",")[0].trim();
        if (branch && !account.branch.trim()) {
          onAccountChange({ ...account, ifsc, branch });
        }
      })
      .catch(() => {
        if (!cancelled) setIfscStatus("notfound");
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.ifsc, account.type]);

  const acctPlaceholder = `e.g., ${exampleAccountNumber(account.bank, banks)}`;
  const ifscPlaceholder = exampleIfsc(account.bank, banks);

  // Account-number length hint/validation for the selected bank (when known).
  const lenRange = accountLenRange(account.bank, banks);
  const acctLen = account.accountNumber.length;
  const acctLenBad = !!lenRange && acctLen > 0 && (acctLen < lenRange.min || acctLen > lenRange.max);
  const lenHint = lenRange
    ? lenRange.min === lenRange.max
      ? `${account.bank} account numbers are ${lenRange.min} digits.`
      : `${account.bank} account numbers are ${lenRange.min}–${lenRange.max} digits.`
    : null;

  return (
    <View className="gap-5">
      {/* Header */}
      {!hideHeader && (
        <View className="gap-1">
          <Text className="text-[26px] font-extrabold text-white">Add Your First Account</Text>
          <Text className="text-base text-muted">Track all your money in one place</Text>
        </View>
      )}

      {/* Account type */}
      <View className="gap-[10px]">
        <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
          Select Account Type
        </Text>
        <View className="flex-row gap-[10px]">
          {ACCOUNT_TYPES.map((t) => {
            const active = account.type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                activeOpacity={0.7}
                className={`flex-1 py-[14px] rounded-[14px] items-center gap-1.5 border-[1.5px] ${
                  active ? "border-accent-purple" : "border-white/10"
                }`}
                style={{ backgroundColor: active ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)" }}
              >
                <Ionicons name={t.icon} size={22} color={active ? "#a855f7" : "#6b7280"} />
                <Text className={`text-xs font-semibold ${active ? "text-accent-purple-light" : "text-muted"}`}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Name — bank uses a searchable picker; wallet a free text field; cash none */}
      {account.type === "bank" && (
        <View className="gap-[10px]">
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Bank Name</Text>
          <BankPicker
            value={account.bank}
            onSelect={(name) => onAccountChange({ ...account, bank: name })}
            placeholder="Search your bank"
          />
        </View>
      )}

      {account.type === "wallet" && (
        <View className="gap-[10px]">
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Wallet Name</Text>
          <TextInput
            value={account.bank}
            onChangeText={(v) => onAccountChange({ ...account, bank: v })}
            placeholder="e.g., Paytm Wallet"
            placeholderTextColor="#374151"
            className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          />
        </View>
      )}

      {/* Account number + IFSC — bank accounts only (needed to match alerts) */}
      {account.type === "bank" && (
        <>
          <View className="gap-[10px]">
            <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
              Account Number
            </Text>
            <TextInput
              value={account.accountNumber}
              onChangeText={(v) => onAccountChange({ ...account, accountNumber: v.replace(/[^0-9]/g, "") })}
              placeholder={acctPlaceholder}
              placeholderTextColor="#374151"
              keyboardType="number-pad"
              className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />
            {acctLenBad ? (
              <Text className="text-[11px] text-accent-red">{lenHint}</Text>
            ) : lenHint ? (
              <Text className="text-[11px] text-dim">{lenHint}</Text>
            ) : (
              <Text className="text-[11px] text-dim">
                Stored securely; shown in full only on your vault page. Used to auto-match bank alerts.
              </Text>
            )}
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
                IFSC <Text className="text-dim">(optional)</Text>
              </Text>
              <TextInput
                value={account.ifsc}
                onChangeText={(v) => onAccountChange({ ...account, ifsc: v.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                placeholder={ifscPlaceholder}
                placeholderTextColor="#374151"
                autoCapitalize="characters"
                maxLength={11}
                className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              />
            </View>
            <View className="flex-1 gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
                Branch <Text className="text-dim">(optional)</Text>
              </Text>
              <TextInput
                value={account.branch}
                onChangeText={(v) => onAccountChange({ ...account, branch: v })}
                placeholder="e.g., Andheri"
                placeholderTextColor="#374151"
                className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              />
            </View>
          </View>

          {/* IFSC lookup status */}
          {ifscStatus === "loading" && (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#6b7280" />
              <Text className="text-[11px] text-dim">Looking up branch…</Text>
            </View>
          )}
          {ifscStatus === "found" && (
            <Text className="text-[11px] text-accent-green">✓ Branch detected from IFSC</Text>
          )}
          {ifscStatus === "notfound" && (
            <Text className="text-[11px] text-dim">Couldn’t find that IFSC — enter the branch manually.</Text>
          )}
        </>
      )}

      {/* Account name (optional) — not meaningful for cash */}
      {account.type !== "cash" && (
        <View className="gap-[10px]">
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
            Account Name <Text className="text-dim">(optional)</Text>
          </Text>
          <TextInput
            value={account.nickname}
            onChangeText={(v) => onAccountChange({ ...account, nickname: v })}
            placeholder="e.g., Salary Account"
            placeholderTextColor="#374151"
            className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          />
        </View>
      )}

      {/* Balance */}
      <View className="gap-[10px]">
        <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
          {account.type === "cash" ? "Cash in Hand" : "Current Balance"}
        </Text>
        <View
          className="flex-row items-center rounded-[12px] px-4 gap-2 border border-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <Text style={{ fontSize: 20, color: "#a855f7", fontWeight: "700" }}>₹</Text>
          <TextInput
            value={account.balance}
            onChangeText={(v) => onAccountChange({ ...account, balance: v.replace(/[^0-9.]/g, "") })}
            placeholder="0.00"
            placeholderTextColor="#374151"
            keyboardType="decimal-pad"
            style={{ flex: 1, paddingVertical: 14, fontSize: 20, fontWeight: "700", color: "#fff" }}
          />
        </View>
      </View>

      {/* Preview */}
      {account.bank && account.balance ? (
        <View
          className="rounded-[14px] p-4 border border-accent-purple/25"
          style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
        >
          <Text className="text-xs text-secondary font-bold uppercase mb-1.5">Preview</Text>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 4 }}>
            ₹ {parseFloat(account.balance || "0").toLocaleString("en-IN")}
          </Text>
          <Text className="text-xs text-muted">
            {account.nickname || account.bank} ·{" "}
            {ACCOUNT_TYPES.find((t) => t.id === account.type)?.label ?? "Account"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
