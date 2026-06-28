/**
 * Security settings. Lets the user turn on a bank-style app lock: a PIN
 * (required) plus optional device biometrics. Reachable from Profile → Security.
 */
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { biometricsAvailable, inspectBiometrics, authenticate } from "@/services/biometrics";
import { useSecurityStore } from "@/store/securityStore";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";
import PinPad from "@/components/security/PinPad";

type SetStep = null | "enter" | "confirm";

export default function SecurityScreen() {
  const {
    appLockEnabled,
    biometricEnabled,
    hasPin,
    setPin,
    setAppLock,
    setBiometric,
  } = useSecurityStore();

  // Set / change PIN flow
  const [step, setStep]         = useState<SetStep>(null);
  const [first, setFirst]       = useState("");
  const [pin, setPinValue]      = useState("");
  const [error, setError]       = useState<string | null>(null);
  // After saving a fresh PIN we may need to also enable app lock.
  const [enableLockAfter, setEnableLockAfter] = useState(false);

  const openSetPin = (enableLock: boolean) => {
    setEnableLockAfter(enableLock);
    setFirst("");
    setPinValue("");
    setError(null);
    setStep("enter");
  };

  const onPinComplete = useCallback(
    async (entered: string) => {
      if (step === "enter") {
        setFirst(entered);
        setPinValue("");
        setStep("confirm");
        return;
      }
      // confirm step
      if (entered !== first) {
        setError("PINs don't match");
        setPinValue("");
        setStep("enter");
        setFirst("");
        return;
      }
      await setPin(entered);
      if (enableLockAfter) await setAppLock(true);
      setStep(null);
      toast.success(enableLockAfter ? "App lock enabled." : "PIN updated.");
    },
    [step, first, enableLockAfter, setPin, setAppLock],
  );

  const onToggleAppLock = async (on: boolean) => {
    if (on) {
      openSetPin(true);            // need a PIN before lock can be on
    } else {
      confirm({
        title: "Turn off app lock?",
        message: "This removes your PIN and biometric unlock.",
        confirmText: "Turn off",
        destructive: true,
        onConfirm: () => { void setAppLock(false).then(() => toast.success("App lock disabled.")); },
      });
    }
  };

  const onToggleBiometric = async (on: boolean) => {
    if (!on) { await setBiometric(false); return; }
    if (!biometricsAvailable) { toast.error("Biometrics need a new build of the app."); return; }
    const { hasHardware, enrolled } = await inspectBiometrics();
    if (!hasHardware) { toast.error("No biometric hardware on this device."); return; }
    if (!enrolled)    { toast.error("Set up biometrics in your device settings first."); return; }
    if (await authenticate("Confirm biometrics")) {
      await setBiometric(true);
      toast.success("Biometric unlock on.");
    }
  };

  // ── Set/Change PIN overlay ──────────────────────────────────────────────────
  if (step) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
        <View className="flex-row items-center px-xl pt-3 pb-2">
          <TouchableOpacity
            onPress={() => setStep(null)}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <PinPad
            value={pin}
            onChange={(v) => { if (error) setError(null); setPinValue(v); }}
            length={4}
            title={step === "enter" ? "Set a PIN" : "Confirm your PIN"}
            subtitle={step === "enter" ? "Choose a 4-digit PIN" : "Re-enter to confirm"}
            error={error}
            onComplete={onPinComplete}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            Lock NetWorth with a PIN and your device biometrics, like a banking app.
            You&apos;ll be asked to unlock each time you open the app.
          </Text>

          {/* App lock */}
          <Row
            icon="lock-closed-outline"
            title="App Lock"
            sub="Require a PIN to open the app"
          >
            <Switch
              value={appLockEnabled}
              onValueChange={onToggleAppLock}
              trackColor={{ false: "#374151", true: "#a855f7" }}
              thumbColor="#fff"
            />
          </Row>

          {/* Biometric — only when app lock is on AND the module is built in */}
          {appLockEnabled && biometricsAvailable && (
            <Row
              icon="finger-print-outline"
              title="Biometric Unlock"
              sub="Use fingerprint / face to unlock"
            >
              <Switch
                value={biometricEnabled}
                onValueChange={onToggleBiometric}
                trackColor={{ false: "#374151", true: "#a855f7" }}
                thumbColor="#fff"
              />
            </Row>
          )}

          {/* Change PIN */}
          {appLockEnabled && hasPin && (
            <TouchableOpacity
              onPress={() => openSetPin(false)}
              className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              activeOpacity={0.7}
            >
              <View
                className="w-10 h-10 rounded-[11px] items-center justify-center"
                style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
              >
                <Ionicons name="keypad-outline" size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">Change PIN</Text>
                <Text className="text-xs text-dim">Update your 4-digit PIN</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#4b5563" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
    >
      <View
        className="w-10 h-10 rounded-[11px] items-center justify-center"
        style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
      >
        <Ionicons name={icon} size={20} color="#a855f7" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white">{title}</Text>
        <Text className="text-xs text-dim">{sub}</Text>
      </View>
      {children}
    </View>
  );
}
