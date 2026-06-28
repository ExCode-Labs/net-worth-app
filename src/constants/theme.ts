/** NetWorth – Dark Cosmic Theme */

export const C = {
  // Backgrounds
  bgDeep:    "#0a0e27",  // page background
  bgCard:    "#0f1629",  // card / surface
  bgEl:      "rgba(255,255,255,0.05)", // elevated element
  bgElHover: "rgba(255,255,255,0.08)",
  border:    "rgba(255,255,255,0.08)",
  borderMid: "rgba(255,255,255,0.12)",

  // Accents
  purple:    "#a855f7",
  purpleMid: "#9333ea",
  purpleLight: "#c084fc",
  blue:      "#3b82f6",

  // Semantic
  green:     "#4ade80",
  greenDim:  "rgba(74,222,128,0.15)",
  greenBorder:"rgba(74,222,128,0.25)",
  red:       "#f87171",
  redDim:    "rgba(248,113,113,0.12)",
  redBorder: "rgba(248,113,113,0.2)",
  amber:     "#fbbf24",

  // Text
  textPrimary:   "#ffffff",
  textSecondary: "#9ca3af",
  textMuted:     "#6b7280",
  textDim:       "#4b5563",
} as const;

/** Drop-shadow helpers (boxShadow = cross-platform, elevation = Android z-order) */
export const S = {
  purple: {
    boxShadow: "0 6px 20px rgba(168, 85, 247, 0.45)",
    elevation: 10,
  } as const,
  purpleSm: {
    boxShadow: "0 3px 10px rgba(168, 85, 247, 0.35)",
    elevation: 6,
  } as const,
  card: {
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.5)",
    elevation: 4,
  } as const,
  sm: {
    boxShadow: "0 1px 6px rgba(0, 0, 0, 0.3)",
    elevation: 2,
  } as const,
} as const;
