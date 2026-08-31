import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { Calendar } from "lucide-react-native";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import { SPText } from "../components/ui/SPText";
import { api, reorderWeeklySchedule } from "../lib/api";
import { GT } from "../theme/gymProgramsTheme";
import { useAppTheme } from "../theme/ThemeContext";
import { DAY_ABBREV } from "../../contants/gymFocusMap";
import { GymHeroCard } from "../components/gymPrograms/GymHeroCard";
import { WeeklyDayCard } from "../components/gymPrograms/WeeklyDayCard";
import type { ScheduleDay, HeroSplitData } from "../types/gymPrograms";
import { GymEmptyWeekState } from "../components/gymPrograms/GymEmptyWeekState";
// NOTE: adjust this path if useResponsive lives elsewhere in your tree —
// matched against the existing "../hooks/Usetabbarheight" import pattern
// used by ProgramsScreen.tsx.
import { useResponsive } from "../hooks/useResponsive";

// ─── API response shape (matches the additive fields on GET /api/programs) ──

interface WorkoutPlanSummary {
  id: string;
  name: string;
  difficulty: string | null;
}

interface ProgramsApiResponse {
  plans: WorkoutPlanSummary[];
  access: { activePlanId: string | null; activeInstanceId: string | null };
  trainingLocation: "HOME" | "GYM" | null;
  weeklySchedule: Omit<ScheduleDay, "dayAbbrev" | "isToday">[] | null;
  weeklyScheduleLocked: boolean;
}

function getTodayIndex(): number {
  // JS getDay(): 0 = Sunday ... 6 = Saturday. Our schedule is Monday-first
  // (dayIndex 0 = Monday ... 6 = Sunday), so convert accordingly.
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export default function GymProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rs } = useResponsive();
  // GT (gymProgramsTheme) still supplies spacing/radius/font tokens, which
  // don't change with light/dark. Colors now come from the shared
  // ThemeContext instead of GT's fixed dark palette, so this screen tracks
  // the rest of the app's theme rather than always rendering dark.
  const { theme } = useAppTheme();

  const [weeklyScheduleLocked, setWeeklyScheduleLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState<HeroSplitData | null>(null);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [activeInstancePlanId, setActiveInstancePlanId] = useState<
    string | null
  >(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  // Local-only guard so a card mid network-reorder can't be dragged again
  // until that request settles — prevents two overlapping swaps racing
  // each other's optimistic state.
  const [reordering, setReordering] = useState(false);

  const heroTranslateY = useSharedValue(24);
  const heroOpacity = useSharedValue(0);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<{
        success: boolean;
        data: ProgramsApiResponse;
      }>("/api/programs");

      if (!result) {
        console.error("[GymProgramsScreen] no response from /api/programs");
        return;
      }
      const { data } = result;
      const activePlan = data.plans.find(
        (p: WorkoutPlanSummary) => p.id === data.access.activePlanId,
      );

      setActiveInstancePlanId(data.access.activePlanId);
      setActiveInstanceId(data.access.activeInstanceId);
      setWeeklyScheduleLocked(!!data.weeklyScheduleLocked);

      if (activePlan) {
        setHero({
          planName: activePlan.name,
          description: "Generated based on your preferences.",
        });
      }

      const todayIndex = getTodayIndex();
      const schedule = (data.weeklySchedule ?? []).map(
        (d: Omit<ScheduleDay, "dayAbbrev" | "isToday">) => ({
          ...d,
          dayAbbrev: DAY_ABBREV[d.dayIndex] ?? "",
          isToday: d.dayIndex === todayIndex,
          // Difficulty lives on the plan, not per-session — apply uniformly.
          difficulty: activePlan?.difficulty ?? null,
        }),
      );
      setDays(schedule);
    } catch (err) {
      console.error("[GymProgramsScreen] failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on every focus (not just mount) so changes made elsewhere --
  // e.g. equipment or workout changes saved in Training System settings --
  // are reflected here as soon as the user returns to this tab. Matches
  // the pattern already used by HomeScreen, ProgramsScreen, and
  // TrainingScreen.
  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [loadSchedule]),
  );

  useEffect(() => {
    if (!loading) {
      heroOpacity.value = withTiming(1, { duration: 320 });
      heroTranslateY.value = withSpring(0, { damping: 16, stiffness: 140 });
    }
  }, [loading]);

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  function handleViewPlan() {
    if (!activeInstancePlanId) return;
    // Hook point — wire to your existing plan-detail route.
    router.push({
      pathname: "/programs/[id]",
      params: { id: activeInstancePlanId },
    });
  }

  function handleStartSession(day: ScheduleDay) {
    // IMPORTANT: this screen only has the catalog plan id
    // (access.activePlanId from /api/programs), not the WorkoutPlanInstance
    // id that the real session route needs
    // (/(tabs)/training/session/[instanceId]/[sessionNumber]). Rather than
    // guess at an instance id we don't have, we route through the Training
    // tab itself and let it resolve instanceId + currentSession from its
    // own verified /api/training fetch — the same trusted path Home users
    // already go through via TrainingScreen's handleStartNow().
    //
    // Trade-off: this starts whatever /api/training reports as the plan's
    // *current* session, not necessarily the specific day card the user
    // tapped (e.g. tapping Friday's card on a Tuesday still starts the
    // next session in sequence, same as Home's "Start Now"). If you need
    // strict day-to-session matching instead, that requires confirming
    // day.sessionNumber always equals the backend's currentSession, and
    // likely a small TrainingScreen change to accept an explicit session
    // override — let me know if that's needed and I'll wire it up.
    router.push({
      pathname: "/(tabs)/training",
      params: { autoStart: "1" },
    });
  }

  function handleCalendarPress() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unsupported on this device/simulator — ignore
    }
    // Hook point — wire to a calendar/overview view if/when one exists.
  }

  function handleUpgradePress() {
    // Hook point — wire to your existing paywall/subscribe screen.
    router.push("/upgrade" as any);
  }

  // Applies a real shift-based reorder: dragging one day onto another
  // shifts everything in between by one, exactly like any normal
  // drag-reorder list — not a two-item-only swap. `data` is the library's
  // own already-correctly-reordered array; we only ever take its content
  // fields, never its day-identity fields (dayIndex/dayLabel/dayAbbrev/
  // isToday/difficulty), which stay pinned to position — position 0 is
  // always Monday, position 6 is always Sunday, regardless of which
  // session's content is currently sitting there. Optimistic: applies
  // locally immediately, then persists, rolling back if the request fails.
  const handleDragEnd = useCallback(
    async ({ data }: { data: ScheduleDay[] }) => {
      if (!activeInstanceId || reordering) return;

      const previousDays = days;

      const nextDays = previousDays.map((day, i) => ({
        ...day,
        sessionNumber: data[i].sessionNumber,
        focus: data[i].focus,
        estimatedMinutes: data[i].estimatedMinutes,
        exercises: data[i].exercises,
        isRestDay: data[i].isRestDay,
        plannedSessionId: data[i].plannedSessionId,
      }));

      // No-op drag (dropped back where it started) — skip the network call.
      const unchanged = nextDays.every(
        (d, i) => d.plannedSessionId === previousDays[i].plannedSessionId,
      );
      if (unchanged) return;

      setDays(nextDays);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // haptics unsupported on this device/simulator — ignore
      }

      setReordering(true);
      try {
        await reorderWeeklySchedule(
          activeInstanceId,
          nextDays.map((d) => ({
            dayOfWeek: d.dayIndex,
            plannedSessionId: d.plannedSessionId,
          })),
        );
      } catch (err) {
        console.error("[GymProgramsScreen] failed to save reorder:", err);
        setDays(previousDays);
      } finally {
        setReordering(false);
      }
    },
    [activeInstanceId, days, reordering],
  );

  const renderDayCard = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ScheduleDay>) => (
      <ScaleDecorator>
        <WeeklyDayCard
          day={item}
          onStartSession={handleStartSession}
          drag={reordering ? undefined : drag}
          isActive={isActive}
          dragDisabled={reordering}
        />
      </ScaleDecorator>
    ),
    [reordering],
  );

  // ─── Responsive values ────────────────────────────────────────────────
  // Everything here was previously fixed-pixel (GT.sNN), which is why the
  // screen read "too big" on smaller phones and didn't tighten up at all
  // on larger ones. These scale per breakpoint instead.
  const calendarButtonSize = rs(36, 38, 40, 42);
  const contentPaddingH = rs(12, 14, 16, 18);
  const headerMarginBottom = rs(14, 16, 18, 20);
  const heroMarginBottom = rs(14, 16, 18, 20);

  if (loading) {
    return (
      <View
        style={[styles.screen, styles.centered, { backgroundColor: theme.bg }]}
      >
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const headerContent = (
    <>
      <Animated.View
        entering={FadeIn.duration(280)}
        style={[styles.header, { marginBottom: headerMarginBottom }]}
      >
        <View style={styles.headerTextCol}>
          <SPText
            style={[
              styles.title,
              {
                color: theme.text,
                fontSize: rs(22, 24, 26, 28),
                // Explicit lineHeight (+ a touch of bottom padding) so
                // the display font's descenders (the "g" in "Gym"/
                // "Programs") aren't clipped at the bottom edge.
                lineHeight: rs(28, 30, 32, 34),
                paddingBottom: rs(2, 3, 3, 4),
              },
            ]}
          >
            Gym Programs
          </SPText>
          <SPText
            style={[
              styles.subtitle,
              { color: theme.muted, fontSize: rs(12, 13, 13, 14) },
            ]}
          >
            Your weekly training schedule.
          </SPText>
        </View>

        <Pressable
          onPress={handleCalendarPress}
          style={({ pressed }) => [
            styles.calendarButton,
            {
              width: calendarButtonSize,
              height: calendarButtonSize,
              borderRadius: calendarButtonSize / 2,
              borderColor: theme.accentDim,
            },
            pressed && { backgroundColor: theme.accentDim },
          ]}
        >
          <Calendar
            size={rs(16, 18, 19, 20)}
            color={theme.accent}
            strokeWidth={1.75}
          />
        </Pressable>
      </Animated.View>

      {hero ? (
        <Animated.View
          style={[
            styles.heroSection,
            { marginBottom: heroMarginBottom },
            heroAnimatedStyle,
          ]}
        >
          <GymHeroCard hero={hero} onViewPlan={handleViewPlan} />
        </Animated.View>
      ) : null}

      <SPText
        style={[
          styles.weekLabel,
          {
            color: theme.muted,
            fontSize: rs(10, 11, 11, 12),
            marginBottom: rs(10, 11, 12, 12),
          },
        ]}
      >
        THIS WEEK
      </SPText>
    </>
  );

  const contentPaddingStyle = {
    paddingHorizontal: contentPaddingH,
    paddingTop: insets.top + rs(8, 10, 12, 12),
    paddingBottom: insets.bottom + rs(110, 120, 130, 140),
  };

  // No plan yet, or the schedule is locked behind a trial/paywall — nothing
  // to drag, so this stays a plain ScrollView exactly as before.
  if (!activeInstancePlanId || weeklyScheduleLocked) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentPaddingStyle]}
          showsVerticalScrollIndicator={false}
        >
          {headerContent}
          <View style={styles.weekSection}>
            {!activeInstancePlanId ? (
              <GymEmptyWeekState
                variant="noPlan"
                onPrimaryPress={loadSchedule}
              />
            ) : (
              <GymEmptyWeekState
                variant="locked"
                onPrimaryPress={handleUpgradePress}
              />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // A DraggableFlatList is itself a scrolling container (built on
  // FlatList), so it replaces the ScrollView here rather than nesting
  // inside it — everything that used to sit above the day cards is now
  // ListHeaderComponent instead.
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <DraggableFlatList
        data={days}
        keyExtractor={(item) => String(item.dayIndex)}
        renderItem={renderDayCard}
        onDragEnd={handleDragEnd}
        ListHeaderComponent={headerContent}
        contentContainerStyle={[styles.scrollContent, contentPaddingStyle]}
        showsVerticalScrollIndicator={false}
        activationDistance={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // backgroundColor applied inline from theme.bg
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    // paddingHorizontal is applied responsively inline above
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextCol: {
    flex: 1,
    gap: GT.s4,
  },
  eyebrow: {
    fontFamily: GT.font.semiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    // color applied inline from theme.muted where used
  },
  title: {
    fontFamily: GT.font.display,
    marginTop: GT.s4,
    // color/fontSize/lineHeight applied inline from theme + rs()
  },
  subtitle: {
    fontFamily: GT.font.medium,
    marginTop: GT.s2,
    // color/fontSize applied inline from theme + rs()
  },
  calendarButton: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: GT.s4,
    // borderColor applied inline from theme.accentDim
  },
  heroSection: {
    // marginBottom is applied responsively inline above
  },
  weekSection: {
    gap: 0,
  },
  weekLabel: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 1.2,
    // color applied inline from theme.muted
  },
});
