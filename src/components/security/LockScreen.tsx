/**
 * Full-screen unlock overlay shown while the app is locked. Auto-prompts
 * biometrics (if enabled) on mount; always offers the PIN as a fallback.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { canUseBiometrics, authenticate } from "@/services/biometrics";
import { useSecurityStore } from "@/store/securityStore";
import PinPad from "./PinPad";

export default function LockScreen() {
  const { biometricEnabled, verifyPin, unlock } = useSecurityStore();
  const [pin, setPin]     = useState("");
  const [error, setError] = useState<string | null>(null);

  const tryBiometric = useCallback(async () => {
    if (!(await canUseBiometrics())) return;
    if (await authenticate("Unlock NetWorth")) unlock();
  }, [unlock]);

  // Auto-prompt biometrics once when the lock screen appears.
  useEffect(() => {
    if (biometricEnabled) void tryBiometric();
  }, [biometricEnabled, tryBiometric]);

  const onComplete = useCallback(
    async (entered: string) => {
      const ok = await verifyPin(entered);
      if (ok) {
        unlock();
      } else {
        setError("Incorrect PIN");
        setPin("");
      }
    },
    [verifyPin, unlock],
  );

  const handleChange = (v: string) => {
    if (error) setError(null);
    setPin(v);
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-cosmic-darker items-center justify-center"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
    >
      <View
        className="w-16 h-16 rounded-2xl items-center justify-center mb-7 border border-accent-purple/30"
        style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
      >
        <Ionicons name="lock-closed" size={30} color="#a855f7" />
      </View>

      <PinPad
        value={pin}
        onChange={handleChange}
        length={4}
        title="Enter PIN"
        subtitle="Unlock to access your finances"
        error={error}
        onComplete={onComplete}
        onBiometric={biometricEnabled ? tryBiometric : undefined}
      />

      {biometricEnabled && (
        <TouchableOpacity onPress={tryBiometric} className="mt-6 flex-row items-center gap-2">
          <Ionicons name="finger-print" size={18} color="#a855f7" />
          <Text className="text-sm text-accent-purple font-semibold">Use biometrics</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
