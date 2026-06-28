import React, { useState, useCallback, useRef, useEffect } from "react";
import { SPSkeleton } from "../components/ui/SPSkeleton";
import {
  View,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "../lib/cacheKeys";
import {
  Sprout,
  TrendingUp,
  Crown,
  Lightbulb,
  ChevronRight,
  CalendarDays,
  Flame,
  Clock,
  BarChart3,
  Dumbbell,
  Lock,
} from "lucide-react-native";
import { SPText } from "../components/ui/SPText";
import { SPButton } from "../components/ui/SPButton";
import { SPCard } from "../components/ui/SPCard";
import { SPBadge } from "../components/ui/SPBadge";
import { SPIcon } from "../components/icons/SPIcon";
import UpgradePrompt from "../components/ui/Upgradeprompts";
import {
  colors,
  spacing,
  radii,
  borders,
  fonts,
  fontSize,
  layout,
  spring,
} from "../theme";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { api } from "../lib/api";
import type {
  TrainingTier,
  MuscleGroup,
  UserLevel,
  SessionDraft,
} from "../types/session";

// ─── Responsive Scale ──────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

function buildScale(): number {
  const BASE = 390;
  const raw = SCREEN_W / BASE;
  return Math.min(1.2, Math.max(0.82, raw));
}

const SCALE = buildScale();

function rs(value: number): number {
  return Math.round(value * SCALE);
}

function rf(size: number): number {
  return Math.round(size * SCALE * 2) / 2;
}

const PROGRAM_CARD_W = Math.round(SCREEN_W * 0.82);

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabKey = "programs" | "session" | "library";

const TABS: { key: TabKey; label: string }[] = [
  { key: "programs", label: "Program" },
  { key: "library", label: "Library" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseForView {
  id: string;
  order: number;
  sets: number;
  reps: number;
  restSeconds: number;
  exercise: {
    id: string;
    name: string;
    musclesWorked: string[];
    equipment: { id: string; name: string }[];
    thumbnailUrl: string | null;
  };
}

interface ProgramStub {
  id: string;
  name: string;
  description: string;
  coachingNote?: string | null;
  tier: string;
  muscleGroup: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  imageUrl: string | null;
  sessionDurationMin: string | null;
}

interface TrainingData {
  instanceId: string;
  planId: string;
  planName: string;
  muscleGroup: MuscleGroup;
  level: UserLevel;
  currentSession: number;
  totalSessions: number;
  focus: string;
  exercisesForView: ExerciseForView[];
  muscles: string[];
  tier: TrainingTier;
  trialExpiresAt: string | null;
  boughtFromStore: boolean;
  draft: SessionDraft | null;
  allPrograms: ProgramStub[];
  activeEquipmentIds: string[];
  imageUrl: string | null;
  sessionDurationMin: string | null;
  estimatedMinutes: number;
}

type WeightMap = Record<string, number | "">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MUSCLE_LABEL: Record<string, string> = {
  FULLBODY: "Full Body",
  UPPER: "Upper Body",
  LOWER: "Lower Body",
  CORE: "Core",
};

const TIER_LABEL: Record<TrainingTier, string> = {
  FREE: "Starter",
  DECLARED_TRIAL: "Trial",
  PURCHASED: "Equipment",
  PRO: "Pro",
};

function formatMuscle(raw: string): string {
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getTrialDaysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={[tabStyles.bar, { borderBottomColor: theme.border }]}>
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => {
              onChange(t.key);
              Haptics.selectionAsync();
            }}
            style={tabStyles.tab}
          >
            <SPText
              style={[
                tabStyles.label,
                {
                  color: isActive ? theme.accent : theme.muted,
                  fontFamily: isActive
                    ? fonts.brandSemiBold
                    : fonts.brandMedium,
                },
              ]}
            >
              {t.label}
            </SPText>
            {isActive && (
              <View
                style={[tabStyles.indicator, { backgroundColor: theme.accent }]}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: rs(spacing[5]),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: rs(spacing[3] + 2),
    position: "relative",
  },
  label: {
    fontSize: rf(14),
    letterSpacing: 0.2,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: "38%",
    right: "38%",
    height: 2,
    borderRadius: 1,
  },
});

// ─── Programs Tab ─────────────────────────────────────────────────────────────

const LEVELS: {
  key: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  label: string;
  description: string;
  lucideIcon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth: number;
  }>;
}[] = [
  {
    key: "BEGINNER",
    label: "Beginner",
    description: "New to training or returning after a break",
    lucideIcon: Sprout,
  },
  {
    key: "INTERMEDIATE",
    label: "Intermediate",
    description: "Consistent training for 6+ months",
    lucideIcon: TrendingUp,
  },
  {
    key: "ADVANCED",
    label: "Advanced",
    description: "2+ years of structured training",
    lucideIcon: Crown,
  },
];

function ProgramsTab({
  data,
  onSwitchProgram,
  onStartNow,
}: {
  data: TrainingData;
  onSwitchProgram: (p: ProgramStub) => void;
  onStartNow: () => void;
}) {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();
  // This tab renders its own ScrollView directly under the floating
  // SPTabBar (it's not nested inside another scroll container), so it
  // needs to reserve the bar's real height itself or the last card
  // renders underneath it.
  const tabBarHeight = useTabBarHeight();

  const { planId, allPrograms, tier, activeEquipmentIds = [] } = data;
  const isPro = tier === "PRO";
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  function isProgramLocked(program: ProgramStub): boolean {
    // "Other Programs" carousel is strictly Pro-gated: any non-Pro user
    // sees every card here locked, regardless of their equipment trial or
    // purchase status (those only affect the Programs Screen's own access
    // model in lib/programaccess.ts, not this teaser strip).
    return !isPro;
  }

  const unlockedPrograms = allPrograms.filter((p) => !isProgramLocked(p));
  const lockedPrograms = isPro
    ? []
    : allPrograms.filter((p) => isProgramLocked(p));
  const sortedPrograms = [...unlockedPrograms, ...lockedPrograms];

  const activeProgram = allPrograms.find((p) => p.id === planId);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + rs(spacing[8]) }}
      >
        {/* ── Hero Program ── */}
        {activeProgram && (
          <View style={programStyles.heroCard}>
            <View
              style={[
                programStyles.heroImageWrap,
                { borderColor: theme.border },
              ]}
            >
              {activeProgram.imageUrl ? (
                <Image
                  source={{ uri: activeProgram.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: theme.void },
                  ]}
                />
              )}

              {/* Subtle bottom gradient scrim for legibility */}
              <View style={programStyles.heroScrim} pointerEvents="none" />

              <View
                style={[
                  programStyles.heroBadge,
                  { borderColor: "rgba(255,255,255,0.18)" },
                ]}
              >
                <SPText
                  style={{
                    color: "#fff",
                    fontSize: rf(11),
                    fontFamily: fonts.brandSemiBold,
                    letterSpacing: 1,
                  }}
                >
                  {activeProgram.durationWeeks} WEEKS
                </SPText>
              </View>

              <View style={programStyles.heroTextBlock}>
                <SPText
                  style={{
                    color: "#fff",
                    fontSize: rf(24),
                    fontFamily: fonts.brandBold,
                    lineHeight: rf(30),
                    letterSpacing: -0.2,
                    marginBottom: rs(spacing[1] + 2),
                  }}
                  numberOfLines={2}
                >
                  {activeProgram.name}
                </SPText>
                <SPText
                  style={{
                    color: "rgba(255,255,255,0.72)",
                    fontSize: rf(13),
                    lineHeight: rf(19),
                  }}
                  numberOfLines={2}
                >
                  {activeProgram.description}
                </SPText>
              </View>
            </View>

            {/* Metadata row — sits below the image, on surface */}
            <View
              style={[
                programStyles.heroMetaRow,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={programStyles.metaItem}>
                <CalendarDays
                  size={rs(16)}
                  color={theme.muted2}
                  strokeWidth={1.75}
                />
                <SPText
                  style={[programStyles.metaValue, { color: theme.text }]}
                >
                  {activeProgram.durationWeeks}w
                </SPText>
                <SPText
                  style={[programStyles.metaLabel, { color: theme.muted }]}
                >
                  Duration
                </SPText>
              </View>

              <View
                style={[
                  programStyles.metaDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={programStyles.metaItem}>
                <Flame size={rs(16)} color={theme.muted2} strokeWidth={1.75} />
                <SPText
                  style={[programStyles.metaValue, { color: theme.text }]}
                >
                  {activeProgram.sessionsPerWeek}×
                </SPText>
                <SPText
                  style={[programStyles.metaLabel, { color: theme.muted }]}
                >
                  Per week
                </SPText>
              </View>

              <View
                style={[
                  programStyles.metaDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={programStyles.metaItem}>
                <Clock size={rs(16)} color={theme.muted2} strokeWidth={1.75} />
                <SPText
                  style={[programStyles.metaValue, { color: theme.text }]}
                >
                  {data.sessionDurationMin ?? "35"}
                </SPText>
                <SPText
                  style={[programStyles.metaLabel, { color: theme.muted }]}
                >
                  Minutes
                </SPText>
              </View>

              <View
                style={[
                  programStyles.metaDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={programStyles.metaItem}>
                <Dumbbell
                  size={rs(16)}
                  color={theme.muted2}
                  strokeWidth={1.75}
                />
                <SPText
                  style={[programStyles.metaValue, { color: theme.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {data.level.charAt(0) + data.level.slice(1).toLowerCase()}
                </SPText>
                <SPText
                  style={[programStyles.metaLabel, { color: theme.muted }]}
                >
                  Level
                </SPText>
              </View>
            </View>

            {/* ── Insight Card ── */}
            {!!activeProgram.coachingNote && (
              <View
                style={[
                  programStyles.insightCard,
                  {
                    backgroundColor: theme.accentDim,
                    borderColor: theme.accent + "26",
                  },
                ]}
              >
                <View
                  style={[
                    programStyles.insightIconWrap,
                    { backgroundColor: theme.accent + "1A" },
                  ]}
                >
                  <Lightbulb
                    size={rs(15)}
                    color={theme.accent}
                    strokeWidth={1.75}
                  />
                </View>
                <SPText
                  style={{
                    flex: 1,
                    color: theme.text,
                    fontSize: rf(13),
                    lineHeight: rf(19),
                    fontFamily: fonts.brandMedium,
                  }}
                >
                  {activeProgram.coachingNote}
                </SPText>
              </View>
            )}
          </View>
        )}

        {/* ── Program Overview ── */}
        <View style={programStyles.section}>
          <View style={programStyles.sectionHeader}>
            <SPText style={[programStyles.sectionTitle, { color: theme.text }]}>
              Program Structure
            </SPText>
            <Pressable
              onPress={() => router.push("/(tabs)/programs" as any)}
              style={programStyles.seeAllBtn}
              hitSlop={8}
            >
              <SPText
                style={{
                  color: theme.accent,
                  fontSize: rf(13),
                  fontFamily: fonts.brandSemiBold,
                }}
              >
                View all
              </SPText>
              <ChevronRight
                size={rs(14)}
                color={theme.accent}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          <View style={{ gap: rs(spacing[3]) }}>
            {data.exercisesForView.slice(0, 4).map((e, i) => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [
                  programStyles.sessionCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    programStyles.sessionThumb,
                    { backgroundColor: theme.raised, overflow: "hidden" },
                  ]}
                >
                  {e.exercise.thumbnailUrl ? (
                    <Image
                      source={{ uri: e.exercise.thumbnailUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}
                </View>

                <View style={programStyles.sessionBody}>
                  <SPText
                    style={{
                      color: theme.muted,
                      fontSize: rf(11),
                      fontFamily: fonts.brandSemiBold,
                      letterSpacing: 0.6,
                      marginBottom: rs(4),
                    }}
                    numberOfLines={1}
                  >
                    SESSION {i + 1} ·{" "}
                    {(
                      MUSCLE_LABEL[data.muscleGroup] ?? data.muscleGroup
                    ).toUpperCase()}{" "}
                    FOCUS
                  </SPText>
                  <SPText
                    style={{
                      color: theme.text,
                      fontSize: rf(16),
                      fontFamily: fonts.brandBold,
                      lineHeight: rf(21),
                    }}
                    numberOfLines={1}
                  >
                    {e.exercise.name}
                  </SPText>
                  <View style={programStyles.sessionMetaRow}>
                    <Clock size={rs(12)} color={theme.muted} strokeWidth={2} />
                    <SPText style={{ color: theme.muted, fontSize: rf(12) }}>
                      {data.sessionDurationMin ?? "35"} min
                    </SPText>
                    <View
                      style={[
                        programStyles.sessionMetaDot,
                        { backgroundColor: theme.border },
                      ]}
                    />
                    <SPText style={{ color: theme.muted, fontSize: rf(12) }}>
                      {data.exercisesForView.length} exercises
                    </SPText>
                  </View>
                </View>

                <ChevronRight
                  size={rs(18)}
                  color={theme.muted}
                  strokeWidth={1.75}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Other Programs ── */}
        {sortedPrograms.length > 1 && (
          <View style={[programStyles.section, { marginTop: rs(spacing[6]) }]}>
            <View style={programStyles.sectionHeader}>
              <SPText
                style={[programStyles.sectionTitle, { color: theme.text }]}
              >
                Other Programs
              </SPText>
              <Pressable
                onPress={() => router.push("/(tabs)/programs" as any)}
                style={programStyles.seeAllBtn}
                hitSlop={8}
              >
                <SPText
                  style={{
                    color: theme.accent,
                    fontSize: rf(13),
                    fontFamily: fonts.brandSemiBold,
                  }}
                >
                  View all
                </SPText>
                <ChevronRight
                  size={rs(14)}
                  color={theme.accent}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <FlatList
              data={sortedPrograms.filter((p) => p.id !== planId)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: rs(spacing[3]) }}
              keyExtractor={(p) => p.id}
              renderItem={({ item: program }) => {
                const isLocked = isProgramLocked(program);
                return (
                  <Pressable
                    onPress={() =>
                      isLocked
                        ? setShowUpgradePrompt(true)
                        : onSwitchProgram(program)
                    }
                    style={({ pressed }) => [
                      programStyles.otherCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={programStyles.otherThumbWrap}>
                      {program.imageUrl ? (
                        <Image
                          source={{ uri: program.imageUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: theme.void },
                          ]}
                        />
                      )}
                      {isLocked && (
                        <View style={programStyles.lockOverlay}>
                          <View style={programStyles.lockIconWrap}>
                            <Lock size={rs(18)} color="#fff" strokeWidth={2} />
                          </View>
                          <SPText
                            style={{
                              color: "#fff",
                              fontSize: rf(12),
                              fontFamily: fonts.brandSemiBold,
                              letterSpacing: 0.2,
                              textAlign: "center",
                              marginTop: rs(spacing[1] + 2),
                              paddingHorizontal: rs(spacing[2]),
                            }}
                          >
                            Go Pro to Unlock
                          </SPText>
                        </View>
                      )}
                    </View>

                    <View style={programStyles.otherBody}>
                      <SPText
                        style={{
                          color: theme.muted,
                          fontSize: rf(10),
                          fontFamily: fonts.brandSemiBold,
                          letterSpacing: 0.8,
                          marginBottom: rs(3),
                        }}
                        numberOfLines={1}
                      >
                        {(
                          MUSCLE_LABEL[program.muscleGroup] ??
                          program.muscleGroup
                        ).toUpperCase()}
                      </SPText>
                      <SPText
                        style={{
                          color: theme.text,
                          fontSize: rf(15),
                          fontFamily: fonts.brandBold,
                          lineHeight: rf(20),
                        }}
                        numberOfLines={1}
                      >
                        {program.name}
                      </SPText>
                      <SPText
                        style={{
                          color: theme.muted,
                          fontSize: rf(12),
                          marginTop: rs(3),
                        }}
                      >
                        {program.durationWeeks}W · {program.sessionsPerWeek}×/WK
                      </SPText>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* ── Sticky-feel CTA (inline, end of scroll) ── */}
        <View style={programStyles.ctaWrap}>
          <SPButton variant="primary" onPress={onStartNow}>
            Start Program
          </SPButton>
        </View>
      </ScrollView>

      <UpgradePrompt
        trigger="upgrade_required"
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </>
  );
}

const programStyles = StyleSheet.create({
  heroCard: {
    marginBottom: rs(spacing[6]),
  },
  heroImageWrap: {
    width: "100%",
    height: SCREEN_W < 380 ? rs(340) : SCREEN_W > 600 ? rs(380) : rs(360),
    position: "relative",
    justifyContent: "flex-end",
    borderRadius: rs(32),
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#0A0A0A",
  },
  heroScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    backgroundColor: "rgba(10,10,10,0.55)",
  },
  heroBadge: {
    position: "absolute",
    top: rs(spacing[4]),
    left: rs(spacing[4]),
    borderWidth: 1,
    borderRadius: rs(radii.full),
    paddingVertical: rs(6),
    paddingHorizontal: rs(spacing[3]),
  },
  heroTextBlock: {
    padding: rs(spacing[5]),
    paddingTop: rs(spacing[4]),
  },
  heroMetaRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: rs(20),
    marginTop: rs(spacing[3]),
    paddingVertical: rs(spacing[4]),
    paddingHorizontal: rs(spacing[2]),
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: rs(6),
    paddingHorizontal: rs(2),
  },
  metaDivider: {
    width: 1,
    height: rs(34),
  },
  metaValue: {
    fontSize: rf(13),
    fontFamily: fonts.brandSemiBold,
    textAlign: "center",
  },
  metaLabel: {
    fontSize: rf(10),
    letterSpacing: 0.3,
    textAlign: "center",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rs(spacing[3]),
    borderWidth: 1,
    borderRadius: rs(18),
    padding: rs(spacing[4]),
    marginTop: rs(spacing[3]),
  },
  insightIconWrap: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: rs(1),
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rs(spacing[4]),
  },
  sectionTitle: {
    fontSize: rf(17),
    fontFamily: fonts.brandBold,
    letterSpacing: -0.1,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(2),
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: rs(120),
    borderWidth: 1,
    borderRadius: rs(22),
    padding: rs(spacing[3]),
    gap: rs(spacing[3]),
  },
  sessionThumb: {
    // 4:3 to match the `thumb` Cloudinary preset (200x150) used in
    // /api/training for exercisesForView[].exercise.thumbnailUrl — the same
    // field also feeds `exerciseThumb` below at a 150:110 (4:3) ratio, so
    // this box needs to match that ratio rather than be square.
    width: rs(106),
    height: rs(80),
    borderRadius: rs(16),
    backgroundColor: "#0C0E10",
    flexShrink: 0,
  },
  sessionBody: {
    flex: 1,
    minWidth: 0,
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    marginTop: rs(6),
    flexWrap: "wrap",
  },
  sessionMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: rs(2),
  },
  otherCard: {
    width: Math.min(rs(220), SCREEN_W - rs(layout.screenPaddingH) * 2 - rs(40)),
    borderRadius: rs(24),
    borderWidth: 1,
    overflow: "hidden",
  },
  otherThumbWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#0C0E10",
    position: "relative",
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,10,10,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockIconWrap: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  otherBody: {
    padding: rs(spacing[3]),
  },
  ctaWrap: {
    marginTop: rs(spacing[6]),
  },
});

// ─── Library Tab ──────────────────────────────────────────────────────────────

const LIBRARY_MUSCLES = [
  { label: "Chest", count: 12 },
  { label: "Back", count: 15 },
  { label: "Shoulders", count: 10 },
  { label: "Arms", count: 14 },
  { label: "Legs", count: 11 },
  { label: "Core", count: 9 },
];

const LIBRARY_COLLECTIONS = [
  { label: "Strength Essentials", count: 12 },
  { label: "Mobility Flow", count: 8 },
  { label: "Core Performance", count: 10 },
];

function LibraryTab({ data }: { data: TrainingData }) {
  const { theme } = useAppTheme();
  // Same story as ProgramsTab — this is the actual content scrolling
  // behind the floating SPTabBar, and it had no bottom padding at all.
  const tabBarHeight = useTabBarHeight();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabBarHeight + rs(spacing[8]) }}
    >
      <View style={libStyles.section}>
        <View style={libStyles.sectionHeader}>
          <SPText style={[libStyles.sectionTitle, { color: theme.text }]}>
            Current Exercises
          </SPText>
          <Pressable>
            <SPText
              style={{
                color: theme.accent,
                fontSize: rf(13),
                fontFamily: fonts.brandSemiBold,
              }}
            >
              View all ›
            </SPText>
          </Pressable>
        </View>

        <FlatList
          data={data.exercisesForView.slice(0, 4)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: rs(spacing[3]) }}
          keyExtractor={(e) => e.id}
          renderItem={({ item: e }) => (
            <Pressable
              style={[
                libStyles.exerciseCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  libStyles.exerciseThumb,
                  { backgroundColor: "#111", overflow: "hidden" },
                ]}
              >
                {e.exercise.thumbnailUrl ? (
                  <Image
                    source={{ uri: e.exercise.thumbnailUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : null}
                <View
                  style={[
                    libStyles.bookmark,
                    { backgroundColor: theme.accent },
                  ]}
                />
              </View>
              <View style={libStyles.exerciseCardBody}>
                <SPText
                  style={{
                    color: theme.text,
                    fontSize: rf(13),
                    fontFamily: fonts.brandBold,
                  }}
                  numberOfLines={1}
                >
                  {e.exercise.name}
                </SPText>
                <SPText
                  style={{
                    color: theme.muted,
                    fontSize: rf(11),
                    marginTop: rs(2),
                  }}
                >
                  ⏱ {e.sets} Sets · {e.reps} Reps
                </SPText>
              </View>
            </Pressable>
          )}
        />
      </View>

      <View style={libStyles.section}>
        <View style={libStyles.sectionHeader}>
          <SPText style={[libStyles.sectionTitle, { color: theme.text }]}>
            Browse by muscle
          </SPText>
          <Pressable>
            <SPText
              style={{
                color: theme.accent,
                fontSize: rf(13),
                fontFamily: fonts.brandSemiBold,
              }}
            >
              View all ›
            </SPText>
          </Pressable>
        </View>

        <FlatList
          data={LIBRARY_MUSCLES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: rs(spacing[3]) }}
          keyExtractor={(m) => m.label}
          renderItem={({ item: m }) => (
            <Pressable
              style={[
                libStyles.muscleCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  libStyles.muscleIllustration,
                  { backgroundColor: "#111" },
                ]}
              >
                <View
                  style={[
                    libStyles.muscleHighlight,
                    { backgroundColor: theme.accent, opacity: 0.7 },
                  ]}
                />
              </View>
              <View style={libStyles.muscleCardFooter}>
                <SPText
                  style={{
                    color: theme.text,
                    fontSize: rf(13),
                    fontFamily: fonts.brandBold,
                  }}
                >
                  {m.label}
                </SPText>
                <SPText style={{ color: theme.muted, fontSize: rf(11) }}>
                  {m.count} Exercises
                </SPText>
              </View>
            </Pressable>
          )}
        />
      </View>

      <View style={libStyles.section}>
        <View style={libStyles.sectionHeader}>
          <SPText style={[libStyles.sectionTitle, { color: theme.text }]}>
            Collections
          </SPText>
          <Pressable>
            <SPText
              style={{
                color: theme.accent,
                fontSize: rf(13),
                fontFamily: fonts.brandSemiBold,
              }}
            >
              View all ›
            </SPText>
          </Pressable>
        </View>

        {LIBRARY_COLLECTIONS.map((c) => (
          <Pressable
            key={c.label}
            style={[
              libStyles.collectionRow,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View
              style={[libStyles.collectionThumb, { backgroundColor: "#111" }]}
            />
            <View style={libStyles.collectionText}>
              <SPText
                style={{
                  color: theme.text,
                  fontSize: rf(18),
                  fontFamily: fonts.brandBold,
                  lineHeight: rf(22),
                }}
              >
                {c.label}
              </SPText>
              <SPText
                style={{
                  color: theme.muted,
                  fontSize: rf(12),
                  marginTop: rs(2),
                }}
              >
                {c.count} Workouts
              </SPText>
            </View>
            <View
              style={[
                libStyles.collectionChevron,
                { borderColor: theme.accent },
              ]}
            >
              <SPText style={{ color: theme.accent, fontSize: rf(14) }}>
                ›
              </SPText>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={{ height: rs(spacing[8]) }} />
    </ScrollView>
  );
}

const libStyles = StyleSheet.create({
  section: {
    marginBottom: rs(spacing[5]),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rs(spacing[3]),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontFamily: fonts.brandBold,
  },
  exerciseCard: {
    width: rs(150),
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    overflow: "hidden",
  },
  exerciseThumb: {
    width: "100%",
    height: rs(110),
    position: "relative",
  },
  bookmark: {
    position: "absolute",
    top: 0,
    right: rs(spacing[3]),
    width: rs(20),
    height: rs(28),
    borderBottomLeftRadius: rs(4),
    borderBottomRightRadius: rs(4),
  },
  exerciseCardBody: {
    padding: rs(spacing[3]),
  },
  muscleCard: {
    width: rs(140),
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    overflow: "hidden",
  },
  muscleIllustration: {
    width: "100%",
    height: rs(120),
    alignItems: "center",
    justifyContent: "center",
  },
  muscleHighlight: {
    width: rs(50),
    height: rs(70),
    borderRadius: rs(radii.sm),
  },
  muscleCardFooter: {
    padding: rs(spacing[3]),
  },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: rs(spacing[3]),
    minHeight: rs(88),
  },
  collectionThumb: {
    width: rs(120),
    alignSelf: "stretch",
  },
  collectionText: {
    flex: 1,
    padding: rs(spacing[4]),
  },
  collectionChevron: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rs(spacing[4]),
  },
});

// ─── Switch Program Modal ─────────────────────────────────────────────────────

function SwitchProgramModal({
  program,
  selectedLevel,
  onLevelChange,
  onConfirm,
  onClose,
  loading,
}: {
  program: ProgramStub;
  selectedLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  onLevelChange: (l: "BEGINNER" | "INTERMEDIATE" | "ADVANCED") => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            modalStyles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + rs(spacing[6]),
            },
          ]}
        >
          <View
            style={[
              modalStyles.handle,
              { backgroundColor: theme.muted + "55" },
            ]}
          />
          <SPText
            variant="h2"
            style={{ marginBottom: rs(spacing[1]), color: theme.text }}
          >
            Switch Program
          </SPText>
          <SPText
            variant="caption"
            style={{ marginBottom: rs(spacing[6]), color: theme.muted }}
          >
            {program.name} ·{" "}
            {MUSCLE_LABEL[program.muscleGroup] ?? program.muscleGroup}
          </SPText>
          <SPText
            variant="bodyMd"
            style={{
              marginBottom: rs(spacing[3]),
              color: theme.text,
              fontFamily: fonts.brandSemiBold,
            }}
          >
            Select your level
          </SPText>
          <View style={{ gap: rs(spacing[3]), marginBottom: rs(spacing[6]) }}>
            {LEVELS.map((l) => {
              const active = selectedLevel === l.key;
              const LevelIcon = l.lucideIcon;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => onLevelChange(l.key)}
                  style={[
                    modalStyles.levelOption,
                    {
                      backgroundColor: active ? theme.accentDim : theme.raised,
                      borderColor: active ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      modalStyles.radio,
                      {
                        borderColor: active ? theme.accent : theme.muted + "88",
                      },
                    ]}
                  >
                    {active && (
                      <View
                        style={[
                          modalStyles.radioDot,
                          { backgroundColor: theme.accent },
                        ]}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: rs(spacing[1]),
                      }}
                    >
                      <LevelIcon
                        size={14}
                        color={active ? theme.accent : theme.muted}
                        strokeWidth={2}
                      />
                      <SPText
                        variant="bodyMd"
                        style={{
                          fontFamily: fonts.brandSemiBold,
                          color: active ? theme.accent : theme.text,
                        }}
                      >
                        {l.label}
                      </SPText>
                    </View>
                    <SPText variant="caption" style={{ color: theme.muted }}>
                      {l.description}
                    </SPText>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <SPButton onPress={onConfirm} disabled={loading}>
            {loading ? "Switching…" : "Start Program"}
          </SPButton>
          <Pressable
            onPress={onClose}
            style={{ marginTop: rs(spacing[4]), alignItems: "center" }}
          >
            <SPText variant="label" style={{ color: theme.muted }}>
              Cancel
            </SPText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Weight Sheet ─────────────────────────────────────────────────────────────

function WeightInputSheet({
  exercises,
  weights,
  onChange,
  onStart,
  onClose,
}: {
  exercises: ExerciseForView[];
  weights: WeightMap;
  onChange: (id: string, val: number | "") => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const weightedExercises = exercises.filter((e) => e.id in weights);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ justifyContent: "flex-end" }}
        >
          <Pressable
            style={[
              modalStyles.sheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                paddingBottom: insets.bottom + rs(spacing[6]),
              },
            ]}
          >
            <View
              style={[
                modalStyles.handle,
                { backgroundColor: theme.muted + "55" },
              ]}
            />
            <SPText
              variant="h2"
              style={{ marginBottom: rs(spacing[1]), color: theme.text }}
            >
              Set Your Weights
            </SPText>
            <SPText
              variant="caption"
              style={{ marginBottom: rs(spacing[6]), color: theme.muted }}
            >
              Enter the weight you'll use for each weighted exercise.
            </SPText>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: rs(300) }}
            >
              {weightedExercises.map((e, i) => (
                <View
                  key={e.id}
                  style={[
                    modalStyles.weightRow,
                    { borderBottomColor: theme.border },
                    i === weightedExercises.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      modalStyles.indexBadge,
                      {
                        backgroundColor: theme.raised,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <SPText
                      variant="caption"
                      style={{
                        color: theme.muted,
                        fontFamily: fonts.brandBold,
                      }}
                    >
                      {i + 1}
                    </SPText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <SPText
                      variant="bodyMd"
                      style={{
                        fontFamily: fonts.brandMedium,
                        color: theme.text,
                      }}
                    >
                      {e.exercise.name}
                    </SPText>
                    <SPText variant="caption" style={{ color: theme.muted }}>
                      {e.sets} sets × {e.reps} reps
                    </SPText>
                  </View>
                  <View style={modalStyles.weightInputGroup}>
                    <TextInput
                      style={[
                        modalStyles.weightInput,
                        {
                          backgroundColor: theme.raised,
                          borderColor: theme.border,
                          color: theme.text,
                          fontFamily: fonts.brandBold,
                        },
                      ]}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.muted}
                      value={
                        weights[e.id] === "" ? "" : String(weights[e.id] ?? "")
                      }
                      onChangeText={(v) =>
                        onChange(e.id, v === "" ? "" : parseFloat(v))
                      }
                    />
                    <SPText variant="caption" style={{ color: theme.muted }}>
                      kg
                    </SPText>
                  </View>
                </View>
              ))}
            </ScrollView>
            <SPText
              variant="caption"
              center
              style={{
                marginTop: rs(spacing[4]),
                marginBottom: rs(spacing[4]),
                color: theme.muted,
              }}
            >
              Weights are saved and used to calculate your training volume.
            </SPText>
            <SPButton onPress={onStart}>Start Workout</SPButton>
            <Pressable
              onPress={onStart}
              style={{ marginTop: rs(spacing[4]), alignItems: "center" }}
            >
              <SPText variant="label" style={{ color: theme.muted }}>
                Skip weight entry
              </SPText>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: rs(radii["2xl"]),
    borderTopRightRadius: rs(radii["2xl"]),
    borderWidth: borders.thin,
    paddingHorizontal: rs(spacing[5]),
    paddingTop: rs(spacing[4]),
  },
  handle: {
    width: rs(40),
    height: rs(4),
    borderRadius: rs(2),
    alignSelf: "center",
    marginBottom: rs(spacing[5]),
  },
  levelOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(spacing[3]),
    borderWidth: borders.base,
    borderRadius: rs(radii.xl),
    padding: rs(spacing[4]),
  },
  radio: {
    width: rs(20),
    height: rs(20),
    borderRadius: rs(10),
    borderWidth: borders.base,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(spacing[3]),
    paddingVertical: rs(spacing[3]),
    borderBottomWidth: borders.thin,
  },
  weightInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(spacing[2]),
  },
  weightInput: {
    width: rs(64),
    height: rs(44),
    borderWidth: borders.base,
    borderRadius: rs(radii.md),
    textAlign: "center",
    fontSize: rf(fontSize.base),
    paddingHorizontal: rs(spacing[2]),
  },
  indexBadge: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(radii.sm),
    borderWidth: borders.thin,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

// ─── Main TrainingScreen ──────────────────────────────────────────────────────

export function TrainingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>("programs");
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const [weights, setWeights] = useState<WeightMap>({});
  const [switchTarget, setSwitchTarget] = useState<ProgramStub | null>(null);
  const [switchLevel, setSwitchLevel] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  >("BEGINNER");
  const [switching, setSwitching] = useState(false);
  const [noPlan, setNoPlan] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.training);
      if (cached) {
        const parsed: TrainingData = JSON.parse(cached);
        const hasThumbnails = parsed.exercisesForView?.some(
          (e) => "thumbnailUrl" in e.exercise,
        );
        if (hasThumbnails) {
          setData(parsed);
          const base: WeightMap = Object.fromEntries(
            parsed.exercisesForView
              .filter(
                (e) =>
                  e.exercise.equipment.length > 0 &&
                  !e.exercise.equipment.some(
                    (eq) => eq.name.toLowerCase() === "bodyweight",
                  ),
              )
              .map((e) => [e.id, "" as number | ""]),
          );
          setWeights(base);
          setNoPlan(false);
          setLoading(false);
        } else {
          await AsyncStorage.removeItem(CACHE_KEYS.training);
          setLoading(true);
        }
      } else {
        setLoading(true);
      }
    } catch {
      setLoading(true);
    }

    try {
      const raw = await api.get<{ success: boolean; data: TrainingData }>(
        "/api/training",
      );
      const d: TrainingData | null = (raw?.data as TrainingData) ?? null;
      if (!d?.instanceId) {
        setNoPlan(true);
        setLoading(false);
        return;
      }
      setData(d);
      const base: WeightMap = Object.fromEntries(
        d.exercisesForView
          .filter(
            (e) =>
              e.exercise.equipment.length > 0 &&
              !e.exercise.equipment.some(
                (eq) => eq.name.toLowerCase() === "bodyweight",
              ),
          )
          .map((e) => [e.id, "" as number | ""]),
      );
      setWeights(base);
      setNoPlan(false);
      setLoading(false);
      await AsyncStorage.setItem(CACHE_KEYS.training, JSON.stringify(d));

      const urlsToPrefetch = [
        d.imageUrl,
        ...d.exercisesForView.map((e) => e.exercise.thumbnailUrl),
        ...d.allPrograms.map((p) => p.imageUrl),
      ].filter((url): url is string => !!url);

      Image.prefetch(urlsToPrefetch).catch(() => {});
    } catch {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ── Redirect when no plan — hooks must be declared before any early return ──
  useEffect(() => {
    if (!loading && noPlan) {
      router.replace("/(tabs)/programs" as any);
    }
  }, [loading, noPlan, router]);

  const handleSwitchProgram = useCallback(async () => {
    if (!switchTarget) return;
    setSwitching(true);
    try {
      await api.post("/api/programs/start", {
        planId: switchTarget.id,
        level: switchLevel,
      });
      await AsyncStorage.removeItem(CACHE_KEYS.training);
      setSwitchTarget(null);
      await fetchData();
    } catch {
    } finally {
      setSwitching(false);
    }
  }, [switchTarget, switchLevel, fetchData]);

  const handleStartNow = useCallback(() => {
    if (!data) return;
    const weightedExercises = data.exercisesForView.filter(
      (e) => e.id in weights,
    );
    if (weightedExercises.length > 0) {
      setShowWeightSheet(true);
    } else {
      router.push(
        `/(tabs)/training/session/${data.instanceId}/${data.currentSession}` as any,
      );
    }
  }, [data, weights, router]);

  const handleConfirmStart = useCallback(() => {
    if (!data) return;
    setShowWeightSheet(false);
    router.push(
      `/(tabs)/training/session/${data.instanceId}/${data.currentSession}` as any,
    );
  }, [data, router]);

  const { autoStart } = useLocalSearchParams<{ autoStart?: string }>();
  const didAutoStart = useRef(false);

  useEffect(() => {
    if (autoStart === "1" && !loading && data && !didAutoStart.current) {
      didAutoStart.current = true;
      handleStartNow();
    }
  }, [autoStart, loading, data, handleStartNow]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.pageHeader,
            {
              paddingTop: insets.top + rs(spacing[5]),
              paddingHorizontal: rs(layout.screenPaddingH),
            },
          ]}
        >
          <View>
            <SPSkeleton width={120} height={36} radius={radii.md} />
            <SPSkeleton
              width={200}
              height={14}
              radius={radii.sm}
              style={{ marginTop: rs(spacing[2]) }}
            />
          </View>
          <SPSkeleton width={40} height={40} radius={radii.full} />
        </View>
        <View style={{ paddingHorizontal: rs(layout.screenPaddingH) }}>
          <View
            style={{
              flexDirection: "row",
              gap: rs(spacing[4]),
              marginTop: rs(spacing[4]),
              marginBottom: rs(spacing[4]),
            }}
          >
            <SPSkeleton width={80} height={20} />
            <SPSkeleton width={80} height={20} />
            <SPSkeleton width={80} height={20} />
          </View>
          <SPSkeleton height={rs(220)} radius={radii.xl} />
        </View>
      </View>
    );
  }

  // ── No plan — show blank while redirect fires ──
  if (noPlan || !data) {
    return <View style={[styles.fill, { backgroundColor: theme.bg }]} />;
  }

  const { planName, muscleGroup, tier, trialExpiresAt } = data;

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      {/* ── Page Header ── */}
      <View
        style={[
          styles.pageHeader,
          {
            paddingTop: insets.top + rs(spacing[5]),
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingBottom: rs(spacing[4]),
          },
        ]}
      >
        <View>
          <SPText
            style={{
              color: theme.text,
              fontSize: rf(30),
              fontFamily: fonts.brandBold,
              lineHeight: rf(36),
              letterSpacing: -0.3,
            }}
          >
            Training
          </SPText>
          <SPText
            style={{
              color: theme.muted,
              fontSize: rf(13),
              marginTop: rs(4),
              letterSpacing: 0.1,
            }}
          >
            Train with structure. Build consistency.
          </SPText>
        </View>
        <View
          style={[
            styles.avatarBubble,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <SPText
            style={{
              color: theme.text,
              fontSize: rf(15),
              fontFamily: fonts.brandBold,
            }}
          >
            L
          </SPText>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={{ paddingHorizontal: rs(layout.screenPaddingH) }}>
        <TabBar active={activeTab} onChange={setActiveTab} />
      </View>

      {/* ── Tab Content ── */}
      <View
        style={[styles.fill, { paddingHorizontal: rs(layout.screenPaddingH) }]}
      >
        {activeTab === "programs" && (
          <ProgramsTab
            data={data}
            onSwitchProgram={(p) => {
              setSwitchTarget(p);
              setSwitchLevel("BEGINNER");
            }}
            onStartNow={handleStartNow}
          />
        )}

        {activeTab === "library" && <LibraryTab data={data} />}
      </View>

      {/* ── Modals ── */}
      {switchTarget && (
        <SwitchProgramModal
          program={switchTarget}
          selectedLevel={switchLevel}
          onLevelChange={setSwitchLevel}
          onConfirm={handleSwitchProgram}
          onClose={() => setSwitchTarget(null)}
          loading={switching}
        />
      )}
      {showWeightSheet && (
        <WeightInputSheet
          exercises={data.exercisesForView}
          weights={weights}
          onChange={(id, val) => setWeights((prev) => ({ ...prev, [id]: val }))}
          onStart={handleConfirmStart}
          onClose={() => setShowWeightSheet(false)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarBubble: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    borderWidth: borders.base,
    alignItems: "center",
    justifyContent: "center",
  },
});
