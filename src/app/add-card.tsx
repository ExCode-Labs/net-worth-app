/**
 * Add Card form — credit and debit cards.
 *
 * Credit cards: full set of fields (bill cycle, due date, limit, PAN, holder).
 * Debit cards: linked account required; billing/limit fields hidden.
 *
 * Vault: PAN and card holder are stored server-side and returned only via
 * GET /vault after vault PIN auth. CVV is never collected.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import BankPicker from "@/components/onboarding/BankPicker";
import CardProductPicker from "@/components/CardProductPicker";
import { useCardStore, bankForIssuer } from "@/store/cardStore";
import { useAccountStore, accountLast4 } from "@/store/accountStore";
import { replayForNewCard } from "@/services/bankIngest";
import { useUserStore } from "@/store/userStore";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";
import { apiError } from "@/utils/apiError";

const NETWORKS = ["Visa", "Mastercard", "RuPay", "Amex", "Diners Club"] as const;

const groupCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

function detectNetwork(digits: string): (typeof NETWORKS)[number] | null {
  if (/^4/.test(digits)) return "Visa";
  if (/^(34|37)/.test(digits)) return "Amex";
  if (/^(36|38|30)/.test(digits)) return "Diners Club";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^(60|65|81|508)/.test(digits)) return "RuPay";
  return null;
}

interface Field {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  optional?: boolean;
  hint?: string;
  maxLength?: number;
}

function LabeledInput({ f }: { f: Field }) {
  return (
    <View className="gap-[10px]">
      <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
        {f.label} {f.optional && <Text className="text-dim">(optional)</Text>}
      </Text>
      <TextInput
        value={f.value}
        onChangeText={f.set}
        placeholder={f.placeholder}
        placeholderTextColor="#374151"
        keyboardType={f.keyboardType ?? "default"}
        maxLength={f.maxLength}
        className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      />
      {f.hint ? <Text className="text-[11px] text-dim">{f.hint}</Text> : null}
    </View>
  );
}

export default function AddCardScreen() {
  const { id, bank: prefillBank, last4: prefillLast4 } = useLocalSearchParams<{ id?: string; bank?: string; last4?: string }>();
  const addCard    = useCardStore((s) => s.addCard);
  const updateCard = useCardStore((s) => s.updateCard);
  const removeCard = useCardStore((s) => s.removeCard);
  const existing   = useCardStore((s) => s.cards.find((c) => c.id === id));
  const accounts   = useAccountStore((s) => s.accounts);
  const isEdit     = !!existing;

  const { fullName: profileFullName, firstName, lastName, guestName } = useUserStore();
  const fullName =
    profileFullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    guestName ||
    "";

  const [cardType, setCardType]           = useState<"credit" | "debit">(existing?.type ?? "credit");
  const [cardName, setCardName]           = useState(existing?.cardName ?? "");
  const [bank, setBank]                   = useState(existing?.bank ?? prefillBank ?? "");
  const [productIssuer, setProductIssuer] = useState<string>("");
  const [billCycle, setBillCycle]         = useState(existing?.billCycle ?? "");
  const [dueDate, setDueDate]             = useState(existing?.dueDate ?? "");
  const [number, setNumber]               = useState(groupCardNumber(existing?.number ?? prefillLast4 ?? ""));
  const [cardHolder, setCardHolder]       = useState(existing?.cardHolder ?? fullName);
  const [network, setNetwork]             = useState(existing?.network ?? "");
  const [expiry, setExpiry]               = useState(existing?.expiry ?? "");
  const [limit, setLimit]                 = useState(existing ? String(existing.limit) : "");
  const [linkedAccountId, setLinkedAccountId] = useState(existing?.linkedAccountId ?? "");
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!existing && !cardHolder && fullName) setCardHolder(fullName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName]);

  const setExpiryFmt = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };

  const setNumberFmt = (v: string) => {
    const grouped = groupCardNumber(v);
    setNumber(grouped);
    const net = detectNetwork(grouped.replace(/\s/g, ""));
    if (net) setNetwork(net);
  };

  const clampDay = (v: string, set: (s: string) => void) => {
    const d = v.replace(/\D/g, "").slice(0, 2);
    set(d && parseInt(d, 10) > 31 ? "31" : d);
  };
  const setBillDay = (v: string) => clampDay(v, setBillCycle);
  const setDueDay  = (v: string) => clampDay(v, setDueDate);

  const handleSave = async () => {
    if (!cardName.trim()) { toast.error("Please enter a card name."); return; }
    if (!bank.trim())     { toast.error("Please enter the card's bank."); return; }
    if (!network.trim())  { toast.error("Please select the card network."); return; }
    if (cardType === "debit" && !linkedAccountId) {
      toast.error("Please select the bank account this debit card belongs to.");
      return;
    }
    if (cardType === "credit" && !limit.trim()) {
      toast.error("Please enter the total credit limit.");
      return;
    }

    setSaving(true);
    const digits = number.replace(/\D/g, "");
    const last4 = digits.slice(-4) || (prefillLast4 ?? "");
    if (!last4) {
      toast.error("Enter at least the last 4 card digits so transactions can be linked automatically.");
      setSaving(false);
      return;
    }

    const payload = {
      cardName:   cardName.trim(),
      bank:       bank.trim(),
      type:       cardType,
      billCycle:  cardType === "credit" ? billCycle.trim() : "",
      dueDate:    cardType === "credit" ? (dueDate.trim() || undefined) : undefined,
      number:     digits || undefined,
      cardHolder: cardHolder.trim() || undefined,
      network:    network.trim() || undefined,
      last4,
      expiry:     expiry.trim(),
      limit:      cardType === "credit" ? (parseFloat(limit) || 0) : 0,
      linkedAccountId: cardType === "debit" ? linkedAccountId : undefined,
    };

    if (isEdit) {
      updateCard(existing.id, payload);
      toast.success("Card updated.");
    } else {
      try {
        const added = await addCard(payload);
        replayForNewCard(added);
        toast.success("Card added.");
      } catch (e) {
        toast.error(apiError(e, "Failed to save card. Check your connection and try again."));
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirm({
      title: "Delete card",
      message: `Remove "${existing.cardName}"? This can't be undone.`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => { removeCard(existing.id); toast.success("Card deleted."); router.back(); },
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-xl pt-3 pb-[14px]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">{isEdit ? "Edit Card" : "Add Card"}</Text>
          {isEdit ? (
            <TouchableOpacity
              onPress={handleDelete}
              className="w-[38px] h-[38px] rounded-[11px] border border-accent-red/35 items-center justify-center"
              style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-5">

            {/* Card type toggle */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Card Type</Text>
              <View className="flex-row gap-3">
                {(["credit", "debit"] as const).map((t) => {
                  const active = cardType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        if (cardType === t) return;
                        setCardType(t);
                        setCardName("");
                        setBank("");
                        setProductIssuer("");
                        setNetwork("");
                      }}
                      className={`flex-1 py-3 rounded-[12px] items-center border ${active ? "border-accent-purple" : "border-white/10"}`}
                      style={{ backgroundColor: active ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.06)" }}
                    >
                      <Text className={`text-sm font-semibold capitalize ${active ? "text-accent-purple-light" : "text-muted"}`}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Card Name */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Card Name</Text>
              <CardProductPicker
                value={cardName}
                placeholder="Search your card"
                cardType={cardType}
                onSelect={(p) => {
                  setCardName(p.name);
                  const knownIssuer = p.issuer && p.issuer !== "Multiple Banks" ? p.issuer : "";
                  setProductIssuer(knownIssuer);
                  if (knownIssuer) setBank(bankForIssuer(knownIssuer));
                  else if (!knownIssuer) setBank("");
                  if (p.network) setNetwork(p.network);
                }}
              />
            </View>

            {/* Bank — hidden when auto-filled from a bank-specific card */}
            {productIssuer ? (
              <View className="gap-[10px]">
                <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Card Bank</Text>
                <View className="flex-row items-center justify-between rounded-[12px] px-4 py-[14px] border border-white/10"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <Text className="text-base text-white">{bank || productIssuer}</Text>
                  <TouchableOpacity onPress={() => { setProductIssuer(""); setBank(""); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="gap-[10px]">
                <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Card Bank</Text>
                <BankPicker value={bank} onSelect={setBank} placeholder="Search your bank" />
              </View>
            )}

            {/* Credit-only fields */}
            {cardType === "credit" && (
              <>
                <LabeledInput f={{ label: "Statement Date", value: billCycle, set: setBillDay, placeholder: "e.g., 5", keyboardType: "number-pad", maxLength: 2, hint: "Day of the month your statement is generated (1–31)." }} />
                <LabeledInput f={{ label: "Payment Due Date", value: dueDate, set: setDueDay, placeholder: "e.g., 25", keyboardType: "number-pad", maxLength: 2, optional: true, hint: "Day of the month your payment is due (1–31)." }} />
              </>
            )}

            <LabeledInput f={{ label: "Card Number", value: number, set: setNumberFmt, placeholder: "1234 5678 9012 3456", keyboardType: "number-pad", maxLength: 19, hint: prefillLast4 ? `Linking the card ending ${prefillLast4}. Keep just these 4 digits, or clear and type the full number to auto-detect the network.` : "Network is detected automatically. Stored securely, shown only on your vault page." }} />

            <LabeledInput f={{ label: "Card Holder", value: cardHolder, set: setCardHolder, placeholder: "Name on card" }} />

            {/* Network */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Network</Text>
              <View className="flex-row gap-2 flex-wrap">
                {NETWORKS.map((n) => {
                  const active = network === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setNetwork(active ? "" : n)}
                      className={`px-4 py-2 rounded-full border ${active ? "border-accent-purple" : "border-white/10"}`}
                      style={{ backgroundColor: active ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)" }}
                    >
                      <Text className={`text-xs font-semibold ${active ? "text-accent-purple-light" : "text-muted"}`}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <LabeledInput f={{ label: "Expiry", value: expiry, set: setExpiryFmt, placeholder: "MM/YY", keyboardType: "number-pad", maxLength: 5, optional: true }} />

            {/* Credit limit — credit only */}
            {cardType === "credit" && (
              <LabeledInput f={{ label: "Total Limit", value: limit, set: (v) => setLimit(v.replace(/[^0-9.]/g, "")), placeholder: "0.00", keyboardType: "decimal-pad" }} />
            )}

            {/* Linked account — debit only */}
            {cardType === "debit" && (
              <View className="gap-[10px]">
                <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
                  Linked Account <Text className="text-red-400">*</Text>
                </Text>
                {accounts.length === 0 ? (
                  <Text className="text-sm text-muted">
                    No bank accounts saved yet. Add a bank account first.
                  </Text>
                ) : (
                  accounts.map((a) => {
                    const active = linkedAccountId === a.id;
                    const last4  = accountLast4(a);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setLinkedAccountId(active ? "" : a.id)}
                        className={`flex-row items-center gap-3 px-4 py-3 rounded-[12px] border ${active ? "border-accent-purple" : "border-white/10"}`}
                        style={{ backgroundColor: active ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)" }}
                      >
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: active ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.08)" }}
                        >
                          <Ionicons name={active ? "checkmark" : "wallet-outline"} size={15} color={active ? "#a855f7" : "#6b7280"} />
                        </View>
                        <View className="flex-1">
                          <Text className={`text-sm font-semibold ${active ? "text-white" : "text-muted"}`}>
                            {a.accountName?.trim() || a.nickname}
                          </Text>
                          <Text className="text-[11px] text-dim">
                            {a.bank}{last4 ? ` · ••${last4}` : ""}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
                <Text className="text-[11px] text-dim">
                  Debit card transactions update this account's balance automatically.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View
          className="px-xl pt-3 pb-2"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}
        >
          <Button
            label={saving ? "Saving…" : isEdit ? "Update Card" : "Save Card"}
            onPress={handleSave}
            isLoading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
