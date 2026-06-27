import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import {
  Dumbbell,
  Footprints,
  Crosshair,
  Accessibility,
  Sprout,
  TrendingUp,
  Crown,
  Lock,
  ChevronRight,
  Clock,
  BarChart2,
  Zap,
  Timer,
  AlertTriangle,
} from "lucide-react-native";

import { SPText } from "../components/ui/SPText";
import { SPButton } from "../components/ui/SPButton";
import { SPIcon } from "../components/icons/SPIcon";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { api } from "../lib/api";
import { CACHE_KEYS } from "../lib/cacheKeys";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  // Spacing
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  s48: 48,
  s56: 56,
  // Radius
  r8: 8,
  r12: 12,
  r16: 16,
  r20: 20,
  r24: 24,
  r28: 28,
  r32: 32,
  // Duration
  dur: 200,
  durMed: 300,
  durSlow: 420,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type MuscleGroup = "UPPER" | "LOWER" | "CORE" | "FULLBODY";
type CategoryFilter = MuscleGroup | "ALL";
type LockReason =
  | "trial_expired"
  | "cap_reached"
  | "equipment_required"
  | "upgrade_required"
  | "no_equipment_match";
type UserLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type Identity = "REBUILD" | "OPERATOR" | "EXECUTIVE_PERFORMANCE";

import type { IconName } from "../components/icons/SPIcon";

type LucideIconType = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  sessionDurationMin?: string | null;
  tier: "FREE" | "PRO";
  muscleGroup: MuscleGroup | null;
  requiresEquipment: boolean;
  difficulty: string | null;
  imageUrl?: string | null;
  exerciseCount?: number | null;
  coachingNote?: string | null;
  identityTarget?: Identity | null;
  goalTarget?: string | null;
  // Computed server-side, by fixed catalog position — NOT by activation
  // history. Exactly 4 bodyweight plans (and 2 declared-equipment plans
  // during trial) come back unlocked; everything past that cap is locked.
  locked: boolean;
  lockReason: LockReason | null;
}

interface AccessContext {
  isPro: boolean;
  isEquipment: boolean;
  hasActiveTrial: boolean;
  trialExpiresAt: string | null;
  activeEquipmentIds: string[];
  expiredEquipmentIds: string[];
  activePlanId: string | null;
  declaredEquipmentIds: string[];
}

interface ProgramsData {
  plans: WorkoutPlan[];
  access: AccessContext;
  declaredEquipmentName: string | null;
  userIdentity?: Identity | null;
}

// ─── Identity config ──────────────────────────────────────────────────────────
// Dark-mode colours are bright/neon by design (they sit on a near-black bg).
// Light-mode needs deeper, less saturated tones of the same hue or they glare
// on a light surface — same approach already used for theme.accent.

const IDENTITY_META: Record<
  Identity,
  {
    label: string;
    shortLabel: string;
    dark: { color: string; dimColor: string; borderColor: string };
    light: { color: string; dimColor: string; borderColor: string };
    icon: IconName;
  }
> = {
  REBUILD: {
    label: "Rebuild",
    shortLabel: "REBUILD",
    dark: {
      color: "#60A5FA",
      dimColor: "rgba(96,165,250,0.10)",
      borderColor: "rgba(96,165,250,0.25)",
    },
    light: {
      color: "#2563EB",
      dimColor: "rgba(37,99,235,0.08)",
      borderColor: "rgba(37,99,235,0.22)",
    },
    icon: "repeat",
  },
  OPERATOR: {
    label: "Operator",
    shortLabel: "OPERATOR",
    dark: {
      color: "#C8F135",
      dimColor: "rgba(200,241,53,0.08)",
      borderColor: "rgba(200,241,53,0.25)",
    },
    light: {
      color: "#5C8A00",
      dimColor: "rgba(92,138,0,0.08)",
      borderColor: "rgba(92,138,0,0.22)",
    },
    icon: "settings",
  },
  EXECUTIVE_PERFORMANCE: {
    label: "Executive Performance",
    shortLabel: "EXEC",
    dark: {
      color: "#F59E0B",
      dimColor: "rgba(245,158,11,0.10)",
      borderColor: "rgba(245,158,11,0.25)",
    },
    light: {
      color: "#B45309",
      dimColor: "rgba(180,83,9,0.08)",
      borderColor: "rgba(180,83,9,0.22)",
    },
    icon: "trophy",
  },
};

function getIdentityMeta(identity: Identity, isDark: boolean) {
  const meta = IDENTITY_META[identity];
  const palette = isDark ? meta.dark : meta.light;
  return {
    label: meta.label,
    shortLabel: meta.shortLabel,
    icon: meta.icon,
    ...palette,
  };
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: {
  value: CategoryFilter;
  label: string;
  icon: IconName;
  LucideIcon?: LucideIconType;
}[] = [
  { value: "ALL", label: "All", icon: "lightning" },
  {
    value: "UPPER",
    label: "Upper Body",
    icon: "muscleUpper",
    LucideIcon: Dumbbell,
  },
  {
    value: "LOWER",
    label: "Lower Body",
    icon: "muscleLower",
    LucideIcon: Footprints,
  },
  { value: "CORE", label: "Core", icon: "muscleCore", LucideIcon: Crosshair },
  {
    value: "FULLBODY",
    label: "Full Body",
    icon: "muscleFullbody",
    LucideIcon: Accessibility,
  },
];

const LEVELS: {
  key: UserLevel;
  label: string;
  desc: string;
  LucideIcon: LucideIconType;
}[] = [
  {
    key: "BEGINNER",
    label: "Beginner",
    desc: "New to training or returning after a break",
    LucideIcon: Sprout,
  },
  {
    key: "INTERMEDIATE",
    label: "Intermediate",
    desc: "Consistent training for 6+ months",
    LucideIcon: TrendingUp,
  },
  {
    key: "ADVANCED",
    label: "Advanced",
    desc: "2+ years of structured training",
    LucideIcon: Crown,
  },
];

const LOCK_LABEL: Record<LockReason, string> = {
  trial_expired: "Trial ended",
  cap_reached: "Limit reached",
  equipment_required: "Equipment required",
  upgrade_required: "Pro required",
  no_equipment_match: "Different gear needed",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLockReason(plan: WorkoutPlan): LockReason | null {
  return plan.locked ? plan.lockReason : null;
}

function getTrialUrgency(
  msLeft: number,
  daysLeft: number,
  isDark: boolean,
): { color: string; icon: IconName } {
  // Dark-mode colours are bright/neon by design; light-mode uses deeper,
  // less saturated tones of the same hue so they don't glare on a light bg.
  if (msLeft <= 0)
    return { color: isDark ? "#A855F7" : "#7E22CE", icon: "lock" };
  if (daysLeft === 0)
    return { color: isDark ? "#EF4444" : "#DC2626", icon: "fire" };
  if (daysLeft <= 3)
    return { color: isDark ? "#F59E0B" : "#B45309", icon: "warning" };
  return { color: isDark ? "#22C55E" : "#15803D", icon: "timer" };
}

function muscleGroupLabel(
  group: MuscleGroup | null,
  isActive: boolean,
): string {
  if (isActive) return "CURRENT";
  switch (group) {
    case "UPPER":
      return "UPPER BODY";
    case "LOWER":
      return "LOWER BODY";
    case "CORE":
      return "CORE";
    case "FULLBODY":
      return "FULL BODY";
    default:
      return "CONDITIONING";
  }
}

function difficultyLabel(d: string | null): string {
  if (!d) return "ALL LEVELS";
  return d.toUpperCase();
}

function sessionDurationLabel(plan: WorkoutPlan): string {
  if (plan.sessionDurationMin) return plan.sessionDurationMin + " MIN";
  const d = plan.difficulty?.toUpperCase();
  if (d === "BEGINNER") return "25–35 MIN";
  if (d === "ADVANCED") return "45–60 MIN";
  return "35–45 MIN";
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function PressableScale({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.975, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 22, stiffness: 320 });
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function SlideUp({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(20);
  useEffect(() => {
    const d = index * 60;
    opacity.value = withDelay(d, withTiming(1, { duration: T.durSlow }));
    y.value = withDelay(d, withSpring(0, { damping: 20, stiffness: 180 }));
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider({ color }: { color: string }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: color,
        marginVertical: T.s4,
      }}
    />
  );
}

// ─── Avatar placeholder ───────────────────────────────────────────────────────

function Avatar({ color, muted }: { color: string; muted: string }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: color + "40",
        backgroundColor: color + "14",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: muted + "80",
        }}
      />
    </View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────────────────

function ScreenHeader({ insetTop, theme }: { insetTop: number; theme: any }) {
  return (
    <View style={{ paddingTop: insetTop + T.s20, marginBottom: T.s8 }}>
      <View style={hdr.row}>
        <View style={{ flex: 1 }}>
          <SPText style={[hdr.eyebrow, { color: theme.muted }]}>
            Sporty Pulse Pro
          </SPText>
          <SPText style={[hdr.title, { color: theme.text }]}>Programs</SPText>
          <SPText style={[hdr.subtitle, { color: theme.muted2 }]}>
            Structured training for people who don't have time to waste.
          </SPText>
        </View>
        <Avatar color={theme.accent} muted={theme.muted} />
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: T.s16,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Barlow-Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: T.s8,
  },
  title: {
    fontSize: 38,
    fontFamily: "Barlow-Bold",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DM Sans",
    lineHeight: 20,
    marginTop: T.s8,
  },
});

// ─── Level Card (Identity Banner) ─────────────────────────────────────────────

function LevelCard({
  identity,
  onViewSettings,
  theme,
  isDark,
}: {
  identity: Identity;
  onViewSettings: () => void;
  theme: any;
  isDark: boolean;
}) {
  const meta = getIdentityMeta(identity, isDark);
  return (
    <SlideUp index={0}>
      <View
        style={[
          lc.card,
          { backgroundColor: theme.surface, borderColor: meta.borderColor },
        ]}
      >
        <View style={lc.top}>
          <View style={lc.emblemWrap}>
            <View style={[lc.emblemRing, { borderColor: meta.borderColor }]} />
            <View
              style={[
                lc.emblemCore,
                { backgroundColor: meta.dimColor, shadowColor: meta.color },
              ]}
            >
              <SPIcon
                name={meta.icon}
                size={20}
                color={meta.color}
                weight="fill"
              />
            </View>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <SPText style={[lc.eyebrow, { color: meta.color }]}>
              YOUR PROGRAM
            </SPText>
            <SPText
              style={[lc.title, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {meta.label.toUpperCase()}
            </SPText>
            <View style={[lc.taglineAccent, { backgroundColor: meta.color }]} />
            <SPText style={[lc.desc, { color: theme.muted2 }]}>
              Programs matched to your training identity.
            </SPText>
          </View>
        </View>

        <PressableScale onPress={onViewSettings}>
          <View style={[lc.pill, { borderColor: meta.borderColor }]}>
            <SPText style={[lc.pillText, { color: meta.color }]}>
              {meta.shortLabel}
            </SPText>
            <ChevronRight size={12} color={meta.color} strokeWidth={2.5} />
          </View>
        </PressableScale>
      </View>
    </SlideUp>
  );
}

function ProCard({ theme }: { theme: any }) {
  return (
    <SlideUp index={0}>
      <View
        style={[
          lc.card,
          { backgroundColor: theme.surface, borderColor: theme.accent + "25" },
        ]}
      >
        <View style={lc.top}>
          <View style={lc.emblemWrap}>
            <View
              style={[lc.emblemRing, { borderColor: theme.accent + "35" }]}
            />
            <View
              style={[
                lc.emblemCore,
                { backgroundColor: theme.accentDim, shadowColor: theme.accent },
              ]}
            >
              <Zap size={20} color={theme.accent} strokeWidth={2.5} />
            </View>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <SPText style={[lc.eyebrow, { color: theme.accent }]}>
              YOUR ACCESS
            </SPText>
            <SPText style={[lc.title, { color: theme.text }]}>
              PRO ACCESS
            </SPText>
            <View
              style={[lc.taglineAccent, { backgroundColor: theme.accent }]}
            />
            <SPText style={[lc.desc, { color: theme.muted2 }]}>
              All programs unlocked · No limits.
            </SPText>
          </View>
        </View>

        <View
          style={[
            lc.pill,
            {
              borderColor: theme.accent + "35",
              backgroundColor: theme.accentDim,
            },
          ]}
        >
          <SPText style={[lc.pillText, { color: theme.accent }]}>PRO</SPText>
        </View>
      </View>
    </SlideUp>
  );
}

const lc = StyleSheet.create({
  card: {
    gap: T.s16,
    padding: T.s16,
    borderRadius: T.r20,
    borderWidth: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s12,
  },
  emblemWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emblemRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
  },
  emblemCore: {
    width: 42,
    height: 42,
    borderRadius: T.r12,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Barlow-SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 19,
    fontFamily: "BarlowCondensed-Bold",
    letterSpacing: 0.4,
  },
  taglineAccent: {
    width: 22,
    height: 2,
    borderRadius: 1,
    marginTop: 3,
    marginBottom: 3,
  },
  desc: {
    fontSize: 12,
    fontFamily: "DM Sans",
    lineHeight: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: T.s12,
    paddingVertical: T.s8,
    borderRadius: T.r24,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontFamily: "Barlow-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

// ─── Tier Card (Trial / Expired / Starter / Cap) ─────────────────────────────

function TrialTierCard({
  trialExpiresAt,
  equipmentName,
  now,
  onUpgrade,
  theme,
  isDark,
}: {
  trialExpiresAt: string;
  equipmentName: string;
  now: number;
  onUpgrade: () => void;
  theme: any;
  isDark: boolean;
}) {
  const msLeft = new Date(trialExpiresAt).getTime() - now;
  const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000));
  const { color } = getTrialUrgency(msLeft, daysLeft, isDark);
  const label =
    daysLeft === 0 && msLeft > 0
      ? "Less than 1 day"
      : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  return (
    <SlideUp index={1}>
      <View
        style={[
          tc.card,
          { backgroundColor: color + "0E", borderColor: color + "30" },
        ]}
      >
        <View style={tc.row}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: T.s8,
                marginBottom: T.s6,
              }}
            >
              <SPText style={[tc.status, { color }]}>{label} left</SPText>
              <View
                style={[
                  tc.badge,
                  { backgroundColor: color + "20", borderColor: color + "30" },
                ]}
              >
                <SPText style={[tc.badgeText, { color }]}>TRIAL</SPText>
              </View>
            </View>
            <SPText style={[tc.desc, { color: theme.muted2 }]}>
              {equipmentName} · Upgrade to keep access after trial ends.
            </SPText>
          </View>
          <PressableScale onPress={onUpgrade}>
            <View style={[tc.cta, { backgroundColor: color }]}>
              <SPText style={[tc.ctaText, { color: "#fff" }]}>Upgrade</SPText>
              <ChevronRight size={13} color="#fff" strokeWidth={2.5} />
            </View>
          </PressableScale>
        </View>
      </View>
    </SlideUp>
  );
}

function ExpiredTierCard({
  onUpgrade,
  theme,
  isDark,
}: {
  onUpgrade: () => void;
  theme: any;
  isDark: boolean;
}) {
  const color = isDark ? "#A855F7" : "#7E22CE";
  return (
    <SlideUp index={1}>
      <View
        style={[
          tc.card,
          { backgroundColor: color + "0E", borderColor: color + "30" },
        ]}
      >
        <View style={tc.row}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: T.s8,
                marginBottom: T.s6,
              }}
            >
              <SPText style={[tc.status, { color }]}>Trial ended</SPText>
              <View
                style={[
                  tc.badge,
                  { backgroundColor: color + "20", borderColor: color + "30" },
                ]}
              >
                <SPText style={[tc.badgeText, { color }]}>EXPIRED</SPText>
              </View>
            </View>
            <SPText style={[tc.desc, { color: theme.muted2 }]}>
              Bodyweight programs are still free. Upgrade for full access.
            </SPText>
          </View>
          <PressableScale onPress={onUpgrade}>
            <View style={[tc.cta, { backgroundColor: color }]}>
              <SPText style={[tc.ctaText, { color: "#fff" }]}>Upgrade</SPText>
              <ChevronRight size={13} color="#fff" strokeWidth={2.5} />
            </View>
          </PressableScale>
        </View>
      </View>
    </SlideUp>
  );
}

function StarterTierCard({
  onUpgrade,
  theme,
}: {
  onUpgrade: () => void;
  theme: any;
}) {
  return (
    <SlideUp index={1}>
      <View
        style={[
          tc.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={tc.row}>
          <View style={{ flex: 1 }}>
            <SPText
              style={[tc.status, { color: theme.text, marginBottom: T.s6 }]}
            >
              Starter plan
            </SPText>
            <SPText style={[tc.desc, { color: theme.muted2 }]}>
              Bodyweight programs are free. Unlock equipment programs with Pro.
            </SPText>
          </View>
          <PressableScale onPress={onUpgrade}>
            <View style={[tc.cta, { backgroundColor: theme.accent }]}>
              <SPText style={[tc.ctaText, { color: theme.bg }]}>Go Pro</SPText>
              <ChevronRight size={13} color={theme.bg} strokeWidth={2.5} />
            </View>
          </PressableScale>
        </View>
      </View>
    </SlideUp>
  );
}

function CapTierCard({
  activeInstanceCount,
  programCap,
  onUpgrade,
  theme,
  isDark,
}: {
  activeInstanceCount: number;
  programCap: number;
  onUpgrade: () => void;
  theme: any;
  isDark: boolean;
}) {
  const isFull = activeInstanceCount >= programCap;
  const ratio = Math.min(activeInstanceCount / programCap, 1);
  const dangerColor = isDark ? "#EF4444" : "#DC2626";
  const warningColor = isDark ? "#F59E0B" : "#B45309";
  const barColor = isFull ? dangerColor : warningColor;
  const slotsLeft = programCap - activeInstanceCount;
  return (
    <SlideUp index={1}>
      <View
        style={[
          tc.card,
          {
            backgroundColor: isFull ? dangerColor + "10" : theme.surface,
            borderColor: isFull ? dangerColor + "30" : theme.border,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: T.s10,
          }}
        >
          <SPText
            style={[tc.status, { color: isFull ? dangerColor : theme.text }]}
          >
            {activeInstanceCount} of {programCap} programs active
          </SPText>
          <PressableScale onPress={onUpgrade}>
            <SPText
              style={{
                fontSize: 11,
                fontFamily: "Barlow-Bold",
                color: theme.accent,
                letterSpacing: 0.5,
              }}
            >
              GO PRO →
            </SPText>
          </PressableScale>
        </View>
        <View style={[tc.track, { backgroundColor: theme.raised }]}>
          <View
            style={[
              tc.fill,
              { width: `${ratio * 100}%` as any, backgroundColor: barColor },
            ]}
          />
        </View>
        <SPText style={[tc.desc, { color: theme.muted2, marginTop: T.s8 }]}>
          {isFull
            ? "Limit reached. Go Pro for unlimited active programs."
            : `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} remaining.`}
        </SPText>
      </View>
    </SlideUp>
  );
}

const tc = StyleSheet.create({
  card: {
    padding: T.s16,
    borderRadius: T.r20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s16,
  },
  status: {
    fontSize: 14,
    fontFamily: "Barlow-SemiBold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "DM Sans",
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: T.s8,
    paddingVertical: 3,
    borderRadius: T.r8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Barlow-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: T.s16,
    paddingVertical: T.s10,
    borderRadius: T.r24,
    justifyContent: "center",
    flexShrink: 0,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: "Barlow-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: 3, borderRadius: 2 },
});

// ─── Category Filters ─────────────────────────────────────────────────────────

function CategoryFilters({
  active,
  onSelect,
  theme,
}: {
  active: CategoryFilter;
  onSelect: (v: CategoryFilter) => void;
  theme: any;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={cf.scroll}
    >
      {CATEGORIES.map((cat) => {
        const selected = active === cat.value;
        const { LucideIcon } = cat;
        return (
          <Pressable
            key={cat.value}
            onPress={() => onSelect(cat.value)}
            style={[
              cf.pill,
              {
                backgroundColor: selected ? theme.accent : theme.surface,
                borderColor: selected ? theme.accent : theme.border,
              },
            ]}
          >
            {LucideIcon ? (
              <LucideIcon
                size={12}
                color={selected ? theme.bg : theme.muted2}
                strokeWidth={2.5}
              />
            ) : (
              <Zap
                size={12}
                color={selected ? theme.bg : theme.muted2}
                strokeWidth={2.5}
              />
            )}
            <SPText
              style={[cf.label, { color: selected ? theme.bg : theme.muted2 }]}
            >
              {cat.label}
            </SPText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const cf = StyleSheet.create({
  scroll: {
    flexDirection: "row",
    gap: T.s8,
    paddingVertical: T.s4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s6,
    paddingHorizontal: T.s14,
    paddingVertical: T.s8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 11,
    fontFamily: "Barlow-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

// ─── Identity Badge ───────────────────────────────────────────────────────────

function IdentityBadge({
  identity,
  isDark,
}: {
  identity: Identity;
  isDark: boolean;
}) {
  const meta = getIdentityMeta(identity, isDark);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: meta.dimColor,
        borderColor: meta.borderColor,
      }}
    >
      <SPIcon name={meta.icon} size={8} color={meta.color} weight="fill" />
      <SPText
        style={{
          fontSize: 8,
          fontFamily: "Barlow-Bold",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: meta.color,
        }}
      >
        {meta.shortLabel}
      </SPText>
    </View>
  );
}

// ─── Metadata Row ─────────────────────────────────────────────────────────────

function MetadataRow({
  plan,
  accentColor,
  mutedColor,
}: {
  plan: WorkoutPlan;
  accentColor: string;
  mutedColor: string;
}) {
  return (
    <View style={mr.row}>
      <View style={mr.item}>
        <Clock size={11} color={accentColor} strokeWidth={2.2} />
        <SPText style={[mr.text, { color: mutedColor }]}>
          {sessionDurationLabel(plan)}
        </SPText>
      </View>
      <View style={mr.dot} />
      <View style={mr.item}>
        <BarChart2 size={11} color={accentColor} strokeWidth={2.2} />
        <SPText style={[mr.text, { color: mutedColor }]}>
          {difficultyLabel(plan.difficulty)}
        </SPText>
      </View>
    </View>
  );
}

const mr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s4,
  },
  text: {
    fontSize: 10,
    fontFamily: "Barlow-SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({
  plan,
  isActive,
  onPress,
  index,
  loading,
  theme,
  isDark,
}: {
  plan: WorkoutPlan;
  isActive: boolean;
  onPress: () => void;
  index: number;
  loading?: boolean;
  theme: any;
  isDark: boolean;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cardHeight = isTablet
    ? 280
    : Math.min(Math.max(width * 0.48, 185), 255);
  const catLabel = muscleGroupLabel(plan.muscleGroup, isActive);

  return (
    <SlideUp index={index}>
      <PressableScale onPress={onPress} disabled={loading}>
        <View
          style={[
            pc.card,
            {
              height: cardHeight,
              backgroundColor: theme.surface,
              borderColor: isActive ? theme.accent + "50" : theme.border,
            },
          ]}
        >
          {/* Active left accent bar */}
          {isActive && (
            <View style={[pc.accentBar, { backgroundColor: theme.accent }]} />
          )}

          {/* Left: Image */}
          <View style={[pc.imageWrap, { width: isTablet ? "42%" : "44%" }]}>
            {plan.imageUrl ? (
              <Image
                source={{ uri: plan.imageUrl }}
                style={pc.image}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[pc.imagePlaceholder, { backgroundColor: theme.raised }]}
              />
            )}
            {/* Dark gradient overlay */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(8,10,12,0.28)",
              }}
            />
          </View>

          {/* Right: Content panel */}
          <View style={[pc.content, { backgroundColor: theme.surface }]}>
            {/* Top row: category badge + identity badge + arrow */}
            <View style={pc.topRow}>
              <View
                style={[
                  pc.catPill,
                  {
                    backgroundColor: isActive
                      ? theme.accent + "20"
                      : theme.surface2,
                    borderColor: isActive ? theme.accent + "45" : theme.border,
                  },
                ]}
              >
                <SPText
                  style={[
                    pc.catText,
                    { color: isActive ? theme.accent : theme.muted2 },
                  ]}
                >
                  {catLabel}
                </SPText>
              </View>
              {plan.identityTarget && (
                <IdentityBadge identity={plan.identityTarget} isDark={isDark} />
              )}
              <View style={pc.spacer} />
              <View style={[pc.arrowCircle, { borderColor: theme.border }]}>
                {loading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <ChevronRight
                    size={13}
                    color={theme.muted2}
                    strokeWidth={2}
                  />
                )}
              </View>
            </View>

            {/* Program name */}
            <View style={{ flex: 1, justifyContent: "center" }}>
              <SPText
                style={[pc.name, { color: theme.text }]}
                numberOfLines={2}
              >
                {plan.name}
              </SPText>
              {!!plan.description && (
                <SPText
                  style={[pc.desc, { color: theme.muted2 }]}
                  numberOfLines={2}
                >
                  {plan.description}
                </SPText>
              )}
            </View>

            {/* Bottom metadata */}
            <MetadataRow
              plan={plan}
              accentColor={isActive ? theme.accent : theme.muted}
              mutedColor={theme.muted2}
            />
          </View>
        </View>
      </PressableScale>
    </SlideUp>
  );
}

// ─── Locked Program Card ──────────────────────────────────────────────────────

function LockedProgramCard({
  plan,
  reason,
  onUpgrade,
  index,
  theme,
}: {
  plan: WorkoutPlan;
  reason: LockReason;
  onUpgrade: () => void;
  index: number;
  theme: any;
}) {
  const { width } = useWindowDimensions();
  const cardHeight = Math.min(Math.max(width * 0.44, 175), 240);

  return (
    <SlideUp index={index}>
      <PressableScale onPress={onUpgrade}>
        <View
          style={[
            pc.card,
            {
              height: cardHeight,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: 0.7,
            },
          ]}
        >
          {/* Left: Image — darkened */}
          <View style={[pc.imageWrap, { width: "44%" }]}>
            {plan.imageUrl ? (
              <Image
                source={{ uri: plan.imageUrl }}
                style={pc.image}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[pc.imagePlaceholder, { backgroundColor: theme.raised }]}
              />
            )}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.68)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.surface2,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={14} color={theme.muted} strokeWidth={2} />
              </View>
            </View>
          </View>

          {/* Right: Content */}
          <View style={[pc.content, { backgroundColor: theme.surface }]}>
            <View style={pc.topRow}>
              <View
                style={[
                  pc.catPill,
                  {
                    backgroundColor: theme.surface2,
                    borderColor: theme.border,
                  },
                ]}
              >
                <SPText style={[pc.catText, { color: theme.muted }]}>
                  {LOCK_LABEL[reason].toUpperCase()}
                </SPText>
              </View>
              <View style={pc.spacer} />
              <View style={[pc.arrowCircle, { borderColor: theme.border }]}>
                <Lock size={11} color={theme.muted} strokeWidth={2} />
              </View>
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <SPText
                style={[pc.name, { color: theme.muted }]}
                numberOfLines={2}
              >
                {plan.name}
              </SPText>
            </View>
            <MetadataRow
              plan={plan}
              accentColor={theme.muted}
              mutedColor={theme.muted}
            />
          </View>
        </View>
      </PressableScale>
    </SlideUp>
  );
}

const pc = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: T.r28,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2.5,
    zIndex: 2,
  },
  imageWrap: {
    height: "100%",
    position: "relative",
    backgroundColor: "#0A0A0A",
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { width: "100%", height: "100%" },
  content: {
    flex: 1,
    padding: T.s16,
    paddingBottom: T.s16,
    gap: T.s10,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s6,
  },
  spacer: { flex: 1 },
  catPill: {
    paddingHorizontal: T.s8,
    paddingVertical: 4,
    borderRadius: T.r8,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
  },
  catText: {
    fontSize: 8,
    fontFamily: "Barlow-Bold",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  name: {
    fontSize: 18,
    fontFamily: "Barlow-Bold",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 12,
    fontFamily: "DM Sans",
    lineHeight: 17,
    marginTop: T.s6,
  },
});

// ─── Level Picker Modal ───────────────────────────────────────────────────────

function LevelPickerModal({
  plan,
  selectedLevel,
  onLevelChange,
  onConfirm,
  onClose,
  loading,
  theme,
}: {
  plan: WorkoutPlan;
  selectedLevel: UserLevel;
  onLevelChange: (l: UserLevel) => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  theme: any;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          style={[
            mo.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + T.s32,
            },
          ]}
        >
          <View style={[mo.handle, { backgroundColor: theme.muted + "40" }]} />

          <SPText style={[mo.planLabel, { color: theme.muted2 }]}>
            {plan.name}
          </SPText>
          <SPText style={[mo.title, { color: theme.text }]}>
            Choose your level
          </SPText>
          <SPText style={[mo.subtitle, { color: theme.muted2 }]}>
            This sets the tempo, volume, and rest intervals.
          </SPText>

          <View style={{ gap: T.s8, marginBottom: T.s24, marginTop: T.s24 }}>
            {LEVELS.map((l) => {
              const active = selectedLevel === l.key;
              const { LucideIcon } = l;
              return (
                <PressableScale
                  key={l.key}
                  onPress={() => onLevelChange(l.key)}
                >
                  <View
                    style={[
                      mo.levelOpt,
                      {
                        backgroundColor: active
                          ? theme.accentDim
                          : theme.raised,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        mo.levelIcon,
                        {
                          backgroundColor: active
                            ? theme.accent + "20"
                            : theme.surface,
                          borderColor: active
                            ? theme.accent + "30"
                            : theme.border,
                        },
                      ]}
                    >
                      <LucideIcon
                        size={16}
                        color={active ? theme.accent : theme.muted}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <SPText
                        style={[
                          mo.levelName,
                          { color: active ? theme.accent : theme.text },
                        ]}
                      >
                        {l.label}
                      </SPText>
                      <SPText style={[mo.levelDesc, { color: theme.muted2 }]}>
                        {l.desc}
                      </SPText>
                    </View>
                    <View
                      style={[
                        mo.radio,
                        {
                          borderColor: active
                            ? theme.accent
                            : theme.muted + "60",
                        },
                      ]}
                    >
                      {active && (
                        <View
                          style={[
                            mo.radioDot,
                            { backgroundColor: theme.accent },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>

          <SPButton onPress={onConfirm} disabled={loading}>
            {loading ? "Starting…" : "Start Program"}
          </SPButton>

          <Pressable
            onPress={onClose}
            style={{ alignItems: "center", paddingVertical: T.s16 }}
          >
            <SPText
              style={{
                fontSize: 14,
                fontFamily: "Barlow-Regular",
                color: theme.muted,
              }}
            >
              Cancel
            </SPText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const mo = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: T.r28,
    borderTopRightRadius: T.r28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: T.s20,
    paddingTop: T.s20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: T.s24,
  },
  planLabel: {
    fontSize: 11,
    fontFamily: "Barlow-Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: T.s6,
  },
  title: {
    fontSize: 26,
    fontFamily: "Barlow-Bold",
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DM Sans",
    lineHeight: 18,
    marginTop: T.s6,
  },
  levelOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s12,
    padding: T.s16,
    borderRadius: T.r20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  levelIcon: {
    width: 38,
    height: 38,
    borderRadius: T.r12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  levelName: {
    fontSize: 15,
    fontFamily: "Barlow-SemiBold",
    marginBottom: 2,
  },
  levelDesc: {
    fontSize: 12,
    fontFamily: "DM Sans",
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ insetTop, theme }: { insetTop: number; theme: any }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    const tick = () => {
      opacity.value = withTiming(opacity.value < 0.38 ? 0.55 : 0.25, {
        duration: 750,
      });
    };
    tick();
    const id = setInterval(tick, 750);
    return () => clearInterval(id);
  }, []);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const bar = (h: number, w: string | number = "100%", r: number = T.r16) => (
    <View
      style={{
        height: h,
        width: w as any,
        borderRadius: r,
        backgroundColor: theme.raised,
      }}
    />
  );

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insetTop + T.s20,
        paddingHorizontal: T.s20,
        backgroundColor: theme.bg,
      }}
    >
      <Animated.View style={[{ gap: T.s20 }, pulse]}>
        {bar(14, "30%", 6)}
        {bar(42, "70%", T.r12)}
        {bar(70, "100%", T.r20)}
        {bar(240, "100%", T.r28)}
        {bar(240, "100%", T.r28)}
        {bar(240, "100%", T.r28)}
      </Animated.View>
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ count, theme }: { count: number; theme: any }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: T.s8,
        marginTop: T.s8,
      }}
    >
      <SPText
        style={{
          fontSize: 10,
          fontFamily: "Barlow-Bold",
          letterSpacing: 1.8,
          textTransform: "uppercase",
          color: theme.muted,
        }}
      >
        {count} Program{count !== 1 ? "s" : ""}
      </SPText>
      <View
        style={{
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.border,
        }}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  // `T.s48 + insets.bottom` only ever accounted for the safe-area inset,
  // not the floating SPTabBar's actual rendered height (its 90px container
  // plus its own top margin and bottom gap), so content was running out
  // from under it.
  const tabBarHeight = useTabBarHeight();

  const [data, setData] = useState<ProgramsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [pendingPlan, setPendingPlan] = useState<WorkoutPlan | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>("BEGINNER");
  const [activating, setActivating] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [localIdentity, setLocalIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("user_identity").then((val) => {
      if (val) setLocalIdentity(val as Identity);
    });
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const result = await api.get<{ success: boolean; data: ProgramsData }>(
        "/api/programs",
      );
      setData((result as any)?.data ?? null);
      setError(null);
    } catch {
      setError("Couldn't load programs. Pull down to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      setNow(Date.now());
    }, [fetchData]),
  );

  useEffect(() => {
    if (!data?.access?.trialExpiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [data?.access?.trialExpiresAt]);

  if (loading) return <Skeleton insetTop={insets.top} theme={theme} />;

  if (error || !data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: T.s32,
          backgroundColor: theme.bg,
          paddingTop: insets.top,
        }}
      >
        <AlertTriangle size={28} color={theme.muted} strokeWidth={1.5} />
        <SPText
          style={{
            fontSize: 14,
            fontFamily: "DM Sans",
            color: theme.muted,
            textAlign: "center",
            marginTop: T.s16,
            lineHeight: 20,
          }}
        >
          {error ?? "Something went wrong."}
        </SPText>
        <SPButton
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => {
            setLoading(true);
            fetchData();
          }}
          containerStyle={{ marginTop: T.s24 }}
        >
          Retry
        </SPButton>
      </View>
    );
  }

  const { plans, access, declaredEquipmentName } = data;
  const userIdentity = data.userIdentity ?? localIdentity;

  const trialExpired =
    !!access.trialExpiresAt && new Date(access.trialExpiresAt).getTime() <= now;
  const hasActiveTrial = access.hasActiveTrial && !trialExpired;

  const isFreeStarter =
    !access.isPro &&
    !access.isEquipment &&
    !hasActiveTrial &&
    access.expiredEquipmentIds.length === 0 &&
    !trialExpired;

  const isExpiredTrial =
    !access.isPro &&
    !access.isEquipment &&
    !hasActiveTrial &&
    (access.expiredEquipmentIds.length > 0 || trialExpired);

  const categoryFiltered =
    activeCategory === "ALL"
      ? plans
      : plans.filter((p) => p.muscleGroup === activeCategory);

  const unlockedPlans = categoryFiltered.filter(
    (p) => getLockReason(p) === null,
  );
  const lockedPlans = categoryFiltered.filter((p) => getLockReason(p) !== null);
  const filteredPlans = [...unlockedPlans, ...lockedPlans];

  const handlePlanPress = (plan: WorkoutPlan) => {
    setPendingPlan(plan);
    setSelectedLevel("BEGINNER");
  };

  const handleConfirmLevel = async () => {
    if (!pendingPlan || activating) return;
    try {
      setActivating(pendingPlan.id);
      await api.post("/api/programs/activate", {
        planId: pendingPlan.id,
        level: selectedLevel,
      });
      await AsyncStorage.removeItem(CACHE_KEYS.training);
      setPendingPlan(null);
      await fetchData();
      router.replace("/(tabs)/training" as any);
    } catch {
      // TODO: toast
    } finally {
      setActivating(null);
    }
  };

  const handleUpgrade = () => router.push("/upgrade" as any);
  const handleViewIdentitySettings = () =>
    router.push("/(tabs)/settings/identity" as any);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: T.s20,
          paddingBottom: tabBarHeight + T.s16,
          gap: T.s16,
        }}
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
        {/* Header */}
        <ScreenHeader insetTop={insets.top} theme={theme} />

        {/* Level card */}
        {userIdentity ? (
          <LevelCard
            identity={userIdentity}
            onViewSettings={handleViewIdentitySettings}
            theme={theme}
            isDark={isDark}
          />
        ) : null}

        {/* Tier card */}
        {access.isPro && <ProCard theme={theme} />}

        {hasActiveTrial &&
          access.trialExpiresAt &&
          declaredEquipmentName &&
          !access.isPro && (
            <TrialTierCard
              trialExpiresAt={access.trialExpiresAt}
              equipmentName={declaredEquipmentName}
              now={now}
              onUpgrade={handleUpgrade}
              theme={theme}
              isDark={isDark}
            />
          )}

        {(access.isEquipment && !hasActiveTrial && !access.isPro) ||
        (isExpiredTrial && !access.isEquipment) ? (
          <ExpiredTierCard
            onUpgrade={handleUpgrade}
            theme={theme}
            isDark={isDark}
          />
        ) : null}

        {isFreeStarter && (
          <StarterTierCard onUpgrade={handleUpgrade} theme={theme} />
        )}

        {/* Category filters */}
        <CategoryFilters
          active={activeCategory}
          onSelect={setActiveCategory}
          theme={theme}
        />

        {/* Plan list */}
        {filteredPlans.length === 0 ? (
          <View style={{ paddingVertical: T.s48, alignItems: "center" }}>
            <SPText
              style={{
                fontSize: 14,
                fontFamily: "DM Sans",
                color: theme.muted,
                textAlign: "center",
              }}
            >
              No programs in this category yet.
            </SPText>
          </View>
        ) : (
          <View style={{ gap: T.s12 }}>
            <SectionLabel count={filteredPlans.length} theme={theme} />
            {filteredPlans.map((plan, i) => {
              const reason = getLockReason(plan);
              return reason ? (
                <LockedProgramCard
                  key={plan.id}
                  plan={plan}
                  reason={reason}
                  onUpgrade={handleUpgrade}
                  index={i}
                  theme={theme}
                />
              ) : (
                <ProgramCard
                  key={plan.id}
                  plan={plan}
                  isActive={access.activePlanId === plan.id}
                  onPress={() => handlePlanPress(plan)}
                  index={i}
                  loading={activating === plan.id}
                  theme={theme}
                  isDark={isDark}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {pendingPlan && (
        <LevelPickerModal
          plan={pendingPlan}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          onConfirm={handleConfirmLevel}
          onClose={() => setPendingPlan(null)}
          loading={activating === pendingPlan.id}
          theme={theme}
        />
      )}
    </View>
  );
}
