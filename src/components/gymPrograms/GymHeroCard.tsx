import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Dumbbell, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useAppTheme } from "../../theme/ThemeContext";
import { useResponsive } from "../../hooks/useResponsive";
import type { HeroSplitData } from "../../types/gymPrograms";

interface GymHeroCardProps {
  hero: HeroSplitData;
  onViewPlan: () => void;
}

export function GymHeroCard({ hero, onViewPlan }: GymHeroCardProps) {
  const { rs } = useResponsive();
  const { theme } = useAppTheme();

  // Every dimension here was fixed-pixel before, which made this the
  // single biggest offender on smaller phones (56/44px icon stack + 24px
  // display text). Scaling per breakpoint brings it in line with the rest
  // of the (already-responsive) Programs screen.
  const cardPadding = rs(16, 18, 20, 22);
  const watermarkSize = rs(70, 82, 92, 100);
  const iconGlowSize = rs(42, 46, 50, 54);
  const iconWrapSize = rs(32, 36, 38, 42);
  const iconSize = rs(18, 20, 22, 24);
  const splitNameSize = rs(18, 19, 21, 23);
  const descriptionSize = rs(11, 12, 12, 13);
  const eyebrowSize = rs(10, 11, 11, 12);
  const ctaMarginTop = rs(12, 14, 16, 18);
  const ctaPaddingV = rs(8, 8, 9, 10);
  const ctaPaddingH = rs(14, 16, 18, 18);
  const ctaLabelSize = rs(11, 12, 12, 13);

  return (
    <View
      style={[
        styles.card,
        {
          padding: cardPadding,
          borderColor: theme.accentDim,
          backgroundColor: theme.surface,
          shadowColor: theme.accent,
        },
      ]}
    >
      {/* Watermark dumbbell — subtle, decorative, matches the design's
          faint background icon on the right side of the hero card. Was a
          hardcoded white rgba, which all but disappeared on a light
          surface -- theme.text at low alpha keeps it faint but visible
          in both modes (near-black on light bg, near-white on dark bg). */}
      <View
        style={[
          styles.watermark,
          { transform: [{ translateY: -watermarkSize / 2 }] },
        ]}
        pointerEvents="none"
      >
        <Dumbbell
          size={watermarkSize}
          color={theme.text + "0A"}
          strokeWidth={1.5}
        />
      </View>

      <View style={styles.row}>
        <View
          style={[
            styles.iconGlow,
            {
              width: iconGlowSize,
              height: iconGlowSize,
              borderRadius: iconGlowSize / 2,
              backgroundColor: theme.accentDim,
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
              },
            ]}
          >
            <Dumbbell size={iconSize} color={theme.accent} strokeWidth={1.75} />
          </View>
        </View>

        <View style={styles.textCol}>
          <SPText
            style={[
              styles.eyebrow,
              { fontSize: eyebrowSize, color: theme.accent },
            ]}
          >
            YOUR SPLIT
          </SPText>
          <SPText
            style={[
              styles.splitName,
              { fontSize: splitNameSize, color: theme.text },
            ]}
            numberOfLines={1}
          >
            {hero.planName.toUpperCase()}
          </SPText>
          <View style={[styles.divider, { backgroundColor: theme.accent }]} />
          <SPText
            style={[
              styles.description,
              { fontSize: descriptionSize, color: theme.muted },
            ]}
          >
            {hero.description}
          </SPText>
        </View>
      </View>

      <View style={[styles.ctaRow, { marginTop: ctaMarginTop }]}>
        <Pressable
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // haptics unsupported on this device/simulator — ignore
            }
            onViewPlan();
          }}
          style={({ pressed }) => [
            styles.viewPlanButton,
            {
              paddingVertical: ctaPaddingV,
              paddingHorizontal: ctaPaddingH,
              borderColor: theme.accentDim,
            },
            pressed && { backgroundColor: theme.accentDim },
          ]}
        >
          <SPText
            style={[
              styles.viewPlanLabel,
              { fontSize: ctaLabelSize, color: theme.accent },
            ]}
          >
            VIEW PLAN
          </SPText>
          <ArrowRight
            size={rs(12, 13, 14, 14)}
            color={theme.accent}
            strokeWidth={2}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GT.r24,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
    // borderColor/backgroundColor/shadowColor applied inline from theme
  },
  watermark: {
    position: "absolute",
    right: -10,
    top: "50%",
  },
  row: {
    flexDirection: "row",
    gap: GT.s12,
  },
  iconGlow: {
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor applied inline from theme.accentDim
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: GT.s4,
  },
  eyebrow: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 1.2,
    // color applied inline from theme.accent
  },
  splitName: {
    fontFamily: GT.font.display,
    letterSpacing: 0.2,
    // color applied inline from theme.text
  },
  divider: {
    width: 22,
    height: 3,
    borderRadius: 2,
    marginVertical: GT.s4,
    // backgroundColor applied inline from theme.accent
  },
  description: {
    fontFamily: GT.font.medium,
    lineHeight: 17,
    // color applied inline from theme.muted
  },
  ctaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GT.s6,
    borderWidth: 1,
    borderRadius: GT.r999,
    // borderColor applied inline from theme.accentDim
  },
  viewPlanLabel: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 0.8,
    // color applied inline from theme.accent
  },
});
