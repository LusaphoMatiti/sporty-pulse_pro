// ─────────────────────────────────────────────────────────────────────────
// View-all screen for the "Other Programs" section on TrainingScreen.
// The horizontal strip there is Pro-gated with a simple binary rule
// (locked if not Pro, full stop) — deliberately NOT the richer
// Free/Trial/Purchased/Pro model ProgramsScreen uses. This screen mirrors
// that same simple rule, since it's an expansion of that strip, not a
// replacement for the full catalog at /(tabs)/programs.
//
// Reuses /api/training (same as TrainingScreen) for allPrograms/tier/planId
// rather than adding a new route.
// ─────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ChevronLeft,
  Lock,
  Sprout,
  TrendingUp,
  Crown,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SPText } from "../components/ui/SPText";
import { SPButton } from "../components/ui/SPButton";
import UpgradePrompt from "../components/ui/Upgradeprompts";
import { spacing, radii, borders, fonts, layout } from "../theme";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { api } from "../lib/api";
import { CACHE_KEYS } from "../lib/cacheKeys";
import type { TrainingTier } from "../types/session";

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

// ─── Types ──────────────────────────────────────────────────────────────

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

interface TrainingSummary {
  instanceId: string | null;
  planId?: string;
  tier?: TrainingTier;
  allPrograms?: ProgramStub[];
}

const MUSCLE_LABEL: Record<string, string> = {
  FULLBODY: "Full Body",
  UPPER: "Upper Body",
  LOWER: "Lower Body",
  CORE: "Core",
};

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

export default function OtherProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrainingSummary | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<ProgramStub | null>(null);
  const [switchLevel, setSwitchLevel] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  >("BEGINNER");
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.get<{ success: boolean; data: TrainingSummary }>(
        "/api/training",
      );
      setData(raw?.data ?? null);
    } catch (err) {
      console.error("[OtherProgramsScreen] failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isPro = data?.tier === "PRO";

  function isProgramLocked(_program: ProgramStub): boolean {
    return !isPro;
  }

  const otherPrograms = (data?.allPrograms ?? []).filter(
    (p) => p.id !== data?.planId,
  );
  const unlockedPrograms = otherPrograms.filter((p) => !isProgramLocked(p));
  const lockedPrograms = otherPrograms.filter((p) => isProgramLocked(p));
  const sortedPrograms = [...unlockedPrograms, ...lockedPrograms];

  function handleProgramPress(program: ProgramStub) {
    if (isProgramLocked(program)) {
      setShowUpgradePrompt(true);
      return;
    }
    setSwitchTarget(program);
    setSwitchLevel("BEGINNER");
  }

  async function handleConfirmSwitch() {
    if (!switchTarget) return;
    setSwitching(true);
    try {
      await api.post("/api/programs/start", {
        planId: switchTarget.id,
        level: switchLevel,
      });
      await AsyncStorage.removeItem(CACHE_KEYS.training);
      setSwitchTarget(null);
      router.replace("/(tabs)/training" as any);
    } catch (err) {
      console.error("[OtherProgramsScreen] failed to switch program:", err);
    } finally {
      setSwitching(false);
    }
  }

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
            onPress={() => router.back()}
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
              style={{
                color: theme.text,
                fontSize: rf(20),
                fontFamily: fonts.brandBold,
              }}
            >
              Other Programs
            </SPText>
            <SPText
              style={{ color: theme.muted, fontSize: rf(12), marginTop: rs(2) }}
            >
              {sortedPrograms.length} programs
            </SPText>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={[styles.fill, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : sortedPrograms.length === 0 ? (
        <View style={[styles.fill, styles.centered]}>
          <SPText style={{ color: theme.muted, fontSize: rf(14) }}>
            No other programs available yet.
          </SPText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[4]),
            paddingBottom: tabBarHeight + rs(spacing[8]),
            gap: rs(spacing[3]),
          }}
        >
          {sortedPrograms.map((program, i) => {
            const isLocked = isProgramLocked(program);
            return (
              <Animated.View
                key={program.id}
                entering={FadeIn.duration(240).delay(i * 30)}
              >
                <Pressable
                  onPress={() => handleProgramPress(program)}
                  style={({ pressed }) => [
                    styles.programCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.programThumb}>
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
                      <View style={styles.lockOverlay}>
                        <Lock size={rs(16)} color="#fff" strokeWidth={2} />
                      </View>
                    )}
                  </View>
                  <View style={styles.programBody}>
                    <SPText
                      style={{
                        color: theme.muted,
                        fontSize: rf(10),
                        fontFamily: fonts.brandSemiBold,
                        letterSpacing: 0.8,
                      }}
                      numberOfLines={1}
                    >
                      {(
                        MUSCLE_LABEL[program.muscleGroup] ?? program.muscleGroup
                      ).toUpperCase()}
                    </SPText>
                    <SPText
                      style={{
                        color: theme.text,
                        fontSize: rf(15),
                        fontFamily: fonts.brandBold,
                        marginTop: rs(2),
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
                      {program.durationWeeks}W · {program.sessionsPerWeek}×/wk
                    </SPText>
                    {isLocked && (
                      <SPText
                        style={{
                          color: theme.accent,
                          fontSize: rf(11),
                          fontFamily: fonts.brandSemiBold,
                          marginTop: rs(4),
                        }}
                      >
                        Go Pro to unlock
                      </SPText>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <UpgradePrompt
        trigger="upgrade_required"
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => router.push("/pricing" as any)}
      />

      {switchTarget && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setSwitchTarget(null)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setSwitchTarget(null)}
          >
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  paddingBottom: insets.bottom + rs(spacing[6]),
                },
              ]}
            >
              <View
                style={[styles.handle, { backgroundColor: theme.muted + "55" }]}
              />
              <SPText
                style={{
                  color: theme.text,
                  fontSize: rf(20),
                  fontFamily: fonts.brandBold,
                  marginBottom: rs(4),
                }}
              >
                Switch Program
              </SPText>
              <SPText
                style={{
                  color: theme.muted,
                  fontSize: rf(13),
                  marginBottom: rs(spacing[6]),
                }}
              >
                {switchTarget.name} ·{" "}
                {MUSCLE_LABEL[switchTarget.muscleGroup] ??
                  switchTarget.muscleGroup}
              </SPText>
              <SPText
                style={{
                  color: theme.text,
                  fontSize: rf(14),
                  fontFamily: fonts.brandSemiBold,
                  marginBottom: rs(spacing[3]),
                }}
              >
                Select your level
              </SPText>
              <View
                style={{ gap: rs(spacing[3]), marginBottom: rs(spacing[6]) }}
              >
                {LEVELS.map((l) => {
                  const active = switchLevel === l.key;
                  const LevelIcon = l.lucideIcon;
                  return (
                    <Pressable
                      key={l.key}
                      onPress={() => setSwitchLevel(l.key)}
                      style={[
                        styles.levelOption,
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
                          styles.radio,
                          {
                            borderColor: active
                              ? theme.accent
                              : theme.muted + "88",
                          },
                        ]}
                      >
                        {active && (
                          <View
                            style={[
                              styles.radioDot,
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
                            marginBottom: rs(2),
                          }}
                        >
                          <LevelIcon
                            size={14}
                            color={active ? theme.accent : theme.muted}
                            strokeWidth={2}
                          />
                          <SPText
                            style={{
                              fontFamily: fonts.brandSemiBold,
                              color: active ? theme.accent : theme.text,
                              fontSize: rf(14),
                            }}
                          >
                            {l.label}
                          </SPText>
                        </View>
                        <SPText
                          style={{ color: theme.muted, fontSize: rf(12) }}
                        >
                          {l.description}
                        </SPText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <SPButton onPress={handleConfirmSwitch} disabled={switching}>
                {switching ? "Switching…" : "Start Program"}
              </SPButton>
              <Pressable
                onPress={() => setSwitchTarget(null)}
                style={{ marginTop: rs(spacing[4]), alignItems: "center" }}
              >
                <SPText style={{ color: theme.muted, fontSize: rf(13) }}>
                  Cancel
                </SPText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
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
  programCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: rs(20),
    overflow: "hidden",
  },
  programThumb: {
    width: rs(96),
    height: rs(96),
    position: "relative",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  programBody: { flex: 1, minWidth: 0, padding: rs(spacing[3]) },
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
  },
  radioDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
  },
});
