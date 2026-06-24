import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";
import { SettingsRow } from "@/components/ui/SettingsRow";

const settingsItems = [
  {
    title: "Privacy",
    description: "Control how your reflections are stored and protected.",
  },
  {
    title: "Audio Retention",
    description: "Choose whether voice notes stay on device after transcription.",
  },
  {
    title: "AI Memory",
    description: "Decide how much past context may inform future reflections.",
  },
  {
    title: "Cloud Sync",
    description: "Optional encrypted backup and sync across devices.",
  },
  {
    title: "Export Data",
    description: "Download your journal, prayers, and gratitudes.",
  },
  {
    title: "Delete Account",
    description: "Permanently remove your account and cloud data.",
  },
  {
    title: "Subscription",
    description: "Manage your Graceward plan and entitlements.",
  },
] as const;

export default function SettingsScreen() {
  return (
    <Screen
      title="Settings"
      subtitle="Privacy, preferences, and account — kept clear and understandable."
    >
      <Section title="Preferences">
        {settingsItems.map((item) => (
          <SettingsRow
            key={item.title}
            title={item.title}
            description={item.description}
          />
        ))}
      </Section>
    </Screen>
  );
}
