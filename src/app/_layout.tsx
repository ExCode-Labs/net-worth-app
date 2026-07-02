import "../global.css";
import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { Toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AnimatedSplash } from "@/components/ui/AnimatedSplash";
import { startSync, stopSync, resync } from "@/services/sync";
import { useSecurityStore } from "@/store/securityStore";
import { useBankStore } from "@/store/bankStore";
import { useCardProductStore } from "@/store/cardProductStore";
import { useCurrencyStore } from "@/store/currencyStore";
import LockScreen from "@/components/security/LockScreen";

SplashScreen.preventAutoHideAsync();

// ── App lock gate ─────────────────────────────────────────────────────────────
function LockGate() {
  const { isHydrated, locked, lock } = useSecurityStore();

  useEffect(() => {
    useSecurityStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" || s === "inactive") lock();
    });
    return () => sub.remove();
  }, [lock]);

  if (!isHydrated || !locked) return null;
  return <LockScreen />;
}

// ── Backend sync wiring ───────────────────────────────────────────────────────
function SyncController() {
  const { isSignedIn, isGuest, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    const active = isSignedIn || isGuest;
    if (active) {
      useAuthStore.setState({ isBootstrapped: false });
      void startSync();
      const t = setTimeout(() => {
        useAuthStore.setState({ isBootstrapped: true });
      }, 10000);
      return () => {
        clearTimeout(t);
        stopSync();
      };
    }
    stopSync();
    useAuthStore.setState({ isBootstrapped: true });
  }, [isHydrated, isSignedIn, isGuest]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && (isSignedIn || isGuest)) void resync();
    });
    return () => sub.remove();
  }, [isSignedIn, isGuest]);

  return null;
}

// ── Routing gate ──────────────────────────────────────────────────────────────
function RouteGate() {
  const {
    isSignedIn,
    isHydrated,
    isGuest,
    hasSeenWelcome,
    hasOnboarded,
    isBootstrapped,
    notifGateRequired,
    notifAccess,
    batteryOptimDone,
  } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    useAuthStore.getState().hydrate();
    useAuthStore.getState().refreshNotifAccess();
    useUserStore.getState().hydrateDeviceId();
    void useBankStore.getState().refresh();
    void useCardProductStore.getState().refresh();
    void useCurrencyStore.getState().fetchRates();
  }, []);

  // Re-check notification access when the app returns to the foreground so a
  // revocation done in system settings re-triggers the permission gate. (#6)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void useAuthStore.getState().refreshNotifAccess();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const inAuth = segments[0] === "(auth)";
    const subRoute = inAuth ? segments[1] : null;
    const authed = isSignedIn || isGuest;

    if (!isHydrated) return;
    if (authed && !isBootstrapped) return;

    // The permission gate applies to any signed-in user, not just during
    // onboarding — if a user later revokes notification access they're sent back
    // to the permissions screen. (#6)
    //   • Onboarding: must actively grant access + confirm battery exemption.
    //   • After onboarding: re-gate only on an explicit "denied". "unknown" is the
    //     transient pre-refresh state, so treating it as missing would flash the
    //     permissions screen on every cold start.
    const needsPermissions = notifGateRequired && (
      hasOnboarded
        ? notifAccess === "denied"
        : notifAccess !== "authorized" || !batteryOptimDone
    );

    if (!authed) {
      if (!hasSeenWelcome) {
        if (subRoute !== "welcome") router.replace("/(auth)/welcome");
      } else {
        if (subRoute !== "login") router.replace("/(auth)/login");
      }
    } else if (needsPermissions) {
      if (subRoute !== "permissions") router.replace("/(auth)/permissions");
    } else if (!hasOnboarded) {
      if (subRoute !== "setup") router.replace("/(auth)/setup");
    } else if (inAuth) {
      router.replace("/(tabs)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isHydrated,
    isSignedIn,
    isGuest,
    hasSeenWelcome,
    hasOnboarded,
    isBootstrapped,
    notifGateRequired,
    notifAccess,
    batteryOptimDone,
    segments,
  ]);

  if (!isHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="add-account" />
      <Stack.Screen name="add-card" />
      <Stack.Screen name="vault" />
      <Stack.Screen name="assets" />
      <Stack.Screen name="add-asset" />
      <Stack.Screen name="asset/[id]" />
      <Stack.Screen name="liabilities" />
      <Stack.Screen name="add-liability" />
      <Stack.Screen name="liability/[id]" />
      <Stack.Screen name="transaction/[id]" />
      <Stack.Screen name="edit-transaction" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="ai-insights" />
      <Stack.Screen name="badge" />
      <Stack.Screen name="spending" />
      <Stack.Screen name="security" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="sessions" />
      <Stack.Screen name="sharing" />
      <Stack.Screen name="share-select" />
      <Stack.Screen name="share-config" />
      <Stack.Screen name="shared/[ownerId]" />
    </Stack>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <SyncController />
          <RouteGate />
          <Toast />
          <ConfirmDialog />
          <AnimatedSplash />
          <LockGate />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
