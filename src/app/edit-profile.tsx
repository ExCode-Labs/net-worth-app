/**
 * Edit Profile — change display name and phone. Avatar shows the current photo
 * or generated initials. Saves to the backend (/me) and the local user store.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useUserStore } from "@/store/userStore";
import { updateMe } from "@/services/backend";
import { toast } from "@/store/toastStore";
import { apiError } from "@/utils/apiError";

export default function EditProfileScreen() {
  const { firstName, lastName, fullName, email, avatarUrl, phone, setProfile, setPhone } = useUserStore();

  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast]   = useState(lastName ?? "");
  const [tel, setTel]     = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  const composed = [first.trim(), last.trim()].filter(Boolean).join(" ");
  const previewName = composed || fullName || "You";

  const handleSave = async () => {
    if (!first.trim()) { toast.error("Please enter your first name."); return; }
    setSaving(true);
    const newFullName = composed;
    // Optimistic local update so the UI reflects immediately.
    setProfile({ firstName: first.trim(), lastName: last.trim() || null, fullName: newFullName });
    if (tel.trim() && tel.trim() !== phone) setPhone(tel.trim());
    try {
      await updateMe({
        firstName: first.trim(),
        lastName: last.trim(),
        fullName: newFullName,
        ...(tel.trim() ? { phone: tel.trim() } : {}),
      });
      toast.success("Profile updated.");
      router.back();
    } catch (e) {
      toast.error(apiError(e, "Couldn't save. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
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
          <Text className="text-lg font-bold text-white">Edit Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar preview */}
          <View className="items-center py-4 gap-2">
            <Avatar
              name={previewName}
              uri={avatarUrl ?? undefined}
              size="xl"
              style={{ borderRadius: 999, borderWidth: 2, borderColor: "rgba(168,85,247,0.35)" }}
            />
            {email ? <Text className="text-sm text-muted">{email}</Text> : null}
          </View>

          <View className="gap-5 mt-2">
            <Field label="First Name" value={first} set={setFirst} placeholder="Your first name" autoCapitalize="words" />
            <Field label="Last Name"  value={last}  set={setLast}  placeholder="Your last name (optional)" autoCapitalize="words" />
            <Field label="Phone" value={tel} set={setTel} placeholder="e.g., +91 98765 43210" keyboardType="phone-pad" hint="Used so friends can find you to share balances. Never shown publicly." />
          </View>
        </ScrollView>

        <View
          className="px-xl pt-3 pb-2"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}
        >
          <Button label={saving ? "Saving…" : "Save Changes"} onPress={handleSave} isLoading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, set, placeholder, keyboardType, autoCapitalize, hint,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
  autoCapitalize?: "none" | "words";
  hint?: string;
}) {
  return (
    <View className="gap-[10px]">
      <Text className="text-xs font-bold text-secondary uppercase tracking-widest">{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor="#374151"
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      />
      {hint ? <Text className="text-[11px] text-dim">{hint}</Text> : null}
    </View>
  );
}
