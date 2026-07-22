/**
 * HomeScreen — Sporty Pulse Pro
 *
 * States:
 *   • Loading          → <LoadingSkeleton />
 *   • Error            → inline error + retry
 *   • Day 1 (locked)   → totalWorkouts === 0 → <Day1Home /> (tier-aware copy)
 *   • Dashboard        → totalWorkouts > 0   → full unlocked layout
 *
 * Dashboard section order (matches design):
 *   1. Greeting + avatar
 *   2. Current Streak card  (streak stat left + StreakDotGrid right)
 *   3. Today's Session card (SessionProgressRing + plan info + START SESSION)
 *   4. Recovery Status card (mini ring + % + label + tip)
 *      └─ Free/Equipment → LockedRecoveryCard (PRO gate)
 *      └─ Pro            → live RecoveryCard
 *   5. Week Overview card   (Workouts / Minutes / Sets + mini bar chart)
 *   6. Recent Activity row  (checkmark + name + duration)
 *   7. Equipment trial strip (Equipment tier only, when trial active/expired)
 *   8. Upgrade nudge card   (Free tier only, bottom of scroll)
 *
 * Tier gating:
 *   accessTier === "free"      → Recovery locked, upgrade nudge shown
 *   accessTier === "equipment" → Recovery locked, trial strip shown
 *   accessTier === "pro"       → Everything unlocked, zero upsell copy
 *
 * Responsive across 4 phone size tiers:
 *   XS  — Small phones    5.4"–5.8"   width < 360
 *   SM  — Standard        6.0"–6.4"   360 ≤ width < 400
 *   MD  — Large           6.5"–6.8"   400 ≤ width < 430
 *   LG  — XL / Foldable  7.0"+       width ≥ 430
 *
 * File location: src/screens/HomeScreen.tsx
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Image,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect } from "expo-router";

import { SPText } from "../components/ui/SPText";
import { SPButton } from "../components/ui/SPButton";
import { SPCard } from "../components/ui/SPCard";
import { SPBadge } from "../components/ui/SPBadge";
import { SPIcon } from "../components/icons/SPIcon";

import { StreakDotGrid } from "../components/home/Streakdotgrid";
import { SessionProgressRing } from "../components/home/Sessionprogressring";
import { Day1Home } from "../components/home/Day1home";

import { spacing, radii, borders, timing, spring } from "../theme";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { api } from "../lib/api";
import type { HomeData, SPUser } from "../types/session";
import type { StreakDotDay } from "../components/home/Streakdotgrid";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccessTier = "free" | "equipment" | "pro";

interface EquipmentTrial {
  daysRemaining: number;
  isExpired: boolean;
}

interface ExtendedHomeData extends HomeData {
  todaySessionNumber: number | null;
  planTotalSessions: number | null;
  sessionPhase: string | null;
  sessionDurationMin: number | null;
  trainingLevel: string | null;
  recoveryPct: number | null;
  recoveryLabel: string | null;
  recoveryTip: string | null;
  weekMinutes: number;
  recentActivity: {
    planName: string;
    sessionLabel: string;
    durationMin: number;
  } | null;
  recentActivityUrl: string | null;
  /** 3 weeks of dot data — index 0 = oldest week, index 2 = current week */
  streakWeeks: StreakDotDay[][];
  /** User's current access tier */
  accessTier: AccessTier;
  /** Equipment trial info — null if no active/expired trial */
  equipmentTrial: EquipmentTrial | null;
}

// ─── Responsive Scale ─────────────────────────────────────────────────────────

type SizeTier = "xs" | "sm" | "md" | "lg";

interface ResponsiveScale {
  tier: SizeTier;
  screenPaddingH: number;
  sectionGap: number;
  cardPadding: number;
  labelFontSize: number;
  h1FontSize: number;
  bodyFontSize: number;
  avatarSize: number;
  avatarRadius: number;
  avatarFontSize: number;
  avatarLineHeight: number;
  sessionRingSize: number;
  metricGap: number;
  ctaBottomPadding: number;
  skeletonH1Height: number;
}

function useResponsiveScale(): ResponsiveScale {
  const { width } = useWindowDimensions();

  return useMemo((): ResponsiveScale => {
    const tier: SizeTier =
      width < 360 ? "xs" : width < 400 ? "sm" : width < 430 ? "md" : "lg";

    const pick = <T,>(values: [T, T, T, T]): T =>
      values[({ xs: 0, sm: 1, md: 2, lg: 3 } as const)[tier]];

    return {
      tier,
      screenPaddingH: pick([14, 16, 20, 24]),
      sectionGap: pick([12, 16, 20, 24]),
      cardPadding: pick([14, 16, 20, 24]),
      labelFontSize: pick([11, 12, 13, 14]),
      h1FontSize: pick([26, 30, 34, 38]),
      bodyFontSize: pick([12, 13, 14, 15]),
      avatarSize: pick([38, 44, 48, 54]),
      avatarRadius: pick([19, 22, 24, 27]),
      avatarFontSize: pick([15, 18, 20, 22]),
      avatarLineHeight: pick([18, 22, 24, 26]),
      sessionRingSize: pick([64, 72, 78, 84]),
      metricGap: pick([16, 20, 24, 28]),
      ctaBottomPadding: pick([90, 96, 100, 108]),
      skeletonH1Height: pick([32, 38, 42, 48]),
    };
  }, [width]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Day1Greeting(accessTier: AccessTier): { cta: string; sub: string } {
  switch (accessTier) {
    case "pro":
      return {
        cta: "Build Your System",
        sub: "Full access unlocked. Choose your first plan.",
      };
    case "equipment":
      return {
        cta: "Start Training with Your Kit",
        sub: "Your equipment is ready. Pick a plan to begin.",
      };
    default:
      return {
        cta: "Pick Your First Plan",
        sub: "Day 1 starts when you pick a plan.",
      };
  }
}

// ─── SectionEntrance ──────────────────────────────────────────────────────────

function SectionEntrance({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 250 }));
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 24, stiffness: 180, mass: 1.1 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  user,
  onPress,
  rs,
}: {
  user: SPUser;
  onPress: () => void;
  rs: ResponsiveScale;
}) {
  const { theme } = useAppTheme();

  const sizeStyle = useMemo(
    () => ({
      width: rs.avatarSize,
      height: rs.avatarSize,
      borderRadius: rs.avatarRadius,
      borderWidth: borders.thin,
    }),
    [rs.avatarSize, rs.avatarRadius],
  );

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {user.image ? (
        <Image
          source={{ uri: user.image }}
          style={[sizeStyle, { borderColor: theme.border }]}
        />
      ) : (
        <View
          style={[
            sizeStyle,
            styles.avatarPlaceholder,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <SPText
            variant="h3"
            style={{
              color: theme.accent,
              fontSize: rs.avatarFontSize,
              lineHeight: rs.avatarLineHeight,
            }}
          >
            {user.name?.charAt(0).toUpperCase() ?? "?"}
          </SPText>
        </View>
      )}
    </Pressable>
  );
}

// ─── StreakCard ───────────────────────────────────────────────────────────────

interface StreakCardProps {
  currentStreak: number;
  bestStreak: number;
  streakWeeks: StreakDotDay[][];
  cardPadding: number;
  labelFontSize: number;
}

function StreakCard({
  currentStreak,
  bestStreak,
  streakWeeks,
  cardPadding,
  labelFontSize,
}: StreakCardProps) {
  const { theme } = useAppTheme();
  const isOnFire = currentStreak >= 3;

  return (
    <SPCard variant="default" padding={cardPadding}>
      {/* Header */}
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="trending" size={16} color={theme.accent} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Current Streak
          </SPText>
        </View>
        <Pressable hitSlop={8}>
          <SPIcon name="chevronRight" size={18} color={theme.muted} />
        </Pressable>
      </View>

      {/* Dot grid + stat */}
      <StreakDotGrid
        currentStreak={currentStreak}
        bestStreak={bestStreak}
        weeks={streakWeeks}
        isOnFire={isOnFire}
        entranceDelay={120}
      />
    </SPCard>
  );
}

// ─── TodaysSessionCard ────────────────────────────────────────────────────────

interface TodaysSessionCardProps {
  planName: string;
  sessionNumber: number;
  planTotalSessions: number;
  phase: string | null;
  durationMin: number | null;
  level: string | null;
  onPress: () => void;
  onViewPlan: () => void;
  cardPadding: number;
  ringSize: number;
  labelFontSize: number;
}

function TodaysSessionCard({
  planName,
  sessionNumber,
  planTotalSessions,
  phase,
  durationMin,
  level,
  onPress,
  onViewPlan,
  cardPadding,
  ringSize,
  labelFontSize,
}: TodaysSessionCardProps) {
  const { theme } = useAppTheme();

  return (
    <SPCard variant="default" padding={cardPadding}>
      {/* Header */}
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="timer" size={16} color={theme.accent} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Today's Session
          </SPText>
        </View>
        <Pressable onPress={onViewPlan} hitSlop={8}>
          <SPIcon name="chevronRight" size={18} color={theme.muted} />
        </Pressable>
      </View>

      {/* Session body */}
      <View style={styles.sessionBody}>
        <SessionProgressRing
          sessionNumber={sessionNumber}
          totalSessions={planTotalSessions}
          size={ringSize}
          entranceDelay={200}
        />

        <View style={styles.sessionInfo}>
          <SPText
            variant="h3"
            style={{ color: theme.text, fontFamily: "Barlow-SemiBold" }}
            numberOfLines={2}
          >
            {planName}
          </SPText>

          {phase !== null && (
            <SPText
              variant="caption"
              style={{ color: theme.muted, marginTop: spacing[0.5] }}
            >
              Session {sessionNumber} · {phase}
            </SPText>
          )}

          <View style={[styles.sessionMeta, { marginTop: spacing[1] }]}>
            {durationMin !== null && (
              <View style={styles.metaItem}>
                <SPIcon name="timer" size={12} color={theme.muted} />
                <SPText variant="caption" style={{ color: theme.muted }}>
                  {durationMin} min
                </SPText>
              </View>
            )}
            {level !== null && (
              <View style={styles.metaItem}>
                <SPIcon name="training" size={12} color={theme.muted} />
                <SPText variant="caption" style={{ color: theme.muted }}>
                  {level}
                </SPText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* CTA */}
      <View style={{ marginTop: spacing[3] }}>
        <SPButton variant="primary" onPress={onPress}>
          Start Session
        </SPButton>
      </View>
    </SPCard>
  );
}

// ─── NoPlanCard ───────────────────────────────────────────────────────────────

function NoPlanCard({
  onBrowse,
  cardPadding,
  labelFontSize,
}: {
  onBrowse: () => void;
  cardPadding: number;
  labelFontSize: number;
}) {
  const { theme } = useAppTheme();

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="timer" size={16} color={theme.accent} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Today's Session
          </SPText>
        </View>
        <Pressable onPress={onBrowse} hitSlop={8}>
          <SPIcon name="chevronRight" size={18} color={theme.muted} />
        </Pressable>
      </View>
      <View style={styles.sessionBody}>
        <View
          style={[
            styles.sessionCounterPlaceholder,
            { borderColor: theme.border, backgroundColor: theme.surface2 },
          ]}
        >
          <SPIcon name="training" size={22} color={theme.muted} />
        </View>
        <View style={styles.sessionInfo}>
          <SPText variant="h3" style={{ color: theme.text }}>
            No Active Plan
          </SPText>
          <SPText
            variant="caption"
            style={{ color: theme.muted, marginTop: spacing[0.5] }}
          >
            Pick a plan to unlock today's session
          </SPText>
        </View>
      </View>
      <View style={{ marginTop: spacing[3] }}>
        <SPButton variant="primary" onPress={onBrowse}>
          Browse Plans
        </SPButton>
      </View>
    </SPCard>
  );
}

// ─── RecoveryCard (Pro) ───────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RecoveryCardProps {
  recoveryPct: number;
  label: string;
  tip: string | null;
  cardPadding: number;
  labelFontSize: number;
}

function RecoveryCard({
  recoveryPct,
  label,
  tip,
  cardPadding,
  labelFontSize,
}: RecoveryCardProps) {
  const { theme } = useAppTheme();

  const RING_SIZE = 64;
  const STROKE = 5;
  const RADIUS = (RING_SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      200,
      withSpring(recoveryPct / 100, spring.smooth),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryPct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const ringColor =
    recoveryPct >= 60
      ? theme.accent
      : recoveryPct >= 30
        ? "#F5A623"
        : "#FF4136";

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="heart" size={16} color={theme.accent} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Recovery Status
          </SPText>
        </View>
        <Pressable hitSlop={8}>
          <SPIcon name="chevronRight" size={18} color={theme.muted} />
        </Pressable>
      </View>

      <View style={styles.recoveryBody}>
        {/* Ring with % inside */}
        <View
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            style={{ position: "absolute" }}
          >
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={theme.surface2}
              strokeWidth={STROKE}
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <SPText
            variant="caption"
            style={{
              color: theme.text,
              fontSize: 13,
              fontFamily: "Barlow-SemiBold",
            }}
          >
            {recoveryPct}%
          </SPText>
        </View>

        <View style={styles.recoveryInfo}>
          <SPText
            variant="bodyMd"
            style={{ color: ringColor, fontFamily: "Barlow-SemiBold" }}
          >
            {label}
          </SPText>
          {tip !== null && (
            <SPText
              variant="caption"
              style={{ color: theme.muted, marginTop: spacing[0.5] }}
            >
              {tip}
            </SPText>
          )}
        </View>
      </View>
    </SPCard>
  );
}

// ─── LockedRecoveryCard (Free + Equipment) ────────────────────────────────────

function LockedRecoveryCard({
  onUpgrade,
  cardPadding,
  labelFontSize,
}: {
  onUpgrade: () => void;
  cardPadding: number;
  labelFontSize: number;
}) {
  const { theme } = useAppTheme();

  const RING_SIZE = 64;
  const STROKE = 5;
  const RADIUS = (RING_SIZE - STROKE) / 2;

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="heart" size={16} color={theme.muted} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Recovery Status
          </SPText>
        </View>
        <SPBadge variant="acid">PRO</SPBadge>
      </View>

      <View style={styles.recoveryBody}>
        {/* Dashed placeholder ring */}
        <View
          style={[
            styles.lockedRing,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderColor: theme.border,
              backgroundColor: theme.raised,
            },
          ]}
        >
          <SPIcon name="lock" size={18} color={theme.muted} />
        </View>

        <View style={styles.recoveryInfo}>
          <SPText
            variant="bodyMd"
            style={{ color: theme.muted2, fontFamily: "Barlow-SemiBold" }}
          >
            — %
          </SPText>
          <SPText
            variant="caption"
            style={{ color: theme.muted, marginTop: spacing[0.5] }}
          >
            See how your body responds to every session.
          </SPText>
          <Pressable
            onPress={onUpgrade}
            hitSlop={8}
            style={{ marginTop: spacing[1.5] }}
          >
            <SPText
              variant="caption"
              style={{ color: theme.accent, fontFamily: "Barlow-SemiBold" }}
            >
              Upgrade to Pro →
            </SPText>
          </Pressable>
        </View>
      </View>
    </SPCard>
  );
}

// ─── WeekOverviewCard ─────────────────────────────────────────────────────────

interface WeekOverviewCardProps {
  totalWorkouts: number;
  weekMinutes: number;
  totalSets: number;
  weekDays: HomeData["weekDays"];
  cardPadding: number;
  metricGap: number;
  labelFontSize: number;
}

function WeekOverviewCard({
  totalWorkouts,
  weekMinutes,
  totalSets,
  weekDays,
  cardPadding,
  metricGap,
  labelFontSize,
}: WeekOverviewCardProps) {
  const { theme } = useAppTheme();

  const stats = [
    { label: "Workouts", value: totalWorkouts.toString() },
    { label: "Minutes", value: weekMinutes.toString() },
    { label: "Sets", value: totalSets.toString() },
  ];

  // Mini bar chart — 7 bars derived from weekDays
  const BAR_MAX = 32;

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="chart" size={16} color={theme.accent} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Week Overview
          </SPText>
        </View>
        <Pressable hitSlop={8}>
          <SPIcon name="chevronRight" size={18} color={theme.muted} />
        </Pressable>
      </View>

      <View style={styles.weekOverviewContent}>
        {/* Stats */}
        <View style={[styles.weekStats, { gap: metricGap }]}>
          {stats.map((s) => (
            <View key={s.label} style={styles.weekStat}>
              <SPText
                variant="statLg"
                style={{ color: theme.text, fontSize: 24, lineHeight: 28 }}
              >
                {s.value}
              </SPText>
              <SPText
                variant="caption"
                style={{ color: theme.muted, marginTop: 2 }}
              >
                {s.label}
              </SPText>
            </View>
          ))}
        </View>

        {/* Mini bar chart */}
        <View style={styles.miniBarChart}>
          {weekDays.map((d, i) => {
            const fill = d.worked ? 1 : d.isFuture ? 0.12 : 0.25;
            return (
              <View key={i} style={styles.miniBarTrack}>
                <View
                  style={[
                    styles.miniBarFill,
                    {
                      height: BAR_MAX * fill,
                      backgroundColor: d.worked ? theme.accent : theme.surface2,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
    </SPCard>
  );
}

// ─── RecentActivityCard ───────────────────────────────────────────────────────

interface RecentActivityProps {
  planName: string;
  sessionLabel: string;
  durationMin: number;
  onSeeAll: () => void;
  cardPadding: number;
  labelFontSize: number;
}

function RecentActivityCard({
  planName,
  sessionLabel,
  durationMin,
  onSeeAll,
  cardPadding,
  labelFontSize,
}: RecentActivityProps) {
  const { theme } = useAppTheme();

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="activity" size={16} color={theme.accent} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Recent Activity
          </SPText>
        </View>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <SPIcon name="chevronRight" size={18} color={theme.muted} />
        </Pressable>
      </View>

      <View style={styles.activityEntry}>
        <View
          style={[
            styles.activityCheck,
            { borderColor: theme.accent, backgroundColor: theme.accentDim },
          ]}
        >
          <SPIcon name="check" size={14} color={theme.accent} />
        </View>

        <View style={styles.activityInfo}>
          <SPText
            variant="bodyMd"
            style={{ color: theme.text, fontFamily: "Barlow-Medium" }}
          >
            {planName}
          </SPText>
          <SPText
            variant="caption"
            style={{ color: theme.muted, marginTop: spacing[0.5] }}
          >
            {sessionLabel}
          </SPText>
        </View>

        <SPText variant="caption" style={{ color: theme.muted }}>
          {durationMin} min
        </SPText>
      </View>
    </SPCard>
  );
}

// ─── NoActivityCard ───────────────────────────────────────────────────────────

function NoActivityCard({
  cardPadding,
  labelFontSize,
}: {
  cardPadding: number;
  labelFontSize: number;
}) {
  const { theme } = useAppTheme();

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
        <View style={styles.cardHeaderLeft}>
          <SPIcon name="activity" size={16} color={theme.muted} />
          <SPText
            variant="label"
            style={{
              color: theme.text,
              fontSize: labelFontSize,
              marginLeft: spacing[1],
            }}
          >
            Recent Activity
          </SPText>
        </View>
      </View>
      <View style={styles.activityEntry}>
        <View
          style={[
            styles.activityCheck,
            { borderColor: theme.border, backgroundColor: theme.surface2 },
          ]}
        >
          <SPIcon name="training" size={14} color={theme.muted} />
        </View>
        <View style={styles.activityInfo}>
          <SPText variant="bodyMd" style={{ color: theme.muted }}>
            No sessions yet
          </SPText>
          <SPText
            variant="caption"
            style={{ color: theme.muted, marginTop: spacing[0.5] }}
          >
            Your completed workouts will appear here
          </SPText>
        </View>
      </View>
    </SPCard>
  );
}

// ─── EquipmentTrialStrip ──────────────────────────────────────────────────────
// Thin contextual strip — amber if trial active, red if expired. Never shown
// for Free or Pro users.

function EquipmentTrialStrip({
  trial,
  onUpgrade,
  screenPaddingH,
}: {
  trial: EquipmentTrial;
  onUpgrade: () => void;
  screenPaddingH: number;
}) {
  const { theme } = useAppTheme();

  const isExpired = trial.isExpired;
  const accent = isExpired ? "#FF4136" : "#F5A623";
  const bg = isExpired ? "#FF413618" : "#F5A62318";

  const message = isExpired
    ? "Your equipment access has expired."
    : trial.daysRemaining === 1
      ? "Your equipment access expires tomorrow."
      : `Your equipment access expires in ${trial.daysRemaining} days.`;

  return (
    <View
      style={[
        styles.trialStrip,
        {
          backgroundColor: bg,
          borderColor: accent + "44",
          marginHorizontal: -screenPaddingH,
          paddingHorizontal: screenPaddingH,
        },
      ]}
    >
      <SPIcon name="warning" size={13} color={accent} />
      <SPText
        variant="caption"
        style={{ color: accent, flex: 1, marginLeft: spacing[1] }}
      >
        {message}
      </SPText>
      <Pressable onPress={onUpgrade} hitSlop={8}>
        <SPText
          variant="caption"
          style={{ color: accent, fontFamily: "Barlow-SemiBold" }}
        >
          Go Pro
        </SPText>
      </Pressable>
    </View>
  );
}

// ─── UpgradeNudgeCard (Free only) ─────────────────────────────────────────────
// Quiet bottom-of-scroll card. Never a popup. Brand-voice copy only.

function UpgradeNudgeCard({
  onUpgrade,
  cardPadding,
}: {
  onUpgrade: () => void;
  cardPadding: number;
}) {
  const { theme } = useAppTheme();

  return (
    <SPCard variant="default" padding={cardPadding}>
      <View style={styles.nudgeContent}>
        <View style={styles.nudgeText}>
          <SPText
            variant="bodyMd"
            style={{ color: theme.text, fontFamily: "Barlow-SemiBold" }}
          >
            Close the gap.
          </SPText>
          <SPText
            variant="caption"
            style={{ color: theme.muted, marginTop: spacing[0.5] }}
          >
            Add equipment or go Pro to unlock recovery tracking and your full
            training system.
          </SPText>
        </View>
        <Pressable
          onPress={onUpgrade}
          hitSlop={8}
          style={[
            styles.nudgePill,
            {
              borderColor: theme.accent + "66",
              backgroundColor: theme.accentDim,
            },
          ]}
        >
          <SPText
            variant="caption"
            style={{ color: theme.accent, fontFamily: "Barlow-SemiBold" }}
          >
            Upgrade
          </SPText>
        </Pressable>
      </View>
    </SPCard>
  );
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton({
  insetTop,
  rs,
}: {
  insetTop: number;
  rs: ResponsiveScale;
}) {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    let active = true;
    function pulse() {
      if (!active) return;
      opacity.value = withTiming(opacity.value < 0.5 ? 0.6 : 0.3, {
        duration: 700,
      });
      setTimeout(pulse, 700);
    }
    pulse();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[
        styles.fill,
        { paddingTop: insetTop + spacing[6], backgroundColor: theme.bg },
      ]}
    >
      <Animated.View
        style={[
          styles.skeletonWrap,
          pulseStyle,
          { paddingHorizontal: rs.screenPaddingH, gap: rs.sectionGap },
        ]}
      >
        <View style={{ gap: spacing[2] }}>
          <View
            style={[
              styles.skeletonBar,
              { width: "45%", height: 10, backgroundColor: theme.raised },
            ]}
          />
          <View
            style={[
              styles.skeletonBar,
              {
                width: "70%",
                height: rs.skeletonH1Height,
                backgroundColor: theme.raised,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonBar,
              {
                width: "50%",
                height: rs.skeletonH1Height,
                backgroundColor: theme.raised,
              },
            ]}
          />
        </View>
        {[120, 100, 80, 80].map((h, i) => (
          <View
            key={i}
            style={[
              styles.skeletonBar,
              {
                width: "100%",
                height: h,
                borderRadius: radii.lg,
                backgroundColor: theme.raised,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const rs = useResponsiveScale();
  // SPTabBar floats absolutely over content now — rs.ctaBottomPadding was
  // only ever sized for breathing room above the CTA, not for clearing
  // the bar itself, so we add the bar's real, safe-area-aware height on top.
  const tabBarHeight = useTabBarHeight();

  const greeting = useMemo(() => getGreeting(), []);

  const [user, setUser] = useState<SPUser | null>(null);
  const [homeData, setHomeData] = useState<ExtendedHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [userData, data] = await Promise.all([
        api.get<SPUser>("/api/user/profile"),
        api.get<Partial<ExtendedHomeData>>("/api/home"),
      ]);

      setUser(userData);
      setHomeData({
        totalWorkouts: 0,
        trainedHours: "0m",
        totalSets: 0,
        currentStreak: 0,
        bestStreak: 0,
        weekDays: [],
        planWeek: null,
        planName: null,
        sessionsLeft: null,
        weekCompletedCount: 0,
        weekTotalCount: 0,
        weekWorkouts: [],
        nextSessionUrl: null,
        weekMinutes: 0,
        todaySessionNumber: null,
        planTotalSessions: null,
        sessionPhase: null,
        sessionDurationMin: null,
        trainingLevel: null,
        recoveryPct: null,
        recoveryLabel: null,
        recoveryTip: null,
        recentActivity: null,
        recentActivityUrl: "/progress",
        streakWeeks: [],
        accessTier: "free",
        equipmentTrial: null,
        ...data,
      } satisfies ExtendedHomeData);

      setError(null);
    } catch {
      setError("Could not load your dashboard. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const scrollContentStyle = useMemo(
    () => ({
      paddingHorizontal: rs.screenPaddingH,
      paddingBottom: tabBarHeight + rs.ctaBottomPadding,
      paddingTop: insets.top + spacing[4],
      gap: rs.sectionGap,
    }),
    [
      rs.screenPaddingH,
      rs.ctaBottomPadding,
      rs.sectionGap,
      insets.top,
      tabBarHeight,
    ],
  );

  // ── Loading ──
  if (loading) {
    return <LoadingSkeleton insetTop={insets.top} rs={rs} />;
  }

  // ── Error ──
  if (error || !user || !homeData) {
    return (
      <View
        style={[
          styles.centerFill,
          {
            paddingTop: insets.top,
            backgroundColor: theme.bg,
            paddingHorizontal: rs.screenPaddingH,
          },
        ]}
      >
        <SPIcon name="warning" size={32} color={theme.muted} />
        <SPText
          variant="body"
          center
          style={{
            marginTop: spacing[3],
            color: theme.muted,
            fontSize: rs.bodyFontSize,
          }}
        >
          {error ?? "Something went wrong."}
        </SPText>
        <SPButton
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => fetchData()}
          containerStyle={{ marginTop: spacing[4] }}
        >
          Retry
        </SPButton>
      </View>
    );
  }

  // ── Day 1 (never completed a workout) ──
  if (homeData.totalWorkouts === 0) {
    const day1Copy = Day1Greeting(homeData.accessTier);
    return (
      <View
        style={[
          styles.fill,
          { paddingTop: insets.top, backgroundColor: theme.bg },
        ]}
      >
        <Day1Home
          user={user}
          greeting={greeting}
          ctaCopy={day1Copy.cta}
          subline={day1Copy.sub}
        />
      </View>
    );
  }

  // ── Dashboard destructure ──
  const {
    totalWorkouts,
    totalSets,
    currentStreak,
    bestStreak,
    weekDays,
    planWeek = null,
    planName = null,
    sessionsLeft = null,
    nextSessionUrl = null,
    todaySessionNumber,
    planTotalSessions,
    sessionPhase,
    sessionDurationMin,
    trainingLevel,
    recoveryPct,
    recoveryLabel,
    recoveryTip,
    weekMinutes,
    recentActivity,
    recentActivityUrl,
    streakWeeks,
    accessTier,
    equipmentTrial,
  } = homeData;

  const isProUser = accessTier === "pro";

  const planSubtitle =
    planName && planWeek !== null && sessionsLeft !== null
      ? `Week ${planWeek} of ${planName} · ${sessionsLeft} session${sessionsLeft !== 1 ? "s" : ""} left`
      : "No active plan — start one to begin tracking";

  const handleUpgrade = () => router.push("/pricing" as any);

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        {/* ── 1. Greeting ── */}
        <SectionEntrance delay={0}>
          <View style={styles.greetingRow}>
            <View style={[styles.greetingLeft, { paddingRight: spacing[3] }]}>
              <SPText
                variant="label"
                style={{
                  color: theme.muted,
                  fontSize: rs.labelFontSize,
                  marginBottom: spacing[1],
                }}
              >
                {greeting}, {user.name}
              </SPText>
              <SPText
                variant="h1"
                style={{ color: theme.text, fontSize: rs.h1FontSize }}
              >
                Stay in{" "}
                <SPText
                  variant="h1"
                  style={{ color: theme.accent, fontSize: rs.h1FontSize }}
                >
                  control
                </SPText>
                {"\n"}everyday.
              </SPText>
              <SPText
                variant="body"
                style={{
                  color: theme.muted,
                  fontSize: rs.bodyFontSize,
                  marginTop: spacing[1],
                }}
              >
                {planSubtitle}
              </SPText>
            </View>
            <Avatar
              user={user}
              onPress={() => router.push("/settings")}
              rs={rs}
            />
          </View>
        </SectionEntrance>

        {/* ── 2. Current Streak ── */}
        <SectionEntrance delay={80}>
          <StreakCard
            currentStreak={currentStreak}
            bestStreak={bestStreak}
            streakWeeks={streakWeeks}
            cardPadding={rs.cardPadding}
            labelFontSize={rs.labelFontSize}
          />
        </SectionEntrance>

        {/* ── 3. Today's Session ── */}
        <SectionEntrance delay={140}>
          {planName !== null &&
          todaySessionNumber !== null &&
          planTotalSessions !== null ? (
            <TodaysSessionCard
              planName={planName}
              sessionNumber={todaySessionNumber}
              planTotalSessions={planTotalSessions}
              phase={sessionPhase}
              durationMin={sessionDurationMin}
              level={trainingLevel}
              onPress={() => router.push("/(tabs)/training?autoStart=1" as any)}
              onViewPlan={() => router.push("/programs")}
              cardPadding={rs.cardPadding}
              ringSize={rs.sessionRingSize}
              labelFontSize={rs.labelFontSize}
            />
          ) : (
            <NoPlanCard
              onBrowse={() => router.push("/programs")}
              cardPadding={rs.cardPadding}
              labelFontSize={rs.labelFontSize}
            />
          )}
        </SectionEntrance>

        {/* ── 4. Recovery Status ── */}
        <SectionEntrance delay={200}>
          {isProUser ? (
            <RecoveryCard
              recoveryPct={recoveryPct ?? 85}
              label={recoveryLabel ?? "Good to train"}
              tip={recoveryTip ?? "Keep fueling and hydrating."}
              cardPadding={rs.cardPadding}
              labelFontSize={rs.labelFontSize}
            />
          ) : (
            <LockedRecoveryCard
              onUpgrade={handleUpgrade}
              cardPadding={rs.cardPadding}
              labelFontSize={rs.labelFontSize}
            />
          )}
        </SectionEntrance>

        {/* ── 5. Week Overview ── */}
        <SectionEntrance delay={240}>
          <WeekOverviewCard
            totalWorkouts={totalWorkouts}
            weekMinutes={weekMinutes}
            totalSets={totalSets}
            weekDays={weekDays}
            cardPadding={rs.cardPadding}
            metricGap={rs.metricGap}
            labelFontSize={rs.labelFontSize}
          />
        </SectionEntrance>

        {/* ── 6. Recent Activity ── */}
        <SectionEntrance delay={280}>
          {recentActivity !== null ? (
            <RecentActivityCard
              planName={recentActivity.planName}
              sessionLabel={recentActivity.sessionLabel}
              durationMin={recentActivity.durationMin}
              onSeeAll={() =>
                recentActivityUrl && router.push(recentActivityUrl as any)
              }
              cardPadding={rs.cardPadding}
              labelFontSize={rs.labelFontSize}
            />
          ) : (
            <NoActivityCard
              cardPadding={rs.cardPadding}
              labelFontSize={rs.labelFontSize}
            />
          )}
        </SectionEntrance>

        {/* ── 7. Equipment Trial Strip (Equipment tier only) ── */}
        {accessTier === "equipment" && equipmentTrial !== null && (
          <SectionEntrance delay={320}>
            <EquipmentTrialStrip
              trial={equipmentTrial}
              onUpgrade={handleUpgrade}
              screenPaddingH={rs.screenPaddingH}
            />
          </SectionEntrance>
        )}

        {/* ── 8. Upgrade Nudge (Free tier only) ── */}
        {accessTier === "free" && (
          <SectionEntrance delay={320}>
            <UpgradeNudgeCard
              onUpgrade={handleUpgrade}
              cardPadding={rs.cardPadding}
            />
          </SectionEntrance>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flex: 1 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Greeting
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingLeft: { flex: 1 },

  // Avatar
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },

  // Shared card header
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Today's Session
  sessionBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  sessionCounterPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: borders.base,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: { flex: 1 },
  sessionMeta: {
    flexDirection: "row",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[0.5],
  },

  // Recovery
  recoveryBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  recoveryInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  lockedRing: {
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },

  // Week Overview
  weekOverviewContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  weekStats: {
    flexDirection: "row",
  },
  weekStat: {
    alignItems: "flex-start",
  },
  miniBarChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 40,
  },
  miniBarTrack: {
    width: 5,
    height: 32,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    width: "100%",
    borderRadius: 3,
  },

  // Recent Activity
  activityEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  activityCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: borders.base,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: { flex: 1 },

  // Equipment trial strip
  trialStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[1.5],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: spacing[1],
  },

  // Upgrade nudge card
  nudgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  nudgeText: {
    flex: 1,
  },
  nudgePill: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },

  // Skeleton
  skeletonWrap: { flex: 1 },
  skeletonBar: { height: 14, borderRadius: radii.sm },
});
