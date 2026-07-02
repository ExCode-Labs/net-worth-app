/**
 * Cards tab. Lists the user's saved cards from the card store, shows usage
 * against each limit (auto-updated from card notifications), and lets the user
 * add a card via the Add Card form. This is the only Cards surface — the
 * dashboard/profile "Cards" entries route here.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCardStore,
  selectTotalLimit,
  selectTotalUsage,
  type Card,
} from "@/store/cardStore";
import { fmt, fmtShort } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";

// Per-card accent, assigned by position so the carousel stays colourful.
const ACCENTS = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"];
const accentFor = (i: number) => ACCENTS[i % ACCENTS.length];

export default function CardsScreen() {
  useAmountVisibilitySync();
  const store = useCardStore();
  const cards = store.cards;
  const totalLimit = selectTotalLimit(store);
  const totalUsage = selectTotalUsage(store);

  const [selId, setSelId] = useState<string | null>(cards[0]?.id ?? null);

  // Derive the valid index without an effect — avoids a cascading render.
  const selIndex = Math.max(0, cards.findIndex((c) => c.id === selId));
  const card: Card | undefined = cards[selIndex];
  const utilPct =
    card && card.limit > 0 ? Math.min(100, Math.round((card.usage / card.limit) * 100)) : 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-[10px] pb-[18px]">
        <Text className="text-[22px] font-bold text-white">My Cards</Text>
        <TouchableOpacity
          onPress={() => router.push("/add-card")}
          className="flex-row items-center gap-[6px] px-[14px] py-2 rounded-full border border-accent-purple/35 bg-accent-purple/[0.08]"
        >
          <Ionicons name="add-circle-outline" size={18} color="#a855f7" />
          <Text className="text-[13px] text-accent-purple font-bold">Add Card</Text>
        </TouchableOpacity>
      </View>

      {cards.length === 0 ? (
        // ── Empty state ───────────────────────────────────────────────────────
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center border border-white/[0.08]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="card-outline" size={30} color="#6b7280" />
          </View>
          <Text className="text-base font-semibold text-white">No cards yet</Text>
          <Text className="text-sm text-muted text-center">
            Add a card so NetWorth can track its limit and auto-update usage from alerts.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/add-card")}
            className="flex-row items-center gap-2 mt-2 px-5 py-3 rounded-[13px] bg-accent-purple"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">Add Card</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Card carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {cards.map((c, i) => {
              const a = accentFor(i);
              const pct = c.limit > 0 ? Math.min(100, Math.round((c.usage / c.limit) * 100)) : 0;
              const active = selId === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setSelId(c.id)} activeOpacity={0.85}>
                  <View
                    className="w-[318px] rounded-[20px] p-5 overflow-hidden border-2"
                    style={{ backgroundColor: "#0c1220", borderColor: active ? a : "transparent" }}
                  >
                    {/* Glow */}
                    <View
                      className="absolute rounded-full"
                      style={{ top: -20, right: -20, width: 120, height: 120, backgroundColor: a + "25" }}
                    />
                    <View className="flex-row justify-between mb-4">
                      <Text className="text-[15px] font-bold text-white">{c.cardName}</Text>
                      <Text className="text-[13px] font-extrabold" style={{ color: a }}>
                        {c.bank}
                      </Text>
                    </View>
                    <Text className="text-[14px] text-muted mb-4" style={{ letterSpacing: 2 }}>
                      {c.last4 ? `•••• ${c.last4}` : "•••• ••••"}
                    </Text>
                    <View className="flex-row justify-between mb-3">
                      <View>
                        <Text className="text-[10px] text-muted mb-1">Credit Limit</Text>
                        <Text className="text-[14px] font-bold text-white">{fmt(c.limit)}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] text-muted mb-1">Used</Text>
                        <Text className="text-[14px] font-bold" style={{ color: a }}>
                          {fmt(c.usage)}
                        </Text>
                      </View>
                    </View>
                    {/* Progress bar */}
                    <View className="h-[5px] bg-white/10 rounded-[3px]">
                      <View
                        className="h-[5px] rounded-[3px]"
                        style={{ width: `${pct}%` as `${number}%`, backgroundColor: a }}
                      />
                    </View>
                    <Text className="text-[10px] text-muted mt-[5px]">Utilization {pct}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {card && (
            <View className="px-5 mt-5 gap-[14px]">
              {/* Selected card details */}
              <View className="bg-white/[0.05] rounded-2xl border border-white/[0.08] p-[18px] gap-[14px]">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-[11px] text-muted mb-1">Bill Cycle</Text>
                    <Text className="text-[14px] font-semibold text-white">
                      {card.billCycle || "—"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[11px] text-muted mb-1">Expiry</Text>
                    <Text className="text-[14px] font-semibold text-white">
                      {card.expiry || "—"}
                    </Text>
                  </View>
                </View>
                <View className="h-px bg-white/[0.08]" />
                <View>
                  <Text className="text-[11px] text-muted mb-1">Outstanding</Text>
                  <Text className="text-[22px] font-extrabold text-accent-red">{fmt(card.usage)}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white/[0.05] rounded-[14px] p-4 border border-white/[0.08]">
                  <Text className="text-[11px] text-muted mb-[6px]">Available Limit</Text>
                  <Text className="text-[20px] font-bold text-accent-green">
                    {fmtShort(Math.max(0, card.limit - card.usage))}
                  </Text>
                </View>
                <View className="flex-1 bg-white/[0.05] rounded-[14px] p-4 border border-white/[0.08]">
                  <Text className="text-[11px] text-muted mb-[6px]">Utilization</Text>
                  <Text
                    className="text-[20px] font-bold"
                    style={{ color: utilPct > 70 ? "#f87171" : "#a855f7" }}
                  >
                    {utilPct}%
                  </Text>
                  <View className="h-[5px] bg-white/10 rounded-[3px] mt-2">
                    <View
                      className="h-[5px] rounded-[3px]"
                      style={{
                        width: `${utilPct}%` as `${number}%`,
                        backgroundColor: utilPct > 70 ? "#f87171" : "#a855f7",
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Totals across all cards */}
              <View className="bg-white/[0.05] rounded-[14px] p-4 border border-white/[0.08] flex-row justify-between items-center">
                <Text className="text-[12px] text-muted">
                  Total outstanding · {cards.length} card{cards.length !== 1 ? "s" : ""}
                </Text>
                <Text className="text-[15px] font-bold text-white">
                  {fmt(totalUsage)} / {fmt(totalLimit)}
                </Text>
              </View>

              {/* All cards list */}
              <Text className="text-[14px] font-bold text-white mt-1">All Cards ({cards.length})</Text>
              {cards.map((c, i) => {
                const a = accentFor(i);
                return (
                  <View
                    key={c.id}
                    className="flex-row items-center gap-3 bg-white/[0.05] rounded-[14px] p-[14px] border border-white/[0.08]"
                  >
                    <View
                      className="w-[46px] h-[46px] rounded-[13px] items-center justify-center"
                      style={{ backgroundColor: a + "20" }}
                    >
                      <Ionicons name="card-outline" size={22} color={a} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-white mb-0.5">{c.cardName}</Text>
                      <Text className="text-[11px] text-muted">
                        {c.bank}{c.last4 ? ` · •••• ${c.last4}` : ""}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[14px] font-bold mb-0.5" style={{ color: a }}>
                        {fmt(c.usage)}
                      </Text>
                      <Text className="text-[11px] text-dim">/ {fmt(c.limit)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
