import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Lock, CalendarClock, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";

type GymEmptyWeekStateVariant = "locked" | "noPlan";

interface GymEmptyWeekStateProps {
  variant: GymEmptyWeekStateVariant;
  onPrimaryPress: () => void;
}

type CopyEntry = {
  Icon: typeof Lock;
  title: string;
  body: string;
  ctaLabel: string;
};

type CopyMap = Record<GymEmptyWeekStateVariant, CopyEntry>;

const COPY: CopyMap = {
  locked: {
    Icon: Lock,
    title: "Your Trial Has Ended",
    body: "Your 15-day free trial is over. Subscribe to keep training your gym program.",
    ctaLabel: "UPGRADE TO PRO",
  },
  noPlan: {
    Icon: CalendarClock,
    title: "Setting Up Your Program",
    body: "We're still putting your training split together. Pull to refresh in a moment.",
    ctaLabel: "REFRESH",
  },
};

export function GymEmptyWeekState({
  variant,
  onPrimaryPress,
}: GymEmptyWeekStateProps) {
  const { Icon, title, body, ctaLabel } = COPY[variant];

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon size={26} color={GT.accent} strokeWidth={1.75} />
      </View>
      <SPText style={styles.title}>{title}</SPText>
      <SPText style={styles.body}>{body}</SPText>
      <Pressable
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // haptics unsupported on this device/simulator — ignore
          }
          onPrimaryPress();
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        {variant === "noPlan" ? (
          <RefreshCw size={14} color={GT.void} strokeWidth={2} />
        ) : null}
        <SPText style={styles.buttonLabel}>{ctaLabel}</SPText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GT.r24,
    borderWidth: 1,
    borderColor: GT.border,
    backgroundColor: GT.surface,
    padding: GT.s24,
    alignItems: "center",
    gap: GT.s8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: GT.r999,
    backgroundColor: GT.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: GT.s8,
  },
  title: {
    fontFamily: GT.font.display,
    fontSize: 19,
    color: GT.text,
    textAlign: "center",
  },
  body: {
    fontFamily: GT.font.medium,
    fontSize: 14,
    color: GT.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: GT.s8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GT.s8,
    height: 48,
    paddingHorizontal: GT.s24,
    borderRadius: GT.r999,
    backgroundColor: GT.accent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: GT.font.semiBold,
    fontSize: 13,
    letterSpacing: 0.8,
    color: GT.void,
  },
});
