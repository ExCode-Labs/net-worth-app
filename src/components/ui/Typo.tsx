/**
 * Typography presets. Import these instead of raw <Text> for consistent hierarchy.
 *
 *   <H2>Net Worth</H2>
 *   <Label>Balance</Label>
 *   <Body muted>Last updated today</Body>
 */
import React from "react";
import { Text, type TextProps } from "react-native";
import { C } from "@/constants/theme";

type Extra = { muted?: boolean; dim?: boolean; accent?: boolean };

function make(base: object) {
  return function Comp({ style, muted, dim, accent, ...props }: TextProps & Extra) {
    const color =
      accent ? C.purple :
      dim    ? C.textDim :
      muted  ? C.textMuted :
      undefined;
    return <Text style={[base, color ? { color } : undefined, style]} {...props} />;
  };
}

export const H1      = make({ fontSize: 28, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.5 });
export const H2      = make({ fontSize: 22, fontWeight: "700", color: C.textPrimary, letterSpacing: -0.3 });
export const H3      = make({ fontSize: 18, fontWeight: "700", color: C.textPrimary });
export const H4      = make({ fontSize: 15, fontWeight: "600", color: C.textPrimary });
export const Body    = make({ fontSize: 14, fontWeight: "400", color: C.textSecondary, lineHeight: 20 });
export const Small   = make({ fontSize: 13, fontWeight: "400", color: C.textSecondary, lineHeight: 18 });
export const Caption = make({ fontSize: 12, fontWeight: "400", color: C.textMuted,     lineHeight: 16 });
export const Label   = make({ fontSize: 11, fontWeight: "700", color: C.textMuted,     letterSpacing: 0.8, textTransform: "uppercase" as const });
export const Overline= make({ fontSize: 10, fontWeight: "700", color: C.textDim,       letterSpacing: 1.2, textTransform: "uppercase" as const });
