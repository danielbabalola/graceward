import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { formatDuration } from "@/lib/journal-display";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type AudioPlaybackProps = {
  uri: string;
  fallbackDurationSeconds?: number | null;
};

const SKIP_SECONDS = 10;
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
const THUMB_SIZE = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calm, premium local audio player for voice reflections. Supports play/pause,
 * ±10s skip, draggable/tappable scrubbing, and playback speed. Audio stays on
 * device; the player is paused on unmount and frees itself via the expo-audio
 * hook so quickly opening/closing screens never leaves overlapping players.
 */
export function AudioPlayback({
  uri,
  fallbackDurationSeconds,
}: AudioPlaybackProps) {
  // Frequent updates keep the progress bar smooth without a waveform.
  const player = useAudioPlayer({ uri }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const [speed, setSpeed] = useState<number>(1);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const duration =
    status.duration && status.duration > 0
      ? status.duration
      : fallbackDurationSeconds ?? 0;
  const actualCurrent = clamp(status.currentTime ?? 0, 0, duration || 0);
  const displayCurrent = scrubbing ? scrubTime : actualCurrent;
  const progress = duration > 0 ? clamp(displayCurrent / duration, 0, 1) : 0;
  const canSeek = status.isLoaded && duration > 0;

  // Refs let the (stable) PanResponder read the latest values without being
  // recreated on every render.
  const trackWidthRef = useRef(0);
  const durationRef = useRef(0);
  const canSeekRef = useRef(false);
  const seekRef = useRef<(seconds: number) => void>(() => {});
  durationRef.current = duration;
  canSeekRef.current = canSeek;
  seekRef.current = (seconds: number) => {
    void player.seekTo(clamp(seconds, 0, durationRef.current));
  };

  // Pause on unmount as a safety net (the hook also removes the player).
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // Player may already be removed; nothing actionable to surface.
      }
    };
  }, [player]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canSeekRef.current,
        onMoveShouldSetPanResponder: () => canSeekRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          if (!canSeekRef.current) {
            return;
          }
          setScrubbing(true);
          setScrubTime(timeFromX(event.nativeEvent.locationX));
        },
        onPanResponderMove: (event) => {
          if (!canSeekRef.current) {
            return;
          }
          setScrubTime(timeFromX(event.nativeEvent.locationX));
        },
        onPanResponderRelease: (event) => {
          if (!canSeekRef.current) {
            setScrubbing(false);
            return;
          }
          seekRef.current(timeFromX(event.nativeEvent.locationX));
          setScrubbing(false);
        },
        onPanResponderTerminate: () => {
          setScrubbing(false);
        },
      }),
    [],
  );

  function timeFromX(x: number): number {
    const width = trackWidthRef.current;
    const total = durationRef.current;
    if (width <= 0 || total <= 0) {
      return 0;
    }
    return clamp(x / width, 0, 1) * total;
  }

  function handleTrackLayout(event: LayoutChangeEvent) {
    trackWidthRef.current = event.nativeEvent.layout.width;
  }

  function handleToggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (duration > 0 && actualCurrent >= duration)) {
      void player.seekTo(0);
    }
    player.play();
  }

  function handleSkip(deltaSeconds: number) {
    if (!canSeek) {
      return;
    }
    void player.seekTo(clamp(actualCurrent + deltaSeconds, 0, duration));
  }

  function handleSpeed(next: number) {
    setSpeed(next);
    // shouldCorrectPitch defaults to true, keeping voices natural at speed.
    player.setPlaybackRate(next, "high");
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.track}
        onLayout={handleTrackLayout}
        hitSlop={{ top: 12, bottom: 12 }}
        accessibilityRole="adjustable"
        accessibilityLabel="Audio progress. Drag to scrub."
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(displayCurrent),
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBackground}>
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
        <View
          style={[
            styles.thumb,
            { left: `${progress * 100}%` },
            scrubbing && styles.thumbActive,
          ]}
        />
      </View>

      <View style={styles.timesRow}>
        <Text style={styles.time}>{formatDuration(displayCurrent)}</Text>
        <Text style={styles.time}>{formatDuration(duration)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => handleSkip(-SKIP_SECONDS)}
          disabled={!canSeek}
          accessibilityRole="button"
          accessibilityLabel="Rewind 10 seconds"
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.pressed,
            !canSeek && styles.disabled,
          ]}
        >
          <Ionicons name="play-back" size={20} color={colors.primaryDeep} />
          <Text style={styles.skipLabel}>10</Text>
        </Pressable>

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
            size={26}
            color={colors.white}
          />
        </Pressable>

        <Pressable
          onPress={() => handleSkip(SKIP_SECONDS)}
          disabled={!canSeek}
          accessibilityRole="button"
          accessibilityLabel="Forward 10 seconds"
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.pressed,
            !canSeek && styles.disabled,
          ]}
        >
          <Ionicons name="play-forward" size={20} color={colors.primaryDeep} />
          <Text style={styles.skipLabel}>10</Text>
        </Pressable>
      </View>

      <View style={styles.speedRow}>
        {PLAYBACK_SPEEDS.map((option) => {
          const selected = option === speed;
          return (
            <Pressable
              key={option}
              onPress={() => handleSpeed(option)}
              accessibilityRole="button"
              accessibilityLabel={`Playback speed ${option}x`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.speedPill,
                selected && styles.speedPillSelected,
                pressed && !selected && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.speedLabel,
                  selected && styles.speedLabelSelected,
                ]}
              >
                {option}x
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  track: {
    height: 28,
    justifyContent: "center",
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryDeep,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primaryDeep,
    marginLeft: -THUMB_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.white,
  },
  thumbActive: {
    transform: [{ scale: 1.2 }],
  },
  timesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  skipButton: {
    minWidth: touchTarget,
    height: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  skipLabel: {
    ...typography.caption,
    color: colors.primaryDeep,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  speedRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  speedPill: {
    minWidth: 48,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  speedPillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryDeep,
  },
  speedLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  speedLabelSelected: {
    color: colors.primaryDeep,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
