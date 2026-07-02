/**
 * Edit an existing transaction. Mirrors the Add tab's fields but is wired to the
 * store's updateTransaction (and a delete in the header). Reached from a
 * transaction's detail screen.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button } from "@/components/ui/Button";
import { useTransactionStore } from "@/store/transactionStore";
import { learnCategory, categoryKey } from "@/store/categoryStore";
import { useAccountStore, accountLabel } from "@/store/accountStore";
import { Chip } from "@/components/ui/Chip";
import { TX_TYPES, TX_TYPE_COLORS, CATEGORIES, type TxType } from "@/constants/categories";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx     = useTransactionStore((s) => s.transactions.find((t) => t.id === id));
  const update = useTransactionStore((s) => s.updateTransaction);
  const remove = useTransactionStore((s) => s.removeTransaction);

  const [txType,    setTxType]    = useState<TxType>(tx?.type ?? "Expense");
  const [amount,    setAmount]    = useState(tx ? String(tx.amount) : "");
  const [category,  setCategory]  = useState(tx?.category ?? "");
  const [merchant,  setMerchant]  = useState(tx?.merchant ?? "");
  const accounts = useAccountStore((s) => s.accounts);
  const [accountId, setAccountId] = useState<string>(() => {
    if (tx?.accountId) return tx.accountId;
    // Recover id from stored label for old transactions that pre-date accountId.
    const match = accounts.find((a) => accountLabel(a) === tx?.account);
    return match?.id ?? "cash";
  });
  const [date,     setDate]     = useState<Date>(tx ? new Date(tx.date) : new Date());
  const [note,     setNote]     = useState(tx?.note ?? "");
  const [showDate, setShowDate] = useState(false);
  const [saving,   setSaving]   = useState(false);

  if (!tx) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker items-center justify-center px-8 gap-3">
        <Ionicons name="receipt-outline" size={30} color="#6b7280" />
        <Text className="text-sm text-muted text-center">This transaction no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-2 px-5 py-2.5 rounded-[12px] bg-accent-purple">
          <Text className="text-sm font-bold text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const color = TX_TYPE_COLORS[txType];

  const handleSave = async () => {
    if (!amount)   { toast.error("Please enter an amount."); return; }
    if (!category) { toast.error("Please pick a category."); return; }
    setSaving(true);
    const merchantName = merchant.trim() || category;
    const acc = accounts.find((a) => a.id === accountId);
    update(tx.id, {
      type:      txType,
      amount:    parseFloat(amount) || 0,
      category,
      merchant:  merchantName,
      account:   acc ? accountLabel(acc) : "Cash",
      accountId: acc?.id,
      date:      date.toISOString(),
      note:      note.trim(),
    });
    setSaving(false);

    const finish = () => { toast.success("Transaction updated."); router.back(); };

    // If the category changed and other transactions share this merchant, ask
    // whether to retag just this one or all of them — instead of silently
    // propagating to every match. (#21)
    const key = categoryKey(merchantName);
    const matches = useTransactionStore.getState().transactions
      .filter((t) => t.id !== tx.id && categoryKey(t.merchant) === key).length;

    if (category !== tx.category && matches > 0 && key !== "unknown") {
      confirm({
        title: "Apply to matching transactions?",
        message: `${matches} other transaction${matches > 1 ? "s" : ""} from "${merchantName}" ${matches > 1 ? "share" : "shares"} this merchant. Recategorise ${matches > 1 ? "them" : "it"} to "${category}" too, or just this one?`,
        confirmText: "All matching",
        cancelText: "Just this one",
        onConfirm: () => { learnCategory(merchantName, category); finish(); },
        onCancel: finish, // this txn only — don't learn a rule or retag siblings
      });
    } else {
      // No siblings to affect: safe to learn the rule for future txns.
      learnCategory(merchantName, category);
      finish();
    }
  };

  const handleDelete = () => {
    confirm({
      title: "Delete transaction",
      message: "Remove this transaction? This can't be undone.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => { remove(tx.id); toast.success("Transaction deleted."); router.dismissAll(); },
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
          <Text className="text-lg font-bold text-white">Edit Transaction</Text>
          <TouchableOpacity
            onPress={handleDelete}
            className="w-[38px] h-[38px] rounded-[11px] border border-accent-red/35 items-center justify-center"
            style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#f87171" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type toggle */}
          <View className="flex-row mb-[18px] bg-white/[0.05] rounded-[12px] p-1 border border-white/[0.08]">
            {TX_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTxType(t); setCategory(""); }}
                className="flex-1 py-[10px] rounded-[9px] items-center"
                style={txType === t ? { backgroundColor: TX_TYPE_COLORS[t] + "cc" } : undefined}
                activeOpacity={0.75}
              >
                <Text className="text-[13px] font-semibold" style={{ color: txType === t ? "#fff" : "#4b5563" }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="gap-[18px]">
            {/* Amount */}
            <View className="bg-white/[0.05] rounded-2xl p-5 border border-white/[0.08]">
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px]">Amount</Text>
              <View className="flex-row items-center gap-[6px] mt-[10px]">
                <Text className="text-[30px] font-bold" style={{ color }}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#4b5563"
                  className="flex-1 text-[40px] font-extrabold"
                  style={{ color, letterSpacing: -1, paddingVertical: 0 }}
                  maxLength={12}
                />
              </View>
            </View>

            {/* Category */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES[txType].map((c) => {
                  const active = category === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setCategory(c.name)}
                      className={`w-[22%] rounded-[13px] border items-center ${
                        active ? "bg-accent-purple/[0.15] border-accent-purple" : "bg-white/[0.05] border-white/[0.08]"
                      }`}
                      style={{ aspectRatio: 0.9, paddingVertical: 8, paddingHorizontal: 3 }}
                      activeOpacity={0.75}
                    >
                      {/* Icon fills the flexible top zone so it's centred the same
                          in every tile regardless of how many lines the label wraps to. */}
                      <View className="flex-1 items-center justify-center">
                        <Ionicons name={c.icon} size={22} color={active ? color : "#6b7280"} />
                      </View>
                      <View className="items-center justify-center" style={{ height: 20 }}>
                        <Text numberOfLines={2} className="text-[8px] text-center font-semibold" style={{ color: active ? color : "#6b7280", lineHeight: 10 }}>{c.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Merchant */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">Merchant / Payee</Text>
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g., Swiggy"
                placeholderTextColor="#4b5563"
                className="bg-white/[0.05] rounded-[12px] border border-white/[0.08] px-[14px] py-[13px] text-[14px] text-gray-300"
              />
            </View>

            {/* Account */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">Account</Text>
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
                    selected={accountId === "cash"}
                    icon="cash-outline"
                    onPress={() => setAccountId("cash")}
                  />
                </View>
              </ScrollView>
            </View>

            {/* Date */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">Date</Text>
              <TouchableOpacity
                onPress={() => setShowDate(true)}
                className="flex-row items-center gap-[10px] bg-white/[0.05] rounded-[12px] border border-white/[0.08] px-[14px] py-[14px]"
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                <Text className="text-[15px] text-gray-300">
                  {date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </Text>
              </TouchableOpacity>
              {showDate && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(e, selected) => {
                    setShowDate(Platform.OS === "ios");
                    if (e.type === "set" && selected) setDate(selected);
                  }}
                />
              )}
            </View>

            {/* Note */}
            <View>
              <Text className="text-[11px] text-muted font-bold uppercase tracking-[0.8px] mb-[10px]">Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note…"
                placeholderTextColor="#4b5563"
                className="bg-white/[0.05] rounded-[12px] border border-white/[0.08] px-[14px] py-3 text-[14px] text-gray-300 min-h-[60px]"
                multiline
                textAlignVertical="top"
              />
            </View>

            <Button label={saving ? "Saving…" : "Update Transaction"} onPress={handleSave} isLoading={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
