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

/** Fixed height for every day cell — the key to keeping all rows aligned. */
const CELL_H = 50;

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

  // Build the grid as actual week-rows (not a flat flex-wrap list): 7 cells
  // per row, each flex:1. A flat list with `width: 100/7 + "%"` per cell — a
  // repeating decimal — accumulates floating-point rounding error across the
  // row, so the 7th cell's total width occasionally exceeds the container and
  // wraps onto the next line, leaving the last column looking empty. Explicit
  // rows sidestep that: no wrap, no fractional-percent rounding to accumulate.
  const weeks = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDow = new Date(year, m, 1).getDay();
    const days = new Date(year, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(year, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const out: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
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

      {/* Day grid — one row per week, 7 flex:1 cells each, fixed height so
          rows stay aligned whether or not a day has income/expense totals. */}
      <View>
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row">
            {week.map((d, i) => {
              if (!d) return <View key={i} style={{ flex: 1, height: CELL_H }} />;
              const k = dayKey(d);
              const t = totals.get(k);
              const isToday = k === todayKey;
              const isSel = k === selKey;
              return (
                <View key={i} style={{ flex: 1, height: CELL_H, padding: 2 }}>
                  <TouchableOpacity
                    onPress={() => onSelectDay(d)}
                    activeOpacity={0.7}
                    className="flex-1 rounded-[10px] items-center pt-[3px]"
                    style={{
                      overflow: "hidden",
                      backgroundColor: isSel
                        ? "rgba(168,85,247,0.22)"
                        : t
                          ? "rgba(255,255,255,0.035)"
                          : "transparent",
                      borderWidth: isSel || isToday ? 1 : 0,
                      borderColor: isSel ? "#a855f7" : isToday ? "rgba(255,255,255,0.18)" : "transparent",
                    }}
                  >
                    <Text className="text-[12px] font-semibold" style={{ color: isToday || isSel ? "#fff" : "#cbd5e1" }}>
                      {d.getDate()}
                    </Text>
                    <View style={{ marginTop: 1, width: "100%", alignItems: "center" }}>
                      {t?.income ? (
                        <Text className="text-[8px] font-bold" style={{ color: "#4ade80" }} numberOfLines={1}>+{tiny(t.income)}</Text>
                      ) : null}
                      {t?.expense ? (
                        <Text className="text-[8px] font-bold" style={{ color: "#f87171" }} numberOfLines={1}>-{tiny(t.expense)}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
