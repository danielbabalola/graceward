import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";

export default function JournalScreen() {
  return (
    <Screen
      title="Journal"
      subtitle="Your reflections over time, kept private and close."
    >
      <Card
        variant="subtle"
        title="Start with one honest reflection"
        description="You do not need perfect words."
      />

      <Section title="Views">
        <Card
          title="Timeline"
          description="A calm, recent-first list of entries with summaries, tone, and themes."
        />
        <Card
          title="Calendar"
          description="Browse reflections by date with gentle indicators for prayer, gratitude, and wins."
        />
      </Section>
    </Screen>
  );
}
