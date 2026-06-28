/**
 * Unified button — replaces PrimaryButton, SecondaryButton, TextButton.
 * Uses Reanimated spring press for tactile feedback.
 */
import React from "react";
import { ActivityIndicator, Pressable, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { C, S } from "@/constants/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize    = "sm" | "md" | "lg";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const SPRING = { damping: 18, stiffness: 350 };

type VariantConfig = {
  bg: string; border: string; text: string; shadow?: ViewStyle;
};
const V: Record<ButtonVariant, VariantConfig> = {
  primary:   { bg: C.purple,     border: "transparent",  text: "#fff",          shadow: S.purple as ViewStyle },
  secondary: { bg: C.bgEl,       border: C.border,        text: C.textSecondary  },
  ghost:     { bg: "transparent", border: "transparent",  text: C.purple        },
  danger:    { bg: C.redDim,     border: C.redBorder,     text: C.red           },
};
type SizeConfig = { py: number; px: number; fs: number; r: number; icon: number };
const SZ: Record<ButtonSize, SizeConfig> = {
  sm: { py: 9,  px: 14, fs: 13, r: 10, icon: 14 },
  md: { py: 13, px: 20, fs: 15, r: 12, icon: 16 },
  lg: { py: 16, px: 24, fs: 16, r: 14, icon: 18 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant   = "primary",
  size      = "lg",
  isLoading = false,
  disabled  = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
}: {
  label:      string;
  onPress:    () => void;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  isLoading?: boolean;
  disabled?:  boolean;
  leftIcon?:  IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
  style?:     ViewStyle;
}) {
  const scale   = useSharedValue(1);
  const inactive = isLoading || disabled;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: inactive ? 0.45 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  }));

  const v  = V[variant];
  const sz = SZ[size];

  return (
    <AnimatedPressable
      onPress={inactive ? undefined : onPress}
      onPressIn={() => { if (!inactive) scale.value = withSpring(0.97, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      style={[
        animStyle,
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: sz.py,
          paddingHorizontal: sz.px,
          borderRadius: sz.r,
          borderWidth: 1,
          borderColor: v.border,
          backgroundColor: v.bg,
        },
        v.shadow,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {leftIcon  && <Ionicons name={leftIcon}  size={sz.icon} color={v.text} />}
          <Animated.Text style={{ fontSize: sz.fs, fontWeight: "700", color: v.text, letterSpacing: 0.1 }}>
            {label}
          </Animated.Text>
          {rightIcon && <Ionicons name={rightIcon} size={sz.icon} color={v.text} />}
        </>
      )}
    </AnimatedPressable>
  );
}
