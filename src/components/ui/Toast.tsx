import React, { useEffect } from "react";
import { Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore, type ToastType } from "@/store/toastStore";

const CONFIG: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
  }
> = {
  success: {
    bg: "rgba(8,28,18,0.97)",
    border: "rgba(74,222,128,0.25)",
    icon: "checkmark-circle",
    color: "#4ade80",
  },
  error: {
    bg: "rgba(28,8,8,0.97)",
    border: "rgba(248,113,113,0.2)",
    icon: "close-circle",
    color: "#f87171",
  },
  info: {
    bg: "rgba(8,18,38,0.97)",
    border: "rgba(59,130,246,0.4)",
    icon: "information-circle",
    color: "#3b82f6",
  },
};

export function Toast() {
  const { visible, message, type } = useToastStore();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0,    { duration: 220 });
      opacity.value    = withTiming(1,    { duration: 180 });
    } else {
      translateY.value = withTiming(-120, { duration: 260 });
      opacity.value    = withTiming(0,    { duration: 260 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const cfg = CONFIG[type];

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 20,
          right: 20,
          zIndex: 9999,
          top: insets.top + 10,
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Animated.View
        className="flex-row items-center gap-[10px] px-4 py-[13px] rounded-[14px] border"
        style={{
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
          elevation: 14,
        }}
      >
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        <Text
          className="flex-1 text-lg font-medium"
          style={{ color: "#f1f5f9", lineHeight: 20 }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
