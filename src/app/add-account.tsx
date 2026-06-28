/**
 * Add Account form. Opened from the Accounts list ("+") and the empty-state
 * CTA. Reuses the onboarding AccountStep fields, wrapped with its own header
 * and save button. On save the account is persisted and we navigate back.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AccountStep, { type AccountForm } from "@/components/onboarding/AccountStep";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/store/accountStore";
import { replayForNewAccount } from "@/services/bankIngest";
import { toast } from "@/store/toastStore";

const EMPTY: AccountForm = {
  type: "bank",
  bank: "",
  nickname: "",
  accountNumber: "",
  ifsc: "",
  branch: "",
  balance: "",
};

export default function AddAccountScreen() {
  const { id, bank: prefillBank, last4: prefillLast4 } = useLocalSearchParams<{ id?: string; bank?: string; last4?: string }>();
  const addAccount    = useAccountStore((s) => s.addAccount);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const removeAccount = useAccountStore((s) => s.removeAccount);
  const existing      = useAccountStore((s) => s.accounts.find((a) => a.id === id));
  const isEdit        = !!existing;

  const [account, setAccount] = useState<AccountForm>(
    existing
      ? {
          type:          existing.type,
          bank:          existing.bank,
          nickname:      existing.nickname,
          accountNumber: existing.accountNumber ?? "",
          ifsc:          existing.ifsc ?? "",
          branch:        existing.branch ?? "",
          balance:       String(existing.balance),
        }
      : { ...EMPTY, bank: prefillBank ?? "", accountNumber: prefillLast4 ?? "" },
  );
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!account.bank.trim()) {
      toast.error("Please enter a bank / account name.");
      return;
    }
    if (!account.balance.trim()) {
      toast.error("Please enter the current balance.");
      return;
    }
    setSaving(true);
    const payload = {
      type:          account.type,
      bank:          account.bank.trim(),
      nickname:      account.nickname.trim() || account.bank.trim(),
      accountName:   account.nickname.trim() || undefined,
      accountNumber: account.accountNumber.trim() || undefined,
      ifsc:          account.ifsc.trim() || undefined,
      branch:        account.branch.trim() || undefined,
      balance:       parseFloat(account.balance) || 0,
    };
    if (isEdit) {
      updateAccount(existing.id, payload);
      toast.success("Account updated.");
    } else {
      addAccount(payload);
      // replay any notification txns that arrived before this account was added
      const added = useAccountStore.getState().accounts.at(-1)!;
      replayForNewAccount(added);
      toast.success("Account added.");
    }
    setSaving(false);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert("Delete account", `Remove "${existing.nickname || existing.bank}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => { removeAccount(existing.id); toast.success("Account deleted."); router.back(); },
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
          <Text className="text-lg font-bold text-white">{isEdit ? "Edit Account" : "Add Account"}</Text>
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
          <AccountStep account={account} onAccountChange={setAccount} hideHeader />
        </ScrollView>

        <View
          className="px-xl pt-3 pb-2"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}
        >
          <Button
            label={saving ? "Saving…" : isEdit ? "Update Account" : "Save Account"}
            onPress={handleSave}
            isLoading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
