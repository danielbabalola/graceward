import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";
import { colors } from "@/theme/tokens";

export default function GratitudeScreen() {
  return (
    <Screen
      title="Gratitude"
      subtitle="Notice mercy, wins, and God's care — one day at a time."
    >
      <Card
        variant="subtle"
        title="Notice one mercy from today"
        description="No matter how small."
      />

      <Section title="Sections">
        <Card
          title="Daily Gratitudes"
          description="Simple thanksgivings from your day and reflections."
        />
        <Card
          title="Wins"
          description="Signs of God's goodness worth remembering."
          style={{ borderColor: colors.accentGold }}
        />
        <Card
          title="Faithfulness Timeline"
          description="Answered prayers and patterns of God's care over time."
          style={{ borderColor: colors.answeredPrayerAccent }}
        />
      </Section>
    </Screen>
  );
}
