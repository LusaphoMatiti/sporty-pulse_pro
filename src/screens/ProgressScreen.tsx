import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { SPText } from "../components/ui/SPText";
import { SPCard } from "../components/ui/SPCard";
import { SPBadge } from "../components/ui/SPBadge";
import { SPButton } from "../components/ui/SPButton";
import { SPIcon } from "../components/icons/SPIcon";
import { Dumbbell, Layers, Flame } from "lucide-react-native";
import Svg, { Path, G } from "react-native-svg";
import { WeeklyVolumeCard } from "../components/progress/WeeklyVolume";
import PersonalRecordCard, {
  EXAMPLE_PR_DATA,
  type PersonalRecordData,
} from "../components/progress/PersonalRecordsCard";
import {
  SessionHistoryCard,
  type SessionHistoryItem,
} from "../components/progress/SessionHistory";

import {
  PRCard,
  MonthCompareChart,
  StrengthTrendsCard,
  VolumeByMuscleCard,
  SmartMetrics,
  LockedUpgradeGate,
  formatVolume,
} from "../components/progress/ProgressComponents";

import { colors, spacing, radii, borders, fonts, layout } from "../theme";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { api } from "../lib/api";
import type {
  UserPlan,
  HeaderStats,
  PersonalRecord,
  MonthStats,
  BodySplitItem,
  SessionItem,
  DashboardData,
} from "../types/session";
import { SPSkeleton } from "../components/ui/SPSkeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type Identity = "REBUILD" | "OPERATOR" | "EXECUTIVE_PERFORMANCE";
type ProgressionType = "VOLUME" | "LOAD" | "DENSITY";

interface ProgressionState {
  week: number;
  progressionType: ProgressionType;
  nextMilestone: string;
  currentSets: number;
  currentReps: number;
  currentRestSeconds: number;
  deloadRequired: boolean;
}

export interface WeeklyVolumeDay {
  label: string; // "M", "T", "W"
  kg: number;
}

interface ProgressData {
  userPlan: UserPlan;
  hasActiveTrial: boolean;
  headerStats: HeaderStats;
  personalRecords: PersonalRecord[];
  thisMonth: MonthStats;
  lastMonth: MonthStats;
  currentMonthName: string;
  prevMonthName: string;
  bodySplit: BodySplitItem[];
  sessionHistory: SessionItem[];
  dashboardData: DashboardData | null;
  // Phase 4 additions
  identity: Identity | null;
  activePlanInstanceId: string | null;
  progression: ProgressionState | null;
}

export interface WeeklyVolumeData {
  totalKg: number;
  setsCompleted: number;
  durationMinutes: number;
  vsLastWeekPct: number | null;
  days: WeeklyVolumeDay[]; // 7 entries, Mon → Sun
}

// ─── Identity config ───────────────────────────────────────────────────────

const IDENTITY_CONFIG: Record<
  Identity,
  { label: string; color: string; description: string }
> = {
  REBUILD: {
    label: "REBUILD",
    color: "#FF9500",
    description: "Restoring foundations with controlled progressive loading.",
  },
  OPERATOR: {
    label: "OPERATOR",
    color: "#30D158",
    description: "Building consistent strength and work capacity.",
  },
  EXECUTIVE_PERFORMANCE: {
    label: "EXEC PERF",
    color: "#BF5AF2",
    description: "Advanced programming for peak performance output.",
  },
};

const PROGRESSION_LABEL: Record<ProgressionType, string> = {
  VOLUME: "Volume",
  LOAD: "Load",
  DENSITY: "Density",
};

// ─── Plan badge config ─────────────────────────────────────────────────────

const PLAN_BADGE: Record<
  UserPlan,
  { label: string; variant: "acid" | "outline" | "white" }
> = {
  FREE: { label: "Free", variant: "outline" },
  EQUIPMENT: { label: "Equipment", variant: "acid" },
  PRO: { label: "Pro", variant: "acid" },
};

// ─── Section Header ────────────────────────────────────────────────────────

function SectionHeader({
  title,
  right,
  lucideIcon: LucideIcon,
}: {
  title: string;
  right?: React.ReactNode;
  lucideIcon?: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth: number;
  }>;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={sectionStyles.header}>
      <View style={sectionStyles.titleRow}>
        {LucideIcon && (
          <LucideIcon size={16} color={theme.accent} strokeWidth={2} />
        )}
        <SPText variant="h3">{title}</SPText>
      </View>
      {right}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  lucideIcon: LucideIcon,
  label,
  value,
  sub,
}: {
  icon?: import("../components/icons/SPIcon").IconName;
  lucideIcon?: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth: number;
  }>;
  label: string;
  value: string;
  sub: string;
}) {
  const { theme } = useAppTheme();
  return (
    <SPCard variant="default" style={{ flex: 1 }} padding={spacing[4]}>
      <View style={{ marginBottom: spacing[2] }}>
        {LucideIcon ? (
          <LucideIcon size={20} color={theme.accent} strokeWidth={2} />
        ) : icon ? (
          <SPIcon name={icon} size={20} color={theme.accent} />
        ) : null}
      </View>
      <SPText
        variant="label"
        numberOfLines={1}
        style={{ opacity: 0.6, fontSize: 10, letterSpacing: 0.8 }}
      >
        {label}
      </SPText>
      <SPText
        variant="h2"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ marginTop: spacing[1], fontSize: 28, lineHeight: 32 }}
      >
        {value}
      </SPText>
      <SPText
        variant="caption"
        style={{ marginTop: spacing[0.5], opacity: 0.45 }}
      >
        {sub}
      </SPText>
    </SPCard>
  );
}

// ─── Deload Banner ─────────────────────────────────────────────────────────

function DeloadBanner() {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        deloadStyles.banner,
        { backgroundColor: "#FF453A18", borderColor: "#FF453A55" },
      ]}
    >
      <SPIcon name="lightning" size={18} color="#FF453A" />
      <View style={{ flex: 1 }}>
        <SPText
          variant="bodyMd"
          style={{ fontFamily: fonts.brandBold, color: "#FF453A" }}
        >
          Deload Week
        </SPText>
        <SPText variant="caption" style={{ opacity: 0.7, marginTop: 2 }}>
          Reduce load this week to let your body recover and come back stronger.
        </SPText>
      </View>
    </View>
  );
}

const deloadStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[4],
  },
});

// ─── Identity Card ─────────────────────────────────────────────────────────

function IdentityCard({
  identity,
  onPress,
}: {
  identity: Identity;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const cfg = IDENTITY_CONFIG[identity];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        identityStyles.card,
        { backgroundColor: theme.surface, borderColor: cfg.color + "55" },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={identityStyles.row}>
        <View style={[identityStyles.dot, { backgroundColor: cfg.color }]} />
        <View style={{ flex: 1 }}>
          <SPText
            variant="label"
            style={{ fontSize: 10, letterSpacing: 1, opacity: 0.5 }}
          >
            TRAINING SYSTEM
          </SPText>
          <SPText
            variant="h3"
            style={{ color: cfg.color, fontFamily: fonts.brandBold }}
          >
            {cfg.label}
          </SPText>
        </View>
        <SPIcon name="forward" size={14} color={theme.muted} />
      </View>
      <SPText variant="caption" style={{ opacity: 0.6, marginTop: spacing[1] }}>
        {cfg.description}
      </SPText>
    </Pressable>
  );
}

const identityStyles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[4],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

// ─── Progression Card ──────────────────────────────────────────────────────

function ProgressionCard({
  progression,
  onPress,
}: {
  progression: ProgressionState;
  onPress: () => void;
}) {
  const { theme, isDark } = useAppTheme();
  const accentColor = isDark ? theme.accent : "#5C8A00";

  const restMins = Math.floor(progression.currentRestSeconds / 60);
  const restSecs = progression.currentRestSeconds % 60;
  const restLabel =
    restMins > 0
      ? `${restMins}m ${restSecs > 0 ? restSecs + "s" : ""}`
      : `${restSecs}s`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        progressionStyles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {/* Header */}
      <View style={progressionStyles.header}>
        <View style={{ gap: 2 }}>
          <SPText
            variant="label"
            style={{ fontSize: 10, letterSpacing: 0.8, opacity: 0.5 }}
          >
            PROGRESSION
          </SPText>
          <SPText variant="bodyMd" style={{ fontFamily: fonts.brandBold }}>
            Week {progression.week} ·{" "}
            {PROGRESSION_LABEL[progression.progressionType]} Phase
          </SPText>
        </View>
        <SPIcon name="forward" size={14} color={theme.muted} />
      </View>

      {/* Stats row */}
      <View style={progressionStyles.statsRow}>
        <View style={progressionStyles.statItem}>
          <SPText
            variant="h2"
            style={{ color: accentColor, fontSize: 22, lineHeight: 26 }}
          >
            {progression.currentSets}
          </SPText>
          <SPText variant="caption" style={{ opacity: 0.5 }}>
            sets
          </SPText>
        </View>
        <View style={progressionStyles.divider} />
        <View style={progressionStyles.statItem}>
          <SPText
            variant="h2"
            style={{ color: accentColor, fontSize: 22, lineHeight: 26 }}
          >
            {progression.currentReps}
          </SPText>
          <SPText variant="caption" style={{ opacity: 0.5 }}>
            reps
          </SPText>
        </View>
        <View style={progressionStyles.divider} />
        <View style={progressionStyles.statItem}>
          <SPText
            variant="h2"
            style={{ color: accentColor, fontSize: 22, lineHeight: 26 }}
          >
            {restLabel}
          </SPText>
          <SPText variant="caption" style={{ opacity: 0.5 }}>
            rest
          </SPText>
        </View>
      </View>

      {/* Next milestone */}
      <View
        style={[
          progressionStyles.milestoneRow,
          { borderTopColor: theme.border },
        ]}
      >
        <SPText variant="caption" style={{ opacity: 0.5 }}>
          Next milestone
        </SPText>
        <SPText
          variant="caption"
          style={{ fontFamily: fonts.brandMedium, color: accentColor }}
        >
          {progression.nextMilestone}
        </SPText>
      </View>
    </Pressable>
  );
}

const progressionStyles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(128,128,128,0.2)",
  },
  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing[3],
    borderTopWidth: borders.thin,
  },
});

// ─── Main ProgressScreen ──────────────────────────────────────────────────

const CACHE_KEY = "sp_progress_cache";

export function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  // SPTabBar floats absolutely over content now, so this screen has to
  // reserve its own bottom padding to clear it — the static `layout.tabBarHeight`
  // this used to read from "../theme" was a frozen guess from before the
  // bar floated and never matched the bar's real, safe-area-aware height.
  const tabBarHeight = useTabBarHeight();

  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 400;

  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(6);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch {
        // cache miss — fall through
      }
    }

    try {
      if (isRefresh) setRefreshing(true);
      const d = await api.get<ProgressData>("/api/progress");
      setData(d);
      setError(null);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(d));
    } catch {
      setError("Could not load progress. Pull down to retry.");
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

  // ── topPR — must live above ALL early returns (Rules of Hooks) ──
  const topPR: PersonalRecordData | undefined = useMemo(() => {
    const pr = data?.personalRecords?.[0];
    if (!pr) return undefined;

    const isBodyweight = pr.weightKg === 0;
    const history = pr.history.map((h: any, i: number) => ({
      label: i === pr.history.length - 1 ? "Today" : h.date.slice(5),
      value: isBodyweight ? h.reps : h.weightKg,
      isToday: i === pr.history.length - 1,
    }));

    const prev =
      pr.history.length >= 2 ? pr.history[pr.history.length - 2] : null;
    const current = pr.history[pr.history.length - 1];
    const improvement = prev
      ? isBodyweight
        ? current.reps - prev.reps
        : current.weightKg - prev.weightKg
      : 0;

    return {
      exerciseName: pr.exerciseName,
      value: isBodyweight ? pr.reps : pr.weightKg,
      unit: isBodyweight ? "REPS" : "KG",
      caption: pr.isNew ? "New Record" : "Personal Best",
      improvement,
      improvementUnit: isBodyweight ? "REPS" : "KG",
      isNewPR: pr.isNew ?? false,
      history,
      insight: {
        headline: "Keep it up! You're getting stronger.",
        body: "Consistency is building results.",
      },
    };
  }, [data?.personalRecords]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <View
        style={[
          styles.fill,
          { paddingTop: insets.top, backgroundColor: theme.bg },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing[4],
              paddingBottom: tabBarHeight + spacing[8],
            },
          ]}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.pageHeader}>
            <View style={{ gap: spacing[1] }}>
              <SPSkeleton width={80} height={11} />
              <SPSkeleton width={140} height={32} radius={radii.md} />
            </View>
            <SPSkeleton width={64} height={22} radius={radii.full} />
          </View>

          {/* Identity + Progression skeletons */}
          <SPSkeleton height={72} radius={radii.xl} />
          <SPSkeleton height={108} radius={radii.xl} />

          {/* All-time stats */}
          <View>
            <SPSkeleton
              width={60}
              height={11}
              style={{ marginBottom: spacing[2.5] }}
            />
            <View style={styles.statsRow}>
              <SPSkeleton height={96} radius={radii.xl} style={{ flex: 1 }} />
              <SPSkeleton height={96} radius={radii.xl} style={{ flex: 1 }} />
              <SPSkeleton height={96} radius={radii.xl} style={{ flex: 1 }} />
            </View>
          </View>

          {/* Smart Metrics */}
          <View style={{ gap: spacing[3] }}>
            <SPSkeleton width="45%" height={13} />
            <SPSkeleton height={180} radius={radii.xl} />
          </View>

          {/* 2-col row */}
          <View style={styles.twoColRow}>
            <SPSkeleton height={140} radius={radii.xl} style={{ flex: 1 }} />
            <SPSkeleton height={140} radius={radii.xl} style={{ flex: 1 }} />
          </View>

          {/* Month / Body Split / PRs */}
          <View style={styles.twoColRow}>
            <SPSkeleton height={180} radius={radii.xl} style={{ flex: 1 }} />
            <SPSkeleton height={180} radius={radii.xl} style={{ flex: 1 }} />
          </View>

          {/* Session history */}
          <View style={{ gap: spacing[2.5] }}>
            <SPSkeleton
              width="45%"
              height={13}
              style={{ marginBottom: spacing[1] }}
            />
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.historyCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <SPSkeleton width={40} height={40} radius={radii.md} />
                <View style={{ flex: 1, gap: spacing[1.5] }}>
                  <SPSkeleton width="60%" height={13} />
                  <SPSkeleton width="40%" height={11} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View
        style={[
          styles.fill,
          styles.centerContent,
          { backgroundColor: theme.bg },
        ]}
      >
        <SPText variant="caption" center style={{ opacity: 0.5 }}>
          {error ?? "No data available."}
        </SPText>
      </View>
    );
  }

  const {
    userPlan,
    headerStats,
    personalRecords,
    thisMonth,
    lastMonth,
    currentMonthName,
    prevMonthName,
    bodySplit,
    sessionHistory,
    dashboardData,
    identity,
    activePlanInstanceId,
    progression,
  } = data;

  const planCfg = PLAN_BADGE[userPlan] ?? PLAN_BADGE.FREE;
  const isPro = userPlan === "PRO";

  const visibleHistory = sessionHistory.slice(0, historyLimit);

  // Map existing SessionItem shape -> SessionHistoryCard's shape.
  // NOTE: `durationMinutes` and `status` aren't on SessionItem yet — once
  // the dashboard route surfaces them (duration already exists on
  // WorkoutLog), drop the `as any` casts and add the fields to the type.
  const historyItems: SessionHistoryItem[] = visibleHistory.map((s) => ({
    key: s.key,
    name: s.focus,
    focusLabel: s.planName,
    date: s.completedAt,
    durationMinutes: (s as any).durationMinutes ?? 0,
    volumeKg: s.totalVolume,
    status: (s as any).status ?? "completed",
    onPress: () =>
      router.push(
        `/progress/history/${s.instanceId}/${s.sessionNumber}` as any,
      ),
  }));

  return (
    <View
      style={[
        styles.fill,
        { paddingTop: insets.top, backgroundColor: theme.bg },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing[4],
            paddingBottom: tabBarHeight + spacing[8],
          },
        ]}
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
        {/* ── 1. Page Header ── */}
        <View style={styles.pageHeader}>
          <View style={{ gap: spacing[1] }}>
            <SPText
              variant="label"
              style={{ opacity: 0.5, fontSize: 11, letterSpacing: 1 }}
            >
              YOUR PROGRESS
            </SPText>
            <SPText variant="h1">Dashboard</SPText>
          </View>
          <SPBadge variant={planCfg.variant}>{planCfg.label}</SPBadge>
        </View>

        {/* ── 2. Deload Banner (conditional) ── */}
        {progression?.deloadRequired && <DeloadBanner />}

        {/* ── 3. Identity Card ── */}
        {identity && (
          <IdentityCard
            identity={identity}
            onPress={() => router.push("/settings/identity" as any)}
          />
        )}

        {/* ── 4. Progression Card ── */}
        {progression && activePlanInstanceId && (
          <ProgressionCard
            progression={progression}
            onPress={() =>
              router.push(
                `/training/progression/${activePlanInstanceId}` as any,
              )
            }
          />
        )}

        {/* ── 5. All-time stats ── */}
        <View>
          <View style={allTimeStyles.header}>
            <SPText
              variant="label"
              style={{
                fontSize: 9,
                letterSpacing: 1.4,
                opacity: 0.4,
                textTransform: "uppercase",
              }}
            >
              All Time
            </SPText>
            <View style={[allTimeStyles.pill, { borderColor: theme.border }]}>
              <SPText
                variant="caption"
                style={{ fontSize: 9, opacity: 0.4, letterSpacing: 0.6 }}
              >
                since day one
              </SPText>
            </View>
          </View>
          <View style={allTimeStyles.row}>
            <StatCard
              lucideIcon={Dumbbell}
              label="Workouts"
              value={String(headerStats.totalWorkouts)}
              sub="Sessions"
            />
            <StatCard
              lucideIcon={Layers}
              label="Volume"
              value={formatVolume(headerStats.totalVolumeKg)}
              sub="Total Volume"
            />
            <StatCard
              lucideIcon={Flame}
              label="Streak"
              value={
                headerStats.currentStreak != null
                  ? String(headerStats.currentStreak)
                  : "0"
              }
              sub="Week streak"
            />
          </View>
        </View>

        {isPro ? (
          <>
            {/* ── 6. Smart Metrics ── */}
            {dashboardData && (
              <View>
                <SectionHeader title="Smart Metrics" />
                <SmartMetrics data={dashboardData} />
              </View>
            )}

            {/* ── 7. Two-col: Strength + Volume ── */}
            {dashboardData && (
              <View style={styles.twoColRow}>
                <StrengthTrendsCard trends={dashboardData.strengthTrends} />
                <VolumeByMuscleCard data={dashboardData.volumeByMuscle} />
              </View>
            )}

            {/* ── 8. Month Compare + Body Split ── */}
            <View style={isNarrow ? styles.oneColStack : styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <SectionHeader title="Monthly" />
                <MonthCompareChart
                  thisMonth={thisMonth}
                  lastMonth={lastMonth}
                  currentMonthName={currentMonthName}
                  prevMonthName={prevMonthName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SectionHeader title="Body Split" />
                <BodySplitCard
                  bodySplit={bodySplit}
                  theme={theme}
                  isDark={isDark}
                />
              </View>
            </View>

            {/* ── 9. PRs (Pro only) ── */}
            {personalRecords.length > 0 && (
              <View>
                <SectionHeader title="Personal Records" />
                <PersonalRecordCard
                  state={loading ? "loading" : topPR ? "populated" : "empty"}
                  data={topPR}
                  onInsightPress={() => router.push("/progress/history" as any)}
                />
              </View>
            )}

            {/* ── 10. Session History (Pro only) ── */}
            <View>
              <SessionHistoryCard
                items={historyItems}
                onViewAll={
                  sessionHistory.length > 6
                    ? () => router.push("/progress/history" as any)
                    : undefined
                }
              />

              {sessionHistory.length > historyLimit && (
                <Pressable
                  onPress={() => setHistoryLimit((l) => l + 10)}
                  style={{
                    alignItems: "center",
                    paddingVertical: spacing[3],
                  }}
                >
                  <SPText variant="tag" accent>
                    Load More ↓
                  </SPText>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <>
            {/* ── Free: Month Compare + Body Split ── */}
            <View style={isNarrow ? styles.oneColStack : styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <SectionHeader title="Monthly" />
                <MonthCompareChart
                  thisMonth={thisMonth}
                  lastMonth={lastMonth}
                  currentMonthName={currentMonthName}
                  prevMonthName={prevMonthName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SectionHeader title="Body Split" />
                <BodySplitCard
                  bodySplit={bodySplit}
                  theme={theme}
                  isDark={isDark}
                />
              </View>
            </View>

            {/* ── Free: locked gate at the bottom ── */}
            <LockedUpgradeGate
              onUpgrade={() => router.push("/pricing" as any)}
            />
          </>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

// ─── Body Split ───────────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Chest",
  BACK: "Back",
  LEGS: "Legs",
  SHOULDERS: "Shoulders",
  ARMS: "Arms",
  CORE: "Core",
  UPPER: "Upper Body",
  LOWER: "Lower Body",
  FULLBODY: "Full Body",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getMuscleColors(accent: string): Record<string, string> {
  return {
    CHEST: accent,
    BACK: "#86efac",
    LEGS: "#60a5fa",
    SHOULDERS: "#c084fc",
    ARMS: "#fbbf24",
    CORE: "#34d399",
    UPPER: accent,
    LOWER: "#86efac",
    FULLBODY: "#c084fc",
  };
}

// Filled donut wedge: outer arc forward, inner arc backward, closed
function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const r = (d: number) => (d * Math.PI) / 180;
  const s = r(startDeg);
  const e = r(endDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  const ox1 = cx + outerR * Math.cos(s),
    oy1 = cy + outerR * Math.sin(s);
  const ox2 = cx + outerR * Math.cos(e),
    oy2 = cy + outerR * Math.sin(e);
  const ix1 = cx + innerR * Math.cos(e),
    iy1 = cy + innerR * Math.sin(e);
  const ix2 = cx + innerR * Math.cos(s),
    iy2 = cy + innerR * Math.sin(s);
  return `M${ox1} ${oy1} A${outerR} ${outerR} 0 ${lg} 1 ${ox2} ${oy2} L${ix1} ${iy1} A${innerR} ${innerR} 0 ${lg} 0 ${ix2} ${iy2}Z`;
}

function BodySplitDonut({
  slices,
  colorMap,
  size,
  theme,
}: {
  slices: { group: string; percent: number }[];
  colorMap: Record<string, string>;
  size: number;
  theme: any;
}) {
  const cx = size / 2,
    cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.6;
  const GAP = 2.5;
  const total = slices.reduce((s, sl) => s + sl.percent, 0) || 1;
  let cursor = -90;

  const wedges = slices
    .filter((sl) => sl.percent > 0)
    .map(({ group, percent }) => {
      const sweep = (percent / total) * 360;
      const start = cursor + GAP / 2;
      const end = cursor + sweep - GAP / 2;
      cursor += sweep;
      return end > start
        ? {
            d: donutSlicePath(cx, cy, outerR, innerR, start, end),
            color: colorMap[group] ?? theme.accent,
            group,
          }
        : null;
    })
    .filter(Boolean) as { d: string; color: string; group: string }[];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* background track */}
      <Path
        d={donutSlicePath(cx, cy, outerR, innerR, -90, 269.9)}
        fill={theme.surface ?? "#1A1D20"}
      />
      {wedges.map(({ d, color, group }) => (
        <Path key={group} d={d} fill={color} />
      ))}
    </Svg>
  );
}

function BodySplitCard({
  bodySplit,
  theme,
  isDark,
}: {
  bodySplit: BodySplitItem[];
  theme: any;
  isDark: boolean;
}) {
  const colorMap = getMuscleColors(theme.accent);
  const nowMonth = MONTHS[new Date().getMonth()];
  const [selectedMonth, setSelectedMonth] = useState(nowMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  if (bodySplit.length === 0) {
    return (
      <SPCard variant="default" padding={spacing[4]} style={{ flex: 1 }}>
        <SPText variant="caption" center>
          Complete workouts to see your training distribution.
        </SPText>
      </SPCard>
    );
  }

  const sorted = [...bodySplit].sort((a, b) => b.percent - a.percent);

  return (
    <SPCard
      variant="default"
      padding={spacing[4]}
      style={{ flex: 1, gap: spacing[3] }}
    >
      {/* ── Header: title + month selector ── */}
      <View style={splitStyles.cardHeader}>
        <SPText
          variant="caption"
          style={{
            fontFamily: fonts.brandBold,
            fontSize: 11,
            letterSpacing: 1.2,
            color: theme.muted,
            textTransform: "uppercase",
          }}
        >
          Body Split
        </SPText>
        <Pressable
          onPress={() => setShowMonthPicker((v) => !v)}
          style={splitStyles.monthPill}
        >
          <SPText
            variant="caption"
            style={{
              fontFamily: fonts.brandMedium,
              fontSize: 12,
              color: theme.text,
              marginRight: 3,
            }}
          >
            {selectedMonth}
          </SPText>
          <SPText
            variant="caption"
            style={{ fontSize: 10, color: theme.muted }}
          >
            ▾
          </SPText>
        </Pressable>
      </View>

      {/* ── Month picker dropdown ── */}
      {showMonthPicker && (
        <View
          style={[
            splitStyles.monthDropdown,
            {
              backgroundColor: theme.card ?? "#161A1E",
              borderColor: theme.border,
            },
          ]}
        >
          {MONTHS.map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setSelectedMonth(m);
                setShowMonthPicker(false);
              }}
              style={[
                splitStyles.monthOption,
                m === selectedMonth && { backgroundColor: theme.accent + "22" },
              ]}
            >
              <SPText
                variant="caption"
                style={{
                  fontSize: 12,
                  fontFamily:
                    m === selectedMonth ? fonts.brandBold : fonts.brandRegular,
                  color: m === selectedMonth ? theme.accent : theme.text,
                }}
              >
                {m}
              </SPText>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Donut + legend ── */}
      <View style={splitStyles.row}>
        <View style={splitStyles.donutWrap}>
          <BodySplitDonut
            slices={sorted}
            colorMap={colorMap}
            size={118}
            theme={theme}
          />
        </View>

        <View style={splitStyles.legend}>
          {sorted.map(({ group, percent }, i) => {
            const color = colorMap[group] ?? theme.accent;
            const label = MUSCLE_LABELS[group] ?? group;
            return (
              <View key={group} style={splitStyles.legendRow}>
                <View
                  style={[splitStyles.legendDot, { backgroundColor: color }]}
                />
                <SPText
                  variant="bodyMd"
                  style={{
                    flex: 1,
                    fontFamily: i === 0 ? fonts.brandBold : fonts.brandMedium,
                    fontSize: 12,
                    color: i === 0 ? theme.text : theme.muted,
                  }}
                >
                  {label}
                </SPText>
                <SPText
                  variant="caption"
                  style={{
                    fontFamily: fonts.brandBold,
                    fontSize: 12,
                    color: percent > 0 ? color : theme.muted,
                    minWidth: 34,
                    textAlign: "right",
                  }}
                >
                  {percent}%
                </SPText>
              </View>
            );
          })}
        </View>
      </View>
    </SPCard>
  );
}

const splitStyles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  monthDropdown: {
    position: "absolute",
    top: 44,
    right: spacing[4],
    zIndex: 99,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    width: 210,
    elevation: 8,
  },
  monthOption: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  donutWrap: {
    flexShrink: 0,
  },
  legend: {
    flex: 1,
    gap: spacing[2],
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing[6],
  },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  statsRow: {
    flexDirection: "row",
    gap: spacing[2.5],
  },

  twoColRow: {
    flexDirection: "row",
    gap: spacing[3],
    alignItems: "flex-start",
  },

  oneColStack: {
    flexDirection: "column",
    gap: spacing[6],
  },

  prScroll: {
    gap: spacing[3],
    paddingRight: spacing[5],
  },

  // Session history
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[4],
    gap: spacing[3],
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: borders.thin,
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: { flex: 1, gap: 2 },
});

{
  /* ── 5. All-time styles ── */
}

const allTimeStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  pill: {
    borderWidth: borders.thin,
    borderRadius: 20,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
  },
  row: {
    flexDirection: "row",
    gap: spacing[2.5],
  },
});
