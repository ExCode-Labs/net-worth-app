/**
 * Live view of what another user shares with me. Only the categories they
 * granted are returned by the backend.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { fetchSharedData, type SharedData } from "@/services/sharing";
import { fmt } from "@/utils/formatters";

export default function SharedDataScreen() {
  const { ownerId } = useLocalSearchParams<{ ownerId: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoad(true);
    setError(false);
    try {
      setData(await fetchSharedData(ownerId));
    } catch {
      setError(true);
    } finally {
      setLoad(false);
    }
  }, [ownerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const name = data?.owner?.name ?? "Shared";

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
        <Text className="text-lg font-bold text-white" numberOfLines={1}>
          {name}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#a855f7" />
        </View>
      ) : error || !data ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="lock-closed-outline" size={30} color="#6b7280" />
          <Text className="text-sm text-muted text-center">
            This data isn&apos;t shared with you anymore.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="px-xl gap-4 mt-1">
            {data.balance && (
              <Card title="Bank Balance" icon="wallet-outline" accent="#3b82f6">
                <Text
                  style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}
                >
                  {fmt(data.balance.total)}
                </Text>
                <Text className="text-xs text-muted mt-1">
                  {data.balance.accounts} account
                  {data.balance.accounts !== 1 ? "s" : ""}
                </Text>
              </Card>
            )}

            {data.cards && (
              <Card title="Card Usage" icon="card-outline" accent="#a855f7">
                {data.cards.length === 0 ? (
                  <Empty />
                ) : (
                  data.cards.map((c, i) => (
                    <Row
                      key={i}
                      left={c.cardName}
                      sub={c.bank}
                      right={`${fmt(c.usage)} / ${fmt(c.limit)}`}
                    />
                  ))
                )}
              </Card>
            )}

            {data.assets && (
              <Card title="Assets" icon="trending-up-outline" accent="#4ade80">
                <Text
                  style={{ fontSize: 22, fontWeight: "800", color: "#4ade80" }}
                >
                  {fmt(data.assets.total)}
                </Text>
                <View className="mt-2 gap-1.5">
                  {data.assets.items.map((a, i) => (
                    <Row
                      key={i}
                      left={a.name}
                      sub={a.type}
                      right={fmt(a.value)}
                    />
                  ))}
                </View>
              </Card>
            )}

            {data.liabilities && (
              <Card
                title="Liabilities"
                icon="trending-down-outline"
                accent="#f87171"
              >
                <Text
                  style={{ fontSize: 22, fontWeight: "800", color: "#f87171" }}
                >
                  {fmt(data.liabilities.total)}
                </Text>
                <View className="mt-2 gap-1.5">
                  {data.liabilities.items.map((l, i) => (
                    <Row
                      key={i}
                      left={l.name}
                      sub={l.type}
                      right={fmt(l.balance)}
                    />
                  ))}
                </View>
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Card({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="rounded-2xl border border-white/[0.08] p-[18px]"
      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
    >
      <View className="flex-row items-center gap-2 mb-3">
        <Ionicons name={icon} size={18} color={accent} />
        <Text className="text-sm font-bold text-white">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({
  left,
  sub,
  right,
  dim,
}: {
  left: string;
  sub?: string;
  right: string;
  dim?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between py-1.5"
      style={{ opacity: dim ? 0.5 : 1 }}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-white">{left}</Text>
        {sub ? <Text className="text-xs text-dim">{sub}</Text> : null}
      </View>
      <Text className="text-sm font-bold text-white">{right}</Text>
    </View>
  );
}

function Empty() {
  return <Text className="text-sm text-muted">Nothing here.</Text>;
}
