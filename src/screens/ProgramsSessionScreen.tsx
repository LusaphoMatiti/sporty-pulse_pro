// ─────────────────────────────────────────────────────────────────────────
// View-all screen for the "Program Structure" section on TrainingScreen.
// Shows every session in the user's active program (Program Structure on
// Training only shows the first 4). This is the user's own active plan --
// there's no Pro/lock gating here, since they've already started it.
//
// Reuses /api/training (the same endpoint TrainingScreen calls) rather
// than adding a new route, since it already returns `allSessions` for the
// active instance -- see route.ts's `allSessions` field.
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
import { ChevronLeft, Clock, Check, PlayCircle } from "lucide-react-native";

import { SPText } from "../components/ui/SPText";
import { spacing, radii, fonts, layout } from "../theme";
import { useAppTheme } from "../theme/ThemeContext";
import { api } from "../lib/api";

// ─── Responsive scale — matches TrainingScreen's own local rs()/rf() so
// this screen feels identical in scale, since it's a direct extension of
// the Program Structure section there. ──────────────────────────────────

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

interface SessionSummary {
  sessionNumber: number;
  focus: string;
  estimatedMinutes: number;
  thumbnailUrl: string | null;
}

interface TrainingSummary {
  instanceId: string | null;
  planName?: string;
  currentSession?: number;
  totalSessions?: number;
  allSessions?: SessionSummary[];
}

export default function ProgramSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

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

  function handleSessionPress(session: SessionSummary) {
    if (!data || session.sessionNumber !== data.currentSession) return;
    // Only the CURRENT session is actionable. Route back through the
    // Training tab and let its existing handleStartNow() flow run (weight
    // sheet, correct instanceId, etc.) — same pattern GymProgramsScreen
    // already uses for "Start Session", rather than deep-linking into a
    // session route directly from here.
    router.push({
      pathname: "/(tabs)/training",
      params: { autoStart: "1" },
    });
  }

  const sessions = data?.allSessions ?? [];

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
              {data?.totalSessions ?? sessions.length} sessions total
            </SPText>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={[styles.fill, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : !data?.instanceId || sessions.length === 0 ? (
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
            paddingBottom: insets.bottom + rs(spacing[8]),
            gap: rs(spacing[3]),
          }}
        >
          {sessions.map((session, i) => {
            const isCurrent = session.sessionNumber === data.currentSession;
            const isCompleted =
              data.currentSession != null &&
              session.sessionNumber < data.currentSession;

            return (
              <Animated.View
                key={session.sessionNumber}
                entering={FadeIn.duration(240).delay(i * 30)}
              >
                <Pressable
                  onPress={() => handleSessionPress(session)}
                  disabled={!isCurrent}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isCurrent ? theme.accent : theme.border,
                      opacity:
                        pressed && isCurrent ? 0.85 : isCompleted ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.sessionThumb,
                      { backgroundColor: theme.raised, overflow: "hidden" },
                    ]}
                  >
                    {session.thumbnailUrl ? (
                      <Image
                        source={{ uri: session.thumbnailUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : null}
                    {isCompleted && (
                      <View
                        style={[
                          styles.completedBadge,
                          { backgroundColor: theme.accent },
                        ]}
                      >
                        <Check size={rs(12)} color={theme.bg} strokeWidth={3} />
                      </View>
                    )}
                  </View>

                  <View style={styles.sessionBody}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: rs(6),
                      }}
                    >
                      <SPText
                        style={{
                          color: theme.muted,
                          fontSize: rf(11),
                          fontFamily: fonts.brandSemiBold,
                          letterSpacing: 0.6,
                        }}
                      >
                        SESSION {session.sessionNumber}
                      </SPText>
                      {isCurrent && (
                        <View
                          style={[
                            styles.upNextPill,
                            { backgroundColor: theme.accentDim },
                          ]}
                        >
                          <SPText
                            style={{
                              color: theme.accent,
                              fontSize: rf(10),
                              fontFamily: fonts.brandBold,
                              letterSpacing: 0.4,
                            }}
                          >
                            UP NEXT
                          </SPText>
                        </View>
                      )}
                    </View>
                    <SPText
                      numberOfLines={1}
                      style={{
                        color: theme.text,
                        fontSize: rf(16),
                        fontFamily: fonts.brandBold,
                        lineHeight: rf(21),
                        marginTop: rs(2),
                      }}
                    >
                      {session.focus}
                    </SPText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: rs(6),
                        marginTop: rs(6),
                      }}
                    >
                      <Clock
                        size={rs(12)}
                        color={theme.muted}
                        strokeWidth={2}
                      />
                      <SPText style={{ color: theme.muted, fontSize: rf(12) }}>
                        {session.estimatedMinutes} min
                      </SPText>
                    </View>
                  </View>

                  {isCurrent && (
                    <PlayCircle
                      size={rs(22)}
                      color={theme.accent}
                      strokeWidth={1.75}
                    />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
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
    position: "relative",
  },
  completedBadge: {
    position: "absolute",
    top: rs(4),
    right: rs(4),
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    alignItems: "center",
    justifyContent: "center",
  },
  sessionBody: { flex: 1, minWidth: 0 },
  upNextPill: {
    borderRadius: rs(radii.full),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
  },
});
