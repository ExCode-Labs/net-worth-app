/**
 * Add Card form. Collects card name, bank, bill cycle, card number, holder,
 * network, expiry, CVV and total limit.
 *
 * Vault: the full card number, holder and network are saved so the card can act
 * as a secure vault entry (revealed only on the app-lock-protected vault page).
 * CVV is never collected — it's a sensitive value we don't store.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import BankPicker from "@/components/onboarding/BankPicker";
import CardProductPicker from "@/components/CardProductPicker";
import { useCardStore, bankForIssuer } from "@/store/cardStore";
import { replayForNewCard } from "@/services/bankIngest";
import { useUserStore } from "@/store/userStore";
import { toast } from "@/store/toastStore";

const NETWORKS = ["Visa", "Mastercard", "RuPay", "Amex", "Diners Club"] as const;

/** Group raw input into 4-digit blocks: "1234 5678 9012 3456" (max 16 digits). */
const groupCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

/** Detect the network from the leading digits (IIN/BIN), or null if unknown. */
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
  const isEdit     = !!existing;

  // Prefill the holder to the user's full name (still editable).
  const { fullName: profileFullName, firstName, lastName, guestName } = useUserStore();
  const fullName =
    profileFullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    guestName ||
    "";

  const [cardName, setCardName]     = useState(existing?.cardName ?? "");
  const [bank, setBank]             = useState(existing?.bank ?? prefillBank ?? "");
  const [billCycle, setBillCycle]   = useState(existing?.billCycle ?? "");
  const [number, setNumber]         = useState(groupCardNumber(existing?.number ?? prefillLast4 ?? ""));
  const [cardHolder, setCardHolder] = useState(existing?.cardHolder ?? fullName);
  const [network, setNetwork]       = useState(existing?.network ?? "");
  const [expiry, setExpiry]         = useState(existing?.expiry ?? "");
  const [limit, setLimit]           = useState(existing ? String(existing.limit) : "");
  const [saving, setSaving]         = useState(false);

  const setExpiryFmt = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };

  // Group the number AND auto-fill the network from its leading digits.
  const setNumberFmt = (v: string) => {
    const grouped = groupCardNumber(v);
    setNumber(grouped);
    const net = detectNetwork(grouped.replace(/\s/g, ""));
    if (net) setNetwork(net);
  };

  // Bill cycle = a day of the month (1–31).
  const setBillDay = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 2);
    setBillCycle(d && parseInt(d, 10) > 31 ? "31" : d);
  };

  const handleSave = async () => {
    if (!cardName.trim()) { toast.error("Please enter a card name."); return; }
    if (!bank.trim())     { toast.error("Please enter the card's bank."); return; }
    if (!network.trim())  { toast.error("Please select the card network."); return; }
    if (!limit.trim())    { toast.error("Please enter the total limit."); return; }

    setSaving(true);
    const digits = number.replace(/\D/g, "");
    const payload = {
      cardName:   cardName.trim(),
      bank:       bank.trim(),
      billCycle:  billCycle.trim(),
      number:     digits || undefined,
      cardHolder: cardHolder.trim() || undefined,
      network:    network.trim() || undefined,
      last4:      digits.slice(-4),
      expiry:     expiry.trim(),
      limit:      parseFloat(limit) || 0,
    };
    if (isEdit) {
      updateCard(existing.id, payload);
      toast.success("Card updated.");
    } else {
      addCard(payload);
      // replay any notification txns that arrived before this card was added
      const added = useCardStore.getState().cards.at(-1)!;
      replayForNewCard(added);
      toast.success("Card added.");
    }
    setSaving(false);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert("Delete card", `Remove "${existing.cardName}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => { removeCard(existing.id); toast.success("Card deleted."); router.back(); },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
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
            {/* Card Name — typeable dropdown from the card reference list;
                selecting a known card prefills bank + network. */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Card Name</Text>
              <CardProductPicker
                value={cardName}
                placeholder="Search your card"
                onSelect={(p) => {
                  setCardName(p.name);
                  if (p.issuer) setBank(bankForIssuer(p.issuer));
                  if (p.network) setNetwork(p.network);
                }}
              />
            </View>

            {/* Bank — same searchable picker used at onboarding */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Card Bank</Text>
              <BankPicker value={bank} onSelect={setBank} placeholder="Search your bank" />
            </View>

            <LabeledInput f={{ label: "Bill Cycle Date", value: billCycle, set: setBillDay, placeholder: "e.g., 22", keyboardType: "number-pad", maxLength: 2, hint: "Statement day of the month (1–31)." }} />
            <LabeledInput f={{ label: "Card Number", value: number, set: setNumberFmt, placeholder: "1234 5678 9012 3456", keyboardType: "number-pad", maxLength: 19, hint: "Network is detected automatically. Stored securely, shown only on your vault page." }} />

            <LabeledInput f={{ label: "Card Holder", value: cardHolder, set: setCardHolder, placeholder: "Name on card" }} />

            {/* Network — mandatory; auto-filled from the card number, editable. */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
                Network
              </Text>
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

            {/* Expiry */}
            <LabeledInput f={{ label: "Expiry", value: expiry, set: setExpiryFmt, placeholder: "MM/YY", keyboardType: "number-pad", maxLength: 5, optional: true }} />

            <LabeledInput f={{ label: "Total Limit", value: limit, set: (v) => setLimit(v.replace(/[^0-9.]/g, "")), placeholder: "0.00", keyboardType: "decimal-pad" }} />
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
