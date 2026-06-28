/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cosmic: {
          dark: "#0f1629",    // C.bgCard
          darker: "#0a0e27",  // C.bgDeep
          black: "#000000",
          surface: "rgba(255,255,255,0.05)",  // C.bgEl
          "surface-hover": "rgba(255,255,255,0.08)", // C.bgElHover
          "border-soft": "rgba(255,255,255,0.08)",   // C.border
          border: "rgba(255,255,255,0.12)",           // C.borderMid
        },
        accent: {
          purple:       "#a855f7",  // C.purple
          "purple-mid": "#9333ea",  // C.purpleMid
          "purple-light":"#c084fc", // C.purpleLight
          blue:         "#3b82f6",  // C.blue
          green:        "#4ade80",  // C.green
          red:          "#f87171",  // C.red
          amber:        "#fbbf24",  // C.amber
        },
        semantic: {
          success: "#22c55e",
          error:   "#ef4444",
          warning: "#f59e0b",
        },
        // Text hierarchy — used as text-dim, text-muted, text-secondary
        dim:       "#4b5563",  // C.textDim
        muted:     "#6b7280",  // C.textMuted
        secondary: "#9ca3af",  // C.textSecondary
      },
      fontFamily: {
        sans: ["-apple-system","BlinkMacSystemFont","Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","sans-serif"],
      },
      fontSize: {
        xs:   ["10px", "14px"],
        sm:   ["11px", "16px"],
        base: ["12px", "18px"],
        lg:   ["14px", "20px"],
        xl:   ["16px", "22px"],
        "2xl":["20px", "24px"],
        "3xl":["24px", "28px"],
        "4xl":["28px", "32px"],
        "5xl":["32px", "36px"],
        "6xl":["40px", "44px"],
        "7xl":["48px", "52px"],
      },
      spacing: {
        xs: "4px",  sm: "8px",   md: "12px", lg: "16px",
        xl: "20px", "2xl": "24px","3xl": "32px","4xl": "40px",
        "5xl": "48px","6xl": "60px",
      },
      borderRadius: {
        sm: "8px", md: "10px", lg: "12px", xl: "16px",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0,0,0,0.4)",
        md: "0 4px 16px rgba(0,0,0,0.5)",
        lg: "0 10px 25px rgba(168,85,247,0.4)",
      },
    },
  },
  plugins: [],
};
