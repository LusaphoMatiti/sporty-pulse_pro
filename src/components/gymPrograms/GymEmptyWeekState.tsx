import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Lock, CalendarClock, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useAppTheme } from "../../theme/ThemeContext";
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
  const { theme } = useAppTheme();

  const cardPadding = rs(16, 18, 20, 22);
  const iconWrapSize = rs(44, 48, 52, 54);
  const iconSize = rs(20, 22, 24, 25);
  const titleSize = rs(15, 16, 17, 18);
  const bodySize = rs(12, 13, 13, 14);
  const buttonHeight = rs(40, 44, 46, 48);
  const buttonPaddingH = rs(18, 20, 22, 24);
  const buttonLabelSize = rs(11, 12, 12, 13);

  return (
    <View
      style={[
        styles.card,
        {
          padding: cardPadding,
          borderColor: theme.border,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            width: iconWrapSize,
            height: iconWrapSize,
            borderRadius: iconWrapSize / 2,
            backgroundColor: theme.accentDim,
          },
        ]}
      >
        <Icon size={iconSize} color={theme.accent} strokeWidth={1.75} />
      </View>
      <SPText
        style={[styles.title, { fontSize: titleSize, color: theme.text }]}
      >
        {title}
      </SPText>
      <SPText style={[styles.body, { fontSize: bodySize, color: theme.muted }]}>
        {body}
      </SPText>
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
          {
            height: buttonHeight,
            paddingHorizontal: buttonPaddingH,
            backgroundColor: theme.accent,
          },
          pressed && styles.buttonPressed,
        ]}
      >
        {variant === "noPlan" ? (
          <RefreshCw size={13} color={theme.void} strokeWidth={2} />
        ) : null}
        <SPText
          style={[
            styles.buttonLabel,
            { fontSize: buttonLabelSize, color: theme.void },
          ]}
        >
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
    alignItems: "center",
    gap: GT.s8,
    // borderColor/backgroundColor applied inline from theme
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: GT.s8,
    // backgroundColor applied inline from theme.accentDim
  },
  title: {
    fontFamily: GT.font.display,
    textAlign: "center",
    // color applied inline from theme.text
  },
  body: {
    fontFamily: GT.font.medium,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: GT.s8,
    // color applied inline from theme.muted
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GT.s8,
    borderRadius: GT.r999,
    // backgroundColor applied inline from theme.accent
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 0.8,
    // color applied inline from theme.void
  },
});
