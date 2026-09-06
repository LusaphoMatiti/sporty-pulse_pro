import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  SectionList,
  Pressable,
  FlatList,
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

// NOTE: this import assumes collections.tsx sits in the same folder as
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

interface TrainingCollectionsResponse {
  planId: string | null;
  tier: TrainingTier;
  allPrograms: ProgramStub[];
}

type Section = { title: string; key: string; data: ProgramStub[] };

// ─── Screen ───────────────────────────────────────────────────────────────

export default function CollectionsScreen() {
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
        data: TrainingCollectionsResponse;
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

  // Group by `collection`. Plans without a collection (null/empty) aren't
  // part of a curated series, so they're left out of this view rather than
  // dumped into a catch-all bucket.
  const sections: Section[] = useMemo(() => {
    const byCollection = new Map<string, ProgramStub[]>();
    for (const p of allPrograms) {
      if (!p.collection) continue;
      const list = byCollection.get(p.collection) ?? [];
      list.push(p);
      byCollection.set(p.collection, list);
    }
    return Array.from(byCollection.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => ({ key: name, title: name, data }));
  }, [allPrograms]);

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
          Collections
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
            <SPSkeleton key={i} height={rs(160)} radius={radii.xl} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(program) => program.id}
          renderItem={() => null}
          contentContainerStyle={{
            paddingHorizontal: rs(layout.screenPaddingH),
            paddingTop: rs(spacing[4]),
            paddingBottom: insets.bottom + rs(spacing[8]),
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: rs(spacing[5]),
                marginBottom: rs(spacing[3]),
              }}
            >
              <SPText
                style={{
                  color: theme.text,
                  fontSize: rf(16),
                  fontFamily: fonts.brandBold,
                }}
              >
                {section.title}
              </SPText>
              <SPText style={{ color: theme.muted, fontSize: rf(12) }}>
                {section.data.length} Program
                {section.data.length === 1 ? "" : "s"}
              </SPText>
            </View>
          )}
          renderSectionFooter={({ section }) => (
            <FlatList
              data={section.data}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: rs(spacing[3]) }}
              keyExtractor={(p) => p.id}
              renderItem={({ item: program }) => {
                const isActive = program.id === planId;
                const isLocked = !isActive && isProgramLocked(program);
                return (
                  <Pressable
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
                          color: theme.muted,
                          fontSize: rf(10),
                          fontFamily: fonts.brandSemiBold,
                          letterSpacing: 0.6,
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
              }}
            />
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
    width: rs(170),
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    overflow: "hidden",
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
