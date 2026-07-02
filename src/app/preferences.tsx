/**
 * Preferences — currency and display options. Reachable from Profile →
 * Preferences. Currency is shared with onboarding (account store).
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAccountStore } from "@/store/accountStore";
import { usePrefsStore } from "@/store/prefsStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { CURRENCIES } from "@/constants/currencies";

/** "Updated just now" / "Updated 12m ago" / "Updated 3h ago". */
function rateAge(updatedAt: number | null): string {
  if (!updatedAt) return "Rates not loaded yet";
  const mins = Math.floor((Date.now() - updatedAt) / 60_000);
  if (mins < 1) return "Rates updated just now";
  if (mins < 60) return `Rates updated ${mins}m ago`;
  return `Rates updated ${Math.floor(mins / 60)}h ago`;
}

export default function PreferencesScreen() {
  const currency    = useAccountStore((s) => s.currency);
  const setCurrency = useAccountStore((s) => s.setCurrency);
  const { hideAmounts, setHideAmounts } = usePrefsStore();
  const ratesUpdatedAt = useCurrencyStore((s) => s.updatedAt);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center px-xl pt-3 pb-[14px] gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Preferences</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-xl gap-[22px] mt-2">

          {/* Currency */}
          <View>
            <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Currency</Text>
            <View
              className="rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              {CURRENCIES.map((c, idx) => {
                const active = currency === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setCurrency(c.code)}
                    className="flex-row items-center gap-[14px] py-[14px] px-4"
                    style={idx < CURRENCIES.length - 1 ? { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" } : undefined}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-9 h-9 rounded-[10px] items-center justify-center"
                      style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
                    >
                      <Text className="text-base font-bold text-accent-purple">{c.symbol}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-white">{c.code}</Text>
                      <Text className="text-xs text-dim">{c.name}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color="#a855f7" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-[11px] text-dim mt-2">
              Amounts convert at the live INR exchange rate. {rateAge(ratesUpdatedAt)}.
            </Text>
          </View>

          {/* Display */}
          <View>
            <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Display</Text>
            <View
              className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <View
                className="w-10 h-10 rounded-[11px] items-center justify-center"
                style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
              >
                <Ionicons name="eye-off-outline" size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">Hide amounts</Text>
                <Text className="text-xs text-dim">Mask balances on the dashboard</Text>
              </View>
              <Switch
                value={hideAmounts}
                onValueChange={setHideAmounts}
                trackColor={{ false: "#374151", true: "#a855f7" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Appearance */}
          <View>
            <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Appearance</Text>
            <View
              className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <View
                className="w-10 h-10 rounded-[11px] items-center justify-center"
                style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
              >
                <Ionicons name="moon-outline" size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">Theme</Text>
                <Text className="text-xs text-dim">Dark</Text>
              </View>
              <Text className="text-xs text-muted">Default</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
