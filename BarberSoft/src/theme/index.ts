// src/theme/index.ts

export const theme = {
  colors: {
    background: "#121212",
    card:        "#1E1E1E",
    cardElevated:"#252525",
    gold:        "#D4AF37",
    goldDim:     "rgba(212,175,55,0.15)",
    text:        "#FFFFFF",
    textMuted:   "#9E9E9E",
    textHint:    "#555555",
    success:     "#4CAF50",
    successBg:   "rgba(76,175,80,0.12)",
    danger:      "#EF5350",
    dangerBg:    "rgba(239,83,80,0.12)",
    info:        "#42A5F5",
    infoBg:      "rgba(66,165,245,0.12)",
    border:      "rgba(212,175,55,0.2)",
    borderSubtle:"rgba(255,255,255,0.06)",
  },
  spacing: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  20,
    xxl: 24,
    xxxl:32,
  },
  radius: {
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    full: 999,
  },
  fontSize: {
    xs:   10,
    sm:   12,
    md:   14,
    lg:   16,
    xl:   18,
    xxl:  22,
    xxxl: 28,
  },
};

export type Theme = typeof theme;
