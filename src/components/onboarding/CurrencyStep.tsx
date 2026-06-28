import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CurrencyStepProps {
  readonly selected: string;
  readonly onSelect: (currency: string) => void;
  readonly guestName?: string;
  readonly onGuestNameChange?: (name: string) => void;
}

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", sub: "Default for India"  },
  { code: "USD", symbol: "$", name: "US Dollar",    sub: "Global standard"    },
];

const HINTS: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [
  { icon: "refresh-circle-outline", text: "Change anytime in settings"          },
  { icon: "globe-outline",          text: "Multi-currency assets supported"     },
  { icon: "bar-chart-outline",      text: "All reports use your base currency"  },
];

export default function CurrencyStep({
  selected,
  onSelect,
  guestName,
  onGuestNameChange,
}: CurrencyStepProps) {
  const isGuest = onGuestNameChange !== undefined;

  return (
    <View className="gap-7">
      {/* Header */}
      <View className="items-center gap-2">
        <View className="w-16 h-16 rounded-[20px] bg-accent-purple/[0.15] border border-accent-purple/30 items-center justify-center mb-1">
          <Ionicons name="cash-outline" size={32} color="#a855f7" />
        </View>
        <Text className="text-[26px] font-extrabold text-white text-center">Choose Your Currency</Text>
        <Text className="text-base text-muted text-center">All amounts will be shown in this currency.</Text>
      </View>

      {/* Guest name input */}
      {isGuest && (
        <View className="gap-2.5">
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
            What should we call you?
          </Text>
          <View
            className="flex-row items-center rounded-[13px] border border-white/[0.12] gap-3 px-[14px] py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="person-outline" size={18} color="#6b7280" />
            <TextInput
              className="flex-1 text-base text-white"
              style={{ paddingVertical: 0 }}
              placeholder="Your name (optional)"
              placeholderTextColor="#4b5563"
              value={guestName}
              onChangeText={onGuestNameChange}
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
          <Text className="text-xs text-dim">
            Used to personalise your dashboard. Stored locally only.
          </Text>
        </View>
      )}

      {/* Currency options */}
      <View className="gap-3">
        {CURRENCIES.map((c) => {
          const active = selected === c.code;
          return (
            <TouchableOpacity
              key={c.code}
              onPress={() => onSelect(c.code)}
              activeOpacity={0.75}
              className={`flex-row items-center gap-4 p-[18px] rounded-2xl border-[1.5px] ${
                active ? "border-accent-purple" : "border-white/10"
              }`}
              style={{ backgroundColor: active ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)" }}
            >
              <View
                className="w-[52px] h-[52px] rounded-[14px] items-center justify-center"
                style={{ backgroundColor: active ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.08)" }}
              >
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#a855f7" }}>{c.symbol}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-base font-bold mb-0.5 ${active ? "text-white" : "text-secondary"}`}>
                  {c.name}
                </Text>
                <Text className="text-xs text-dim">{c.sub}</Text>
              </View>
              <View
                className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center ${
                  active ? "border-accent-purple" : "border-white/20"
                }`}
              >
                {active && <View className="w-[10px] h-[10px] rounded-full bg-accent-purple" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Feature hints */}
      <View
        className="rounded-[14px] p-4 gap-3 border border-white/[0.07]"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {HINTS.map((h) => (
          <View key={h.text} className="flex-row items-center gap-3">
            <Ionicons name={h.icon} size={16} color="#6b7280" />
            <Text className="text-sm text-secondary">{h.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
