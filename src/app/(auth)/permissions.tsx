/**
 * Notification-access gate.
 *
 * Shown after login and before onboarding on builds that can read bank/UPI
 * notifications (native Android). The user must grant "Notification access"
 * from system settings to continue — auto-import is the core of the app, so
 * there is no skip. Once access is granted the RouteGate advances to setup.
 *
 * On builds where the listener isn't available (web / iOS / Expo Go) the
 * RouteGate never routes here, so this screen is effectively Android-only.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, AppState, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { requestNotificationAccess } from "@/services/notificationListener";
import { Button } from "@/components/ui/Button";

const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; sub: string }[] = [
  {
    icon: "flash-outline",
    title: "Automatic logging",
    sub: "Spends and income are captured the moment your bank alerts you.",
  },
  {
    icon: "lock-closed-outline",
    title: "Private by design",
    sub: "Alerts are parsed on your device. Nothing is read until you allow it.",
  },
  {
    icon: "create-outline",
    title: "You stay in control",
    sub: "Every detected transaction waits for your review before it's saved.",
  },
];

export default function PermissionsScreen() {
  const { refreshNotifAccess, notifAccess, signOut } = useAuthStore();
  const { reset: resetUser } = useUserStore();
  const [opening, setOpening] = useState(false);

  // Re-read access whenever the app returns to the foreground — the user grants
  // it in system settings and comes back. The RouteGate reacts to the new
  // status and advances to setup automatically once authorized.
  useEffect(() => {
    refreshNotifAccess();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setOpening(false);
        refreshNotifAccess();
      }
    });
    return () => sub.remove();
  }, [refreshNotifAccess]);

  const handleEnable = useCallback(() => {
    setOpening(true);
    requestNotificationAccess();
  }, []);

  const handleSignOut = useCallback(async () => {
    resetUser();
    await signOut();
    router.replace("/(auth)/login");
  }, [resetUser, signOut]);

  const denied = notifAccess === "denied";

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(500)} className="items-center mt-6 mb-8">
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-5 border border-accent-purple/30"
            style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
          >
            <Ionicons name="notifications-outline" size={38} color="#a855f7" />
          </View>
          <Text className="text-2xl font-bold text-white text-center">
            Enable notification access
          </Text>
          <Text className="text-base text-muted text-center mt-2" style={{ lineHeight: 22 }}>
            NetWorth reads your bank &amp; UPI alerts to track money automatically.
            We need this permission to continue.
          </Text>
        </Animated.View>

        {/* Benefits */}
        <Animated.View entering={FadeInUp.duration(500).delay(150)} className="gap-3">
          {BENEFITS.map((b) => (
            <View
              key={b.title}
              className="flex-row items-start gap-[14px] rounded-2xl border border-white/[0.08] p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <View
                className="w-10 h-10 rounded-[11px] items-center justify-center"
                style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
              >
                <Ionicons name={b.icon} size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-white mb-0.5">{b.title}</Text>
                <Text className="text-xs text-dim" style={{ lineHeight: 17 }}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {denied && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-row items-center gap-2 mt-5 px-4 py-3 rounded-[12px] border border-accent-amber/30"
            style={{ backgroundColor: "rgba(251,191,36,0.08)" }}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#fbbf24" />
            <Text className="text-xs text-accent-amber flex-1" style={{ lineHeight: 17 }}>
              Access is still off. Find <Text className="font-bold">NetWorth</Text> in the list
              and toggle it on, then come back.
            </Text>
          </Animated.View>
        )}

        {/* Spacer pushes the CTA to the bottom */}
        <View className="flex-1" />

        <Animated.View entering={FadeInUp.duration(500).delay(300)} className="gap-2">
          <Button
            label={opening ? "Waiting for access…" : "Open settings to enable"}
            onPress={handleEnable}
            isLoading={opening}
          />
          <Text className="text-xs text-dim text-center mt-1" style={{ lineHeight: 17 }}>
            You&apos;ll be taken to Android&apos;s “Notification access” screen.
            Toggle NetWorth on, then return here.
          </Text>
          <TouchableOpacity onPress={handleSignOut} className="items-center py-3 mt-1">
            <Text className="text-sm text-muted font-semibold">Sign out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
