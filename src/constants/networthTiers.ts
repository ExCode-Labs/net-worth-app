/**
 * Net-worth achievement tiers (Indian milestones + Millionaire), used by the
 * shareable cosmic badge (#5). Thresholds are in INR — the app stores every
 * amount in INR — so lakh/crore/arab map cleanly regardless of display currency.
 */
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface NetWorthTier {
  key: string;
  name: string;        // headline, e.g. "CROREPATI"
  label: string;       // milestone line, e.g. "₹1 Crore+ Net Worth"
  tagline: string;     // cosmic flavour line
  threshold: number;   // INR floor for this tier
  icon: IoniconName;   // filled emblem
  color: string;       // accent
  glow: string;        // glow / gradient tint
}

/** Ascending by threshold. The first entry (threshold 0) is the base tier. */
export const NETWORTH_TIERS: NetWorthTier[] = [
  {
    key: "explorer", name: "COSMIC EXPLORER", label: "Building your cosmos",
    tagline: "Every empire starts with a single star.",
    threshold: 0, icon: "rocket", color: "#38bdf8", glow: "#0ea5e9",
  },
  {
    key: "lakhpati", name: "LAKHPATI", label: "₹1 Lakh+ Net Worth",
    tagline: "The first constellation is lit.",
    threshold: 100_000, icon: "star", color: "#f59e0b", glow: "#d97706",
  },
  {
    key: "millionaire", name: "MILLIONAIRE", label: "₹10 Lakh+ Net Worth",
    tagline: "A million reasons to keep going.",
    threshold: 1_000_000, icon: "diamond", color: "#2dd4bf", glow: "#14b8a6",
  },
  {
    key: "crorepati", name: "CROREPATI", label: "₹1 Crore+ Net Worth",
    tagline: "You bend the orbit now.",
    threshold: 10_000_000, icon: "trophy", color: "#a855f7", glow: "#7c3aed",
  },
  {
    key: "arabpati", name: "ARABPATI", label: "₹100 Crore+ Net Worth",
    tagline: "A galaxy of your own making.",
    threshold: 1_000_000_000, icon: "planet", color: "#fbbf24", glow: "#f472b6",
  },
];

export interface TierStatus {
  tier: NetWorthTier;
  next: NetWorthTier | null;
  /** 0–1 progress from this tier's floor to the next tier's floor. */
  progress: number;
}

/** Highest tier reached for a net worth (INR), plus progress toward the next. */
export function tierForNetWorth(inr: number): TierStatus {
  let idx = 0;
  for (let i = 0; i < NETWORTH_TIERS.length; i++) {
    if (inr >= NETWORTH_TIERS[i].threshold) idx = i;
  }
  const tier = NETWORTH_TIERS[idx];
  const next = NETWORTH_TIERS[idx + 1] ?? null;
  let progress = 1;
  if (next) {
    const span = next.threshold - tier.threshold;
    progress = span > 0 ? (inr - tier.threshold) / span : 0;
    progress = Math.max(0, Math.min(1, progress));
  }
  return { tier, next, progress };
}
