import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Dumbbell, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useResponsive } from "../../hooks/useResponsive";
import type { HeroSplitData } from "../../types/gymPrograms";

interface GymHeroCardProps {
  hero: HeroSplitData;
  onViewPlan: () => void;
}

export function GymHeroCard({ hero, onViewPlan }: GymHeroCardProps) {
  const { rs } = useResponsive();

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
    <View style={[styles.card, { padding: cardPadding }]}>
      {/* Watermark dumbbell — subtle, decorative, matches the design's
          faint background icon on the right side of the hero card. */}
      <View
        style={[
          styles.watermark,
          { transform: [{ translateY: -watermarkSize / 2 }] },
        ]}
        pointerEvents="none"
      >
        <Dumbbell
          size={watermarkSize}
          color="rgba(255,255,255,0.04)"
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
            <Dumbbell size={iconSize} color={GT.accent} strokeWidth={1.75} />
          </View>
        </View>

        <View style={styles.textCol}>
          <SPText style={[styles.eyebrow, { fontSize: eyebrowSize }]}>
            YOUR SPLIT
          </SPText>
          <SPText
            style={[styles.splitName, { fontSize: splitNameSize }]}
            numberOfLines={1}
          >
            {hero.planName.toUpperCase()}
          </SPText>
          <View style={styles.divider} />
          <SPText style={[styles.description, { fontSize: descriptionSize }]}>
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
            },
            pressed && styles.viewPlanButtonPressed,
          ]}
        >
          <SPText style={[styles.viewPlanLabel, { fontSize: ctaLabelSize }]}>
            VIEW PLAN
          </SPText>
          <ArrowRight
            size={rs(12, 13, 14, 14)}
            color={GT.accent}
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
    borderColor: GT.accentDim,
    backgroundColor: GT.surface,
    overflow: "hidden",
    shadowColor: GT.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
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
    backgroundColor: GT.accentDim,
    alignItems: "center",
    justifyContent: "center",
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
    color: GT.accent,
  },
  splitName: {
    fontFamily: GT.font.display,
    color: GT.text,
    letterSpacing: 0.2,
  },
  divider: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: GT.accent,
    marginVertical: GT.s4,
  },
  description: {
    fontFamily: GT.font.medium,
    color: GT.muted,
    lineHeight: 17,
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
    borderColor: GT.accentDim,
    borderRadius: GT.r999,
  },
  viewPlanButtonPressed: {
    backgroundColor: GT.accentDim,
  },
  viewPlanLabel: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 0.8,
    color: GT.accent,
  },
});
