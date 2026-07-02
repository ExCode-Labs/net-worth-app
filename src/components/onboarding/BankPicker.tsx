/**
 * Searchable bank picker. Tap the field → gorhom bottom sheet with search + list.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  type ListRenderItemInfo,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { searchBanks, type IndianBank } from "@/constants/indianBanks";
import { useBankStore } from "@/store/bankStore";
import { C } from "@/constants/theme";

interface Props {
  value:        string;
  onSelect:     (bankName: string) => void;
  placeholder?: string;
}

const SNAP = ["80%"];
const BG   = "#0d1225";

export default function BankPicker({ value, onSelect, placeholder }: Props) {
  const ref          = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");
  const banks        = useBankStore((s) => s.banks);

  const results    = useMemo(() => searchBanks(query, banks), [query, banks]);
  const typedIsNew = query.trim().length > 0 &&
    !banks.some((b) => b.name.toLowerCase() === query.trim().toLowerCase());

  const open  = () => ref.current?.present();
  const close = () => { ref.current?.dismiss(); setQuery(""); };

  const pick = (name: string) => { onSelect(name); close(); };

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.65} pressBehavior="close" />
    ),
    [],
  );

  const renderItem = ({ item }: ListRenderItemInfo<IndianBank>) => {
    const selected = item.name.toLowerCase() === value.trim().toLowerCase();
    return (
      <TouchableOpacity onPress={() => pick(item.name)} activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: C.textSecondary }}>{item.code.slice(0, 2)}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 14, color: selected ? C.purple : "#e5e7eb" }}>{item.name}</Text>
        {selected && <Ionicons name="checkmark" size={20} color={C.purple} />}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity onPress={open} activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
          borderWidth: 1, borderColor: C.border, backgroundColor: C.bgEl }}>
        <Text style={{ fontSize: 14, color: value ? C.textPrimary : C.textDim }}>{value || placeholder || "Select your bank"}</Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      <BottomSheetModal ref={ref} snapPoints={SNAP} enableDynamicSizing={false} onDismiss={() => setQuery("")}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive" keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.18)", width: 40, height: 4 }}
        backgroundStyle={{ backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border }}>

        {/* BottomSheetFlatList must be a direct child — BottomSheetView wrapper breaks scroll */}
        <BottomSheetFlatList
          data={results}
          keyExtractor={(b) => b.code}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ paddingBottom: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 12 }}>Select your bank</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12,
                borderWidth: 1, borderColor: C.border, backgroundColor: C.bgEl, paddingHorizontal: 12 }}>
                <Ionicons name="search" size={18} color={C.textMuted} />
                <TextInput value={query} onChangeText={setQuery} placeholder="Search 60+ banks…"
                  placeholderTextColor={C.textDim} autoFocus autoCorrect={false}
                  style={{ flex: 1, fontSize: 14, color: C.textPrimary, paddingVertical: 12 }} />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {typedIsNew && (
                <TouchableOpacity onPress={() => pick(query.trim())}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(168,85,247,0.15)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="add" size={18} color={C.purple} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: C.textPrimary }}>
                    Use &quot;<Text style={{ fontWeight: "600" }}>{query.trim()}</Text>&quot;
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 32 }}>
              No banks match &quot;{query}&quot;.
            </Text>
          }
          renderItem={renderItem}
        />
      </BottomSheetModal>
    </>
  );
}
