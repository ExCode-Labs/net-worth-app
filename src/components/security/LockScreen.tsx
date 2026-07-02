/**
 * Full-screen unlock overlay. Auto-prompts device biometric / credential
 * (Face ID, fingerprint, device PIN/pattern/password) on mount.
 * No custom PIN here — the OS handles all authentication.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { authenticate, biometricsAvailable } from "@/services/biometrics";
import { useSecurityStore } from "@/store/securityStore";

export default function LockScreen() {
  const [failed, setFailed] = useState(false);
  const authInProgress = useRef(false);

  const tryAuth = useCallback(async () => {
    if (authInProgress.current) return;
    authInProgress.current = true;
    setFailed(false);
    try {
      if (!biometricsAvailable) {
        useSecurityStore.getState().unlock();
        return;
      }
      const ok = await authenticate("Unlock NetWorth");
      if (ok) useSecurityStore.getState().unlock();
      else setFailed(true);
    } finally {
      authInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    // Only prompt when app is fully foreground — biometric calls fail while backgrounding
    if (AppState.currentState === "active") {
      void tryAuth();
      return;
    }
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        sub.remove();
        void tryAuth();
      }
    });
    return () => sub.remove();
  }, [tryAuth]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-cosmic-darker items-center justify-center"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      <View
        className="w-16 h-16 rounded-2xl items-center justify-center mb-6 border border-accent-purple/30"
        style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
      >
        <Ionicons name="lock-closed" size={30} color="#a855f7" />
      </View>

      <Text className="text-2xl font-bold text-white mb-2">NetWorth</Text>
      <Text className="text-sm text-muted mb-10">
        {failed ? "Authentication failed. Try again." : "Authenticating…"}
      </Text>

      <TouchableOpacity
        onPress={tryAuth}
        className="px-8 py-3.5 rounded-2xl"
        style={{ backgroundColor: "rgba(168,85,247,0.9)" }}
        activeOpacity={0.8}
      >
        <Text className="text-base font-bold text-white">
          {failed ? "Try again" : "Unlock"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
