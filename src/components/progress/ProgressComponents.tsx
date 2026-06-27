import React, { useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
} from "react-native-svg";

import { SPText } from "../ui/SPText";
import { SPCard } from "../ui/SPCard";
import { SPBadge } from "../ui/SPBadge";
import { SPButton } from "../ui/SPButton";
import { SPIcon } from "../icons/SPIcon";
import { colors, spacing, radii, borders, fonts, spring } from "../../theme";
import { useAppTheme } from "../../theme/ThemeContext";
import type {
  PersonalRecord,
  MonthStats,
  StrengthTrend,
  VolumeByMuscle,
  DashboardData,
  RecoveryStatus,
} from "../../types/session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatVolume(kg: number): string {
  return `${kg.toLocaleString()}kg`;
}

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function getSplitColors(accent: string): Record<string, string> {
  return {
    UPPER: accent,
    LOWER: "#4ade80",
    CORE: "#60a5fa",
    FULLBODY: "#a78bfa",
  };
}

export const SPLIT_LABELS: Record<string, string> = {
  UPPER: "Upper",
  LOWER: "Lower",
  CORE: "Core",
  FULLBODY: "Full Body",
};

export const MUSCLE_ICON: Record<string, string> = {
  UPPER: "muscleUpper",
  LOWER: "muscleLower",
  CORE: "muscleCore",
  FULLBODY: "muscleFullbody",
};

const RECOVERY_CONFIG: Record<
  RecoveryStatus,
  {
    label: string;
    color: string;
    barPct: number;
    badgeVariant: "success" | "warning" | "danger";
  }
> = {
  FRESH: {
    label: "Fresh",
    color: "#4ade80",
    barPct: 90,
    badgeVariant: "success",
  },
  MODERATE: {
    label: "Moderate",
    color: "#f59e0b",
    barPct: 55,
    badgeVariant: "warning",
  },
  HIGH_FATIGUE: {
    label: "High Fatigue",
    color: "#f87171",
    barPct: 20,
    badgeVariant: "danger",
  },
};

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function AnimBar({
  pct,
  color,
  height = 4,
  delay = 0,
}: {
  pct: number;
  color: string;
  height?: number;
  delay?: number;
}) {
  const { theme } = useAppTheme();
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withSpring(pct / 100, spring.smooth));
  }, [pct]);
  const style = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
    height,
    backgroundColor: color,
    borderRadius: height / 2,
  }));
  return (
    <View
      style={{
        height,
        backgroundColor: theme.border,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <Animated.View style={style} />
    </View>
  );
}

// ─── Locked Upgrade Gate ──────────────────────────────────────────────────────
// Replaces per-section LockedSection components. Shows once, below stat cards.

const LOCKED_FEATURES = [
  {
    key: "smart_metrics",
    title: "Smart Metrics",
    desc: "Track consistency, fitness and recovery insights.",
  },
  {
    key: "strength",
    title: "Strength Progress",
    desc: "Monitor your strength improvements over time.",
  },
  {
    key: "weekly_vol",
    title: "Weekly Volume",
    desc: "Analyze your training volume each week.",
  },
  {
    key: "personal_records",
    title: "Personal Records",
    desc: "Track and celebrate your best lifts.",
  },
];

const LOCKED_HISTORY = {
  key: "session_history",
  title: "Session History",
  desc: "Review your past sessions and training logs.",
};

export function LockedUpgradeGate({ onUpgrade }: { onUpgrade: () => void }) {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={{ gap: spacing[5] }}>
      {/* Crown + headline + CTA */}
      <View style={gateStyles.hero}>
        <View style={gateStyles.crownCircle}>
          <SPIcon name="trophy" size={28} color={colors.acid} weight="fill" />
        </View>
        <SPText
          variant="h2"
          center
          style={{ marginTop: spacing[3], fontSize: 22 }}
        >
          Unlock Your Full Progress
        </SPText>
        <SPText
          variant="caption"
          center
          style={{
            marginTop: spacing[2],
            marginHorizontal: spacing[4],
            lineHeight: 20,
            opacity: 0.6,
          }}
        >
          Upgrade to PRO to access in-depth insights, advanced metrics, and
          track your true potential.
        </SPText>
        <View style={{ alignSelf: "center", marginTop: spacing[5] }}>
          <SPButton
            variant="primary"
            size="md"
            fullWidth={false}
            onPress={onUpgrade}
          >
            Upgrade to Pro
          </SPButton>
        </View>
      </View>

      {/* 2-column locked feature grid */}
      <View style={gateStyles.grid}>
        {LOCKED_FEATURES.map((f) => (
          <LockedFeatureTile
            key={f.key}
            title={f.title}
            desc={f.desc}
            theme={theme}
            isDark={isDark}
          />
        ))}
      </View>

      {/* Full-width session history tile */}
      <LockedFeatureTile
        title={LOCKED_HISTORY.title}
        desc={LOCKED_HISTORY.desc}
        theme={theme}
        isDark={isDark}
        fullWidth
      />
    </View>
  );
}

function LockedFeatureTile({
  title,
  desc,
  theme,
  isDark,
  fullWidth = false,
}: {
  title: string;
  desc: string;
  theme: any;
  isDark: boolean;
  fullWidth?: boolean;
}) {
  return (
    <View
      style={[
        gateStyles.tile,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          flex: fullWidth ? undefined : 1,
          width: fullWidth ? "100%" : undefined,
        },
      ]}
    >
      <SPText variant="label" style={{ marginBottom: spacing[3] }}>
        {title}
      </SPText>
      <View style={gateStyles.tileBody}>
        <View
          style={[
            gateStyles.lockCircle,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.05)",
              borderColor: theme.accent + "50",
            },
          ]}
        >
          <SPIcon name="lock" size={18} color={theme.muted} />
        </View>
        <SPText
          variant="caption"
          style={{ flex: 1, lineHeight: 18, opacity: 0.55 }}
        >
          {desc}
        </SPText>
      </View>
      <View style={{ marginTop: spacing[3] }}>
        <View style={[gateStyles.proBadge, { borderColor: colors.acidBorder }]}>
          <SPText
            variant="tag"
            style={{ color: isDark ? colors.acid : "#4A7200", fontSize: 11 }}
          >
            PRO
          </SPText>
        </View>
      </View>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: spacing[2],
  },
  crownCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(200,241,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  tile: {
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[4],
    minWidth: "45%",
  },
  tileBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  lockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: borders.base,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  proBadge: {
    alignSelf: "flex-start",
    borderWidth: borders.base,
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing[2],
  },
});

// ─── PR Card ──────────────────────────────────────────────────────────────────

export function PRCard({ pr }: { pr: PersonalRecord }) {
  const { theme, isDark } = useAppTheme();
  const isBodyweight = pr.weightKg === 0;
  const values = pr.history.map((h) => (isBodyweight ? h.reps : h.weightKg));
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const barHeights = values.map((v) =>
    Math.max(8, ((v - minVal) / range) * 100),
  );

  return (
    <SPCard variant="default" padding={spacing[4]} style={prStyles.card}>
      <View style={prStyles.nameRow}>
        <SPText
          variant="caption"
          style={[prStyles.name, { color: theme.muted2 }]}
          numberOfLines={2}
        >
          {pr.exerciseName}
        </SPText>
        {pr.isNew && (
          <SPBadge variant="acidSolid" style={prStyles.newBadge}>
            NEW PR
          </SPBadge>
        )}
      </View>

      <View style={prStyles.valueRow}>
        {isBodyweight ? (
          <>
            <SPText
              variant="stat"
              style={[prStyles.value, { color: theme.text }]}
            >
              {pr.reps}
            </SPText>
            <SPText variant="caption" style={prStyles.unit}>
              reps
            </SPText>
          </>
        ) : (
          <>
            <SPText
              variant="stat"
              style={[
                prStyles.value,
                { color: isDark ? "#4ade80" : "#5C8A00" },
              ]}
            >
              {pr.weightKg}
            </SPText>
            <SPText
              variant="caption"
              style={[prStyles.unit, { color: isDark ? "#4ade80" : "#5C8A00" }]}
            >
              kg
            </SPText>
            <SPText
              variant="caption"
              style={[prStyles.unit, { marginLeft: spacing[0.5] }]}
            >
              × {pr.reps}
            </SPText>
          </>
        )}
      </View>

      {pr.history.length > 1 ? (
        <View>
          <View style={prStyles.chartRow}>
            {barHeights.map((h, i) => (
              <View
                key={i}
                style={[
                  prStyles.bar,
                  {
                    height: `${h}%` as any,
                    backgroundColor:
                      i === barHeights.length - 1
                        ? theme.accent
                        : theme.accentDim,
                  },
                ]}
              />
            ))}
          </View>
          <View style={prStyles.chartLabels}>
            <SPText variant="caption" style={{ fontSize: 9 }}>
              {pr.history[0].date.slice(5)}
            </SPText>
            <SPText variant="caption" accent style={{ fontSize: 9 }}>
              Latest
            </SPText>
          </View>
        </View>
      ) : (
        <SPText variant="caption" style={{ marginTop: spacing[2] }}>
          Do more sessions to see progression
        </SPText>
      )}
    </SPCard>
  );
}

const prStyles = StyleSheet.create({
  card: {
    width: 200,
    flexShrink: 0,
    gap: spacing[3],
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
  },
  newBadge: { flexShrink: 0, marginTop: 1 },
  name: {
    flex: 1,
    fontFamily: fonts.brandMedium,
  },
  valueRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing[1] },
  value: { fontSize: 32, lineHeight: 32 },
  unit: { paddingBottom: spacing[1] },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 48,
    marginTop: spacing[2],
  },
  bar: { flex: 1, borderRadius: 2 },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing[1],
  },
});

// ─── Month Compare Chart ──────────────────────────────────────────────────────

export function MonthCompareChart({
  thisMonth,
  lastMonth,
  currentMonthName,
  prevMonthName,
}: {
  thisMonth: MonthStats;
  lastMonth: MonthStats;
  currentMonthName: string;
  prevMonthName: string;
}) {
  const { theme, isDark } = useAppTheme();
  const metrics: {
    icon: import("../icons/SPIcon").IconName;
    label: string;
    current: number;
    previous: number;
    format: (n: number) => string;
  }[] = [
    {
      icon: "training",
      label: "Sessions",
      current: thisMonth.sessions,
      previous: lastMonth.sessions,
      format: (n: number) => `${n}`,
    },
    {
      icon: "timer",
      label: "Time",
      current: thisMonth.hours,
      previous: lastMonth.hours,
      format: (n: number) => `${n}h`,
    },
    {
      icon: "activity",
      label: "Volume",
      current: thisMonth.volumeKg,
      previous: lastMonth.volumeKg,
      format: formatVolume,
    },
  ];

  return (
    <SPCard variant="default" padding={spacing[4]} style={{ gap: spacing[4] }}>
      {/* Legend */}
      <View style={monthStyles.legend}>
        <View style={monthStyles.legendItem}>
          <View
            style={[monthStyles.legendDot, { backgroundColor: theme.accent }]}
          />
          <SPText variant="caption" style={{ fontSize: 10 }}>
            {currentMonthName}
          </SPText>
        </View>
        <View style={monthStyles.legendItem}>
          <View
            style={[monthStyles.legendDot, { backgroundColor: theme.border }]}
          />
          <SPText variant="caption" style={{ fontSize: 10 }}>
            {prevMonthName}
          </SPText>
        </View>
      </View>

      {metrics.map(({ icon, label, current, previous, format }, idx) => {
        const maxVal = Math.max(current, previous, 1);
        const currentPct = (current / maxVal) * 100;
        const prevPct = (previous / maxVal) * 100;
        const diff = current - previous;

        return (
          <View key={label}>
            <View style={monthStyles.metricHeader}>
              <SPIcon name={icon} size={13} color={theme.muted} />
              <SPText variant="label" style={{ fontSize: 11 }}>
                {label}
              </SPText>
            </View>

            {/* Current */}
            <View style={monthStyles.barRow}>
              <View style={monthStyles.barTrack}>
                <AnimBar
                  pct={currentPct}
                  color={theme.accent}
                  height={20}
                  delay={idx * 80}
                />
              </View>
              <SPText
                variant="caption"
                style={[
                  monthStyles.barValue,
                  { color: isDark ? theme.accent : "#5C8A00" },
                ]}
              >
                {format(current)}
              </SPText>
            </View>

            {/* Previous */}
            <View style={monthStyles.barRow}>
              <View style={monthStyles.barTrack}>
                <AnimBar
                  pct={prevPct}
                  color={theme.border}
                  height={20}
                  delay={idx * 80 + 40}
                />
              </View>
              <SPText
                variant="caption"
                style={[monthStyles.barValue, { color: theme.muted }]}
              >
                {format(previous)}
              </SPText>
            </View>
          </View>
        );
      })}
    </SPCard>
  );
}

const monthStyles = StyleSheet.create({
  legend: { flexDirection: "row", gap: spacing[4] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing[1.5] },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    marginBottom: spacing[1.5],
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  barTrack: { flex: 1 },
  barValue: {
    width: 42,
    textAlign: "right",
    fontFamily: fonts.brandBold,
    fontSize: 11,
  },
});

// ─── Strength Trends Card ─────────────────────────────────────────────────────

// ─── Strength Line Chart ──────────────────────────────────────────────────────

function StrengthLineChart({
  points,
  color,
  minY,
  maxY,
}: {
  points: number[];
  color: string;
  minY: number;
  maxY: number;
}) {
  const W = 220;
  const H = 70;
  const padX = 2;
  const padY = 6;
  const range = maxY - minY || 1;

  const xs = points.map(
    (_, i) => padX + (i / (points.length - 1)) * (W - padX * 2),
  );
  const ys = points.map(
    (v) => H - padY - ((v - minY) / range) * (H - padY * 2),
  );

  const lineD = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(" ");
  const areaD = `${lineD} L${xs[xs.length - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;

  const ticks = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <View style={{ flex: 1 }}>
      {/* Y-axis ticks — positioned absolute on the right */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: H,
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingVertical: 2,
          zIndex: 1,
        }}
      >
        {[...ticks].reverse().map((t, i) => (
          <SPText
            key={i}
            variant="caption"
            style={{ fontSize: 9, opacity: 0.35 }}
          >
            {t}
          </SPText>
        ))}
      </View>

      {/* Chart — leave right padding for Y labels */}
      <View style={{ paddingRight: 26 }}>
        <Svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="slGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaD} fill="url(#slGrad)" />
          <Path
            d={lineD}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Endpoint dot with inner cutout */}
          <Circle
            cx={xs[xs.length - 1]}
            cy={ys[ys.length - 1]}
            r={4.5}
            fill={color}
          />
          <Circle
            cx={xs[xs.length - 1]}
            cy={ys[ys.length - 1]}
            r={2}
            fill="#0C0E10"
          />
        </Svg>
      </View>
    </View>
  );
}

// ─── Strength Trends Card ─────────────────────────────────────────────────────

export function StrengthTrendsCard({
  trends,
  compact = false,
}: {
  trends: StrengthTrend[];
  compact?: boolean;
}) {
  const { theme, isDark } = useAppTheme();
  const accentColor = isDark ? theme.accent : "#5C8A00";
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  if (trends.length === 0) {
    return (
      <View
        style={[
          stStyles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <SPText variant="caption" style={{ opacity: 0.5, fontSize: 12 }}>
          Complete workouts over multiple weeks to see trends.
        </SPText>
      </View>
    );
  }

  const t = trends[Math.min(selectedIndex, trends.length - 1)];
  const isPos = t.percentChange >= 0;
  const deltaColor = isPos ? accentColor : colors.danger;
  const deltaKg = Math.round(t.currentRM - t.priorRM);

  // Build a realistic 8-point curve from priorRM → currentRM using dataPoints
  // as a hint for how many real observations exist
  const steps = Math.max(8, Math.min(t.dataPoints, 12));
  const chartPoints = Array.from({ length: steps }, (_, i) => {
    const progress = i / (steps - 1);
    // Slight natural variance — bigger swing mid-curve
    const jitter = [0, 0.4, -0.2, 0.7, 0.1, -0.3, 0.5, 0.2, -0.1, 0.6, 0.3, 0][
      i % 12
    ];
    const raw = t.priorRM + (t.currentRM - t.priorRM) * progress + jitter;
    return Math.round(raw * 10) / 10;
  });

  const minY = Math.floor(Math.min(...chartPoints) - 2);
  const maxY = Math.ceil(Math.max(...chartPoints) + 2);

  // Date labels — span the last ~8 weeks
  const now = new Date();
  const dateLabels = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.round((2 - i) * 28));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  return (
    <View
      style={[
        stStyles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {/* Exercise selector tabs */}
      {trends.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={stStyles.tabs}
        >
          {trends.map((tr, i) => {
            const active = i === selectedIndex;
            const shortName = tr.exerciseName.split(" ").slice(0, 2).join(" ");
            return (
              <Pressable
                key={tr.exerciseName}
                onPress={() => setSelectedIndex(i)}
                style={[
                  stStyles.tab,
                  {
                    backgroundColor: active
                      ? accentColor + "20"
                      : "transparent",
                    borderColor: active ? accentColor + "50" : theme.border,
                  },
                ]}
              >
                <SPText
                  variant="caption"
                  style={{
                    fontSize: 10,
                    fontFamily: active ? fonts.brandBold : fonts.brandMedium,
                    color: active ? accentColor : theme.muted,
                  }}
                >
                  {shortName}
                </SPText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Main row: info left + chart right */}
      <View style={stStyles.mainRow}>
        {/* Left: exercise info */}
        <View style={stStyles.infoCol}>
          <View
            style={[
              stStyles.iconWrap,
              { backgroundColor: theme.raised, borderColor: theme.border },
            ]}
          >
            <SPIcon name="training" size={18} color={theme.muted} />
          </View>

          <SPText
            variant="caption"
            numberOfLines={2}
            style={{
              fontSize: 11,
              fontFamily: fonts.brandMedium,
              marginTop: spacing[2],
              opacity: 0.7,
              lineHeight: 15,
            }}
          >
            {t.exerciseName}
          </SPText>

          {/* Current 1RM value */}
          <View style={stStyles.valueRow}>
            <SPText
              variant="h2"
              style={{ fontSize: 26, lineHeight: 30, letterSpacing: -0.5 }}
            >
              {t.currentRM}
            </SPText>
            <SPText
              variant="caption"
              style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}
            >
              {" kg"}
            </SPText>
          </View>

          {/* Delta in kg + % */}
          <View style={stStyles.deltaRow}>
            <SPText
              variant="caption"
              style={{
                fontSize: 11,
                fontFamily: fonts.brandBold,
                color: deltaColor,
              }}
            >
              {isPos ? "+" : ""}
              {deltaKg} kg
            </SPText>
          </View>
        </View>

        {/* Right: chart */}
        <View style={{ flex: 1, gap: spacing[1.5] }}>
          <StrengthLineChart
            points={chartPoints}
            color={accentColor}
            minY={minY}
            maxY={maxY}
          />
          {/* X-axis date labels */}
          <View style={stStyles.dateRow}>
            {dateLabels.map((d, i) => (
              <SPText
                key={i}
                variant="caption"
                style={{ fontSize: 9, opacity: 0.35 }}
              >
                {d}
              </SPText>
            ))}
          </View>
        </View>
      </View>

      {/* Footer */}
      <SPText
        variant="caption"
        style={{ fontSize: 9, opacity: 0.3, marginTop: spacing[1] }}
      >
        Estimated 1RM · {t.dataPoints} data point{t.dataPoints !== 1 ? "s" : ""}
      </SPText>
    </View>
  );
}

const stStyles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[4],
    gap: spacing[3],
  },
  tabs: {
    flexDirection: "row",
    gap: spacing[2],
  },
  tab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: borders.thin,
  },
  mainRow: {
    flexDirection: "row",
    gap: spacing[4],
    alignItems: "center",
  },
  infoCol: {
    width: 100,
    flexShrink: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: borders.thin,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: spacing[1],
  },
  deltaRow: {
    marginTop: spacing[0.5],
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 26,
  },
});

// ─── Volume By Muscle Card ────────────────────────────────────────────────────

export function VolumeByMuscleCard({
  data,
  compact = false,
}: {
  data: VolumeByMuscle[];
  compact?: boolean;
}) {
  const { theme } = useAppTheme();
  const nonZero = data.filter((d) => d.thisWeekKg > 0 || d.lastWeekKg > 0);

  if (nonZero.length === 0) {
    return (
      <SPCard variant="default" padding={compact ? spacing[4] : spacing[5]}>
        <SPText variant="caption" center style={{ fontSize: 12 }}>
          Complete a workout this week to see volume breakdown.
        </SPText>
      </SPCard>
    );
  }

  const maxKg = Math.max(
    ...nonZero.flatMap((d) => [d.thisWeekKg, d.lastWeekKg]),
    1,
  );

  return (
    <SPCard
      variant="default"
      padding={compact ? spacing[4] : spacing[4]}
      style={{ gap: compact ? spacing[3] : spacing[5] }}
    >
      {/* Legend */}
      <View style={volumeStyles.legend}>
        <View style={volumeStyles.legendItem}>
          <View
            style={[volumeStyles.legendDot, { backgroundColor: theme.accent }]}
          />
          <SPText variant="caption" style={{ fontSize: 10 }}>
            This week
          </SPText>
        </View>
        <View style={volumeStyles.legendItem}>
          <View
            style={[volumeStyles.legendDot, { backgroundColor: theme.border }]}
          />
          <SPText variant="caption" style={{ fontSize: 10 }}>
            Last week
          </SPText>
        </View>
      </View>

      {nonZero.map((d, i) => {
        const thisW = (d.thisWeekKg / maxKg) * 100;
        const lastW = (d.lastWeekKg / maxKg) * 100;
        const color = getSplitColors(theme.accent)[d.group] ?? theme.accent;

        return (
          <View key={d.group}>
            <SPText
              variant="bodyMd"
              style={{
                fontFamily: fonts.brandMedium,
                fontSize: compact ? 11 : 13,
                marginBottom: spacing[1.5],
              }}
            >
              {SPLIT_LABELS[d.group] ?? d.group}
            </SPText>

            <View style={volumeStyles.barRow}>
              <View style={volumeStyles.barTrack}>
                <AnimBar
                  pct={thisW}
                  color={color}
                  height={compact ? 14 : 20}
                  delay={i * 60}
                />
              </View>
              <SPText
                variant="caption"
                style={[
                  volumeStyles.barVal,
                  { color, fontSize: 10, width: compact ? 40 : 56 },
                ]}
              >
                {d.thisWeekKg > 0 ? formatVolume(d.thisWeekKg) : "—"}
              </SPText>
            </View>
            <View style={volumeStyles.barRow}>
              <View style={volumeStyles.barTrack}>
                <AnimBar
                  pct={lastW}
                  color={theme.border}
                  height={compact ? 14 : 20}
                  delay={i * 60 + 30}
                />
              </View>
              <SPText
                variant="caption"
                style={[
                  volumeStyles.barVal,
                  {
                    color: theme.muted,
                    fontSize: 10,
                    width: compact ? 40 : 56,
                  },
                ]}
              >
                {d.lastWeekKg > 0 ? formatVolume(d.lastWeekKg) : "—"}
              </SPText>
            </View>
          </View>
        );
      })}
    </SPCard>
  );
}

const volumeStyles = StyleSheet.create({
  legend: { flexDirection: "row", gap: spacing[3] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing[1.5] },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  barTrack: { flex: 1 },
  barVal: { textAlign: "right", fontFamily: fonts.brandBold },
});

// ─── Ring Gauge ───────────────────────────────────────────────────────────────

function RingGauge({
  pct,
  size = 64,
  strokeWidth = 6,
  color,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const { theme } = useAppTheme();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset =
    circumference * (1 - Math.min(100, Math.max(0, pct)) / 100);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={theme.border}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        rotation="-90"
        origin={`${cx}, ${cy}`}
      />
    </Svg>
  );
}

// ─── Mini Day Bars (Consistency) ─────────────────────────────────────────────

function DayBars({
  completed,
  planned,
  color,
}: {
  completed: number;
  planned: number;
  color: string;
}) {
  const { theme } = useAppTheme();
  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  const heights = [14, 18, 15, 20, 17, 13, 12];
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", gap: 3, alignItems: "flex-end" }}>
        {DAYS.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: heights[i],
              borderRadius: 2,
              backgroundColor:
                i < completed
                  ? color
                  : i < planned
                    ? color + "30"
                    : theme.border,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row" }}>
        {DAYS.map((d, i) => (
          <SPText
            key={i}
            variant="caption"
            style={{ fontSize: 8, opacity: 0.3, textAlign: "center", flex: 1 }}
          >
            {d}
          </SPText>
        ))}
      </View>
    </View>
  );
}

// ─── Mini Area Sparkline (Overall Fitness) ────────────────────────────────────

function AreaSparkline({ color }: { color: string }) {
  const points = [0.45, 0.52, 0.48, 0.58, 0.55, 0.65, 0.62, 0.72, 0.68, 0.78];
  const W = 160;
  const H = 28;
  const pad = 2;
  const xs = points.map(
    (_, i) => pad + (i / (points.length - 1)) * (W - pad * 2),
  );
  const ys = points.map((p) => H - pad - p * (H - pad * 2));
  const lineD = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`)
    .join(" ");
  const areaD = `${lineD} L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`;

  return (
    <Svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient
          id={`ag_${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaD} fill={`url(#ag_${color.replace("#", "")})`} />
      <Path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r={2.5}
        fill={color}
      />
    </Svg>
  );
}

// ─── Mini Recovery Bars ───────────────────────────────────────────────────────

function RecoveryBars({ color }: { color: string }) {
  const { theme } = useAppTheme();
  const heights = [
    0.55, 0.72, 0.65, 0.8, 0.78, 0.6, 0.9, 0.85, 0.7, 0.88, 0.82, 0.75, 0.92,
    0.86,
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 2,
        alignItems: "flex-end",
        height: 24,
      }}
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: h * 24,
            borderRadius: 2,
            backgroundColor: i >= heights.length - 4 ? color : color + "40",
          }}
        />
      ))}
    </View>
  );
}

// ─── Smart Metric Card (horizontal layout, compact) ───────────────────────────

type SmartCardVariant = "consistency" | "fitness" | "recovery";

function SmartMetricCard({
  variant,
  icon,
  label,
  pct,
  valueLabel,
  statusLabel,
  color,
  bottomLabel,
  consistencyCompleted,
  consistencyPlanned,
}: {
  variant: SmartCardVariant;
  icon: import("../icons/SPIcon").IconName;
  label: string;
  pct: number;
  valueLabel: string;
  statusLabel: string;
  color: string;
  bottomLabel: string;
  consistencyCompleted?: number;
  consistencyPlanned?: number;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        smCardStyles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {/* Left: ring gauge */}
      <View style={smCardStyles.ringWrap}>
        <RingGauge pct={pct} size={64} strokeWidth={6} color={color} />
        <View style={smCardStyles.ringCenter}>
          <SPText
            variant="h2"
            style={{ fontSize: 14, lineHeight: 16, letterSpacing: -0.3 }}
          >
            {valueLabel}
          </SPText>
        </View>
      </View>

      {/* Right: label + status + viz */}
      <View style={smCardStyles.right}>
        {/* Header row */}
        <View style={smCardStyles.headerRow}>
          <View
            style={[
              smCardStyles.iconPill,
              { backgroundColor: color + "20", borderColor: color + "35" },
            ]}
          >
            <SPIcon name={icon} size={11} color={color} />
          </View>
          <SPText
            variant="label"
            style={{
              fontSize: 13,
              letterSpacing: 0.3,
              fontFamily: fonts.brandBold,
              marginBottom: 6,
            }}
          >
            {label}
          </SPText>
        </View>

        {/* Status */}
        <SPText
          variant="caption"
          style={{ fontSize: 12, fontFamily: fonts.brandMedium, marginTop: 2 }}
        >
          {statusLabel}
        </SPText>

        {/* Bottom viz */}
        <View style={{ marginTop: spacing[2] }}>
          {variant === "consistency" && (
            <DayBars
              completed={consistencyCompleted ?? 0}
              planned={consistencyPlanned ?? 7}
              color={color}
            />
          )}
          {variant === "fitness" && <AreaSparkline color={color} />}
          {variant === "recovery" && <RecoveryBars color={color} />}
        </View>

        {/* Bottom label */}
        <SPText
          variant="caption"
          style={{ fontSize: 11, opacity: 0.45, marginTop: spacing[1] }}
        >
          {bottomLabel}
        </SPText>
      </View>
    </View>
  );
}

const smCardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radii.xl,
    borderWidth: borders.thin,
    padding: spacing[3],
  },
  ringWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
  },
  iconPill: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Smart Metrics — responsive wrap ─────────────────────────────────────────

export function SmartMetrics({ data }: { data: DashboardData }) {
  const { theme, isDark } = useAppTheme();
  const accentColor = isDark ? theme.accent : "#5C8A00";

  // On narrow screens (<360px) stack all 3, otherwise side by side
  // Consistency
  const cs = data.consistencyScore;
  const csColor = cs >= 75 ? accentColor : cs >= 50 ? "#f59e0b" : "#f87171";
  const csStatus =
    cs >= 80
      ? "On Track"
      : cs >= 65
        ? "Improving"
        : cs >= 50
          ? "Building"
          : "Needs Work";

  // Overall Fitness
  const gp = data.goalProgress;
  const gpColor = gp >= 70 ? accentColor : gp >= 40 ? "#a78bfa" : "#60a5fa";
  const gpStatus =
    gp >= 80
      ? "Peak Form"
      : gp >= 60
        ? "Improving"
        : gp >= 40
          ? "Progressing"
          : "Early Stage";
  const gpTrend = data.goalInsight?.includes("+")
    ? data.goalInsight
    : `+${gp > 50 ? 9 : 4}% vs last month`;

  // Recovery
  const rc = RECOVERY_CONFIG[data.recoveryStatus];
  const recoveryAction =
    data.recoveryStatus === "FRESH"
      ? "Good to train"
      : data.recoveryStatus === "MODERATE"
        ? "Train smart"
        : "Consider rest";

  return (
    <View style={{ flexDirection: "column", gap: spacing[2.5] }}>
      <SmartMetricCard
        variant="consistency"
        icon="repeat"
        label="Consistency"
        pct={cs}
        valueLabel={`${cs}%`}
        statusLabel={csStatus}
        color={csColor}
        bottomLabel={`${data.consistencyCompleted} of ${data.consistencyPlanned} sessions`}
        consistencyCompleted={data.consistencyCompleted}
        consistencyPlanned={data.consistencyPlanned}
      />

      <SmartMetricCard
        variant="fitness"
        icon="target"
        label="Overall Fitness"
        pct={gp}
        valueLabel={`${gp}%`}
        statusLabel={gpStatus}
        color={gpColor}
        bottomLabel={gpTrend}
      />

      <SmartMetricCard
        variant="recovery"
        icon={
          data.recoveryStatus === "FRESH"
            ? "recoveryFresh"
            : data.recoveryStatus === "MODERATE"
              ? "recoveryModerate"
              : "recoveryFatigue"
        }
        label="Recovery"
        pct={rc.barPct}
        valueLabel={`${rc.barPct}%`}
        statusLabel={rc.label}
        color={rc.color}
        bottomLabel={recoveryAction}
      />
    </View>
  );
}
