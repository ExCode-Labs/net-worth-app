import React, { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useConfirmStore } from "@/store/confirmStore";

/**
 * App-styled confirmation dialog — the in-house replacement for the OS
 * Alert.alert. Driven imperatively via `confirm()` from confirmStore.
 */
export function ConfirmDialog() {
  const { visible, options, accept, dismiss } = useConfirmStore();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 160 });
      scale.value = withTiming(1, { duration: 180 });
    } else {
      opacity.value = withTiming(0, { duration: 140 });
      scale.value = withTiming(0.92, { duration: 140 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!options) return null;

  const {
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false,
  } = options;
  const accent = destructive ? "#f87171" : "#a855f7";

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={dismiss}>
      <Animated.View
        style={[
          { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
          backdropStyle,
        ]}
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" }}
          onPress={dismiss}
        />
        <Animated.View
          style={[
            {
              width: "100%",
              maxWidth: 360,
              borderRadius: 22,
              backgroundColor: "#0d1225",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              padding: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 24,
              elevation: 24,
            },
            cardStyle,
          ]}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: accent + "22",
              marginBottom: 14,
            }}
          >
            <Ionicons
              name={destructive ? "trash-outline" : "help-circle-outline"}
              size={24}
              color={accent}
            />
          </View>

          <Text style={{ fontSize: 19, fontWeight: "700", color: "#fff", marginBottom: 6 }}>
            {title}
          </Text>
          {message ? (
            <Text style={{ fontSize: 14, color: "#9ca3af", lineHeight: 20, marginBottom: 20 }}>
              {message}
            </Text>
          ) : (
            <View style={{ height: 12 }} />
          )}

          <View style={{ flexDirection: "row", gap: 14 }}>
            {/* Secondary — outline */}
            <Pressable
              onPress={dismiss}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: "transparent",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#e5e7eb" }}>{cancelText}</Text>
            </Pressable>
            {/* Primary — solid accent (red for destructive) */}
            <Pressable
              onPress={accept}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: accent,
                opacity: pressed ? 0.85 : 1,
                shadowColor: accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 6,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
