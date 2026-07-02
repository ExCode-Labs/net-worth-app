/**
 * AI Insights — full-page view of the server-generated spending insights
 * (same data as the dashboard card). Reachable from Profile → AI Insights
 * and by tapping the dashboard card.
 */
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { apiEnabled } from "@/services/api";
import { fetchAiInsights } from "@/services/ai";

export default function AiInsightsScreen() {
  const [insights, setInsights]       = useState<string[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

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
