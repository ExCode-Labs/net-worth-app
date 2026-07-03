/**
 * AI Insights — full-page view of the server-generated spending insights
 * (same data as the dashboard card). Reachable from Profile → AI Insights
 * and by tapping the dashboard card.
 */
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { apiEnabled } from "@/services/api";
import { fetchAiInsights } from "@/services/ai";
import { useTransactionStore } from "@/store/transactionStore";
import { CATEGORIES } from "@/constants/categories";
import { fmt } from "@/utils/formatters";
import { categoryTotals, cardSpendSeries, periodStart } from "@/utils/analytics";

const CAT_ICON = new Map(
  [...CATEGORIES.Expense, ...CATEGORIES.Income].map((c) => [c.name, c.icon] as const),
);
const CARD_COLOR = "#a855f7";
const OTHER_COLOR = "#3b82f6";

export default function AiInsightsScreen() {
  const [insights, setInsights]       = useState<string[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const transactions = useTransactionStore((s) => s.transactions);
  const since = useMemo(() => periodStart("3M"), []);
  const cats  = useMemo(() => categoryTotals(transactions, "Expense", since), [transactions, since]);
  const catTotal = cats.reduce((s, c) => s + c.total, 0);
  const catMax   = Math.max(1, ...cats.map((c) => c.total));

  const cardMonths = useMemo(() => cardSpendSeries(transactions, 6), [transactions]);
  const hasCardSpend = cardMonths.some((m) => m.card > 0);
  const cardChartMax = Math.max(1, ...cardMonths.flatMap((m) => [m.card, m.other]));

  const load = useCallback((isRefresh = false) => {
    if (!apiEnabled) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    fetchAiInsights()
      .then((r) => { setInsights(r.insights); setGeneratedAt(r.generatedAt); })
      .catch(() => setInsights(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <View className="flex-row items-center px-xl pt-3 pb-[14px] gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">AI Insights</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl tintColor="#a855f7" refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View className="px-xl gap-4 mt-2">

          {/* Hero */}
          <View
            className="rounded-[20px] border border-accent-purple/[0.28] p-5 overflow-hidden items-center"
            style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
          >
            <View style={{ position: "absolute", top: -30, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(168,85,247,0.12)" }} pointerEvents="none" />
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(168,85,247,0.18)" }}
            >
              <Ionicons name="sparkles" size={26} color="#a855f7" />
            </View>
            <Text className="text-base font-bold text-white mb-1">Smart Spending Analysis</Text>
            <Text className="text-xs text-muted text-center">
              Generated from your spending patterns{generatedAt ? ` · ${new Date(generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
            </Text>
          </View>

          {/* Category-wise spend (last 3 months) */}
          {cats.length > 0 && (
            <View
              className="rounded-[18px] border border-white/[0.08] p-[18px]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <Text className="text-base font-bold text-white mb-3">Category-wise Spend</Text>
              <View className="gap-3">
                {cats.slice(0, 8).map((c) => {
                  const pct = catTotal > 0 ? Math.round((c.total / catTotal) * 100) : 0;
                  return (
                    <View key={c.label}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2 flex-1 pr-2">
                          <Ionicons name={CAT_ICON.get(c.label) ?? "pricetag-outline"} size={14} color="#a855f7" />
                          <Text className="text-[13px] text-secondary font-medium flex-1" numberOfLines={1}>{c.label}</Text>
                        </View>
                        <Text className="text-[13px] font-bold text-white">{fmt(c.total)}</Text>
                        <Text className="text-[11px] text-dim ml-2" style={{ width: 34, textAlign: "right" }}>{pct}%</Text>
                      </View>
                      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                        <View style={{ width: `${Math.max((c.total / catMax) * 100, 2)}%`, height: "100%", borderRadius: 999, backgroundColor: "#a855f7" }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Card spend behaviour — card-paid vs other spend, last 6 months */}
          {hasCardSpend && (
            <View
              className="rounded-[18px] border border-white/[0.08] p-[18px]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-bold text-white">Card Spend Behaviour</Text>
                <View className="flex-row gap-3">
                  <Legend color={CARD_COLOR} label="Card" />
                  <Legend color={OTHER_COLOR} label="Other" />
                </View>
              </View>
              <View className="flex-row items-end justify-between" style={{ height: 120 }}>
                {cardMonths.map((m) => (
                  <View key={m.key} className="flex-1 items-center gap-1.5">
                    <View className="flex-row items-end gap-[3px]" style={{ height: 96 }}>
                      <MiniBar pct={m.card / cardChartMax} color={CARD_COLOR} />
                      <MiniBar pct={m.other / cardChartMax} color={OTHER_COLOR} />
                    </View>
                    <Text className="text-[10px] font-semibold text-dim">{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Insights list */}
          <View
            className="rounded-[18px] border border-white/[0.08] p-[18px]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            {loading ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#a855f7" />
              </View>
            ) : insights?.length ? (
              <View className="gap-4">
                {insights.map((line, i) => (
                  <View key={i} className="flex-row gap-3">
                    <View
                      className="w-7 h-7 rounded-full items-center justify-center mt-0.5"
                      style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
                    >
                      <Ionicons name="bulb" size={14} color="#a855f7" />
                    </View>
                    <Text className="flex-1 text-sm text-secondary leading-5 mt-1">{line}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-8 gap-2">
                <Ionicons name="sparkles-outline" size={28} color="#4b5563" />
                <Text className="text-sm text-muted text-center">
                  {apiEnabled
                    ? "Not enough data yet. Add a few transactions and check back."
                    : "AI Insights aren't available right now."}
                </Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text className="text-[11px] text-dim">{label}</Text>
    </View>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View
      style={{
        width: 9,
        height: `${Math.max(pct * 100, pct > 0 ? 3 : 0)}%`,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        backgroundColor: color,
      }}
    />
  );
}
