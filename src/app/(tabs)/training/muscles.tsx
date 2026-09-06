import React, { useCallback, useState } from "react";
import {
  View,
  SectionList,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "../../../lib/cacheKeys";
import { SPText } from "../../../components/ui/SPText";
import { SPSkeleton } from "../../../components/ui/SPSkeleton";
import UpgradePrompt from "../../../components/ui/Upgradeprompts";
import { colors, spacing, radii, borders, fonts, layout } from "../../../theme";
import { useAppTheme } from "../../../theme/ThemeContext";
import { api } from "../../../lib/api";
import type { TrainingTier } from "../../../types/session";
import {
  ProgramStub,
  SwitchProgramModal,
  MUSCLE_LABEL,
  LEVELS,
} from "../../../screens/TrainingScreen";

// NOTE: this import assumes muscles.tsx sits in the same folder as
// TrainingScreen.tsx (a sibling of program-sessions.tsx / other-programs.tsx).
// Adjust the "./TrainingScreen" path if your project structure differs.

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

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrainingMusclesResponse {
  planId: string | null;
  tier: TrainingTier;
  allPrograms: ProgramStub[];
}

const MUSCLE_GROUP_ORDER = ["UPPER", "LOWER", "CORE", "FULLBODY"];

type Section = { title: string; key: string; data: ProgramStub[][] };

// ─── Screen ───────────────────────────────────────────────────────────────

export default function BrowseByMuscleScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<string | null>(null);
  const [tier, setTier] = useState<TrainingTier>("FREE");
  const [allPrograms, setAllPrograms] = useState<ProgramStub[]>([]);

  const [switchTarget, setSwitchTarget] = useState<ProgramStub | null>(null);
  const [switchLevel, setSwitchLevel] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  >("BEGINNER");
  const [switching, setSwitching] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const raw = await api.get<{
        success: boolean;
        data: TrainingMusclesResponse;
      }>("/api/training");
      const d = raw?.data ?? null;
      setAllPrograms(d?.allPrograms ?? []);
      setPlanId(d?.planId ?? null);
      setTier(d?.tier ?? "FREE");
    } catch {
      setAllPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const isPro = tier === "PRO";
  function isProgramLocked(_program: ProgramStub): boolean {
    return !isPro;
  }

  const sections: Section[] = MUSCLE_GROUP_ORDER.filter((mg) =>
    allPrograms.some((p) => p.muscleGroup === mg),
  ).map((mg) => {
    const rows = allPrograms.filter((p) => p.muscleGroup === mg);
    // Chunk into pairs for a 2-up row layout within each section
    const chunked: ProgramStub[][] = [];
    for (let i = 0; i < rows.length; i += 2) {
      chunked.push(rows.slice(i, i + 2));
    }
    return { key: mg, title: MUSCLE_LABEL[mg] ?? mg, data: chunked };
  });

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
      router.back();
    } catch {
    } finally {
      setSwitching(false);
    }
  }, [switchTarget, switchLevel, router]);

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
        <SPText
          style={{
            color: theme.text,
            fontSize: rf(22),
            fontFamily: fonts.brandBold,
            letterSpacing: -0.2,
            marginLeft: rs(spacing[3]),
          }}
        >
          Browse by Muscle
        </SPText>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View
          style={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[5]),
            gap: rs(spacing[3]),
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SPSkeleton key={i} height={rs(140)} radius={radii.xl} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(pair) => pair.map((p) => p.id).join("-")}
          contentContainerStyle={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[4]),
            paddingBottom: insets.bottom + rs(spacing[8]),
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <SPText
              style={{
                color: theme.text,
                fontSize: rf(16),
                fontFamily: fonts.brandBold,
                marginTop: rs(spacing[5]),
                marginBottom: rs(spacing[3]),
              }}
            >
              {section.title}
            </SPText>
          )}
          renderItem={({ item: pair }) => (
            <View style={{ flexDirection: "row", gap: rs(spacing[3]) }}>
              {pair.map((program) => {
                const isActive = program.id === planId;
                const isLocked = !isActive && isProgramLocked(program);
                return (
                  <Pressable
                    key={program.id}
                    onPress={() => {
                      if (isActive) return;
                      if (isLocked) setShowUpgradePrompt(true);
                      else {
                        setSwitchTarget(program);
                        setSwitchLevel("BEGINNER");
                      }
                    }}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isActive ? theme.accent : theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.thumbWrap}>
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
                      {isActive && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: theme.accent },
                          ]}
                        >
                          <SPText
                            style={{
                              color: "#000",
                              fontSize: rf(9.5),
                              fontFamily: fonts.brandSemiBold,
                              letterSpacing: 0.4,
                            }}
                          >
                            ACTIVE
                          </SPText>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardBody}>
                      <SPText
                        style={{
                          color: theme.text,
                          fontSize: rf(14),
                          fontFamily: fonts.brandBold,
                          lineHeight: rf(18),
                        }}
                        numberOfLines={2}
                      >
                        {program.name}
                      </SPText>
                      <SPText
                        style={{
                          color: theme.muted,
                          fontSize: rf(11.5),
                          marginTop: rs(3),
                        }}
                      >
                        {program.durationWeeks}W · {program.sessionsPerWeek}×/WK
                      </SPText>
                    </View>
                  </Pressable>
                );
              })}
              {pair.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          )}
        />
      )}

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
      <UpgradePrompt
        trigger="upgrade_required"
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => router.push("/pricing" as any)}
      />
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
  card: {
    flex: 1,
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: rs(spacing[3]),
  },
  thumbWrap: {
    width: "100%",
    height: rs(110),
    position: "relative",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    position: "absolute",
    top: rs(8),
    left: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.sm),
  },
  cardBody: {
    padding: rs(spacing[3]),
  },
});
