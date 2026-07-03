/**
 * Category picker grid, shared by Add/Edit transaction. Capped to a fixed
 * height and scrollable internally so a long category list (16 for Expense)
 * doesn't push the rest of the form off-screen.
 */
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, type TxType } from "@/constants/categories";

const GRID_HEIGHT = 220;

export function CategoryGrid({
  txType,
  category,
  onSelect,
  activeColor,
}: {
  txType: TxType;
  category: string;
  onSelect: (name: string) => void;
  activeColor: string;
}) {
  return (
    <ScrollView style={{ height: GRID_HEIGHT }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {CATEGORIES[txType].map((c) => {
          const active = category === c.name;
          return (
            <TouchableOpacity
              key={c.name}
              onPress={() => onSelect(c.name)}
              className={`w-[23%] rounded-[13px] border items-center ${
                active ? "bg-accent-purple/[0.15] border-accent-purple" : "bg-white/[0.05] border-white/[0.08]"
              }`}
              style={{ aspectRatio: 0.9, paddingVertical: 8, paddingHorizontal: 3 }}
              activeOpacity={0.75}
            >
              {/* Icon fills the flexible top zone so it's centred the same
                  in every tile regardless of how many lines the label wraps to. */}
              <View className="flex-1 items-center justify-center">
                <Ionicons name={c.icon} size={22} color={active ? activeColor : "#6b7280"} />
              </View>
              <View className="items-center justify-center" style={{ height: 20 }}>
                <Text
                  numberOfLines={2}
                  className="text-[8px] text-center font-semibold"
                  style={{ color: active ? activeColor : "#6b7280", lineHeight: 10 }}
                >
                  {c.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
