// ─────────────────────────────────────────────
// New screen — only rendered when the user's onboarding trainingLocation
// is GYM. Does not replace or modify the existing ProgramsScreen, which
// still serves HOME users (and GYM users before an active plan exists).
// ─────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
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

import { SPText } from "../components/ui/SPText";
import { api } from "../lib/api";
import { GT } from "../theme/gymProgramsTheme";
import { DAY_ABBREV } from "../../contants/gymFocusMap";
import { GymHeroCard } from "../components/gymPrograms/GymHeroCard";
import { WeeklyDayCard } from "../components/gymPrograms/WeeklyDayCard";
import type { ScheduleDay, HeroSplitData } from "../types/gymPrograms";
import { GymEmptyWeekState } from "../components/gymPrograms/GymEmptyWeekState";

// ─── API response shape (matches the additive fields on GET /api/programs) ──

interface WorkoutPlanSummary {
  id: string;
  name: string;
  difficulty: string | null;
}

interface ProgramsApiResponse {
  plans: WorkoutPlanSummary[];
  access: { activePlanId: string | null };
  trainingLocation: "HOME" | "GYM" | null;
  weeklySchedule: Omit<ScheduleDay, "dayAbbrev" | "isToday">[] | null;
  weeklyScheduleLocked: boolean;
}

interface ProgramsApiResponse {
  plans: WorkoutPlanSummary[];
  access: { activePlanId: string | null };
  trainingLocation: "HOME" | "GYM" | null;
  weeklySchedule: Omit<ScheduleDay, "dayAbbrev" | "isToday">[] | null;
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

  const [weeklyScheduleLocked, setWeeklyScheduleLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState<HeroSplitData | null>(null);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [activeInstancePlanId, setActiveInstancePlanId] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

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
    // Hook point — wire to your existing session-launch route/params.
    // Session-level launching lives outside this screen's scope (it wasn't
    // part of the files I have), so confirm the pathname/params below
    // match your actual session-launch route before shipping.
    router.push({
      pathname: "/session",
      params: {
        planId: activeInstancePlanId ?? "",
        sessionNumber: String(day.sessionNumber ?? ""),
      },
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

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={GT.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + GT.s16,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
          <View style={styles.headerTextCol}>
            <SPText style={styles.title}>Gym Programs</SPText>
            <SPText style={styles.subtitle}>
              Your weekly training schedule.
            </SPText>
          </View>

          <Pressable
            onPress={handleCalendarPress}
            style={({ pressed }) => [
              styles.calendarButton,
              pressed && styles.calendarButtonPressed,
            ]}
          >
            <Calendar size={20} color={GT.accent} strokeWidth={1.75} />
          </Pressable>
        </Animated.View>

        {hero ? (
          <Animated.View style={[styles.heroSection, heroAnimatedStyle]}>
            <GymHeroCard hero={hero} onViewPlan={handleViewPlan} />
          </Animated.View>
        ) : null}

        <View style={styles.weekSection}>
          <SPText style={styles.weekLabel}>THIS WEEK</SPText>

          {!activeInstancePlanId ? (
            <GymEmptyWeekState variant="noPlan" onPrimaryPress={loadSchedule} />
          ) : weeklyScheduleLocked ? (
            <GymEmptyWeekState
              variant="locked"
              onPrimaryPress={handleUpgradePress}
            />
          ) : (
            days.map((day, i) => (
              <Animated.View
                key={day.dayIndex}
                entering={FadeIn.duration(280).delay(120 + i * 60)}
              >
                <WeeklyDayCard day={day} onStartSession={handleStartSession} />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GT.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: GT.s16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: GT.s24,
  },
  headerTextCol: {
    flex: 1,
    gap: GT.s4,
  },
  eyebrow: {
    fontFamily: GT.font.semiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: GT.muted,
  },
  eyebrowAccent: {
    color: GT.accent,
  },
  title: {
    fontFamily: GT.font.display,
    fontSize: 34,
    color: GT.text,
    marginTop: GT.s4,
  },
  subtitle: {
    fontFamily: GT.font.medium,
    fontSize: 15,
    color: GT.muted,
    marginTop: GT.s2,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: GT.r999,
    borderWidth: 1,
    borderColor: GT.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginTop: GT.s4,
  },
  calendarButtonPressed: {
    backgroundColor: GT.accentDim,
  },
  heroSection: {
    marginBottom: GT.s24,
  },
  weekSection: {
    gap: 0,
  },
  weekLabel: {
    fontFamily: GT.font.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: GT.muted,
    marginBottom: GT.s12,
  },
});
