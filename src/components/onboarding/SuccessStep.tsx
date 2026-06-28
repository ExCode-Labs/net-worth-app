import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fmt } from "@/utils/formatters";

interface SuccessStepProps {
  readonly currency: string;
  readonly account: { type: string; bank: string; balance: string };
  readonly asset:   { type: string; name: string;  value: string  };
}

const WHATS_NEXT: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}[] = [
  { icon: "add-circle-outline",    text: "Add more accounts & cards"           },
  { icon: "swap-horizontal-outline",text: "Track daily transactions"            },
  { icon: "bulb-outline",          text: "Get AI-powered insights"             },
  { icon: "notifications-outline", text: "Auto-capture from bank notifications"},
];

export default function SuccessStep({ currency, account, asset }: SuccessStepProps) {
  const accountBal = parseFloat(account.balance) || 0;
  const assetVal   = parseFloat(asset.value)     || 0;
  const netWorth   = accountBal + assetVal;

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1,    { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ), -1, true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View className="gap-[18px]">
      {/* Celebration header */}
      <Animated.View entering={FadeInDown.duration(500)} className="items-center gap-2">
        <View className="w-16 h-16 rounded-full bg-accent-purple/[0.18] border border-accent-purple/30 items-center justify-center mb-1">
          <Ionicons name="checkmark-circle" size={38} color="#a855f7" />
        </View>
        <Text className="text-[26px] font-extrabold text-white">You&apos;re All Set!</Text>
        <Text className="text-base text-muted text-center">Your financial journey starts here.</Text>
      </Animated.View>

      {/* Net worth hero card */}
      <Animated.View
        entering={ZoomIn.duration(600).delay(180).springify()}
        className="rounded-[20px] p-6 items-center border border-accent-purple/[0.28] overflow-hidden"
        style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
      >
        <View
          className="absolute rounded-full"
          style={{ width: 160, height: 160, backgroundColor: "rgba(168,85,247,0.12)", top: -30, right: -30 }}
        />
        <Text className="text-xs text-muted font-bold uppercase tracking-wide mb-2">Your Net Worth</Text>
        <Animated.Text style={[pulseStyle, { fontSize: 36, fontWeight: "900", color: "#fff", marginBottom: 4 }]}>
          {fmt(netWorth)}
        </Animated.Text>
        <Text className="text-xs text-dim">as of today</Text>
      </Animated.View>

      {/* Assets vs Liabilities */}
      <Animated.View entering={FadeInDown.duration(450).delay(360)} className="flex-row gap-3">
        <View
          className="flex-1 rounded-[14px] p-4 border border-accent-green/25 gap-1"
          style={{ backgroundColor: "rgba(74,222,128,0.15)" }}
        >
          <Text className="text-xs text-muted font-bold uppercase">Total Assets</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#4ade80" }}>
            {fmt(accountBal + assetVal)}
          </Text>
        </View>
        <View
          className="flex-1 rounded-[14px] p-4 border border-accent-red/20 gap-1"
          style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
        >
          <Text className="text-xs text-muted font-bold uppercase">Liabilities</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#f87171" }}>₹0</Text>
          <Text className="text-xs text-dim">Add later</Text>
        </View>
      </Animated.View>

      {/* Setup summary */}
      <Animated.View
        entering={FadeInUp.duration(450).delay(480)}
        className="rounded-[14px] p-4 border border-white/[0.08]"
        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      >
        <Text className="text-xs text-muted font-bold uppercase tracking-wide mb-[10px]">Your Setup</Text>
        <View className="gap-2">
          <SummaryRow text={`Currency: ${currency === "INR" ? "Indian Rupee (₹)" : "US Dollar ($)"}`} />
          {account.bank ? <SummaryRow text={`${account.bank} · ${fmt(accountBal)}`} /> : null}
          {asset.name   ? <SummaryRow text={`${asset.name} · ${fmt(assetVal)}`}     /> : null}
        </View>
      </Animated.View>

      {/* What's next */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(580)}
        className="rounded-[14px] p-4 border border-accent-blue/[0.14] gap-3"
        style={{ backgroundColor: "rgba(59,130,246,0.06)" }}
      >
        <Text className="text-xs text-muted font-bold uppercase tracking-wide">What&apos;s Next?</Text>
        {WHATS_NEXT.map((item) => (
          <View key={item.text} className="flex-row items-center gap-3">
            <Ionicons name={item.icon} size={16} color="#6b7280" />
            <Text className="text-sm text-secondary flex-1" style={{ lineHeight: 20 }}>{item.text}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function SummaryRow({ text }: { text: string }) {
  return (
    <View className="flex-row gap-2 items-start">
      <Ionicons name="checkmark-circle-outline" size={16} color="#a855f7" style={{ marginTop: 1 }} />
      <Text className="flex-1 text-sm" style={{ color: "#d1d5db" }}>{text}</Text>
    </View>
  );
}
