import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/theme/tokens";

type SectionProps = {
  title: string;
  /** Optional accent glyph shown before the title for scannability. */
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
};

export function Section({ title, icon, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {icon ? (
          <Ionicons name={icon} size={16} color={colors.accentGold} />
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  content: {
    gap: spacing.sm,
  },
});
