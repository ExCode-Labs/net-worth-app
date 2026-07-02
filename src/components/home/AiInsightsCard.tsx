/**
 * AI spending insights — a few plain-English observations generated server-side
 * (Gemini, from an aggregated category/month summary, cached ~6h). Fetched once
 * per screen focus; silently hides on failure or when there's not enough data
 * rather than showing an error card on the dashboard.
 */
import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { apiEnabled } from "@/services/api";
import { fetchAiInsights } from "@/services/ai";

export default function AiInsightsCard() {
  const [insights, setInsights] = useState<string[] | null>(null);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(useCallback(() => {
    if (!apiEnabled) { setLoading(false); return; }
    let active = true;
    fetchAiInsights()
      .then((r) => { if (active) setInsights(r.insights); })
      .catch(() => { if (active) setInsights(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  if (!apiEnabled || (!loading && !insights?.length)) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push("/ai-insights")}
      className="rounded-[18px] border border-accent-purple/[0.22] p-[18px]"
      style={{ backgroundColor: "rgba(168,85,247,0.07)" }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={16} color="#a855f7" />
          <Text className="text-base font-bold text-white">AI Insights</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#a855f7" />
      </View>

      {loading ? (
        <ActivityIndicator color="#a855f7" />
      ) : (
        <View className="gap-2.5">
          {insights!.map((line, i) => (
            <View key={i} className="flex-row gap-2.5">
              <Text className="text-xs text-accent-purple font-bold mt-0.5">•</Text>
              <Text className="flex-1 text-sm text-secondary leading-5">{line}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
