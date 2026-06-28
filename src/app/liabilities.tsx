/**
 * Liabilities list. Reachable from the dashboard ("Liabilities" quick action)
 * and profile ("Liabilities" row). The "+" opens the Add Liability form.
 * Liabilities are subtracted from assets/balances to compute net worth.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLiabilityStore, selectTotalLiabilities, type Liability } from "@/store/liabilityStore";
import { useCardStore, selectTotalUsage, cardLast4 } from "@/store/cardStore";
import { fmt } from "@/utils/formatters";

export const LIABILITY_TYPES: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  loan:     { label: "Loan",       icon: "cash-outline"              },
  emi:      { label: "EMI",        icon: "calendar-outline"          },
  mortgage: { label: "Mortgage",   icon: "home-outline"              },
  credit:   { label: "Credit Due", icon: "card-outline"              },
  borrow:   { label: "Borrowed",   icon: "arrow-down-circle-outline" },
  other:    { label: "Other",      icon: "ellipsis-horizontal"       },
};

/** Types the user can add manually — credit dues come from cards, so they're
 *  excluded here. */
export const ADDABLE_LIABILITY_TYPES = ["loan", "emi", "borrow"] as const;

/** One liability list row → tap opens its detail page. `dim` styles repaid ones. */
function LiabilityRow({ liability: l, dim }: { liability: Liability; dim?: boolean }) {
  const meta = LIABILITY_TYPES[l.type] ?? LIABILITY_TYPES.other;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/liability/${l.id}`)}
      activeOpacity={0.7}
      className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.05)", opacity: dim ? 0.55 : 1 }}
    >
      <View
        className="w-11 h-11 rounded-[12px] items-center justify-center"
        style={{ backgroundColor: "rgba(248,113,113,0.15)" }}
      >
        <Ionicons name={meta.icon} size={22} color="#f87171" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white mb-0.5">{l.name}</Text>
        <Text className="text-xs text-dim">
          {dim ? "Repaid · " : ""}{meta.label}{l.lender ? ` · ${l.lender}` : ""}
          {l.emi > 0 ? ` · EMI ${fmt(l.emi)}` : ""}
        </Text>
        {l.phone ? <Text className="text-xs text-accent-purple mt-0.5">{l.phone}</Text> : null}
      </View>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#f87171" }}>{fmt(l.balance)}</Text>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

export default function LiabilitiesScreen() {
  const store       = useLiabilityStore();
  const liabilities = store.liabilities;

  // Derived liabilities (read-only): credit-card dues come from each card's
  // outstanding usage.
  const cardStore   = useCardStore();
  const dueCards    = cardStore.cards.filter((c) => c.usage > 0);
  const cardDue     = selectTotalUsage(cardStore);

  const active = liabilities.filter((l) => !l.closed);
  const closed = liabilities.filter((l) => l.closed);

  const total = selectTotalLiabilities(store) + cardDue;
  const count = active.length + dueCards.length;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center justify-between px-xl pt-3 pb-[14px]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Liabilities</Text>
        <TouchableOpacity
          onPress={() => router.push("/add-liability")}
          className="w-[38px] h-[38px] rounded-[11px] border border-accent-red/35 items-center justify-center"
          style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={24} color="#f87171" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Total */}
        <View
          className="mx-xl mb-5 rounded-2xl border border-accent-red/25 p-5"
          style={{ backgroundColor: "rgba(248,113,113,0.1)" }}
        >
          <Text className="text-xs text-secondary font-bold uppercase tracking-widest mb-1.5">
            Total Owed
          </Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff" }}>{fmt(total)}</Text>
          <Text className="text-xs text-muted mt-1">
            {count} liabilit{count !== 1 ? "ies" : "y"}
          </Text>
        </View>

        {count === 0 && closed.length === 0 ? (
          <View className="items-center px-xl pt-10 gap-3">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center border border-white/[0.08]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <Ionicons name="trending-down-outline" size={30} color="#6b7280" />
            </View>
            <Text className="text-base font-semibold text-white">No liabilities yet</Text>
            <Text className="text-sm text-muted text-center">
              Add loans, EMIs or dues so NetWorth can show your true net worth.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/add-liability")}
              className="flex-row items-center gap-2 mt-2 px-5 py-3 rounded-[13px]"
              style={{ backgroundColor: "#f87171" }}
            >
              <Ionicons name="add" size={18} color="#0a0e27" />
              <Text className="text-sm font-bold" style={{ color: "#0a0e27" }}>Add Liability</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-xl gap-3">
            {active.map((l) => <LiabilityRow key={l.id} liability={l} />)}

            {/* Derived: credit-card dues (read-only; manage cards in Cards) */}
            {dueCards.map((c) => (
              <View
                key={c.id}
                className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <View
                  className="w-11 h-11 rounded-[12px] items-center justify-center"
                  style={{ backgroundColor: "rgba(248,113,113,0.15)" }}
                >
                  <Ionicons name="card-outline" size={22} color="#f87171" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white mb-0.5">{c.cardName || `${c.bank} Card`}</Text>
                  <Text className="text-xs text-dim">
                    Credit Due · {c.bank}{cardLast4(c) ? ` · •••• ${cardLast4(c)}` : ""}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#f87171" }}>{fmt(c.usage)}</Text>
              </View>
            ))}

            {closed.length > 0 && (
              <>
                <Text className="text-xs font-bold text-muted uppercase tracking-widest mt-3 mb-1">Repaid</Text>
                {closed.map((l) => <LiabilityRow key={l.id} liability={l} dim />)}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
