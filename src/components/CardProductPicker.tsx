/**
 * Searchable card-product picker. Mirrors BankPicker with gorhom bottom sheet.
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
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { searchCardProducts, type CardProduct } from "@/constants/cardProducts";
import { useCardProductStore } from "@/store/cardProductStore";
import { C } from "@/constants/theme";

interface Props {
  value:        string;
  onSelect:     (p: { name: string; issuer?: string; network?: string }) => void;
  placeholder?: string;
  cardType?:    "credit" | "debit";
}

const SNAP = ["80%"];
const BG   = "#0d1225";

export default function CardProductPicker({ value, onSelect, placeholder, cardType }: Props) {
  const ref            = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");
  const products       = useCardProductStore((s) => s.products);

  const results    = useMemo(() => searchCardProducts(query, products, cardType), [query, products, cardType]);
  const typedIsNew = query.trim().length > 0 &&
    !results.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  const open  = () => ref.current?.present();
  const pick  = (p: { name: string; issuer?: string; network?: string }) => {
    onSelect(p); ref.current?.dismiss(); setQuery("");
  };

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.65} pressBehavior="close" />
    ),
    [],
  );

  const renderItem = ({ item }: ListRenderItemInfo<CardProduct>) => {
    const selected = item.name.toLowerCase() === value.trim().toLowerCase();
    return (
      <TouchableOpacity onPress={() => pick(item)} activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="card-outline" size={16} color={C.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: selected ? C.purple : "#e5e7eb" }}>{item.name}</Text>
          <Text style={{ fontSize: 11, color: C.textDim }}>
            {[item.issuer, item.network, item.type].filter(Boolean).join(" · ")}
          </Text>
        </View>
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
        <Text style={{ fontSize: 14, color: value ? C.textPrimary : C.textDim }}>{value || placeholder || "Select your card"}</Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      <BottomSheetModal ref={ref} snapPoints={SNAP} enableDynamicSizing={false} onDismiss={() => setQuery("")}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive" keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.18)", width: 40, height: 4 }}
        backgroundStyle={{ backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border }}>

        <BottomSheetView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 12 }}>Select your card</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12,
              borderWidth: 1, borderColor: C.border, backgroundColor: C.bgEl, paddingHorizontal: 12 }}>
              <Ionicons name="search" size={18} color={C.textMuted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search cards…"
                placeholderTextColor={C.textDim} autoFocus autoCorrect={false}
                style={{ flex: 1, fontSize: 14, color: C.textPrimary, paddingVertical: 12 }} />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <BottomSheetFlatList
          data={results}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListHeaderComponent={typedIsNew ? (
            <TouchableOpacity onPress={() => pick({ name: query.trim() })}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(168,85,247,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="add" size={18} color={C.purple} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: C.textPrimary }}>
                Use &quot;<Text style={{ fontWeight: "600" }}>{query.trim()}</Text>&quot;
              </Text>
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 32 }}>
              No cards match &quot;{query}&quot;.
            </Text>
          }
          renderItem={renderItem}
        />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
