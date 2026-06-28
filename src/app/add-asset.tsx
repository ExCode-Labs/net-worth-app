/**
 * Add Asset screen — thin wrapper around the shared <AssetForm>. The same form
 * (and the same value/maturity maths) is used in onboarding, so adding gold,
 * an FD, a mutual fund, etc. behaves identically wherever you do it.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import AssetForm, { EMPTY_ASSET_DRAFT, buildAsset, draftFromAsset, type AssetDraft } from "@/components/assets/AssetForm";
import { useAccountStore } from "@/store/accountStore";
import { toast } from "@/store/toastStore";

export default function AddAssetScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const addAsset    = useAccountStore((s) => s.addAsset);
  const updateAsset = useAccountStore((s) => s.updateAsset);
  const removeAsset = useAccountStore((s) => s.removeAsset);
  const existing    = useAccountStore((s) => s.assets.find((a) => a.id === id));
  const isEdit      = !!existing;

  const [draft, setDraft]   = useState<AssetDraft>(existing ? draftFromAsset(existing) : EMPTY_ASSET_DRAFT);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const built = buildAsset(draft);
    if (!built.valid) {
      toast.error(built.name ? "Please complete the amounts." : "Please enter a name.");
      return;
    }
    setSaving(true);
    const payload = { type: draft.type, name: built.name, value: built.value, details: built.details, startDate: built.startDate, periodMonths: built.periodMonths };
    if (isEdit) {
      updateAsset(existing.id, payload);
      toast.success("Asset updated.");
    } else {
      addAsset(payload);
      toast.success("Asset added.");
    }
    setSaving(false);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert("Delete asset", `Remove "${existing.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => { removeAsset(existing.id); toast.success("Asset deleted."); router.back(); },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
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
          <Text className="text-lg font-bold text-white">{isEdit ? "Edit Asset" : "Add Asset"}</Text>
          {isEdit ? (
            <TouchableOpacity
              onPress={handleDelete}
              className="w-[38px] h-[38px] rounded-[11px] border border-accent-red/35 items-center justify-center"
              style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AssetForm draft={draft} onChange={setDraft} />
        </ScrollView>

        <View className="px-xl pt-3 pb-2" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
          <Button label={saving ? "Saving…" : isEdit ? "Update Asset" : "Save Asset"} onPress={handleSave} isLoading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
