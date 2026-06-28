/**
 * Welcome-screen slide data + Visual sub-components.
 * Kept in constants so welcome.tsx stays a clean layout-only file.
 */
import React from "react";
import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, S } from "./theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ── Shared types ──────────────────────────────────────────────────────────────
export interface SlideHighlight {
  icon: IoniconName;
  text: string;
}

export interface Slide {
  id: string;
  accent: string;
  tag: string;
  headline: string;
  sub: string;
  highlights?: SlideHighlight[];
  Visual: React.FC;
}

// ── Reusable mini-card used in Slide 1 ───────────────────────────────────────
function AssetCard({
  icon, label, color,
}: {
  icon: IoniconName;
  label: string;
  color: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1.5 px-[10px] py-[7px] rounded-[10px] border bg-white/[0.04]"
      style={{ borderColor: color + "44" }}
    >
      <View
        className="w-[26px] h-[26px] rounded-lg items-center justify-center"
        style={{ backgroundColor: color + "22" }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text className="text-[11px] text-secondary font-semibold">{label}</Text>
    </View>
  );
}

// ── Slide visuals ─────────────────────────────────────────────────────────────
function Slide1Visual() {
  return (
    <View className="items-center">
      <View
        className="absolute rounded-full bg-accent-purple/[0.18]"
        style={{ width: 120, height: 120, top: -14 }}
      />
      <View
        className="w-20 h-20 rounded-[22px] bg-accent-purple items-center justify-center mb-1 z-[1]"
        style={S.purple}
      >
        <Image
          source={require("../../assets/foreground.png")}
          style={{ width: 52, height: 52 }}
          resizeMode="contain"
        />
        <View className="absolute top-2 right-2 w-[11px] h-[11px] rounded-full bg-accent-amber border-2 border-accent-purple" />
      </View>
      <View className="h-5 w-0.5 bg-white/[0.08] my-1" />
      <View className="flex-row gap-2 mb-2">
        <AssetCard icon="business-outline" label="Bank"     color={C.blue}   />
        <AssetCard icon="card-outline"     label="Card"     color={C.purple} />
        <AssetCard icon="home-outline"     label="Property" color={C.green}  />
      </View>
      <View className="flex-row gap-2">
        <AssetCard icon="trending-up-outline" label="Mutual Fund" color={C.amber} />
        <AssetCard icon="receipt-outline"     label="Loan"        color={C.red}   />
      </View>
    </View>
  );
}

function Slide2Visual() {
  const txs = [
    { icon: "restaurant-outline" as IoniconName, name: "Swiggy",      amt: "₹250",   cat: "Food",      color: C.amber  },
    { icon: "car-outline"        as IoniconName, name: "Fuel",         amt: "₹500",   cat: "Transport", color: C.blue   },
    { icon: "bag-outline"        as IoniconName, name: "Amazon",       amt: "₹1,200", cat: "Shopping",  color: C.purple },
    { icon: "flash-outline"      as IoniconName, name: "UPI Transfer", amt: "₹35",    cat: "Transfer",  color: C.green  },
  ];
  return (
    <View className="w-full bg-white/[0.04] rounded-2xl border border-white/[0.08] p-[14px] gap-[10px]">
      <View className="flex-row gap-[5px] mb-0.5">
        <View className="w-2 h-2 rounded-full bg-white/[0.15]" />
        <View className="w-2 h-2 rounded-full bg-white/[0.15]" />
      </View>
      <Text className="text-[12px] text-muted font-bold mb-1">Recent Transactions</Text>
      {txs.map((t) => (
        <View key={t.name} className="flex-row items-center gap-[10px]">
          <View
            className="w-[30px] h-[30px] rounded-[9px] items-center justify-center"
            style={{ backgroundColor: t.color + "22" }}
          >
            <Ionicons name={t.icon} size={15} color={t.color} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-white font-semibold">{t.name}</Text>
            <Text className="text-[11px] text-dim">{t.cat}</Text>
          </View>
          <Text className="text-[13px] font-bold text-accent-red">-{t.amt}</Text>
        </View>
      ))}
    </View>
  );
}

function Slide3Visual() {
  const metrics = [
    { label: "Expenses",     value: "↓ 12%", color: C.green,  icon: "trending-down-outline" as IoniconName },
    { label: "Income",       value: "↑ 8%",  color: C.blue,   icon: "trending-up-outline"   as IoniconName },
    { label: "Savings Rate", value: "↑ 20%", color: C.purple, icon: "wallet-outline"         as IoniconName },
  ];
  return (
    <View className="w-full">
      <View className="flex-row gap-[10px] mb-[10px]">
        {metrics.slice(0, 2).map((m) => (
          <View
            key={m.label}
            className="flex-1 bg-white/[0.04] border rounded-[14px] p-3 gap-1"
            style={{ borderColor: m.color + "33" }}
          >
            <Ionicons name={m.icon} size={18} color={m.color} />
            <Text className="text-[18px] font-extrabold" style={{ color: m.color }}>{m.value}</Text>
            <Text className="text-[11px] text-muted font-semibold">{m.label}</Text>
          </View>
        ))}
      </View>
      <View
        className="flex-row items-center gap-[10px] bg-white/[0.04] border rounded-[14px] p-3"
        style={{ borderColor: metrics[2].color + "33" }}
      >
        <Ionicons name={metrics[2].icon} size={18} color={metrics[2].color} />
        <Text className="text-[18px] font-extrabold" style={{ color: metrics[2].color }}>
          {metrics[2].value}
        </Text>
        <Text className="text-[11px] text-muted font-semibold">{metrics[2].label}</Text>
      </View>
    </View>
  );
}

function Slide4Visual() {
  return (
    <View className="w-full bg-accent-purple/[0.08] border border-accent-purple/25 rounded-[20px] p-5 overflow-hidden">
      <View
        className="absolute rounded-full bg-accent-purple/[0.12]"
        style={{ top: -30, right: -30, width: 120, height: 120 }}
      />
      <Text className="text-[11px] text-accent-purple font-extrabold tracking-[2px] mb-[6px]">NET WORTH</Text>
      <Text className="text-[28px] font-black text-white mb-[14px]">₹ 28,45,000</Text>
      <View className="h-px bg-white/[0.08] mb-3" />
      <View className="flex-row justify-between mb-[6px]">
        <Text className="text-[13px] text-muted">Assets</Text>
        <Text className="text-[13px] font-bold text-accent-green">₹ 35,00,000</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-muted">Liabilities</Text>
        <Text className="text-[13px] font-bold text-accent-red">₹ 6,55,000</Text>
      </View>
    </View>
  );
}

function Slide5Visual() {
  const chips = [
    { label: "Accounts", on: true  },
    { label: "Cards",    on: true  },
    { label: "Loans",    on: false },
    { label: "Expenses", on: true  },
  ];
  return (
    <View className="w-full items-center">
      <View className="flex-row items-center gap-[10px] mb-[18px]">
        <View className="w-[46px] h-[46px] rounded-full bg-accent-purple/[0.15] border border-accent-purple/[0.27] items-center justify-center">
          <Ionicons name="person" size={20} color={C.purple} />
        </View>
        <View className="w-[28px] h-px bg-white/[0.08]" />
        <View className="w-[30px] h-[30px] rounded-full bg-accent-amber/[0.15] border border-accent-amber/[0.27] items-center justify-center">
          <Ionicons name="lock-closed" size={14} color={C.amber} />
        </View>
        <View className="w-[28px] h-px bg-white/[0.08]" />
        <View className="gap-[6px]">
          {[
            { icon: "people-outline" as IoniconName, label: "Family", color: C.blue  },
            { icon: "briefcase-outline" as IoniconName, label: "CA",   color: C.green },
          ].map((c) => (
            <View key={c.label} className="flex-row items-center gap-[5px] p-[5px] bg-white/[0.04] rounded-lg border border-white/[0.08]">
              <Ionicons name={c.icon} size={14} color={c.color} />
              <Text className="text-[11px] text-secondary font-semibold">{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {chips.map((c) => (
          <View
            key={c.label}
            className={`flex-row items-center gap-[5px] px-[10px] py-[6px] rounded-full border ${
              c.on
                ? "bg-accent-green/[0.08] border-accent-green/25"
                : "bg-white/[0.04] border-white/[0.08]"
            }`}
          >
            <Ionicons
              name={c.on ? "checkmark-circle" : "close-circle"}
              size={14}
              color={c.on ? C.green : C.textDim}
            />
            <Text className="text-[12px] font-semibold" style={{ color: c.on ? C.green : C.textDim }}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row items-center gap-1.5 mt-3">
        <Ionicons name="flash-outline" size={12} color="#4b5563" />
        <Text className="text-[12px] text-dim">Revoke access anytime</Text>
      </View>
    </View>
  );
}

// ── Slide definitions ─────────────────────────────────────────────────────────
export const SLIDES: Slide[] = [
  {
    id: "1", accent: C.purple, tag: "WELCOME",
    headline: "Your Money.\nOne Place.",
    sub: "Track your complete financial life — from bank accounts and cards to assets, loans, and investments.",
    Visual: Slide1Visual,
  },
  {
    id: "2", accent: C.blue, tag: "TRANSACTIONS",
    headline: "Every Transaction.\nAutomatically Organized.",
    sub: "Auto-capture transactions from your bank notifications and manage expenses effortlessly.",
    highlights: [
      { icon: "checkmark-circle-outline", text: "Auto-detect bank transactions"     },
      { icon: "card-outline",             text: "Track UPI, cards, wallets & transfers" },
      { icon: "add-circle-outline",       text: "Add manual transactions anytime"   },
      { icon: "bulb-outline",             text: "Smart categorization"              },
    ],
    Visual: Slide2Visual,
  },
  {
    id: "3", accent: C.amber, tag: "INSIGHTS",
    headline: "Understand Your\nSpending Habits",
    sub: "Compare expenses across days, weeks, and months with powerful AI insights.",
    highlights: [
      { icon: "calendar-outline",       text: "This Week vs Last Week"    },
      { icon: "bar-chart-outline",      text: "This Month vs Last Month"  },
      { icon: "wallet-outline",         text: "Savings Rate"              },
      { icon: "grid-outline",           text: "Spending Categories"       },
    ],
    Visual: Slide3Visual,
  },
  {
    id: "4", accent: C.green, tag: "NET WORTH",
    headline: "Assets. Liabilities.\nNet Worth.",
    sub: "Monitor everything you own and owe in a single live dashboard.",
    highlights: [
      { icon: "business-outline",     text: "Bank Accounts & Cards"   },
      { icon: "home-outline",         text: "Properties & Gold"       },
      { icon: "trending-up-outline",  text: "Investments & LIC"       },
      { icon: "receipt-outline",      text: "Loans & EMIs"            },
    ],
    Visual: Slide4Visual,
  },
  {
    id: "5", accent: C.red, tag: "SECURITY",
    headline: "Share Only\nWhat You Choose",
    sub: "Collaborate with family, accountants, or advisors — fully in your control.",
    highlights: [
      { icon: "shield-checkmark-outline", text: "Bank-grade encryption"         },
      { icon: "people-outline",           text: "Share selected accounts"       },
      { icon: "calendar-outline",         text: "Share custom date ranges"      },
      { icon: "flash-outline",            text: "Revoke access anytime"         },
    ],
    Visual: Slide5Visual,
  },
];
