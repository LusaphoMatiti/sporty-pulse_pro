import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Dumbbell, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import type { HeroSplitData } from "../../types/gymPrograms";

interface GymHeroCardProps {
  hero: HeroSplitData;
  onViewPlan: () => void;
}

export function GymHeroCard({ hero, onViewPlan }: GymHeroCardProps) {
  return (
    <View style={styles.card}>
      {/* Watermark dumbbell — subtle, decorative, matches the design's
          faint background icon on the right side of the hero card. */}
      <View style={styles.watermark} pointerEvents="none">
        <Dumbbell size={110} color="rgba(255,255,255,0.04)" strokeWidth={1.5} />
      </View>

      <View style={styles.row}>
        <View style={styles.iconGlow}>
          <View style={styles.iconWrap}>
            <Dumbbell size={26} color={GT.accent} strokeWidth={1.75} />
          </View>
        </View>

        <View style={styles.textCol}>
          <SPText style={styles.eyebrow}>YOUR SPLIT</SPText>
          <SPText style={styles.splitName} numberOfLines={1}>
            {hero.planName.toUpperCase()}
          </SPText>
          <View style={styles.divider} />
          <SPText style={styles.description}>{hero.description}</SPText>
        </View>
      </View>

      <View style={styles.ctaRow}>
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
            pressed && styles.viewPlanButtonPressed,
          ]}
        >
          <SPText style={styles.viewPlanLabel}>VIEW PLAN</SPText>
          <ArrowRight size={14} color={GT.accent} strokeWidth={2} />
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
    padding: GT.s24,
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
    transform: [{ translateY: -55 }],
  },
  row: {
    flexDirection: "row",
    gap: GT.s16,
  },
  iconGlow: {
    width: 56,
    height: 56,
    borderRadius: GT.r999,
    backgroundColor: GT.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: GT.r999,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: GT.s6,
  },
  eyebrow: {
    fontFamily: GT.font.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: GT.accent,
  },
  splitName: {
    fontFamily: GT.font.display,
    fontSize: 24,
    color: GT.text,
    letterSpacing: 0.2,
  },
  divider: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: GT.accent,
    marginVertical: GT.s4,
  },
  description: {
    fontFamily: GT.font.medium,
    fontSize: 13,
    color: GT.muted,
    lineHeight: 18,
  },
  ctaRow: {
    marginTop: GT.s20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GT.s8,
    borderWidth: 1,
    borderColor: GT.accentDim,
    borderRadius: GT.r999,
    paddingVertical: GT.s10,
    paddingHorizontal: GT.s20,
  },
  viewPlanButtonPressed: {
    backgroundColor: GT.accentDim,
  },
  viewPlanLabel: {
    fontFamily: GT.font.semiBold,
    fontSize: 13,
    letterSpacing: 0.8,
    color: GT.accent,
  },
});
