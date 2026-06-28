import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { SHARE_CATEGORIES } from "@/services/sharing";
import { C } from "@/constants/theme";

interface Props {
  visible:       boolean;
  recipientName: string;
  initial:       string[];
  saving?:       boolean;
  onSave:        (categories: string[]) => void;
  onClose:       () => void;
}

export default function CategorySheet({ visible, recipientName, initial, saving, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(initial);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (visible) setSelected(initial); }, [visible, initial]);

  const toggle = (key: string) =>
    setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 4 }}>
          Share with {recipientName}
        </Text>
        <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          Pick what they can see. They&apos;ll see live values.
        </Text>

        <View style={{ gap: 10 }}>
          {SHARE_CATEGORIES.map((c) => {
            const on = selected.includes(c.key);
            return (
              <TouchableOpacity key={c.key} onPress={() => toggle(c.key)} activeOpacity={0.8}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16,
                  borderWidth: 1, padding: 16,
                  borderColor: on ? C.purple : C.border,
                  backgroundColor: on ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.04)" }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center",
                  backgroundColor: on ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)" }}>
                  <Ionicons name={c.icon} size={20} color={on ? C.purple : C.textSecondary} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: on ? "#fff" : "#d1d5db" }}>
                  {c.label}
                </Text>
                <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={22} color={on ? C.purple : C.textDim} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 20 }}>
          <Button
            label={saving ? "Saving…" : selected.length ? "Save sharing" : "Stop sharing"}
            onPress={() => onSave(selected)}
            variant={selected.length ? "primary" : "danger"}
            isLoading={saving}
          />
        </View>
      </View>
    </Sheet>
  );
}
