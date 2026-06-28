/**
 * Find people to share with. Reads contacts, hashes their numbers locally, and
 * shows which are registered NetWorth users. Pick one → choose categories.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  discoverFromContacts,
  upsertShare,
  contactsAvailable,
  type AppUser,
} from "@/services/sharing";
import { toast } from "@/store/toastStore";
import CategorySheet from "@/components/sharing/CategorySheet";

type Status = "loading" | "ok" | "denied" | "unavailable";

export default function ShareSelectScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [users, setUsers]   = useState<AppUser[]>([]);
  const [pick, setPick]     = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);

  const run = useCallback(async () => {
    setStatus("loading");
    if (!contactsAvailable) { setStatus("unavailable"); return; }
    try {
      const res = await discoverFromContacts();
      if (res.status === "denied") { setStatus("denied"); return; }
      if (res.status === "unavailable") { setStatus("unavailable"); return; }
      setUsers(res.users);
      setStatus("ok");
    } catch {
      toast.error("Couldn't search contacts.");
      setStatus("ok");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void run(); }, [run]);

  const save = async (categories: string[]) => {
    if (!pick || categories.length === 0) { setPick(null); return; }
    setSaving(true);
    try {
      await upsertShare(pick.id, categories);
      toast.success(`Sharing with ${pick.contactName || pick.name}.`);
      setPick(null);
      router.back();
    } catch {
      toast.error("Couldn't start sharing.");
    } finally {
      setSaving(false);
    }
  };

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
        <Text className="text-lg font-bold text-white">Choose a person</Text>
      </View>

      {status === "loading" ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#a855f7" />
          <Text className="text-sm text-muted">Finding people on NetWorth…</Text>
        </View>
      ) : status === "denied" ? (
        <Info icon="lock-closed-outline" title="Contacts permission needed"
          body="Allow contacts access so we can find friends who use NetWorth. Their numbers are hashed on your device — never uploaded in clear text."
          cta="Try again" onPress={run} />
      ) : status === "unavailable" ? (
        <Info icon="build-outline" title="Needs a new build"
          body="Contact discovery requires the contacts module. Rebuild the app to enable it."
        />
      ) : users.length === 0 ? (
        <Info icon="people-outline" title="No contacts on NetWorth yet"
          body="None of your contacts are registered yet. Invite them — once they sign up with their phone number, they'll show up here."
          cta="Refresh" onPress={run} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="px-xl gap-2.5 mt-1">
            <Text className="text-xs text-dim mb-1">{users.length} contact{users.length !== 1 ? "s" : ""} on NetWorth</Text>
            {users.map((u) => (
              <TouchableOpacity
                key={u.id}
                onPress={() => setPick(u)}
                activeOpacity={0.75}
                className="flex-row items-center gap-3 rounded-2xl border border-white/[0.08] p-4"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(168,85,247,0.15)" }}>
                  <Text className="text-base font-bold text-accent-purple">
                    {(u.contactName || u.name).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">{u.contactName || u.name}</Text>
                  <Text className="text-xs text-dim">On NetWorth</Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color="#a855f7" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <CategorySheet
        visible={!!pick}
        recipientName={pick?.contactName || pick?.name || ""}
        initial={[]}
        saving={saving}
        onSave={save}
        onClose={() => setPick(null)}
      />
    </SafeAreaView>
  );
}

function Info({
  icon, title, body, cta, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-3">
      <View className="w-16 h-16 rounded-2xl items-center justify-center border border-white/[0.08]" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
        <Ionicons name={icon} size={30} color="#6b7280" />
      </View>
      <Text className="text-base font-semibold text-white text-center">{title}</Text>
      <Text className="text-sm text-muted text-center">{body}</Text>
      {cta && onPress && (
        <TouchableOpacity onPress={onPress} className="flex-row items-center gap-2 mt-2 px-5 py-3 rounded-[13px] bg-accent-purple">
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text className="text-sm font-bold text-white">{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
