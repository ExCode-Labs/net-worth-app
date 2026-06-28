/**
 * PersonField — capture a person's name + mobile number, with a "from contacts"
 * shortcut. Used wherever the app stores someone's number (e.g. borrow lender).
 * Pick from the OS address book, or type it in manually. The contacts button
 * hides itself when contacts aren't available on this build.
 */
import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { contactsAvailable, pickContact } from "@/services/contacts";
import { toast } from "@/store/toastStore";

export function PersonField({
  label,
  name,
  phone,
  onChangeName,
  onChangePhone,
  optional,
  namePlaceholder = "e.g., Raj Sharma",
}: {
  label: string;
  name: string;
  phone: string;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  optional?: boolean;
  namePlaceholder?: string;
}) {
  const handlePick = async () => {
    try {
      const picked = await pickContact();
      if (!picked) return; // cancelled
      onChangeName(picked.name);
      onChangePhone(picked.phone);
    } catch {
      toast.error("Couldn't open contacts.");
    }
  };

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
          {label} {optional && <Text className="text-dim">(optional)</Text>}
        </Text>
        {contactsAvailable && (
          <TouchableOpacity
            onPress={handlePick}
            className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent-purple/30"
            style={{ backgroundColor: "rgba(168,85,247,0.12)" }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="person-add-outline" size={13} color="#a855f7" />
            <Text className="text-[11px] font-semibold text-accent-purple">Contacts</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder={namePlaceholder}
        placeholderTextColor="#374151"
        className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      />
      <TextInput
        value={phone}
        onChangeText={(v) => onChangePhone(v.replace(/[^0-9+ ]/g, ""))}
        placeholder="Mobile number"
        placeholderTextColor="#374151"
        keyboardType="phone-pad"
        className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      />
    </View>
  );
}
