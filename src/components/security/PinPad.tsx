/**
 * Reusable numeric PIN pad: dot indicators + 0-9 keypad with an optional
 * biometric key. Controlled via `value` / `onChange`; fires `onComplete` when
 * `value` reaches `length`.
 */
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { hapticTap } from "@/utils/haptics";
import { usePreventScreenCapture } from "@/utils/screenCapture";

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  title: string;
  subtitle?: string;
  error?: string | null;
  onComplete?: (pin: string) => void;
  onBiometric?: () => void;   // shows a fingerprint key when provided
  /** True while the entered PIN is being verified server-side — pulses the
   *  dots and blocks input so the screen doesn't look frozen mid-request. */
  loading?: boolean;
}

export default function PinPad({
  value,
  onChange,
  length = 4,
  title,
  subtitle,
  error,
  onComplete,
  onBiometric,
  loading,
}: Props) {
  // Block screenshots / screen-recording / screen-share while a PIN is on screen
  // (Android FLAG_SECURE renders the surface black in captures). (#9)
  usePreventScreenCapture("pinpad");

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (loading) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 450, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [loading, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const press = (d: string) => {
    if (loading || value.length >= length) return;
    hapticTap();
    onChange(value + d);
  };
  const backspace = () => {
    if (loading) return;
    hapticTap();
    onChange(value.slice(0, -1));
  };

  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <View className="items-center">
      <Text className="text-xl font-bold text-white text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-muted text-center mt-1.5">{subtitle}</Text>
      ) : null}

      {/* Dots — pulse while a completed PIN is being verified server-side */}
      <Animated.View style={[{ flexDirection: "row", gap: 14, marginTop: 28, marginBottom: 8, height: 16, alignItems: "center" }, pulseStyle]}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: filled ? "#a855f7" : "transparent",
                borderWidth: filled ? 0 : 1.5,
                borderColor: error ? "#f87171" : "rgba(255,255,255,0.25)",
              }}
            />
          );
        })}
      </Animated.View>
      <Text className={`text-xs h-4 ${loading ? "text-dim" : "text-accent-red"}`}>
        {loading ? "Verifying…" : error ?? ""}
      </Text>

      {/* Keypad */}
      <View className="flex-row flex-wrap mt-4" style={{ width: 264, opacity: loading ? 0.4 : 1 }}>
        {KEYS.map((k) => (
          <Key key={k} onPress={() => press(k)} disabled={loading}>
            <Text className="text-[26px] font-semibold text-white">{k}</Text>
          </Key>
        ))}
        {/* bottom row: biometric / 0 / backspace */}
        <Key onPress={onBiometric} disabled={!onBiometric || loading}>
          {onBiometric ? <Ionicons name="finger-print" size={28} color="#a855f7" /> : null}
        </Key>
        <Key onPress={() => press("0")} disabled={loading}>
          <Text className="text-[26px] font-semibold text-white">0</Text>
        </Key>
        <Key onPress={backspace} disabled={value.length === 0 || loading}>
          <Ionicons name="backspace-outline" size={26} color="#9ca3af" />
        </Key>
      </View>
    </View>
  );
}

function Key({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ width: 88, height: 76, alignItems: "center", justifyContent: "center" }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || !onPress}
        activeOpacity={0.6}
        className="w-[60px] h-[60px] rounded-full items-center justify-center"
        style={{ backgroundColor: disabled || !onPress ? "transparent" : "rgba(255,255,255,0.06)" }}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
}
