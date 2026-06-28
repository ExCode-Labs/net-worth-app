import { useEffect, useState } from "react";
import { Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/authStore";

/**
 * Full-screen splash overlay.
 *
 * The Android 12+ system splash only shows a centered icon, so we render our
 * own edge-to-edge splash image on top of the app. It appears the moment the
 * JS layer mounts (we hide the native splash on first layout) and stays until
 * the app is actually ready (Clerk auth loaded + persisted state hydrated),
 * then fades out — so the user never sees a blank/half-loaded screen.
 */
export function AnimatedSplash() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const { width, height } = useWindowDimensions();
  const [hidden, setHidden] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  const opacity = useSharedValue(1);

  // For authed users, also wait for the backend bootstrap so data is loaded and
  // the onboarding decision is final before we reveal the app.
  const authed = isSignedIn || isGuest;
  const ready = (isHydrated && (!authed || isBootstrapped)) || forceReveal;

  // Absolute fail-safe: never let the splash hang, whatever the gates do.
  useEffect(() => {
    const t = setTimeout(() => setForceReveal(true), 8000);
    return () => clearTimeout(t);
  }, []);

  // Reveal our full-screen splash by dismissing the native one on first frame.
  const onLayout = () => {
    SplashScreen.hideAsync().catch(() => {});
  };

  useEffect(() => {
    if (!ready) return;
    opacity.value = withTiming(0, { duration: 350 }, (finished) => {
      if (finished) runOnJS(setHidden)(true);
    });
  }, [ready, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (hidden) return null;

  return (
    <Animated.View
      onLayout={onLayout}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#0a0e27", zIndex: 999 },
        style,
      ]}
    >
      <Image
        source={require("../../../assets/splash.png")}
        style={{ width, height }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}
