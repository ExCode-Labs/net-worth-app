/**
 * Sharing hub. Manage who can see your finances ("People you share with") and
 * view what others share with you ("Shared with you"). The "+" finds registered
 * users from your contacts.
 */
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { apiEnabled } from "@/services/api";
import {
  listOutgoing,
  listIncoming,
  upsertShare,
  SHARE_CATEGORIES,
  type OutgoingShare,
  type IncomingShare,
} from "@/services/sharing";
import { toast } from "@/store/toastStore";
import CategorySheet from "@/components/sharing/CategorySheet";

const catLabel = (key: string) => SHARE_CATEGORIES.find((c) => c.key === key)?.label ?? key;

function Avatar({ name }: { name: string }) {
  return (
    <View
      className="w-11 h-11 rounded-full items-center justify-center"
      style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
    >
      <Text className="text-base font-bold text-accent-purple">{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function SharingScreen() {
  const [outgoing, setOutgoing] = useState<OutgoingShare[]>([]);
  const [incoming, setIncoming] = useState<IncomingShare[]>([]);
  const [loading, setLoading]   = useState(true);

  const [edit, setEdit] = useState<OutgoingShare | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!apiEnabled) { setLoading(false); return; }
    try {
      const [out, inc] = await Promise.all([listOutgoing(), listIncoming()]);
      setOutgoing(out);
      setIncoming(inc);
    } catch {
      // leave lists as-is
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveEdit = async (categories: string[]) => {
    if (!edit) return;
    setSaving(true);
    try {
      await upsertShare(edit.recipient.id, categories);
      toast.success(categories.length ? "Sharing updated." : "Sharing stopped.");
      setEdit(null);
      await load();
    } catch {
      toast.error("Couldn't update sharing.");
    } finally {
      setSaving(false);
    }
  };

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
        <Text className="text-lg font-bold text-white">Sharing</Text>
        <TouchableOpacity
          onPress={() => router.push("/share-select")}
          className="w-[38px] h-[38px] rounded-[11px] border border-accent-purple/35 items-center justify-center"
          style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="person-add-outline" size={20} color="#a855f7" />
        </TouchableOpacity>
      </View>

      {!apiEnabled ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-muted text-center">Sharing needs the backend to be connected.</Text>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#a855f7" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="px-xl gap-[22px] mt-2">

            {/* Outgoing */}
            <View>
              <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-2">People you share with</Text>
              {outgoing.length === 0 ? (
                <Text className="text-sm text-dim">You&apos;re not sharing with anyone yet. Tap + to start.</Text>
              ) : (
                <View className="gap-2.5">
                  {outgoing.map((s) => (
                    <TouchableOpacity
                      key={s.recipient.id}
                      onPress={() => setEdit(s)}
                      activeOpacity={0.75}
                      className="flex-row items-center gap-3 rounded-2xl border border-white/[0.08] p-4"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    >
                      <Avatar name={s.recipient.name} />
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-white mb-0.5">{s.recipient.name}</Text>
                        <Text className="text-xs text-dim" numberOfLines={1}>
                          {s.categories.map(catLabel).join(", ")}
                        </Text>
                      </View>
                      <Ionicons name="create-outline" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Incoming */}
            <View>
              <Text className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Shared with you</Text>
              {incoming.length === 0 ? (
                <Text className="text-sm text-dim">No one is sharing with you yet.</Text>
              ) : (
                <View className="gap-2.5">
                  {incoming.map((s) => (
                    <TouchableOpacity
                      key={s.owner.id}
                      onPress={() => router.push(`/shared/${s.owner.id}`)}
                      activeOpacity={0.75}
                      className="flex-row items-center gap-3 rounded-2xl border border-white/[0.08] p-4"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    >
                      <Avatar name={s.owner.name} />
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-white mb-0.5">{s.owner.name}</Text>
                        <Text className="text-xs text-dim" numberOfLines={1}>
                          {s.categories.map(catLabel).join(", ")}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <CategorySheet
        visible={!!edit}
        recipientName={edit?.recipient.name ?? ""}
        initial={edit?.categories ?? []}
        saving={saving}
        onSave={saveEdit}
        onClose={() => setEdit(null)}
      />
    </SafeAreaView>
  );
}
