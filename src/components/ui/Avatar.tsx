import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { dim: number; fs: number; r: number }> = {
  xs: { dim: 28, fs: 11, r: 8  },
  sm: { dim: 36, fs: 13, r: 10 },
  md: { dim: 44, fs: 16, r: 12 },
  lg: { dim: 56, fs: 20, r: 14 },
  xl: { dim: 72, fs: 26, r: 18 },
};

const PALETTE = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

export function Avatar({
  name,
  uri,
  size = "md",
  style,
}: {
  name?:  string;
  uri?:   string;
  size?:  Size;
  style?: object;
}) {
  const { dim, fs, r } = SIZES[size];
  const color = colorFor(name ?? "?");

  return (
    <View
      style={[
        {
          width: dim, height: dim, borderRadius: r,
          backgroundColor: color + "22",
          borderWidth: 1, borderColor: color + "55",
          overflow: "hidden",
          alignItems: "center", justifyContent: "center",
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: dim, height: dim }} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: fs, fontWeight: "700", color }}>{name ? initials(name) : "?"}</Text>
      )}
    </View>
  );
}
