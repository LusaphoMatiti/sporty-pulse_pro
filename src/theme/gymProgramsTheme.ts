export const GT = {
  background: "#0C0E10",
  surface: "#13171A",
  surface2: "#1A1F23",
  raised: "#1E1E1E",
  border: "rgba(255,255,255,0.07)",

  text: "#F0EDE4",
  muted: "#9A9A90",
  muted2: "#6B6B62",

  accent: "#C8F135",
  accentDim: "rgba(200,241,53,0.10)",
  accentGlow: "rgba(200,241,53,0.35)",

  void: "#0A0A0A",

  // Spacing scale (4pt grid, matches app-wide convention)
  s2: 2,
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  s48: 48,

  // Radius scale
  r8: 8,
  r12: 12,
  r16: 16,
  r20: 20,
  r24: 24,
  r28: 28,
  r999: 999,

  font: {
    display: "Barlow-Bold",
    semiBold: "Barlow-SemiBold",
    regular: "DMSans-Regular",
    medium: "DMSans-Medium",
  },
} as const;

export const GYM_SPRING = { damping: 16, stiffness: 180 };
export const GYM_PRESS_SPRING = { damping: 14, stiffness: 220 };
