/**
 * Assets list. Reachable from the dashboard ("Assets" quick action) and profile
 * ("Assets" row). The "+" opens the Add Asset form. Assets are stored in the
 * account store and counted toward net worth.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAccountStore, selectTotalAssets, type Asset } from "@/store/accountStore";
import { fmt } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";

export const ASSET_TYPES: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  mutual_fund: { label: "Mutual Fund",       icon: "trending-up-outline"      },
  stocks:      { label: "Stocks",            icon: "stats-chart-outline"      },
  gold:        { label: "Gold",              icon: "diamond-outline"          },
  fd:          { label: "Fixed Deposit",     icon: "lock-closed-outline"      },
  rd:          { label: "Recurring Deposit", icon: "repeat-outline"           },
  lic:         { label: "LIC / Insurance",   icon: "shield-checkmark-outline" },
  property:    { label: "Property",          icon: "home-outline"             },
  cash:        { label: "Cash",              icon: "cash-outline"             },
  lent:        { label: "Lent",              icon: "arrow-up-circle-outline"  },
};

/** One-line subtitle describing an asset's composition, for the list rows. */
export function assetSubtitle(a: Pick<Asset, "type" | "details">): string {
  const d = a.details ?? {};
  switch (a.type) {
    case "gold":
      return d.quantity
        ? `${d.quantity} g${d.rate ? ` · ₹${d.rate.toLocaleString("en-IN")}/g` : ""}`
        : ASSET_TYPES.gold.label;
    case "stocks":
      return d.quantity
        ? `${d.quantity} sh${d.rate ? ` · ₹${d.rate.toLocaleString("en-IN")}` : ""}`
        : ASSET_TYPES.stocks.label;
    case "mutual_fund":
      return d.quantity
        ? `${d.quantity} units${d.rate ? ` · NAV ₹${d.rate}` : ""}`
        : ASSET_TYPES.mutual_fund.label;
    case "fd":
    case "rd":
      return [
        d.bank ?? "",
        d.maturityAmount ? `matures ₹${Math.round(d.maturityAmount).toLocaleString("en-IN")}` : "",
      ].filter(Boolean).join(" · ") || ASSET_TYPES[a.type].label;
    case "lent":
      return d.phone ? `Lent · ${d.phone}` : ASSET_TYPES.lent.label;
    default:
      return ASSET_TYPES[a.type]?.label ?? "Asset";
  }
}

/** One asset list row → tap opens its detail page. `dim` styles closed assets. */
function AssetRow({ asset: a, dim }: { asset: Asset; dim?: boolean }) {
  const meta = ASSET_TYPES[a.type] ?? ASSET_TYPES.cash;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/asset/${a.id}`)}
      activeOpacity={0.7}
      className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.05)", opacity: dim ? 0.55 : 1 }}
    >
      <View
        className="w-11 h-11 rounded-[12px] items-center justify-center"
        style={{ backgroundColor: "rgba(74,222,128,0.15)" }}
      >
        <Ionicons name={meta.icon} size={22} color="#4ade80" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white mb-0.5">{a.name}</Text>
        <Text className="text-xs text-dim">{dim ? "Closed · " : ""}{assetSubtitle(a)}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{fmt(a.value)}</Text>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

export default function AssetsScreen() {
  useAmountVisibilitySync();
  const store  = useAccountStore();
  const assets = store.assets;

  const total   = selectTotalAssets(store);
  const active  = assets.filter((a) => !a.closed);
  const closed  = assets.filter((a) => a.closed);
  const count   = active.length;

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
        <Text className="text-lg font-bold text-white">Assets</Text>
        <TouchableOpacity
          onPress={() => router.push("/add-asset")}
          className="w-[38px] h-[38px] rounded-[11px] border border-accent-green/35 items-center justify-center"
          style={{ backgroundColor: "rgba(74,222,128,0.12)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={24} color="#4ade80" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Total */}
        <View
          className="mx-xl mb-5 rounded-2xl border border-accent-green/25 p-5"
          style={{ backgroundColor: "rgba(74,222,128,0.1)" }}
        >
          <Text className="text-xs text-secondary font-bold uppercase tracking-widest mb-1.5">
            Total Assets
          </Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff" }}>{fmt(total)}</Text>
          <Text className="text-xs text-muted mt-1">
            {count} asset{count !== 1 ? "s" : ""}
          </Text>
        </View>

        {assets.length === 0 ? (
          <View className="items-center px-xl pt-10 gap-3">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center border border-white/[0.08]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <Ionicons name="trending-up-outline" size={30} color="#6b7280" />
            </View>
            <Text className="text-base font-semibold text-white">No assets yet</Text>
            <Text className="text-sm text-muted text-center">
              Add investments, property or gold so NetWorth can track your total worth.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/add-asset")}
              className="flex-row items-center gap-2 mt-2 px-5 py-3 rounded-[13px] bg-accent-green"
            >
              <Ionicons name="add" size={18} color="#0a0e27" />
              <Text className="text-sm font-bold" style={{ color: "#0a0e27" }}>Add Asset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-xl gap-3">
            {active.map((a) => <AssetRow key={a.id} asset={a} />)}

            {closed.length > 0 && (
              <>
                <Text className="text-xs font-bold text-muted uppercase tracking-widest mt-3 mb-1">Closed</Text>
                {closed.map((a) => <AssetRow key={a.id} asset={a} dim />)}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
