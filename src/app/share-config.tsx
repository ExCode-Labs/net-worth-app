/**
 * Pick what to share with one recipient. Reached by tapping a person on the
 * Sharing screen. Each category can be toggled on, and within it the individual
 * accounts/cards/assets/liabilities to share are chosen. Saving writes via
 * upsertShare and returns — the Sharing screen refetches on focus.
 *
 * Selection model: `picks[category]` is the array of selected item IDs. A
 * category absent from `picks` is not shared; an empty array is dropped on save.
 */
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { upsertShare, SHARE_CATEGORIES, type ShareItems } from "@/services/sharing";
import { useAccountStore, accountLabel } from "@/store/accountStore";
import { useCardStore } from "@/store/cardStore";
import { useLiabilityStore } from "@/store/liabilityStore";
import { toast } from "@/store/toastStore";
import { apiError } from "@/utils/apiError";
import { fmt } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";
import { Button } from "@/components/ui/Button";
import { C } from "@/constants/theme";

type Item = { id: string; label: string; sub: string; amount: number };

export default function ShareConfigScreen() {
  useAmountVisibilitySync();
  const { id, name, sel } = useLocalSearchParams<{ id: string; name: string; sel?: string }>();

  const accounts    = useAccountStore((s) => s.accounts);
  const assets      = useAccountStore((s) => s.assets);
  const cards       = useCardStore((s) => s.cards);
  const liabilities = useLiabilityStore((s) => s.liabilities);

  // Owner's own items, grouped by share category. "transactions" picks from the
  // same accounts as "balance" — it decides whose transaction history to reveal.
  const itemsByCat = useMemo<Record<string, Item[]>>(() => ({
    balance:      accounts.map((a) => ({ id: a.id, label: accountLabel(a), sub: a.bank, amount: a.balance })),
    transactions: accounts.map((a) => ({ id: a.id, label: accountLabel(a), sub: a.bank, amount: a.balance })),
    cards:        cards.map((c) => ({ id: c.id, label: c.cardName, sub: c.bank, amount: c.usage })),
    assets:       assets.filter((a) => !a.closed).map((a) => ({ id: a.id, label: a.name, sub: a.type, amount: a.value })),
    liabilities:  liabilities.map((l) => ({ id: l.id, label: l.name, sub: l.type, amount: l.balance })),
  }), [accounts, cards, assets, liabilities]);

  // Seed from the existing share. Legacy shares have a category but no item list
  // → treat as "all items of that category selected".
  const [picks, setPicks] = useState<Record<string, string[]>>(() => {
    const parsed = sel ? (JSON.parse(sel) as { categories: string[]; items: ShareItems }) : { categories: [], items: {} };
    const seed: Record<string, string[]> = {};
    for (const cat of parsed.categories) {
      const liveIds = new Set((itemsByCat[cat] ?? []).map((it) => it.id));
      // Reconcile stored picks against live items — an account/asset deleted after
      // the share was saved must not keep counting as shared (#19). A category with
      // no stored item list is legacy "share all", so seed it with every live id.
      seed[cat] = parsed.items?.[cat]
        ? parsed.items[cat].filter((id) => liveIds.has(id))
        : [...liveIds];
    }
    return seed;
  });
  const [saving, setSaving] = useState(false);

  const enabled = (cat: string) => picks[cat] !== undefined;

  const toggleCategory = (cat: string) =>
    setPicks((p) => {
      if (cat in p) { const { [cat]: _drop, ...rest } = p; return rest; }
      return { ...p, [cat]: (itemsByCat[cat] ?? []).map((it) => it.id) }; // default: all
    });

  const toggleItem = (cat: string, itemId: string) =>
    setPicks((p) => {
      const cur = p[cat] ?? [];
      return { ...p, [cat]: cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId] };
    });

  const save = async () => {
    if (!id) return;
    // Drop categories with nothing selected.
    const categories = Object.keys(picks).filter((c) => (picks[c]?.length ?? 0) > 0);
    const items: ShareItems = {};
    for (const c of categories) items[c] = picks[c];
    setSaving(true);
    try {
      await upsertShare(id, categories, items);
      toast.success(categories.length ? `Sharing with ${name}.` : "Sharing stopped.");
      router.back();
    } catch (e) {
      toast.error(apiError(e, "Couldn't update sharing."));
    } finally {
      setSaving(false);
    }
  };

  const anySelected = Object.values(picks).some((v) => v.length > 0);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center px-xl pt-3 pb-[14px] gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1" numberOfLines={1}>
          Share with {name}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
          Turn on a category, then pick exactly what they can see. They&apos;ll see live values.
        </Text>

        <View style={{ gap: 12 }}>
          {SHARE_CATEGORIES.map((c) => {
            const on = enabled(c.key);
            const items = itemsByCat[c.key] ?? [];
            const picked = picks[c.key] ?? [];
            return (
              <View
                key={c.key}
                style={{
                  borderRadius: 16, borderWidth: 1, overflow: "hidden",
                  borderColor: on ? C.purple : C.border,
                  backgroundColor: on ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)",
                }}
              >
                {/* Category header row */}
                <TouchableOpacity
                  onPress={() => toggleCategory(c.key)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center",
                    backgroundColor: on ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)",
                  }}>
                    <Ionicons name={c.icon} size={20} color={on ? C.purple : C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: on ? "#fff" : "#d1d5db" }}>{c.label}</Text>
                    {on && (
                      <Text style={{ fontSize: 12, color: C.textMuted }}>
                        {picked.length} of {items.length} selected
                      </Text>
                    )}
                  </View>
                  <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={22} color={on ? C.purple : C.textDim} />
                </TouchableOpacity>

                {/* Item picker */}
                {on && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
                    {items.length === 0 ? (
                      <Text style={{ fontSize: 13, color: C.textDim, paddingBottom: 4 }}>
                        Nothing to share here yet.
                      </Text>
                    ) : (
                      items.map((it) => {
                        const sel = picked.includes(it.id);
                        return (
                          <TouchableOpacity
                            key={it.id}
                            onPress={() => toggleItem(c.key, it.id)}
                            activeOpacity={0.8}
                            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}
                          >
                            <Ionicons
                              name={sel ? "checkbox" : "square-outline"}
                              size={20}
                              color={sel ? C.purple : C.textDim}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: "600", color: sel ? "#fff" : "#9ca3af" }} numberOfLines={1}>
                                {it.label}
                              </Text>
                              <Text style={{ fontSize: 11, color: C.textDim }} numberOfLines={1}>{it.sub}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : "#6b7280" }}>
                              {fmt(it.amount)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 24 }}>
          <Button
            label={saving ? "Saving…" : anySelected ? "Save sharing" : "Stop sharing"}
            onPress={save}
            variant={anySelected ? "primary" : "danger"}
            isLoading={saving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
