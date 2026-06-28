import React from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ACCENT  = "#a855f7";
const SPRING  = { damping: 18, stiffness: 350 };
const AnimPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({
  label,
  selected = false,
  icon,
  onPress,
  style,
}: {
  label:     string;
  selected?: boolean;
  icon?:     IconName;
  onPress?:  () => void;
  style?:    StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.94, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      style={[
        animStyle,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? ACCENT : "rgba(255,255,255,0.08)",
          backgroundColor: selected ? ACCENT : "rgba(255,255,255,0.05)",
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? "#fff" : "#6b7280"} />}
      <Text
        numberOfLines={1}
        style={{ fontSize: 13, fontWeight: "600", color: selected ? "#fff" : "#9ca3af" }}
      >
        {label}
      </Text>
    </AnimPressable>
  );
}
