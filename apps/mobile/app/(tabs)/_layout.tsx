import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { haptics } from "@/lib/haptics";
import { colors, shadows, typography } from "@/theme/tokens";

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

/**
 * Raised, arched icon for the Today tab. The circle is absolutely positioned
 * inside a normal-sized icon footprint so it floats above the bar while the
 * default label below stays aligned with the other tabs. Turns gold when active.
 */
function CenterTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.centerSlot}>
      <View style={[styles.centerButton, focused && styles.centerButtonFocused]}>
        <Ionicons name="sunny" size={24} color={colors.white} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenListeners={{
        tabPress: () => haptics.selection(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDeep,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          ...typography.caption,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.backgroundCream,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 84,
        },
      }}
    >
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color }) => <TabIcon name="book-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: "Prayer",
          tabBarIcon: ({ color }) => <TabIcon name="heart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ focused }) => <CenterTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gratitude"
        options={{
          title: "Remember",
          tabBarIcon: ({ color }) => (
            <TabIcon name="bookmark-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <TabIcon name="settings-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerSlot: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.backgroundCream,
    ...shadows.high,
  },
  centerButtonFocused: {
    backgroundColor: colors.accentGold,
  },
});
