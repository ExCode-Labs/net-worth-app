/**
 * Shareable cosmic net-worth badge (#5). Renders the user's achievement tier
 * (Lakhpati → Arabpati) as a cosmic card and shares it as a PNG via the OS share
 * sheet — reusing the same captureRef + expo-sharing pattern as the transaction
 * receipt. The exact figure is never shown, only the milestone, so it's safe to
 * post publicly.
 */
import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useAccountStore, selectNetWorth } from "@/store/accountStore";
import { useCardStore, selectTotalUsage } from "@/store/cardStore";
import { useLiabilityStore, selectTotalLiabilities } from "@/store/liabilityStore";
import { tierForNetWorth } from "@/constants/networthTiers";
import { toast } from "@/store/toastStore";

export default function BadgeScreen() {
  const accountStore   = useAccountStore();
  const cardStore      = useCardStore();
  const liabilityStore = useLiabilityStore();

  // Same net-worth basis as the dashboard (INR): assets − liabilities − card dues.
  const netWorth =
    selectNetWorth(accountStore) -
    selectTotalLiabilities(liabilityStore) -
    selectTotalUsage(cardStore);

  const { tier, next, progress } = tierForNetWorth(netWorth);

  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
      if (!(await Sharing.isAvailableAsync())) {
        toast.error("Sharing isn't available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your NetWorth badge" });
    } catch {
      toast.error("Couldn't create the image. Try again.");
    } finally {
      setSharing(false);
    }
  };

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
        <Text className="text-lg font-bold text-white flex-1">Your Badge</Text>
      </View>

      <View className="flex-1 items-center justify-center px-xl">
        {/* ── Captured cosmic badge ── */}
        <View
          ref={card}
          collapsable={false}
          className="w-full rounded-[28px] overflow-hidden border"
          style={{ backgroundColor: "#080b1e", borderColor: tier.color + "55" }}
        >
          {/* Cosmic glows */}
          <View pointerEvents="none" style={{ position: "absolute", top: -70, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: tier.glow, opacity: 0.28 }} />
          <View pointerEvents="none" style={{ position: "absolute", bottom: -80, right: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: tier.color, opacity: 0.18 }} />
          {/* Star dots */}
          {STARS.map((s, i) => (
            <View key={i} pointerEvents="none" style={{ position: "absolute", top: s.top, left: s.left, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#fff", opacity: s.opacity }} />
          ))}

          <View className="items-center px-7 pt-9 pb-8">
            {/* Emblem */}
            <View
              className="w-[92px] h-[92px] rounded-full items-center justify-center mb-5 border"
              style={{ backgroundColor: tier.color + "22", borderColor: tier.color + "77" }}
            >
              <Ionicons name={tier.icon} size={46} color={tier.color} />
            </View>

            <Text className="text-[11px] font-bold tracking-[3px] mb-1" style={{ color: tier.color }}>
              ✦ NETWORTH CLUB ✦
            </Text>
            <Text style={{ fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: 1, textAlign: "center" }}>
              {tier.name}
            </Text>
            <Text className="text-sm font-semibold mt-1.5 mb-3" style={{ color: tier.color }}>
              {tier.label}
            </Text>
            <Text className="text-xs text-center text-secondary" style={{ lineHeight: 18, maxWidth: 260 }}>
              {tier.tagline}
            </Text>

            {/* Progress to next tier */}
            {next && (
              <View className="w-full mt-6">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-[10px] text-dim font-semibold">Next: {next.name}</Text>
                  <Text className="text-[10px] font-bold" style={{ color: next.color }}>{Math.round(progress * 100)}%</Text>
                </View>
                <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <View style={{ width: `${Math.max(progress * 100, 3)}%`, height: "100%", borderRadius: 999, backgroundColor: next.color }} />
                </View>
              </View>
            )}

            {/* Branding */}
            <View className="flex-row items-center gap-1.5 mt-7">
              <Ionicons name="planet-outline" size={13} color="#a855f7" />
              <Text className="text-[11px] font-bold text-white">Net<Text className="text-accent-purple">Worth</Text></Text>
              <Text className="text-[11px] text-dim"> · getworthapp.com</Text>
            </View>
          </View>
        </View>

        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          className="flex-row items-center justify-center gap-2 rounded-[16px] py-4 mt-8 w-full bg-accent-purple"
          style={sharing ? { opacity: 0.6 } : undefined}
          activeOpacity={0.85}
        >
          {sharing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={19} color="#fff" />
              <Text className="text-base font-bold text-white">Share Badge</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Fixed star positions so the card looks the same every render (and capture).
const STARS = [
  { top: 26,  left: 34,  size: 3, opacity: 0.7 },
  { top: 54,  left: 300, size: 2, opacity: 0.5 },
  { top: 120, left: 20,  size: 2, opacity: 0.5 },
  { top: 90,  left: 250, size: 3, opacity: 0.6 },
  { top: 200, left: 60,  size: 2, opacity: 0.4 },
  { top: 240, left: 290, size: 3, opacity: 0.6 },
  { top: 160, left: 330, size: 2, opacity: 0.45 },
];
