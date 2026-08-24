// ─────────────────────────────────────────────────────────────────────────
// View-all screen for the "Program Structure" section on TrainingScreen.
// Program Structure shows the workouts (exercises) inside the user's
// current session — each with its own short demo clip. It only shows the
// first 4; this screen shows all of them, unsliced, using the exact same
// card design (thumbnail, "SESSION N" label, exercise name, clip length).
//
// Reuses /api/training (same endpoint TrainingScreen calls) rather than
// adding a new route — exercisesForView already contains every workout in
// the current session.
// ─────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react-native";

import { SPText } from "../components/ui/SPText";
import { spacing, fonts, layout } from "../theme";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { api } from "../lib/api";

// ─── Responsive scale — matches TrainingScreen's own local rs()/rf(). ────

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

// ─── Types — mirrors ExerciseForView from TrainingScreen ─────────────────

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

interface TrainingSummary {
  instanceId: string | null;
  planName?: string;
  exercisesForView?: ExerciseForView[];
}

export default function ProgramSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrainingSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.get<{ success: boolean; data: TrainingSummary }>(
        "/api/training",
      );
      setData(raw?.data ?? null);
    } catch (err) {
      console.error("[ProgramSessionsScreen] failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exercises = data?.exercisesForView ?? [];

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: rs(layout.screenPaddingH),
        }}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/(tabs)/training" as any)}
            hitSlop={12}
            style={[
              styles.backBtn,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <ChevronLeft size={rs(20)} color={theme.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <SPText
              numberOfLines={1}
              style={{
                color: theme.text,
                fontSize: rf(20),
                fontFamily: fonts.brandBold,
              }}
            >
              {data?.planName ?? "Program"}
            </SPText>
            <SPText
              style={{ color: theme.muted, fontSize: rf(12), marginTop: rs(2) }}
            >
              {exercises.length} workouts
            </SPText>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={[styles.fill, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : !data?.instanceId || exercises.length === 0 ? (
        <View style={[styles.fill, styles.centered]}>
          <SPText style={{ color: theme.muted, fontSize: rf(14) }}>
            No active program found.
          </SPText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[5]),
            paddingBottom: tabBarHeight + rs(spacing[8]),
            gap: rs(spacing[3]),
          }}
        >
          {exercises.map((e, i) => (
            <Animated.View
              key={e.id}
              entering={FadeIn.duration(240).delay(i * 25)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.sessionCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.sessionThumb,
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

                <View style={styles.sessionBody}>
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
                    SESSION {i + 1}
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
                  <View style={styles.sessionMetaRow}>
                    <Clock size={rs(12)} color={theme.muted} strokeWidth={2} />
                    <SPText style={{ color: theme.muted, fontSize: rf(12) }}>
                      2 min
                    </SPText>
                  </View>
                </View>

                <ChevronRight
                  size={rs(18)}
                  color={theme.muted}
                  strokeWidth={1.75}
                />
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(spacing[3]),
    paddingBottom: rs(spacing[4]),
  },
  backBtn: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: rs(96),
    borderWidth: 1,
    borderRadius: rs(20),
    padding: rs(spacing[3]),
    gap: rs(spacing[3]),
  },
  sessionThumb: {
    width: rs(84),
    height: rs(64),
    borderRadius: rs(14),
    flexShrink: 0,
  },
  sessionBody: { flex: 1, minWidth: 0 },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rs(6),
    marginTop: rs(6),
  },
});
