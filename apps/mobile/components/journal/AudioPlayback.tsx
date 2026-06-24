import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { formatDuration } from "@/lib/journal-display";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type AudioPlaybackProps = {
  uri: string;
  fallbackDurationSeconds?: number | null;
};

export function AudioPlayback({
  uri,
  fallbackDurationSeconds,
}: AudioPlaybackProps) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const duration =
    status.duration && status.duration > 0
      ? status.duration
      : fallbackDurationSeconds ?? 0;
  const current = Math.min(status.currentTime ?? 0, duration || Infinity);

  function handleToggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (duration > 0 && current >= duration)) {
      player.seekTo(0);
    }
    player.play();
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleToggle}
        disabled={!status.isLoaded}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Pause" : "Play"}
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.pressed,
          !status.isLoaded && styles.disabled,
        ]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={22}
          color={colors.white}
        />
      </Pressable>
      <Text style={styles.time}>
        {formatDuration(current)} / {formatDuration(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  playButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    backgroundColor: colors.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    ...typography.body,
    color: colors.text,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
