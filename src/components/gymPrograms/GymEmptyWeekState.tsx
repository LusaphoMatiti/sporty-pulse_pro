import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Lock, CalendarClock, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useResponsive } from "../../hooks/useResponsive";

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
  const { rs } = useResponsive();

  const cardPadding = rs(16, 18, 20, 22);
  const iconWrapSize = rs(44, 48, 52, 54);
  const iconSize = rs(20, 22, 24, 25);
  const titleSize = rs(15, 16, 17, 18);
  const bodySize = rs(12, 13, 13, 14);
  const buttonHeight = rs(40, 44, 46, 48);
  const buttonPaddingH = rs(18, 20, 22, 24);
  const buttonLabelSize = rs(11, 12, 12, 13);

  return (
    <View style={[styles.card, { padding: cardPadding }]}>
      <View
        style={[
          styles.iconWrap,
          {
            width: iconWrapSize,
            height: iconWrapSize,
            borderRadius: iconWrapSize / 2,
          },
        ]}
      >
        <Icon size={iconSize} color={GT.accent} strokeWidth={1.75} />
      </View>
      <SPText style={[styles.title, { fontSize: titleSize }]}>{title}</SPText>
      <SPText style={[styles.body, { fontSize: bodySize }]}>{body}</SPText>
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
          { height: buttonHeight, paddingHorizontal: buttonPaddingH },
          pressed && styles.buttonPressed,
        ]}
      >
        {variant === "noPlan" ? (
          <RefreshCw size={13} color={GT.void} strokeWidth={2} />
        ) : null}
        <SPText style={[styles.buttonLabel, { fontSize: buttonLabelSize }]}>
          {ctaLabel}
        </SPText>
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
    alignItems: "center",
    gap: GT.s8,
  },
  iconWrap: {
    backgroundColor: GT.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: GT.s8,
  },
  title: {
    fontFamily: GT.font.display,
    color: GT.text,
    textAlign: "center",
  },
  body: {
    fontFamily: GT.font.medium,
    color: GT.muted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: GT.s8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GT.s8,
    borderRadius: GT.r999,
    backgroundColor: GT.accent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 0.8,
    color: GT.void,
  },
});
