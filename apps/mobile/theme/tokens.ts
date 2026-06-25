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

/**
 * Heading typeface. Fraunces (a warm, "old-style" serif) is loaded in the root
 * layout via expo-font; the keys below match the loaded font names. Headings
 * use the serif for a crafted, sanctuary feel while body text stays on the
 * system sans for maximum legibility. When a named weight variant is used we
 * intentionally omit `fontWeight` so Android doesn't synthesize a faux-bold.
 */
export const fonts = {
  headingSemiBold: "Fraunces_600SemiBold",
  headingMedium: "Fraunces_500Medium",
  headingRegular: "Fraunces_400Regular",
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  cardTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 17,
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

/**
 * Three-step elevation hierarchy so surfaces read at different depths instead
 * of every card sharing one flat shadow: `low` for resting list cards, `medium`
 * for anchored/hero surfaces, `high` for floating elements (e.g. the center tab
 * button). `card` is kept as an alias for `low` for backward compatibility.
 */
const elevationLow = {
  shadowColor: colors.primaryDeep,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

export const shadows = {
  low: elevationLow,
  medium: {
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  high: {
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  card: elevationLow,
} as const;

export const touchTarget = 44;
