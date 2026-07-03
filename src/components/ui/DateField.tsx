/**
 * DateField — a tappable row that opens the native date picker, used by the
 * asset/liability forms for "Start date". Value is an ISO date string ("" when
 * unset); clearing is allowed since the field is optional.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export function DateField({
  label,
  value,
  onChange,
  maximumDate,
}: {
  label: string;
  value?: string;            // ISO string, or undefined/"" when unset
  onChange: (iso?: string) => void;
  maximumDate?: Date;        // defaults to today (e.g. "Start date"); pass a future cap for dates like maturity
}) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value) : undefined;

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
          {label} <Text className="text-dim">(optional)</Text>
        </Text>
        {date && (
          <TouchableOpacity onPress={() => onChange(undefined)} hitSlop={8}>
            <Text className="text-xs text-dim">Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="flex-row items-center gap-[10px] rounded-[12px] border border-white/10 px-4 py-[14px]"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color="#6b7280" />
        <Text className={`text-base ${date ? "text-white" : "text-dim"}`}>
          {date
            ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
            : "Select date"}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date ?? new Date()}
          mode="date"
          maximumDate={maximumDate ?? new Date()}
          onChange={(e, selected) => {
            setShow(Platform.OS === "ios");
            if (e.type === "set" && selected) onChange(selected.toISOString());
          }}
        />
      )}
    </View>
  );
}
