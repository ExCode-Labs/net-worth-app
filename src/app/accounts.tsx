/**
 * Accounts list. Reachable from the dashboard ("Accounts" quick action /
 * "See All") and the profile ("Accounts" row). The "+" opens the Add Account
 * form. Tapping an account does nothing yet (edit comes later).
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useAccountStore,
  accountLast4,
  selectTotalBalance,
} from "@/store/accountStore";
import { fmt } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";

const TYPE_META: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  bank:   { label: "Bank",   icon: "business-outline"       },
  wallet: { label: "Wallet", icon: "wallet-outline"         },
  cash:   { label: "Cash",   icon: "cash-outline"           },
  upi:    { label: "UPI",    icon: "phone-portrait-outline" },
};

export default function AccountsScreen() {
  useAmountVisibilitySync();
  const store    = useAccountStore();
  const accounts = store.accounts;
  const total    = selectTotalBalance(store);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
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
        <Text className="text-lg font-bold text-white">Accounts</Text>
        <TouchableOpacity
          onPress={() => router.push("/add-account")}
          className="w-[38px] h-[38px] rounded-[11px] border border-accent-purple/35 items-center justify-center"
          style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={24} color="#a855f7" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Total balance */}
        <View
          className="mx-xl mb-5 rounded-2xl border border-accent-purple/25 p-5"
          style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
        >
          <Text className="text-xs text-secondary font-bold uppercase tracking-widest mb-1.5">
            Total Balance
          </Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff" }}>{fmt(total)}</Text>
          <Text className="text-xs text-muted mt-1">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {accounts.length === 0 ? (
          <View className="items-center px-xl pt-10 gap-3">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center border border-white/[0.08]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <Ionicons name="wallet-outline" size={30} color="#6b7280" />
            </View>
            <Text className="text-base font-semibold text-white">No accounts yet</Text>
            <Text className="text-sm text-muted text-center">
              Add a bank account so NetWorth can track its balance and auto-log alerts.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/add-account")}
              className="flex-row items-center gap-2 mt-2 px-5 py-3 rounded-[13px] bg-accent-purple"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">Add Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-xl gap-3">
            {accounts.map((a) => {
              const meta  = TYPE_META[a.type] ?? TYPE_META.bank;
              const last4 = accountLast4(a);
              const title = a.accountName?.trim() || a.nickname?.trim() || a.bank;
              return (
                <View
                  key={a.id}
                  className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <View
                    className="w-11 h-11 rounded-[12px] items-center justify-center"
                    style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
                  >
                    <Ionicons name={meta.icon} size={22} color="#a855f7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white mb-0.5">{title}</Text>
                    <Text className="text-xs text-dim">
                      {a.bank} · {meta.label}
                      {last4 ? ` · •••• ${last4}` : ""}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                    {fmt(a.balance)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
