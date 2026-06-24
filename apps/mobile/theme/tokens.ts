export const colors = {
  primaryLight: "#DFF3FF",
  primaryDeep: "#12324A",
  backgroundCream: "#FFF8EE",
  accentGold: "#D6A84F",
  sage: "#A8C7B1",
  lamentAccent: "#6F8798",
  correctionAccent: "#C97B63",
  answeredPrayerAccent: "#5FA87A",
  white: "#FFFFFF",
  text: "#12324A",
  textMuted: "#5C6F7E",
  textSubtle: "#8A9AA8",
  border: "#E8DFD0",
  cardBackground: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const typography = {
  screenTitle: {
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const touchTarget = 44;
