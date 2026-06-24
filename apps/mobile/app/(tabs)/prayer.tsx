import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";
import { colors } from "@/theme/tokens";

export default function PrayerScreen() {
  return (
    <Screen
      title="Prayer"
      subtitle="Bring what matters before God — and remember when He answers."
    >
      <Card
        variant="subtle"
        title="Add something you want to bring before God"
        description="Prayer requests can be added manually or suggested from your reflections."
      />

      <Section title="Requests">
        <Card
          title="Active"
          description="Prayer requests you're currently carrying."
        />
        <Card
          title="Answered"
          description="Requests marked answered — reminders of God's faithfulness."
          style={{ borderColor: colors.answeredPrayerAccent }}
        />
        <Card
          title="Archived"
          description="Older requests kept for remembrance without daily focus."
        />
      </Section>
    </Screen>
  );
}
