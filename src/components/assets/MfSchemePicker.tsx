/**
 * Searchable mutual-fund scheme picker (mfapi.in). Debounced remote search.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
import { searchMutualFunds, type MfScheme } from "@/services/rates";
import { C } from "@/constants/theme";

interface Props {
  value:    string;
  onSelect: (scheme: MfScheme) => void;
}

const SNAP = ["80%"];
const BG   = "#0d1225";

export default function MfSchemePicker({ value, onSelect }: Props) {
  const ref               = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MfScheme[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.trim().length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await searchMutualFunds(query);
      setResults(r);
      setLoading(false);
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const open = () => ref.current?.present();
  const pick = (s: MfScheme) => { onSelect(s); ref.current?.dismiss(); setQuery(""); setResults([]); };

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.65} pressBehavior="close" />
    ),
    [],
  );

  const renderItem = ({ item }: ListRenderItemInfo<MfScheme>) => (
    <TouchableOpacity onPress={() => pick(item)} activeOpacity={0.7}
      style={{ paddingVertical: 14, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" }}>
      <Text style={{ fontSize: 13, color: "#e5e7eb" }}>{item.schemeName}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity onPress={open} activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
          borderWidth: 1, borderColor: C.border, backgroundColor: C.bgEl }}>
        <Text style={{ flex: 1, fontSize: 14, color: value ? C.textPrimary : C.textDim }} numberOfLines={1}>
          {value || "Search mutual fund scheme"}
        </Text>
        <Ionicons name="search" size={18} color={C.textMuted} />
      </TouchableOpacity>

      <BottomSheetModal ref={ref} snapPoints={SNAP} enableDynamicSizing={false} onDismiss={() => { setQuery(""); setResults([]); }}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive" keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.18)", width: 40, height: 4 }}
        backgroundStyle={{ backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border }}>

        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 12 }}>Find your fund</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12,
            borderWidth: 1, borderColor: C.border, backgroundColor: C.bgEl, paddingHorizontal: 12, marginBottom: 4 }}>
            <Ionicons name="search" size={18} color={C.textMuted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="e.g., HDFC Flexi Cap"
              placeholderTextColor={C.textDim} autoFocus autoCorrect={false}
              style={{ flex: 1, fontSize: 14, color: C.textPrimary, paddingVertical: 12 }} />
            {loading && <ActivityIndicator size="small" color={C.textMuted} />}
          </View>
        </BottomSheetView>

        <BottomSheetFlatList
          data={results}
          keyExtractor={(s) => String(s.schemeCode)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 32 }}>
              {query.trim().length < 3 ? "Type at least 3 letters to search."
                : loading ? "Searching…" : "No schemes found."}
            </Text>
          }
          renderItem={renderItem}
        />
      </BottomSheetModal>
    </>
  );
}
