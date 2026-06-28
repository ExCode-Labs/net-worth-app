/**
 * Lightweight month calendar (no external deps). Each day cell shows the day
 * number plus that day's income (green) / expense (red) totals when present.
 * Tapping a day reports it to the parent. The selected day and today are
 * highlighted.
 */
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type DayTotal = { income: number; expense: number };

/** Local YYYY-M-D key (no timezone shift). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Compact "1.2k" / "85k" / "999" for the tiny day cells. */
function tiny(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

export default function MonthCalendar({
  month,
  selected,
  totals,
  onSelectDay,
  onMonthChange,
}: {
  month: Date;                       // any date within the displayed month
  selected: Date | null;
  totals: Map<string, DayTotal>;
  onSelectDay: (d: Date) => void;
  onMonthChange: (d: Date) => void;
}) {
  const todayKey = dayKey(new Date());
  const selKey = selected ? dayKey(selected) : null;

  // Build the grid: leading blanks for the weekday offset, then each day.
  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDow = new Date(year, m, 1).getDay();
    const days = new Date(year, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(year, m, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  const step = (delta: number) =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <View className="mx-5 mb-3 rounded-2xl border border-white/[0.08] p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
      {/* Month header */}
      <View className="flex-row items-center justify-between px-1 mb-2">
        <TouchableOpacity onPress={() => step(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="w-8 h-8 items-center justify-center">
          <Ionicons name="chevron-back" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-[15px] font-bold text-white">{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
        <TouchableOpacity onPress={() => step(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="w-8 h-8 items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Weekday header */}
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-[10px] font-bold text-muted">{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 0.78 }} />;
          const k = dayKey(d);
          const t = totals.get(k);
          const isToday = k === todayKey;
          const isSel = k === selKey;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onSelectDay(d)}
              activeOpacity={0.7}
              style={{ width: `${100 / 7}%`, aspectRatio: 0.78, padding: 2 }}
            >
              <View
                className="flex-1 rounded-[9px] items-center pt-1"
                style={{
                  backgroundColor: isSel ? "rgba(168,85,247,0.22)" : "transparent",
                  borderWidth: isSel ? 1 : isToday ? 1 : 0,
                  borderColor: isSel ? "#a855f7" : isToday ? "rgba(255,255,255,0.18)" : "transparent",
                }}
              >
                <Text className="text-[12px] font-semibold" style={{ color: isToday || isSel ? "#fff" : "#cbd5e1" }}>
                  {d.getDate()}
                </Text>
                <View className="items-center" style={{ marginTop: 1 }}>
                  {t && t.income > 0 ? (
                    <Text className="text-[8px] font-bold" style={{ color: "#4ade80" }} numberOfLines={1}>+{tiny(t.income)}</Text>
                  ) : null}
                  {t && t.expense > 0 ? (
                    <Text className="text-[8px] font-bold" style={{ color: "#f87171" }} numberOfLines={1}>-{tiny(t.expense)}</Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
