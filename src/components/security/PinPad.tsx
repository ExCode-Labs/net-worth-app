/**
 * Reusable numeric PIN pad: dot indicators + 0-9 keypad with an optional
 * biometric key. Controlled via `value` / `onChange`; fires `onComplete` when
 * `value` reaches `length`.
 */
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePreventScreenCapture } from "expo-screen-capture";

/** Light tactile tap on each key; never let a haptics failure break input. */
const tap = () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  title: string;
  subtitle?: string;
  error?: string | null;
  onComplete?: (pin: string) => void;
  onBiometric?: () => void;   // shows a fingerprint key when provided
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
}: Props) {
  // Block screenshots / screen-recording / screen-share while a PIN is on screen
  // (Android FLAG_SECURE renders the surface black in captures). (#9)
  usePreventScreenCapture("pinpad");

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const press = (d: string) => {
    if (value.length >= length) return;
    tap();
    onChange(value + d);
  };
  const backspace = () => { tap(); onChange(value.slice(0, -1)); };

  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <View className="items-center">
      <Text className="text-xl font-bold text-white text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-muted text-center mt-1.5">{subtitle}</Text>
      ) : null}

      {/* Dots */}
      <View className="flex-row gap-[14px] mt-7 mb-2 h-4 items-center">
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
      </View>
      <Text className="text-xs text-accent-red h-4">{error ?? ""}</Text>

      {/* Keypad */}
      <View className="flex-row flex-wrap mt-4" style={{ width: 264 }}>
        {KEYS.map((k) => (
          <Key key={k} onPress={() => press(k)}>
            <Text className="text-[26px] font-semibold text-white">{k}</Text>
          </Key>
        ))}
        {/* bottom row: biometric / 0 / backspace */}
        <Key onPress={onBiometric} disabled={!onBiometric}>
          {onBiometric ? <Ionicons name="finger-print" size={28} color="#a855f7" /> : null}
        </Key>
        <Key onPress={() => press("0")}>
          <Text className="text-[26px] font-semibold text-white">0</Text>
        </Key>
        <Key onPress={backspace} disabled={value.length === 0}>
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
