import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";

export default function TodayScreen() {
  return (
    <Screen
      title="Today"
      subtitle="Pause. Reflect. Remember God's faithfulness."
    >
      <Section title="Reflection">
        <Card
          variant="primary"
          eyebrow="Start here"
          title="New Reflection"
          description="Speak or type honestly about your day. One tap away when you're ready."
          onPress={() => router.push("/reflection")}
        />
        <Card
          variant="subtle"
          title="Continue Draft"
          description="Pick up where you left off with an unfinished reflection."
        />
      </Section>

      <Section title="Focus">
        <Card
          title="Today's Prayer Focus"
          description="A gentle prompt for what to bring before God today."
        />
        <Card
          title="Recent Gratitude"
          description="A small reminder of mercy noticed recently."
        />
      </Section>

      <Section title="Review">
        <Card
          eyebrow="Coming soon"
          title="Weekly Review Card"
          description="Recurring themes, lessons, and patterns from your week of reflection."
        />
      </Section>
    </Screen>
  );
}
