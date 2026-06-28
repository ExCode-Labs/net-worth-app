/**
 * Security settings — app lock using the device's own biometrics / PIN.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { authenticate, biometricsAvailable } from "@/services/biometrics";
import { useSecurityStore } from "@/store/securityStore";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";

export default function SecurityScreen() {
  const { appLockEnabled, setAppLock } = useSecurityStore();

  const onToggleAppLock = async (on: boolean) => {
    if (on) {
      // Verify device auth before enabling, so we know it works on this device.
      if (!biometricsAvailable) {
        toast.error("Device authentication needs a native build of the app.");
        return;
      }
      const ok = await authenticate("Confirm to enable app lock");
      if (!ok) { toast.error("Authentication failed. App lock not enabled."); return; }
      await setAppLock(true);
      toast.success("App lock enabled.");
    } else {
      confirm({
        title: "Turn off app lock?",
        message: "The app will open without authentication.",
        confirmText: "Turn off",
        destructive: true,
        onConfirm: () => {
          void setAppLock(false).then(() => toast.success("App lock disabled."));
        },
      });
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
        <Text className="text-lg font-bold text-white">Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-xl gap-4 mt-2">
          <Text className="text-sm text-muted" style={{ lineHeight: 20 }}>
            Lock NetWorth on every open using your phone&apos;s biometrics or device PIN —
            no custom PIN to set or remember.
          </Text>

          {/* App lock toggle */}
          <View
            className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <View
              className="w-10 h-10 rounded-[11px] items-center justify-center"
              style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#a855f7" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">App Lock</Text>
              <Text className="text-xs text-dim">Face ID, fingerprint, or device PIN</Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={onToggleAppLock}
              trackColor={{ false: "#374151", true: "#a855f7" }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
