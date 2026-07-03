/**
 * Permission setup screen — shown after login, before onboarding.
 *
 * Required (must complete before Setup):
 *   1. Battery optimization exemption — keeps the notification listener alive
 *      when the app is closed. User-confirmed (we can't check it programmatically).
 *   2. Notification listener access — reads bank/UPI alerts automatically.
 *
 * Optional (can skip):
 *   3. Contacts — for sharing net-worth summaries with friends.
 *   4. App notifications — for bill reminders and budget alerts.
 *
 * RouteGate advances to Setup once batteryOptimDone && notifAccess === "authorized".
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, AppState, TouchableOpacity, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import * as Contacts from "expo-contacts";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { clearAllDataStores } from "@/services/sync";
import { requestNotificationAccess } from "@/services/notificationListener";

type SimpleStatus = "undetermined" | "granted" | "denied";

// ── Permission card ────────────────────────────────────────────────────────────
interface CardProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  required?: boolean;
  status: "pending" | "done" | "denied";
  actionLabel: string;
  actionDone?: boolean;
  onAction: () => void;
}

function PermCard({ icon, title, description, required, status, actionLabel, actionDone, onAction }: CardProps) {
  const done   = status === "done";
  const denied = status === "denied";

  return (
    <View
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: done
          ? "rgba(34,197,94,0.07)"
          : denied
          ? "rgba(248,113,113,0.07)"
          : "rgba(255,255,255,0.05)",
        borderColor: done
          ? "rgba(34,197,94,0.25)"
          : denied
          ? "rgba(248,113,113,0.2)"
          : "rgba(255,255,255,0.08)",
      }}
    >
      <View className="flex-row items-start gap-3">
        {/* Icon */}
        <View
          className="w-10 h-10 rounded-[11px] items-center justify-center shrink-0"
          style={{
            backgroundColor: done
              ? "rgba(34,197,94,0.15)"
              : denied
              ? "rgba(248,113,113,0.15)"
              : "rgba(168,85,247,0.15)",
          }}
        >
          <Ionicons
            name={done ? "checkmark" : icon}
            size={20}
            color={done ? "#22c55e" : denied ? "#f87171" : "#a855f7"}
          />
        </View>

        {/* Text + badge */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-0.5 flex-wrap">
            <Text className="text-base font-semibold text-white">{title}</Text>
            <View
              className="px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: required
                  ? "rgba(168,85,247,0.2)"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <Text
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: required ? "#a855f7" : "#6b7280" }}
              >
                {required ? "Required" : "Optional"}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-dim" style={{ lineHeight: 17 }}>{description}</Text>
        </View>
      </View>

      {/* Action button (hidden once done) */}
      {!done && (
        <View className="mt-3 items-start">
          <TouchableOpacity
            onPress={onAction}
            className="px-4 py-2 rounded-full border"
            style={{
              backgroundColor: denied
                ? "rgba(248,113,113,0.1)"
                : actionDone
                ? "rgba(34,197,94,0.15)"
                : "rgba(168,85,247,0.15)",
              borderColor: denied
                ? "rgba(248,113,113,0.3)"
                : actionDone
                ? "rgba(34,197,94,0.3)"
                : "rgba(168,85,247,0.35)",
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: denied ? "#f87171" : actionDone ? "#22c55e" : "#c084fc" }}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function PermissionsScreen() {
  const {
    refreshNotifAccess,
    notifAccess,
    batteryOptimDone,
    setBatteryOptimDone,
    signOut,
  } = useAuthStore();
  const { reset: resetUser } = useUserStore();

  const [batteryOpened, setBatteryOpened]   = useState(false);
  const [notifOpened, setNotifOpened]       = useState(false);
  const [contactsStatus, setContactsStatus] = useState<SimpleStatus>("undetermined");
  const [appNotifStatus, setAppNotifStatus] = useState<SimpleStatus>("undetermined");

  // Check optional permission statuses on mount.
  useEffect(() => {
    refreshNotifAccess();
    if (Platform.OS !== "web") {
      Contacts.getPermissionsAsync()
        .then((r) => setContactsStatus(r.status as SimpleStatus))
        .catch(() => {});
      Notifications.getPermissionsAsync()
        .then((r) => setAppNotifStatus(r.status as SimpleStatus))
        .catch(() => {});
    }
  }, [refreshNotifAccess]);

  // Refresh all permission statuses whenever the user returns from system settings.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNotifOpened(false);
        refreshNotifAccess();
        if (Platform.OS !== "web") {
          Contacts.getPermissionsAsync()
            .then((r) => setContactsStatus(r.status as SimpleStatus))
            .catch(() => {});
          Notifications.getPermissionsAsync()
            .then((r) => setAppNotifStatus(r.status as SimpleStatus))
            .catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, [refreshNotifAccess]);

  const handleBatteryOpen = useCallback(() => {
    setBatteryOpened(true);
    IntentLauncher.startActivityAsync(
      "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
    ).catch(() => {});
  }, []);

  const handleBatteryDone = useCallback(() => {
    void setBatteryOptimDone();
  }, [setBatteryOptimDone]);

  const handleNotifOpen = useCallback(() => {
    setNotifOpened(true);
    requestNotificationAccess();
  }, []);

  // Once the OS has recorded a real denial, requestPermissionsAsync() won't
  // re-show the prompt — it just silently returns "denied" again. Only the
  // Settings app can flip it back, so route there instead.
  const handleContacts = useCallback(async () => {
    if (contactsStatus === "denied") {
      Linking.openSettings();
      return;
    }
    const { status } = await Contacts.requestPermissionsAsync();
    setContactsStatus(status as SimpleStatus);
  }, [contactsStatus]);

  const handleAppNotif = useCallback(async () => {
    if (appNotifStatus === "denied") {
      Linking.openSettings();
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    setAppNotifStatus(status as SimpleStatus);
  }, [appNotifStatus]);

  const handleSignOut = useCallback(async () => {
    clearAllDataStores();
    await signOut();
    router.replace("/(auth)/login");
  }, [signOut]);

  const notifGranted = notifAccess === "authorized";
  const allRequired  = batteryOptimDone && notifGranted;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(500)} className="items-center mt-4 mb-8">
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-5 border border-accent-purple/30"
            style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
          >
            <Ionicons name="shield-checkmark-outline" size={38} color="#a855f7" />
          </View>
          <Text className="text-2xl font-bold text-white text-center">Set up permissions</Text>
          <Text className="text-sm text-muted text-center mt-2" style={{ lineHeight: 20 }}>
            Grant the required permissions so NetWorth can capture your transactions automatically, even when the app is closed.
          </Text>
        </Animated.View>

        {/* Required */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)} className="gap-3">
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
            Required
          </Text>

          <PermCard
            icon="battery-charging-outline"
            title="Background capture"
            description="Prevents Android from stopping the notification listener when the app is closed. Open Battery settings → find NetWorth → tap 'Don't optimize'."
            required
            status={batteryOptimDone ? "done" : "pending"}
            actionLabel={batteryOpened ? "I've done it" : "Open Battery Settings"}
            actionDone={batteryOpened}
            onAction={batteryOpened ? handleBatteryDone : handleBatteryOpen}
          />

          <PermCard
            icon="notifications-outline"
            title="Notification access"
            description="Reads your bank and UPI alerts to log transactions the moment they arrive. Everything is parsed on-device."
            required
            status={notifGranted ? "done" : "pending"}
            actionLabel={notifOpened ? "Waiting for access…" : "Open Notification Settings"}
            actionDone={notifOpened}
            onAction={handleNotifOpen}
          />

          {/* Android blocks this toggle with an "App was denied access" sheet for
              apps installed outside the Play Store (sideloaded/dev builds), until
              the user explicitly allows restricted settings for this app. */}
          {notifAccess === "denied" && (
            <View
              className="rounded-2xl border p-4"
              style={{ backgroundColor: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.2)" }}
            >
              <Text className="text-sm font-semibold text-white mb-2">
                Seeing &quot;App was denied access&quot;?
              </Text>
              <Text className="text-xs text-dim" style={{ lineHeight: 18 }}>
                Android blocks this toggle for apps installed outside the Play Store. To unblock it:
                {"\n"}1. Long-press the NetWorth icon → <Text className="font-semibold text-secondary">App info</Text>
                {"\n"}2. Tap the <Text className="font-semibold text-secondary">⋮</Text> menu (top-right)
                {"\n"}3. Tap <Text className="font-semibold text-secondary">Allow restricted settings</Text>
                {"\n"}4. Confirm with your PIN / fingerprint
                {"\n"}5. Come back here and tap &quot;Open Notification Settings&quot; again
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Optional */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)} className="gap-3 mt-5">
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
            Optional
          </Text>

          <PermCard
            icon="people-outline"
            title="Contacts"
            description="Lets you find friends to share your net-worth summary with. Only your local address book is searched — nothing is uploaded."
            status={
              contactsStatus === "granted" ? "done"
              : contactsStatus === "denied" ? "denied"
              : "pending"
            }
            actionLabel={contactsStatus === "denied" ? "Open Settings" : "Allow Access"}
            onAction={handleContacts}
          />

          <PermCard
            icon="alarm-outline"
            title="App notifications"
            description="Receive bill payment reminders and budget alerts on your lock screen."
            status={
              appNotifStatus === "granted" ? "done"
              : appNotifStatus === "denied" ? "denied"
              : "pending"
            }
            actionLabel={appNotifStatus === "denied" ? "Open Settings" : "Allow Access"}
            onAction={handleAppNotif}
          />
        </Animated.View>

        <View className="flex-1" />

        {/* CTA */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} className="mt-6 gap-2">
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/setup")}
            disabled={!allRequired}
            className="rounded-2xl py-4 items-center"
            style={{
              backgroundColor: allRequired ? "rgba(168,85,247,0.9)" : "rgba(168,85,247,0.2)",
            }}
          >
            <Text
              className="text-base font-bold"
              style={{ color: allRequired ? "#fff" : "rgba(192,132,252,0.4)" }}
            >
              {allRequired ? "Continue to Setup" : "Complete required steps above"}
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-dim text-center mt-1" style={{ lineHeight: 17 }}>
            Optional permissions can be granted later from Settings.
          </Text>

          <TouchableOpacity onPress={handleSignOut} className="items-center py-3 mt-1">
            <Text className="text-sm text-muted font-semibold">Sign out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
