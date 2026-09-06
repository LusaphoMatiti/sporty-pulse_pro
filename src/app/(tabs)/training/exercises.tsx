import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { SPText } from "../../../components/ui/SPText";
import { SPSkeleton } from "../../../components/ui/SPSkeleton";
import { colors, spacing, radii, borders, fonts, layout } from "../../../theme";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useTabBarHeight } from "../../../hooks/Usetabbarheight";
import { api } from "../../../lib/api";

// ─── Responsive Scale (mirrors TrainingScreen.tsx) ─────────────────────────

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

const CARD_GAP = 12;
const CARD_W = Math.round(
  (SCREEN_W - rs(layout.screenPaddingH) * 2 - CARD_GAP) / 2,
);

// ─── Types ──────────────────────────────────────────────────────────────────
// Mirrors the actual /api/training response shape (repsScheme + restSeconds),
// not the `sets`/`reps` fields referenced elsewhere in TrainingScreen.tsx —
// the API has never sent those, so this defines the exercise shape correctly
// for this screen rather than reusing the existing (inaccurate) type.

interface ExerciseItem {
  id: string;
  order: number;
  repsScheme: number[];
  restSeconds: number;
  exercise: {
    id: string;
    name: string;
    musclesWorked: string[];
    thumbnailUrl: string | null;
    equipment: { id: string; name: string }[];
  };
}

interface TrainingExercisesResponse {
  instanceId: string | null;
  planName?: string;
  exercisesForView: ExerciseItem[];
}

function formatSetsReps(repsScheme: number[]): string {
  if (!repsScheme || repsScheme.length === 0) return "";
  const allSame = repsScheme.every((r) => r === repsScheme[0]);
  const repsLabel = allSame ? `${repsScheme[0]}` : repsScheme.join("/");
  return `${repsScheme.length} Sets · ${repsLabel} Reps`;
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function AllExercisesScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const raw = await api.get<{
        success: boolean;
        data: TrainingExercisesResponse;
      }>("/api/training");
      const d = raw?.data ?? null;
      setExercises(d?.exercisesForView ?? []);
      setPlanName(d?.planName ?? null);
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + rs(spacing[4]),
            paddingHorizontal: rs(layout.screenPaddingH),
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            styles.backBtn,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ChevronLeft size={rs(20)} color={theme.text} strokeWidth={2.25} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: rs(spacing[3]) }}>
          <SPText
            style={{
              color: theme.text,
              fontSize: rf(22),
              fontFamily: fonts.brandBold,
              letterSpacing: -0.2,
            }}
          >
            All Exercises
          </SPText>
          {!loading && (
            <SPText
              style={{
                color: theme.muted,
                fontSize: rf(12.5),
                marginTop: rs(2),
              }}
            >
              {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
              {planName ? ` · ${planName}` : ""}
            </SPText>
          )}
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View
          style={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[5]),
            flexDirection: "row",
            flexWrap: "wrap",
            gap: CARD_GAP,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SPSkeleton
              key={i}
              width={CARD_W}
              height={rs(190)}
              radius={radii.xl}
            />
          ))}
        </View>
      ) : exercises.length === 0 ? (
        <View style={styles.emptyWrap}>
          <SPText style={{ color: theme.muted, fontSize: rf(14) }}>
            No exercises in your current session yet.
          </SPText>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(e) => e.id}
          numColumns={2}
          columnWrapperStyle={{ gap: CARD_GAP }}
          contentContainerStyle={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[5]),
            paddingBottom: tabBarHeight + rs(spacing[8]),
            gap: CARD_GAP,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: e }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  width: CARD_W,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={[styles.thumb, { backgroundColor: "#111" }]}>
                {e.exercise.thumbnailUrl ? (
                  <Image
                    source={{ uri: e.exercise.thumbnailUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={200}
                  />
                ) : null}
              </View>
              <View style={styles.cardBody}>
                <SPText
                  style={{
                    color: theme.text,
                    fontSize: rf(13.5),
                    fontFamily: fonts.brandBold,
                  }}
                  numberOfLines={2}
                >
                  {e.exercise.name}
                </SPText>
                <SPText
                  style={{
                    color: theme.muted,
                    fontSize: rf(11),
                    marginTop: rs(4),
                  }}
                  numberOfLines={1}
                >
                  {formatSetsReps(e.repsScheme)}
                </SPText>
                {e.exercise.musclesWorked.length > 0 && (
                  <SPText
                    style={{
                      color: theme.accent,
                      fontSize: rf(10.5),
                      fontFamily: fonts.brandSemiBold,
                      marginTop: rs(4),
                      letterSpacing: 0.3,
                    }}
                    numberOfLines={1}
                  >
                    {e.exercise.musclesWorked.join(" · ").toUpperCase()}
                  </SPText>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: rs(spacing[4]),
  },
  backBtn: {
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    borderWidth: borders.base,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rs(layout.screenPaddingH),
  },
  card: {
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: rs(120),
  },
  cardBody: {
    padding: rs(spacing[3]),
  },
});
