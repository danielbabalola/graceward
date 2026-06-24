import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors, typography } from "@/theme/tokens";

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
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
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <TabIcon name="sunny-outline" color={color} />,
        }}
      />
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
