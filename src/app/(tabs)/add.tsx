import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { S } from "@/constants/theme";
import { Chip } from "@/components/ui/Chip";
import { TX_TYPES, TX_TYPE_COLORS, CATEGORIES, type TxType } from "@/constants/categories";
import { fmtDate } from "@/utils/formatters";
import { useTransactionStore } from "@/store/transactionStore";
import { learnCategory } from "@/store/categoryStore";
import { useAccountStore, accountLabel, type Account } from "@/store/accountStore";
import { toast } from "@/store/toastStore";

const CASH = "cash"; // pseudo-account id for non-account spending

export default function AddScreen() {
  const accounts = useAccountStore((s) => s.accounts);

  const [txType,   setTxType]   = useState<TxType>("Expense");
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState<string>(CASH); // expense/income source
  const [fromId,   setFromId]   = useState<string>("");     // transfer source
  const [toId,     setToId]     = useState<string>("");     // transfer destination
  const [note,     setNote]     = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const today = fmtDate();
  const amtColor = TX_TYPE_COLORS[txType];
  const isTransfer = txType === "Transfer";

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const findAcc = (id: string) => accounts.find((a) => a.id === id);

  const handleSave = async () => {
    if (!amount || !category) return;

    if (isTransfer) {
      const from = findAcc(fromId);
      const to = findAcc(toId);
      if (!from || !to) { toast.error("Pick both accounts to transfer between."); return; }
      if (from.id === to.id) { toast.error("Transfer must be between two different accounts."); return; }
      setIsSaving(true);
      addTransaction({
        type:         "Transfer",
        amount:       parseFloat(amount) || 0,
        category,
        merchant:     `${accountLabel(from)} → ${accountLabel(to)}`,
        account:      accountLabel(from),
        accountId:    from.id,
        toAccountId:  to.id,
        bank:         from.bank,
        date:         new Date().toISOString(),
        note:         note.trim(),
        source:       "manual",
        status:       "confirmed",
        confidence:   "high",
      });
      toast.success("Transfer saved.");
      setAmount(""); setCategory(""); setNote("");
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    const acc = findAcc(accountId);
    const merchantName = note.trim() || category;
    addTransaction({
      type:       txType,
      amount:     parseFloat(amount) || 0,
      category,
      merchant:   merchantName,
      account:    acc ? accountLabel(acc) : "Cash",
      accountId:  acc?.id,
      bank:       acc?.bank ?? "",
      date:       new Date().toISOString(),
      note:       note.trim(),
      source:     "manual",
      status:     "confirmed",
      confidence: "high",
    });
    // Learn this merchant→category so similar txns auto-adopt it.
    learnCategory(merchantName, category);
    toast.success(`${txType} saved.`);
    setAmount(""); setCategory(""); setNote("");
    setIsSaving(false);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-3 pb-[14px]">
            <Text className="text-[22px] font-bold text-white">Add Transaction</Text>
          </View>

          {/* Type toggle */}
          <View className="flex-row mx-5 mb-[18px] bg-white/[0.05] rounded-[12px] p-1 border border-white/[0.08]">
            {TX_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTxType(t); setCategory(""); }}
                className="flex-1 py-[10px] rounded-[9px] items-center"
                style={txType === t ? { backgroundColor: TX_TYPE_COLORS[t] + "cc" } : undefined}
                activeOpacity={0.75}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: txType === t ? "#fff" : "#4b5563" }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="px-5 gap-[18px]">
            {/* Amount */}
            <View className="bg-white/[0.05] rounded-2xl p-5 border border-white/[0.08]">
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px]">Amount</Text>
              <View className="flex-row items-center gap-[6px] mt-[10px]">
                <Text className="text-[30px] font-bold" style={{ color: amtColor }}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#4b5563"
                  className="flex-1 text-[40px] font-extrabold"
                  style={{ color: amtColor, letterSpacing: -1, paddingVertical: 0 }}
                  maxLength={12}
                />
              </View>
            </View>

            {/* Category */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES[txType].map((c) => {
                  const active = category === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setCategory(c.name)}
                      className={`w-[22%] rounded-[13px] border items-center justify-center gap-[5px] ${
                        active
                          ? "bg-accent-purple/[0.15] border-accent-purple"
                          : "bg-white/[0.05] border-white/[0.08]"
                      }`}
                      style={{ aspectRatio: 0.9 }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={c.icon} size={22} color={active ? amtColor : "#6b7280"} />
                      <Text
                        className="text-[8px] text-center font-semibold"
                        style={{ color: active ? amtColor : "#6b7280" }}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Account(s) — only the user's added accounts (no hardcoding) */}
            {isTransfer ? (
              accounts.length < 2 ? (
                <View className="rounded-[12px] border border-white/[0.08] px-4 py-3 bg-white/[0.03]">
                  <Text className="text-[12px] text-dim">
                    Add at least two accounts to transfer between them.
                  </Text>
                </View>
              ) : (
                <>
                  <AccountRow
                    label="From"
                    accounts={accounts}
                    selectedId={fromId}
                    onSelect={setFromId}
                  />
                  <AccountRow
                    label="To"
                    accounts={accounts}
                    selectedId={toId}
                    onSelect={setToId}
                    excludeId={fromId}
                  />
                </>
              )
            ) : (
              <View>
                <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">
                  Account
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {accounts.map((a) => (
                      <Chip
                        key={a.id}
                        label={accountLabel(a)}
                        selected={accountId === a.id}
                        icon="business-outline"
                        onPress={() => setAccountId(a.id)}
                      />
                    ))}
                    <Chip
                      label="Cash"
                      selected={accountId === CASH}
                      icon="cash-outline"
                      onPress={() => setAccountId(CASH)}
                    />
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Date */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">
                Date
              </Text>
              <View className="flex-row items-center gap-[10px] bg-white/[0.05] rounded-[12px] border border-white/[0.08] px-[14px] py-[14px]">
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                <Text className="text-[15px] text-gray-300">{today}</Text>
              </View>
            </View>

            {/* Note */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">
                Note (optional)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note…"
                placeholderTextColor="#4b5563"
                className="bg-white/[0.05] rounded-[12px] border border-white/[0.08] px-[14px] py-3 text-[14px] text-gray-300 min-h-[60px]"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Receipt */}
            <TouchableOpacity
              className="flex-row items-center gap-3 rounded-[12px] border-[1.5px] border-dashed border-white/[0.08] py-[14px] px-4 bg-white/[0.02]"
              activeOpacity={0.7}
            >
              <Ionicons name="attach-outline" size={20} color="#6b7280" />
              <View>
                <Text className="text-[13px] text-secondary font-semibold">Add Receipt</Text>
                <Text className="text-[11px] text-dim">Upload bill / receipt image</Text>
              </View>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={!amount || !category || isSaving}
              className={`flex-row items-center justify-center gap-2 bg-accent-purple rounded-[14px] py-4 mt-1 mb-1 ${
                !amount || !category || isSaving ? "opacity-40" : ""
              }`}
              style={S.purple}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text className="text-[16px] font-bold text-white">Save {txType}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Account picker row (From / To) ──────────────────────────────────────────────
function AccountRow({
  label, accounts, selectedId, onSelect, excludeId,
}: {
  label: string;
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
  excludeId?: string;
}) {
  return (
    <View>
      <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {accounts
            .filter((a) => a.id !== excludeId)
            .map((a) => (
              <Chip
                key={a.id}
                label={accountLabel(a)}
                selected={selectedId === a.id}
                icon="business-outline"
                onPress={() => onSelect(a.id)}
              />
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
