/**
 * Standardized text input — label, error/hint, left icon, right element.
 * Animates the border to accent-purple on focus.
 */
import React, { forwardRef, useState } from "react";
import { View, Text, TextInput, type TextInputProps, type ViewStyle } from "react-native";
import { C } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface InputProps extends TextInputProps {
  label?:        string;
  error?:        string;
  hint?:         string;
  leftIcon?:     IconName;
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, onFocus, onBlur, containerStyle, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error ? C.redBorder : focused ? C.purple : C.border;

    return (
      <View style={[{ gap: 6 }, containerStyle]}>
        {label && (
          <Text style={{ fontSize: 11, fontWeight: "700", color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>
            {label}
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 13,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            backgroundColor: C.bgEl,
          }}
        >
          {leftIcon && <Ionicons name={leftIcon} size={18} color={focused ? C.purple : C.textMuted} />}
          <TextInput
            ref={ref}
            placeholderTextColor={C.textDim}
            onFocus={(e) => { setFocused(true);  onFocus?.(e); }}
            onBlur={(e)  => { setFocused(false); onBlur?.(e);  }}
            style={[{ flex: 1, fontSize: 14, color: C.textPrimary, paddingVertical: 0 }, style]}
            {...props}
          />
          {rightElement}
        </View>
        {error && (
          <Text style={{ fontSize: 11, color: C.red }}>{error}</Text>
        )}
        {!error && hint && (
          <Text style={{ fontSize: 11, color: C.textDim }}>{hint}</Text>
        )}
      </View>
    );
  },
);
Input.displayName = "Input";
