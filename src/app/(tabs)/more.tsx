import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { useAccountStore, selectNetWorth, selectTotalAssets } from "@/store/accountStore";
import { useLiabilityStore, selectTotalLiabilities } from "@/store/liabilityStore";
import { useCardStore, selectTotalUsage } from "@/store/cardStore";
import { fmtShort } from "@/utils/formatters";
import { Avatar } from "@/components/ui/Avatar";
import { logout } from "@/services/auth";
import { toast } from "@/store/toastStore";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const SECTIONS: {
  title: string;
  items: { icon: IoniconName; label: string; sub: string; accent?: string; onPress?: () => void }[];
}[] = [
  {
    title: "Finance",
    items: [
      { icon: "wallet-outline",        label: "Accounts",     sub: "Manage bank & wallet accounts",  accent: "#3b82f6", onPress: () => router.push("/accounts") },
      { icon: "card-outline",          label: "Cards",        sub: "Credit & debit cards",            accent: "#a855f7", onPress: () => router.push("/analytics") },
      { icon: "trending-up-outline",   label: "Assets",       sub: "Investments, property & gold",   accent: "#4ade80", onPress: () => router.push("/assets") },
      { icon: "trending-down-outline", label: "Liabilities",  sub: "Loans, EMIs & dues",             accent: "#f87171", onPress: () => router.push("/liabilities") },
    ],
  },
  {
    title: "Insights",
    items: [
      { icon: "bulb-outline",          label: "AI Insights",   sub: "Smart spending analysis",        accent: "#fbbf24" },
      { icon: "bar-chart-outline",     label: "Analytics",     sub: "Charts & spending reports",      accent: "#3b82f6" },
      { icon: "flag-outline",          label: "Budget Goals",  sub: "Set & track monthly budgets",    accent: "#a855f7" },
    ],
  },
  {
    title: "Settings",
    items: [
      { icon: "settings-outline",          label: "Preferences",       sub: "Currency, theme, display", onPress: () => router.push("/preferences") },
      { icon: "notifications-outline",     label: "Notifications",     sub: "Alerts, reminders & limits" },
      { icon: "lock-closed-outline",       label: "Vault",             sub: "Full card & account numbers", accent: "#a855f7", onPress: () => router.push("/vault") },
      { icon: "shield-checkmark-outline",  label: "Security",          sub: "App lock, PIN & biometrics", accent: "#4ade80", onPress: () => router.push("/security") },
      { icon: "phone-portrait-outline",    label: "Devices",           sub: "Active sessions & sign-out", accent: "#3b82f6", onPress: () => router.push("/sessions") },
      { icon: "share-social-outline",      label: "Sharing",           sub: "Share balances & more with people", accent: "#a855f7", onPress: () => router.push("/sharing") },
    ],
  },
];

export default function ProfileScreen() {
  const { signOut, isGuest }      = useAuthStore();
  const { guestName, phone, firstName: profileFirst, fullName, email, avatarUrl, reset: resetUser } = useUserStore();
  const accountStore   = useAccountStore();
  const liabilityStore = useLiabilityStore();
  const cardStore      = useCardStore();
  const totalLiabilities = selectTotalLiabilities(liabilityStore);
  const netWorth = selectNetWorth(accountStore) - totalLiabilities
    - selectTotalUsage(cardStore);

  const displayName  = fullName ?? profileFirst ?? guestName ?? (isGuest ? "Guest" : "You");
  const displayEmail = email ?? (isGuest ? "Guest Mode · No account" : "");

  const handleLogout = async () => {
    await logout();          // revoke this session server-side (best-effort)
    resetUser();
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-cosmic-darker">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View className="flex-row justify-between items-center px-xl pt-[10px] pb-1">
          <Text className="text-[22px] font-bold text-white">Profile</Text>
          <TouchableOpacity
            onPress={() => toast.info("QR sharing coming soon")}
            className="w-10 h-10 rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="qr-code-outline" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Avatar section — profile photo if present, else local initials */}
        <View className="items-center py-6 gap-1.5">
          <View className="mb-1.5">
            <Avatar
              name={displayName}
              uri={avatarUrl ?? undefined}
              size="xl"
              style={{ borderRadius: 999, borderWidth: 2, borderColor: "rgba(168,85,247,0.35)" }}
            />
          </View>

          <Text className="text-[20px] font-bold text-white">{displayName}</Text>
          {displayEmail ? <Text className="text-sm text-muted">{displayEmail}</Text> : null}
          {phone ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="call-outline" size={12} color="#6b7280" />
              <Text className="text-xs text-dim">{phone}</Text>
            </View>
          ) : null}
          {isGuest && (
            <View
              className="px-3 py-1 rounded-full border border-accent-amber/30 mt-1"
              style={{ backgroundColor: "rgba(251,191,36,0.08)" }}
            >
              <Text className="text-xs text-accent-amber font-semibold">Guest Mode</Text>
            </View>
          )}
          {!isGuest && (
            <TouchableOpacity
              onPress={() => router.push("/edit-profile")}
              className="flex-row items-center gap-1.5 mt-1.5 px-4 py-2 rounded-full border border-accent-purple/35"
              style={{ backgroundColor: "rgba(168,85,247,0.08)" }}
            >
              <Ionicons name="create-outline" size={14} color="#a855f7" />
              <Text className="text-sm text-accent-purple font-semibold">Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Net worth snapshot */}
        <View
          className="flex-row mx-xl rounded-2xl border border-white/[0.08]"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {[
            { label: "Net Worth",   value: fmtShort(netWorth), color: "#a855f7", border: true  },
            { label: "Assets",      value: fmtShort(selectTotalAssets(accountStore)), color: "#4ade80", border: true  },
            { label: "Liabilities", value: fmtShort(totalLiabilities + selectTotalUsage(cardStore)), color: "#f87171", border: false },
          ].map((col) => (
            <View
              key={col.label}
              className="flex-1 items-center py-4"
              style={col.border ? { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.08)" } : undefined}
            >
              <Text className="text-xs text-muted font-semibold mb-1.5">{col.label}</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: col.color }}>{col.value}</Text>
            </View>
          ))}
        </View>

        {/* Menu sections */}
        <View className="px-xl gap-[22px] mt-5">
          {SECTIONS.map((sec) => (
            <View key={sec.title}>
              <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-2">{sec.title}</Text>
              <View
                className="rounded-2xl border border-white/[0.08] overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                {sec.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.onPress ?? (() => toast.info(`${item.label} is coming soon`))}
                    className="flex-row items-center gap-[14px] py-[14px] px-4"
                    style={idx < sec.items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" } : undefined}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-10 h-10 rounded-[11px] items-center justify-center"
                      style={{ backgroundColor: (item.accent ?? "#6b7280") + "20" }}
                    >
                      <Ionicons name={item.icon} size={20} color={item.accent ?? "#6b7280"} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold mb-0.5" style={{ color: "#e5e7eb" }}>{item.label}</Text>
                      <Text className="text-xs text-dim">{item.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#4b5563" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-2 rounded-[14px] py-4 border border-accent-red/20"
            style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#f87171" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#f87171" }}>Sign Out</Text>
          </TouchableOpacity>

          <Text className="text-xs text-dim text-center">NetWorth v1.0.0 · Phase 1</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
