/**
 * SessionScreen — Active workout session UI (Redesigned)
 *
 * Route: app/(tabs)/training/session/[instanceId]/[sessionNumber].tsx
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SkipBack,
  SkipForward,
  Check,
  Volume2,
  Maximize,
  Play,
  Pause,
  ChevronRight,
  Layers,
  Repeat,
  EyeOff,
  Eye,
  PictureInPicture2,
  X,
  Hand,
  Clock,
  Flame,
} from "lucide-react-native";

import { useAppTheme } from "../theme/ThemeContext";
import type { AppTheme } from "../theme/ThemeContext";
import { useResponsive } from "../hooks/useResponsive";
import { SPText } from "../components/ui/SPText";
import { SPIcon } from "../components/icons/SPIcon";
import { fonts } from "../theme";

import { PauseExitSheet } from "../components/session/PauseExitSheet";

import { useSessionTimer } from "../hooks/useSessionTimer";
import { useRestTimer } from "../hooks/useRestTimer";
import { useSessionState } from "../hooks/useSessionState";

import type { SessionScreenProps } from "../types/session";
import type { IconName } from "../components/icons/SPIcon";

// ─── Theme ────────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgressionType = "VOLUME" | "LOAD" | "DENSITY";

interface ProgressionContext {
  week: number;
  progressionType: ProgressionType;
  weeklyChange: string | null;
}

interface SessionScreenPropsWithProgression extends SessionScreenProps {
  progressionContext?: ProgressionContext | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLevel(level: string) {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Video playback clock — m:ss, no leading zero on minutes (matches the
// reference design's "0:00 / 3:00" style)
function formatVideoTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${pad(secs)}`;
}

const MUSCLE_ICON_MAP: Record<string, IconName> = {
  UPPER: "muscleUpper",
  LOWER: "muscleLower",
  CORE: "muscleCore",
  FULLBODY: "muscleFullbody",
  Chest: "muscleUpper",
  Shoulders: "muscleUpper",
  Triceps: "muscleUpper",
  Biceps: "muscleUpper",
  Back: "muscleUpper",
  "Upper Back": "muscleUpper",
  "Lower Back": "muscleCore",
  Lats: "muscleUpper",
  Traps: "muscleUpper",
  Forearms: "muscleUpper",
  Quads: "muscleLower",
  Hamstrings: "muscleLower",
  Glutes: "muscleLower",
  Calves: "muscleLower",
  "Hip Flexors": "muscleLower",
  Adductors: "muscleLower",
  Abductors: "muscleLower",
  Abs: "muscleCore",
  Obliques: "muscleCore",
  Core: "muscleCore",
  "Full Body": "muscleFullbody",
  Cardio: "muscleFullbody",
};

function muscleToIcon(muscles: string[] | undefined): IconName {
  if (!muscles || muscles.length === 0) return "training";
  return MUSCLE_ICON_MAP[muscles[0]] ?? "training";
}

// ─── Workout Completion ────────────────────────────────────────────────────────

const COMPLETION_QUOTES = [
  "Consistency compounds.",
  "Momentum beats motivation.",
  "Your future self noticed.",
  "Small wins become identity.",
  "Progress happened today.",
] as const;

// Fixed particle positions — deterministic, no Math.random at render time
const PARTICLES = [
  { x: -88, y: -135, size: 3, delay: 160 },
  { x: 80, y: -115, size: 2, delay: 300 },
  { x: -132, y: -18, size: 2, delay: 140 },
  { x: 124, y: 12, size: 3, delay: 360 },
  { x: -64, y: 128, size: 2, delay: 240 },
  { x: 88, y: 104, size: 2, delay: 290 },
  { x: 14, y: -152, size: 3, delay: 200 },
  { x: -108, y: -68, size: 2, delay: 420 },
] as const;

function CompletionParticle({
  x,
  y,
  size,
  delay,
  color,
  visible,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
  visible: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.55, { duration: 420 }),
        withDelay(480, withTiming(0, { duration: 700 })),
      ),
    );
    translateY.value = withDelay(delay, withTiming(-22, { duration: 1600 }));
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          top: "50%",
          left: "50%",
          marginLeft: x,
          marginTop: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

// ─── WorkoutCompleteOverlay ────────────────────────────────────────────────────

function WorkoutCompleteOverlay({
  visible,
  workoutSeconds,
  dayNumber,
  accentColor,
  onContinue,
  onViewSummary,
}: {
  visible: boolean;
  workoutSeconds: number;
  dayNumber: number;
  accentColor: string;
  onContinue: () => void;
  onViewSummary: () => void;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  // ── Animated values ────────────────────────────────────────────────────────
  const backdropOpacity = useSharedValue(0);
  const cardY = useSharedValue(72);
  const cardOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.85);
  const metricsOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(18);

  // ── Count-up state ─────────────────────────────────────────────────────────
  const [displaySec, setDisplaySec] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setDisplaySec(0);
    setDisplayPct(0);

    // 1 — backdrop fades in
    backdropOpacity.value = withTiming(1, { duration: 380 });

    // 2 — card slides up
    cardOpacity.value = withTiming(1, { duration: 300 });
    cardY.value = withSpring(0, { damping: 24, stiffness: 240, mass: 0.85 });

    // 3 — ring expands + glow pulses twice
    ringScale.value = withDelay(
      260,
      withSpring(1, { damping: 16, stiffness: 230 }),
    );
    glowOpacity.value = withDelay(320, withTiming(1, { duration: 280 }));
    glowScale.value = withDelay(
      320,
      withRepeat(
        withSequence(
          withTiming(1.18, { duration: 950 }),
          withTiming(0.92, { duration: 950 }),
        ),
        2,
        false,
      ),
    );

    // 4 — check mark appears
    checkOpacity.value = withDelay(540, withTiming(1, { duration: 260 }));

    // 5 — metrics fade in
    metricsOpacity.value = withDelay(660, withTiming(1, { duration: 320 }));

    // 6 — CTA rises up last
    ctaOpacity.value = withDelay(920, withTiming(1, { duration: 360 }));
    ctaTranslateY.value = withDelay(
      920,
      withSpring(0, { damping: 20, stiffness: 200 }),
    );

    // Count-up (ease-out cubic over 920ms)
    const t0 = Date.now();
    const countMs = 920;
    const interval = setInterval(() => {
      const t = Math.min((Date.now() - t0) / countMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplaySec(Math.round(eased * workoutSeconds));
      setDisplayPct(Math.round(eased * 100));
      if (t >= 1) clearInterval(interval);
    }, 16);

    return () => clearInterval(interval);
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const metricsStyle = useAnimatedStyle(() => ({
    opacity: metricsOpacity.value,
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  const quote = COMPLETION_QUOTES[dayNumber % COMPLETION_QUOTES.length];
  const dispMins = Math.floor(displaySec / 60);
  const dispSecs = displaySec % 60;
  const timeStr = `${String(dispMins).padStart(2, "0")}:${String(dispSecs).padStart(2, "0")}`;

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, wc.root]} pointerEvents="auto">
      {/* Dark backdrop — animates separately so card stays fully opaque */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, wc.backdrop, backdropStyle]}
        pointerEvents="none"
      />

      {/* Particles — tied to backdrop fade */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, backdropStyle]}
        pointerEvents="none"
      >
        {PARTICLES.map((p, i) => (
          <CompletionParticle
            key={i}
            x={p.x}
            y={p.y}
            size={p.size}
            delay={p.delay}
            color={accentColor}
            visible={visible}
          />
        ))}
      </Animated.View>

      {/* Card + CTA */}
      <View
        style={[
          wc.sheetWrap,
          { paddingBottom: Math.max(insets.bottom, 20) + 12 },
        ]}
        pointerEvents="box-none"
      >
        {/* Reward card */}
        <Animated.View style={[wc.card, cardStyle]}>
          {/* Success ring */}
          <View style={wc.ringWrap}>
            <Animated.View
              style={[
                wc.glowOuter,
                { backgroundColor: `${accentColor}09` },
                glowStyle,
              ]}
            />
            <Animated.View
              style={[
                wc.glowInner,
                { backgroundColor: `${accentColor}15` },
                glowStyle,
              ]}
            />
            <Animated.View
              style={[wc.ring, { borderColor: accentColor }, ringStyle]}
            >
              <View
                style={[wc.ringFill, { backgroundColor: `${accentColor}0D` }]}
              />
              <Animated.View style={checkStyle}>
                <Check size={36} color={accentColor} strokeWidth={1.5} />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Copy */}
          <SPText style={[wc.title, { color: "#F0EDE4" }]}>Great Job.</SPText>
          <SPText style={[wc.subtitle, { color: "#9A9A90" }]}>
            You completed today's workout
          </SPText>

          {/* Session snapshot — 3 metrics */}
          <Animated.View style={[wc.metrics, metricsStyle]}>
            <View style={wc.metricItem}>
              <Clock size={13} color={accentColor} strokeWidth={1.8} />
              <SPText style={[wc.metricValue, { color: "#F0EDE4" }]}>
                {timeStr}
              </SPText>
              <SPText style={[wc.metricLabel, { color: "#9A9A90" }]}>
                WORKOUT
              </SPText>
            </View>

            <View
              style={[
                wc.metricSep,
                { backgroundColor: "rgba(255,255,255,0.08)" },
              ]}
            />

            <View style={wc.metricItem}>
              <Check size={13} color={accentColor} strokeWidth={1.8} />
              <SPText style={[wc.metricValue, { color: "#F0EDE4" }]}>
                {displayPct}%
              </SPText>
              <SPText style={[wc.metricLabel, { color: "#9A9A90" }]}>
                DONE
              </SPText>
            </View>

            <View
              style={[
                wc.metricSep,
                { backgroundColor: "rgba(255,255,255,0.08)" },
              ]}
            />

            <View style={wc.metricItem}>
              <Flame size={13} color={accentColor} strokeWidth={1.8} />
              <SPText style={[wc.metricValue, { color: "#F0EDE4" }]}>
                Day {dayNumber}
              </SPText>
              <SPText style={[wc.metricLabel, { color: "#9A9A90" }]}>
                SESSION
              </SPText>
            </View>
          </Animated.View>

          {/* Divider */}
          <View
            style={[wc.divider, { backgroundColor: "rgba(255,255,255,0.08)" }]}
          />

          {/* Motivational quote */}
          <SPText style={[wc.quote, { color: "#6B6B62" }]}>{quote}</SPText>
        </Animated.View>

        {/* CTA + secondary */}
        <Animated.View style={[wc.ctaWrap, ctaStyle]}>
          <PressableScale
            onPress={onContinue}
            style={[wc.cta, { backgroundColor: accentColor }]}
          >
            <SPText style={[wc.ctaText, { color: "#0A0A0A" }]}>CONTINUE</SPText>
          </PressableScale>
          <Pressable
            onPress={onViewSummary}
            hitSlop={12}
            style={wc.secondaryBtn}
          >
            <SPText style={[wc.secondaryText, { color: "#9A9A90" }]}>
              View Session Summary
            </SPText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── useFlowMode ──────────────────────────────────────────────────────────────
// Tracks inactivity and enters cinematic flow mode after timeout.
// Default: 120s (spec range 90–180s — pass timeoutMs to override).
// Any touch anywhere resets the timer and exits flow mode.

const FLOW_TIMEOUT_MS = 120_000;

// Must match the key written by TrainingScreen
const SP_EXERCISE_THUMBNAILS_KEY = "sp_exercise_thumbnails_v1";

// ─── Cloudinary client-side URL resizer ───────────────────────────────────────
// Pure string manipulation — no server imports, no cloudinary SDK.
// Swaps the transform segment in a stored Cloudinary URL so each slot
// gets the right resolution and crop without any backend changes.
//
// Input:  https://res.cloudinary.com/.../upload/w_400,h_300,c_fit,.../<publicId>
// Output: https://res.cloudinary.com/.../upload/<newTransform>/<publicId>

const CL = {
  videoCard: "w_1200,h_675,c_fill,f_auto,q_auto", // 16:9, crisp on 3× DPR
  flowMode: "w_1080,h_1350,c_fill,f_auto,q_auto", // portrait fullscreen
  upNext: "w_400,h_320,c_fill,f_auto,q_auto", // 110×90 card slot
} as const;

function cloudinaryResize(
  url: string | null | undefined,
  transform: string,
): string | undefined {
  if (!url?.includes("res.cloudinary.com/")) return url ?? undefined;
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx === -1) return url;
  const base = url.slice(0, uploadIdx + "/upload/".length);
  const after = url.slice(uploadIdx + "/upload/".length);
  // Strip the existing transform (everything before the first "/")
  const slashIdx = after.indexOf("/");
  if (slashIdx === -1) return `${base}${transform}/${after}`;
  return `${base}${transform}/${after.slice(slashIdx + 1)}`;
}

function useFlowMode(timeoutMs = FLOW_TIMEOUT_MS) {
  const [isFlowMode, setIsFlowMode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFlow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsFlowMode(true), timeoutMs);
  }, [timeoutMs]);

  const resetFlow = useCallback(() => {
    setIsFlowMode(false);
    scheduleFlow();
  }, [scheduleFlow]);

  useEffect(() => {
    scheduleFlow();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleFlow]);

  return { isFlowMode, resetFlow };
}

// ─── PressableScale ───────────────────────────────────────────────────────────

function PressableScale({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const spring = { damping: 18, stiffness: 260, mass: 0.8 };

  return (
    <Animated.View style={[aStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!onPress || disabled) return;
          scale.value = withSpring(0.93, spring);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, spring);
        }}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── ProgressHeader ───────────────────────────────────────────────────────────

function ProgressHeader({
  current,
  total,
  accentColor,
}: {
  current: number;
  total: number;
  accentColor: string;
}) {
  const { theme } = useAppTheme();
  const progress = total > 0 ? current / total : 0;
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(progress, { duration: 400 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as `${number}%`,
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.progressHeader}>
      <View style={[s.progressTrack, { backgroundColor: theme.border }]}>
        <Animated.View
          style={[s.progressFill, fillStyle, { backgroundColor: accentColor }]}
        />
      </View>
      <SPText style={[s.progressCount, { color: theme.muted2 }]}>
        {current} / {total}
      </SPText>
    </Animated.View>
  );
}

// ─── ExerciseHeader ───────────────────────────────────────────────────────────

function ExerciseHeader({
  level,
  focus,
  exerciseName,
  muscles,
  accentColor,
  onOpenPip,
  rs,
}: {
  level: string;
  focus: string;
  exerciseName: string;
  muscles: string[];
  accentColor: string;
  onOpenPip?: () => void;
  rs: (...args: number[]) => number;
}) {
  const { theme } = useAppTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(40)}
      style={s.exerciseHeader}
    >
      <View style={s.exerciseHeaderTop}>
        <View style={{ flex: 1 }}>
          <SPText style={[s.exerciseMeta, { color: accentColor }]}>
            {level.toUpperCase()} · {focus.toUpperCase()}
          </SPText>
          <SPText
            style={[
              s.exerciseTitle,
              { color: theme.text, fontSize: rs(24, 26, 30) },
            ]}
            numberOfLines={2}
          >
            {exerciseName}
          </SPText>
        </View>
        <PressableScale onPress={onOpenPip} style={s.pipButtonWrap}>
          <View
            style={[
              s.exerciseIconBox,
              {
                backgroundColor: theme.surface2,
                borderColor: theme.border,
              },
            ]}
          >
            <PictureInPicture2
              size={rs(20, 22)}
              color={accentColor}
              strokeWidth={1.8}
            />
          </View>
          <SPText style={[s.pipLabel, { color: theme.muted }]}>PIP</SPText>
        </PressableScale>
      </View>

      {/* Muscle pills */}
      {muscles.length > 0 && (
        <View style={s.musclePillRow}>
          {muscles.slice(0, 3).map((m) => (
            <View
              key={m}
              style={[
                s.musclePill,
                {
                  backgroundColor: accentColor + "22",
                  borderColor: accentColor + "44",
                },
              ]}
            >
              <SPText style={[s.musclePillText, { color: accentColor }]}>
                {m.toUpperCase()}
              </SPText>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ─── VideoPlayerCard ──────────────────────────────────────────────────────────

function VideoPlayerCard({
  durationSeconds = 180,
  thumbnailUrl,
  onHideVideo,
  rs,
}: {
  durationSeconds?: number;
  thumbnailUrl?: string | null;
  onHideVideo?: () => void;
  rs: (...args: number[]) => number;
}) {
  const { theme, isDark } = useAppTheme();
  const [playing, setPlaying] = useState(false);

  // ── Video's own playback clock — independent of the workout timer ─────────
  const [videoSeconds, setVideoSeconds] = useState(0);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

    if (playing) {
      videoIntervalRef.current = setInterval(() => {
        setVideoSeconds((s) => {
          if (s + 1 >= durationSeconds) {
            if (videoIntervalRef.current)
              clearInterval(videoIntervalRef.current);
            setPlaying(false);
            return durationSeconds;
          }
          return s + 1;
        });
      }, 1000);
    }

    return () => {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [playing, durationSeconds]);

  const videoProgress =
    durationSeconds > 0 ? videoSeconds / durationSeconds : 0;
  const currentTime = formatVideoTime(videoSeconds);
  const duration = formatVideoTime(durationSeconds);

  // ── Flow-state controls: visible on tap, auto-fade after 3s ────────────────
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity = useSharedValue(1);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    controlsOpacity.value = withTiming(controlsVisible ? 1 : 0, {
      duration: 220,
    });
  }, [controlsVisible, controlsOpacity]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const overlayPointerEvents = controlsVisible ? "auto" : "none";

  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(60)}
      style={[s.videoCard, { backgroundColor: isDark ? "#000000" : "#F2F2F2" }]}
    >
      {/* Thumbnail area — tapping anywhere brings controls back */}
      <Pressable style={s.videoThumb} onPress={showControls}>
        {/* Thumbnail — fills behind controls; swap for Video component when ready */}
        {thumbnailUrl ? (
          <Image
            source={cloudinaryResize(thumbnailUrl, CL.videoCard) ?? undefined}
            style={[
              s.videoThumbInner,
              { backgroundColor: isDark ? "#000000" : "#F2F2F2" },
            ]}
            contentFit="contain"
          />
        ) : (
          <View
            style={[
              s.videoThumbInner,
              { backgroundColor: isDark ? "#000000" : "#F2F2F2" },
            ]}
          />
        )}

        {/* Top-right: hide video */}
        <Animated.View
          style={[s.videoTopBar, overlayStyle]}
          pointerEvents={overlayPointerEvents}
        >
          <Pressable style={s.videoMenuBtn} hitSlop={8} onPress={onHideVideo}>
            <EyeOff size={18} color="#fff" strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Centre play button */}
        <Animated.View
          style={overlayStyle}
          pointerEvents={overlayPointerEvents}
        >
          <PressableScale
            onPress={() => {
              setPlaying((p) => !p);
              showControls();
            }}
          >
            <View style={s.videoPlayBtn}>
              {playing ? (
                <Pause size={28} color="#fff" fill="#fff" strokeWidth={0} />
              ) : (
                <Play size={28} color="#fff" fill="#fff" strokeWidth={0} />
              )}
            </View>
          </PressableScale>
        </Animated.View>

        {/* Bottom gradient overlay — always present so the image never looks flat */}
        <View style={s.videoGradient} pointerEvents="none" />

        {/* Bottom controls */}
        <Animated.View
          style={[s.videoControls, overlayStyle]}
          pointerEvents={overlayPointerEvents}
        >
          <SPText style={s.videoTime}>{currentTime}</SPText>

          {/* Timeline */}
          <View style={s.videoTimeline}>
            <View
              style={[
                s.videoTimelineTrack,
                { backgroundColor: "rgba(255,255,255,0.25)" },
              ]}
            >
              <View
                style={[
                  s.videoTimelineFill,
                  {
                    width: `${videoProgress * 100}%` as `${number}%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
              {/* Scrubber dot */}
              <View
                style={[
                  s.videoScrubber,
                  {
                    left: `${videoProgress * 100}%` as `${number}%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
          </View>

          <SPText style={s.videoTime}>{duration}</SPText>

          <Pressable hitSlop={8}>
            <Volume2
              size={16}
              color="rgba(255,255,255,0.8)"
              strokeWidth={1.8}
            />
          </Pressable>

          <Pressable hitSlop={8}>
            <Maximize
              size={16}
              color="rgba(255,255,255,0.8)"
              strokeWidth={1.8}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── VideoHiddenCard ──────────────────────────────────────────────────────────
// Replaces the video area when the user hides it — never an empty container.

function VideoHiddenCard({
  workoutTime,
  completedSets,
  totalSets,
  nextExerciseName,
  accentColor,
  onShowVideo,
  rs,
}: {
  workoutTime: string;
  completedSets: number;
  totalSets: number;
  nextExerciseName?: string | null;
  accentColor: string;
  onShowVideo?: () => void;
  rs: (...args: number[]) => number;
}) {
  const { theme } = useAppTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      style={[
        s.hiddenCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={s.hiddenStatsRow}>
        <View style={s.hiddenStatItem}>
          <SPText
            style={[s.metricValue, { color: theme.text, fontSize: rs(22, 24) }]}
          >
            {workoutTime}
          </SPText>
          <SPText style={[s.metricLabel, { color: theme.muted }]}>TIME</SPText>
        </View>
        <View style={[s.metricDivider, { backgroundColor: theme.border }]} />
        <View style={s.hiddenStatItem}>
          <SPText
            style={[s.metricValue, { color: theme.text, fontSize: rs(22, 24) }]}
          >
            {completedSets} / {totalSets}
          </SPText>
          <SPText style={[s.metricLabel, { color: theme.muted }]}>SETS</SPText>
        </View>
      </View>

      {nextExerciseName ? (
        <View style={s.hiddenUpNextRow}>
          <SPText style={[s.upNextLabel, { color: theme.muted2 }]}>
            UP NEXT
          </SPText>
          <SPText
            style={[s.hiddenUpNextName, { color: theme.text }]}
            numberOfLines={1}
          >
            {nextExerciseName}
          </SPText>
        </View>
      ) : null}

      <PressableScale onPress={onShowVideo} style={s.showVideoBtn}>
        <Eye size={16} color={accentColor} strokeWidth={1.8} />
        <SPText style={[s.showVideoLabel, { color: accentColor }]}>
          SHOW VIDEO
        </SPText>
      </PressableScale>
    </Animated.View>
  );
}

// ─── PipOverlay ───────────────────────────────────────────────────────────────
// In-app floating mini-player (top-right). Note: this simulates PiP within the
// app's own screen — true OS-level PiP (floating over other apps) requires a
// native module and isn't achievable in pure Expo/RN.

function PipOverlay({
  visible,
  paused,
  exerciseName,
  onTogglePause,
  onClose,
  onExpand,
}: {
  visible: boolean;
  paused: boolean;
  exerciseName: string;
  onTogglePause: () => void;
  onClose: () => void;
  onExpand: () => void;
}) {
  const { theme } = useAppTheme();
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        s.pipOverlay,
        { backgroundColor: theme.raised, borderColor: theme.border },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onExpand}>
        <View style={s.pipThumb} />
      </Pressable>

      <Pressable style={s.pipCloseBtn} onPress={onClose} hitSlop={8}>
        <X size={12} color="#fff" strokeWidth={2.4} />
      </Pressable>

      <View style={s.pipFooter} pointerEvents="box-none">
        <SPText style={s.pipName} numberOfLines={1}>
          {exerciseName}
        </SPText>
        <View style={s.pipControls}>
          <Pressable onPress={onTogglePause} hitSlop={6}>
            {paused ? (
              <Play size={13} color="#fff" fill="#fff" strokeWidth={0} />
            ) : (
              <Pause size={13} color="#fff" fill="#fff" strokeWidth={0} />
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── FlowModeOverlay ──────────────────────────────────────────────────────────
// Full-screen cinematic "flow mode" shown after inactivity.
// Renders outside SafeAreaView so the video fills edge-to-edge.
// All transitions: 250ms fade in / 200ms fade out.

function FlowModeOverlay({
  visible,
  current,
  total,
  level,
  focus,
  exerciseName,
  workoutTime,
  thumbnailUrl,
  accentColor,
  onTap,
  onPip,
  onHideVideo,
}: {
  visible: boolean;
  current: number;
  total: number;
  level: string;
  focus: string;
  exerciseName: string;
  workoutTime: string;
  thumbnailUrl?: string | null;
  accentColor: string;
  onTap: () => void;
  onPip: () => void;
  onHideVideo: () => void;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  // ── Overlay fade ──────────────────────────────────────────────────────────
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 250 : 200,
    });
  }, [visible]);
  const overlayAnim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // ── Progress fill ─────────────────────────────────────────────────────────
  const progress = total > 0 ? current / total : 0;
  const fillW = useSharedValue(progress);
  useEffect(() => {
    fillW.value = withTiming(progress, { duration: 500 });
  }, [progress]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillW.value * 100}%` as `${number}%`,
  }));

  // ── Pulsing active dot ────────────────────────────────────────────────────
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!visible) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1100 }),
        withTiming(1, { duration: 1100 }),
      ),
      -1,
      false,
    );
  }, [visible]);
  const dotAnim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, fm.overlay, overlayAnim]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* ── Full-screen tap detector (renders first = below content in z-order) */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onTap} />

      {/* ── Layout — rendered after Pressable so it's on top in z-order ──── */}
      <View
        style={[
          fm.overlayContent,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Progress bar + step count */}
        <View style={[fm.progressRow, { paddingHorizontal: 16 }]}>
          <View
            style={[
              fm.progressTrack,
              { backgroundColor: "rgba(255,255,255,0.07)" },
            ]}
          >
            <Animated.View
              style={[
                fm.progressFill,
                fillStyle,
                { backgroundColor: accentColor },
              ]}
            />
          </View>
          <SPText style={[fm.progressCount, { color: "#9A9A90" }]}>
            {current} / {total}
          </SPText>
        </View>

        {/* Exercise identity */}
        <View
          style={[fm.identity, { paddingHorizontal: 16 }]}
          pointerEvents="box-none"
        >
          <View style={{ flex: 1 }}>
            <SPText style={[fm.exerciseMeta, { color: accentColor }]}>
              {level.toUpperCase()} · {focus.toUpperCase()}
            </SPText>
            <SPText style={[fm.exerciseTitle, { color: "#F0EDE4" }]}>
              {exerciseName}
            </SPText>
          </View>

          {/* PiP button — identical to normal screen */}
          <PressableScale onPress={onPip} style={s.pipButtonWrap}>
            <View
              style={[
                s.exerciseIconBox,
                {
                  backgroundColor: "rgba(26,31,35,0.85)",
                  borderColor: "rgba(255,255,255,0.10)",
                },
              ]}
            >
              <PictureInPicture2
                size={22}
                color={accentColor}
                strokeWidth={1.8}
              />
            </View>
            <SPText style={[s.pipLabel, { color: "#6B6B62" }]}>PIP</SPText>
          </PressableScale>
        </View>

        {/* Cinematic video area — fills remaining height */}
        <View style={fm.videoWrap} pointerEvents="box-none">
          <View style={[fm.videoFill, { backgroundColor: "#090b0c" }]}>
            {/* Thumbnail — fills the cinematic area while video isn't available */}
            {thumbnailUrl ? (
              <Image
                source={
                  cloudinaryResize(thumbnailUrl, CL.flowMode) ?? undefined
                }
                style={StyleSheet.absoluteFillObject}
                contentFit="contain"
              />
            ) : null}
            {/* Bottom vignette sits on top of image */}
            <View style={fm.videoVignette} />
          </View>

          {/* Hide-video button — top right of the video */}
          <PressableScale onPress={onHideVideo} style={fm.eyeBtn}>
            <View style={fm.eyeBtnInner}>
              <EyeOff size={18} color="#9A9A90" strokeWidth={1.8} />
            </View>
          </PressableScale>
        </View>

        {/* Bottom floating HUD + tap hint */}
        <View style={fm.bottomArea} pointerEvents="box-none">
          {/* Glass pill */}
          <View
            style={[
              fm.hudPill,
              {
                backgroundColor: "rgba(19,23,26,0.80)",
                borderColor: "rgba(255,255,255,0.06)",
              },
            ]}
          >
            <SPText
              style={[fm.hudLabel, { color: "#9A9A90" }]}
              numberOfLines={1}
            >
              {exerciseName.toUpperCase()}
            </SPText>
            <View
              style={[
                fm.hudDivider,
                { backgroundColor: "rgba(255,255,255,0.13)" },
              ]}
            />
            <SPText style={[fm.hudTime, { color: "#F0EDE4" }]}>
              {workoutTime}
            </SPText>
            <Animated.View
              style={[fm.hudDot, { backgroundColor: accentColor }, dotAnim]}
            />
          </View>

          {/* Tap hint */}
          <View style={fm.tapRow}>
            <Hand size={15} color="#6B6B62" strokeWidth={1.5} />
            <SPText style={[fm.tapHint, { color: "#6B6B62" }]}>
              Tap anywhere to show controls
            </SPText>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── MetricsCard ─────────────────────────────────────────────────────────────

function MetricsCard({
  totalReps,
  completedSets,
  totalSets,
  accentColor,
  rs,
}: {
  totalReps: number | string;
  completedSets: number;
  totalSets: number;
  accentColor: string;
  rs: (...args: number[]) => number;
}) {
  const { theme } = useAppTheme();
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(80)}>
      <View
        style={[
          s.metricsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {/* REPS */}
        <View style={s.metricItem}>
          <View style={s.metricIconRow}>
            <Repeat size={rs(14, 16)} color={theme.muted2} strokeWidth={1.8} />
          </View>
          <SPText
            style={[s.metricValue, { color: theme.text, fontSize: rs(26, 28) }]}
          >
            {totalReps}
          </SPText>
          <SPText style={[s.metricLabel, { color: theme.muted }]}>REPS</SPText>
        </View>

        <View style={[s.metricDivider, { backgroundColor: theme.border }]} />

        {/* SETS */}
        <View style={s.metricItem}>
          <View style={s.metricIconRow}>
            <Layers size={rs(14, 16)} color={accentColor} strokeWidth={1.8} />
          </View>
          <SPText
            style={[s.metricValue, { color: theme.text, fontSize: rs(26, 28) }]}
          >
            {completedSets} / {totalSets}
          </SPText>
          <SPText style={[s.metricLabel, { color: theme.muted }]}>SETS</SPText>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── UpNextCard ───────────────────────────────────────────────────────────────

function UpNextCard({
  exerciseName,
  equipment,
  thumbnailUrl,
  accentColor,
  rs,
}: {
  exerciseName: string;
  equipment?: string;
  thumbnailUrl?: string | null;
  accentColor: string;
  rs: (...args: number[]) => number;
}) {
  const { theme } = useAppTheme();
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(100)}>
      <View
        style={[
          s.upNextCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {/* Thumbnail */}
        {thumbnailUrl ? (
          <Image
            source={cloudinaryResize(thumbnailUrl, CL.upNext) ?? undefined}
            style={s.upNextThumb}
            contentFit="contain"
          />
        ) : (
          <View style={[s.upNextThumb, { backgroundColor: theme.raised }]} />
        )}

        {/* Info */}
        <View style={s.upNextInfo}>
          <SPText style={[s.upNextLabel, { color: theme.muted2 }]}>
            UP NEXT
          </SPText>
          <SPText
            style={[s.upNextName, { color: theme.text, fontSize: rs(17, 19) }]}
            numberOfLines={1}
          >
            {exerciseName}
          </SPText>
          {equipment && (
            <SPText style={[s.upNextEquipment, { color: theme.muted }]}>
              {equipment}
            </SPText>
          )}
          <View style={[s.upNextAccent, { backgroundColor: accentColor }]} />
        </View>

        {/* Arrow */}
        <ChevronRight size={20} color={theme.muted2} strokeWidth={1.8} />
      </View>
    </Animated.View>
  );
}

// ─── ActionControls ───────────────────────────────────────────────────────────

function ActionControls({
  onBack,
  onComplete,
  onNext,
  disabled,
  accentColor,
  phase,
  resting,
  rs,
}: {
  onBack?: () => void;
  onComplete?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  accentColor: string;
  phase: string;
  resting: boolean;
  rs: (...args: number[]) => number;
}) {
  const { theme } = useAppTheme();
  const completeIcon =
    phase === "paused" ? (
      <Play size={rs(26, 28)} color="#000" fill="#000" strokeWidth={0} />
    ) : resting ? (
      <SkipForward size={rs(26, 28)} color="#000" fill="#000" strokeWidth={0} />
    ) : (
      <Check size={rs(26, 28)} color="#000" strokeWidth={2.5} />
    );

  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(140)}
      style={[s.actionControls, { borderTopColor: theme.border }]}
    >
      {/* Back */}
      <PressableScale onPress={onBack} style={s.actionSideBtn}>
        <View
          style={[
            s.actionSecBtn,
            {
              backgroundColor: theme.surface2,
              borderColor: theme.border,
            },
          ]}
        >
          <SkipBack size={rs(18, 20)} color={theme.text} strokeWidth={1.8} />
        </View>
        <SPText style={[s.actionBtnLabel, { color: theme.muted }]}>BACK</SPText>
      </PressableScale>

      {/* Complete */}
      <View style={s.actionCenter}>
        <PressableScale onPress={onComplete} disabled={disabled}>
          <View style={[s.actionPrimaryBtn, { backgroundColor: accentColor }]}>
            {completeIcon}
          </View>
        </PressableScale>
        <SPText
          style={[
            s.actionBtnLabel,
            { color: theme.text, fontFamily: fonts.brandBold },
          ]}
        >
          COMPLETE
        </SPText>
      </View>

      {/* Next */}
      <PressableScale onPress={onNext} style={s.actionSideBtn}>
        <View
          style={[
            s.actionSecBtn,
            {
              backgroundColor: theme.surface2,
              borderColor: theme.border,
            },
          ]}
        >
          <SkipForward size={rs(18, 20)} color={theme.text} strokeWidth={1.8} />
        </View>
        <SPText style={[s.actionBtnLabel, { color: theme.muted }]}>NEXT</SPText>
      </PressableScale>
    </Animated.View>
  );
}

// ─── WorkoutFooter ────────────────────────────────────────────────────────────

function WorkoutFooter({
  workoutTime,
  restTime,
  resting,
  phase,
  accentColor,
  onPauseResume,
  onEnd,
  rs,
}: {
  workoutTime: string;
  restTime: string;
  resting: boolean;
  phase: string;
  accentColor: string;
  onPauseResume: () => void;
  onEnd: () => void;
  rs: (...args: number[]) => number;
}) {
  const { theme } = useAppTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(180)}
      style={[
        s.footer,
        { borderTopColor: theme.border, backgroundColor: theme.bg },
      ]}
    >
      {/* Workout timer */}
      <View style={s.footerTimer}>
        <SPText
          style={[
            s.footerTimerValue,
            { color: theme.text, fontSize: rs(22, 24) },
          ]}
        >
          {workoutTime}
        </SPText>
        <SPText style={[s.footerTimerLabel, { color: theme.muted }]}>
          WORKOUT
        </SPText>
      </View>

      {/* Pause / End */}
      <View style={s.footerCenter}>
        <Pressable onPress={onPauseResume} style={s.footerAction}>
          {phase === "paused" ? (
            <Play
              size={12}
              color={theme.muted2}
              fill={theme.muted2}
              strokeWidth={0}
            />
          ) : (
            <View style={s.pauseIconRow}>
              <View style={[s.pauseBar, { backgroundColor: theme.muted2 }]} />
              <View style={[s.pauseBar, { backgroundColor: theme.muted2 }]} />
            </View>
          )}
          <SPText style={[s.footerActionLabel, { color: theme.muted2 }]}>
            {phase === "paused" ? "RESUME" : "PAUSE"}
          </SPText>
        </Pressable>

        <Pressable onPress={onEnd} style={s.footerAction}>
          <View style={[s.stopIcon, { borderColor: "#ef4444" }]} />
          <SPText style={[s.footerActionLabel, { color: "#ef4444" }]}>
            END
          </SPText>
        </Pressable>
      </View>

      {/* Rest timer */}
      <View style={[s.footerTimer, { alignItems: "flex-end" }]}>
        <SPText
          style={[
            s.footerTimerValue,
            {
              color: resting ? accentColor : theme.text,
              fontSize: rs(22, 24),
            },
          ]}
        >
          {restTime}
        </SPText>
        <SPText style={[s.footerTimerLabel, { color: theme.muted }]}>
          REST
        </SPText>
      </View>
    </Animated.View>
  );
}

// ─── SessionScreen ────────────────────────────────────────────────────────────

export default function SessionScreen({
  instanceId,
  dayNumber,
  planName,
  focus,
  level,
  muscleGroup,
  exercises,
  draft,
  progressionContext,
}: SessionScreenPropsWithProgression) {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { rs } = useResponsive();

  const levelLabel = formatLevel(level);
  const accentColor = theme.accent;

  // ─── Exercise navigation ──────────────────────────────────────────────────

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const total = exercises.length;
  const currentExView = exercises[currentExIdx] ?? null;
  const nextExView = exercises[currentExIdx + 1] ?? null;

  // ─── Video hide / PiP state ────────────────────────────────────────────────

  const [videoHidden, setVideoHidden] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  // ─── Flow / hide mode ─────────────────────────────────────────────────────
  // Activates after FLOW_TIMEOUT_MS of no interaction. Any touch resets.

  const { isFlowMode, resetFlow } = useFlowMode();

  // ─── Session hooks ────────────────────────────────────────────────────────

  const timer = useSessionTimer(draft?.elapsedSeconds ?? 0);
  const restTimer = useRestTimer();

  const secondsRef = useRef(timer.seconds);
  useEffect(() => {
    secondsRef.current = timer.seconds;
  }, [timer.seconds]);
  const getSeconds = useCallback(() => secondsRef.current, []);

  // ─── Workout completion overlay ───────────────────────────────────────────

  const [showCompletion, setShowCompletion] = useState(false);
  const completionSecondsRef = useRef(0);
  // Prevents onSessionEnd firing more than once per session lifecycle.
  const hasEndedRef = useRef(false);

  // useFocusEffect runs every time the screen gains navigation focus.
  // Expo Router keeps tab-nested screens MOUNTED when you navigate away —
  // this is why showCompletion was persisting. Resetting here is the correct
  // lifecycle hook for Expo Router: it fires when the screen is about to be
  // shown, guaranteeing clean state for every new session visit.
  useFocusEffect(
    useCallback(() => {
      setShowCompletion(false);
      hasEndedRef.current = false;
    }, []),
  );

  const onSessionEnd = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    completionSecondsRef.current = secondsRef.current;
    setShowCompletion(true);
  }, []);

  const session = useSessionState({
    instanceId,
    dayNumber,
    exercises,
    draft,
    startRest: restTimer.startRest,
    getSeconds,
    onSessionEnd,
  });

  useEffect(() => {
    session.initWeights();
  }, [instanceId]);

  // ── Thumbnail map — loaded from the cache TrainingScreen writes ─────────────
  // exercisesForView on TrainingScreen has thumbnailUrl; ExerciseForSession
  // (from the session API) doesn't. We bridge the gap via AsyncStorage.

  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(SP_EXERCISE_THUMBNAILS_KEY)
      .then((raw) => {
        if (raw) setThumbnailMap(JSON.parse(raw) as Record<string, string>);
      })
      .catch(() => {});
  }, []);

  const thumbFor = (exerciseId: string): string | null =>
    thumbnailMap[exerciseId] ?? null;

  useEffect(() => {
    if (!restTimer.resting && session.phase === "resting") {
      session.onRestEnd();
    }
  }, [restTimer.resting, session.phase, session.onRestEnd]);

  useEffect(() => {
    if (
      session.currentExerciseIdx !== undefined &&
      session.currentExerciseIdx !== currentExIdx
    ) {
      setCurrentExIdx(session.currentExerciseIdx);
    }
  }, [session.currentExerciseIdx]);

  // ─── Pause / exit ──────────────────────────────────────────────────────────

  const showSheet = session.phase === "paused";

  const handleOpenSheet = useCallback(() => {
    timer.pause();
    session.setPaused(true);
  }, [timer, session]);

  const handleResume = useCallback(() => {
    session.setPaused(false);
    timer.resume();
  }, [timer, session]);

  const handleSaveDraftAndLeave = useCallback(async () => {
    await session.persistDraft();
    router.replace("/(tabs)/training");
  }, [session, router]);

  const handleEndAndSave = useCallback(() => {
    session.handleEndSession(false);
  }, [session]);

  // ─── Derived display values ────────────────────────────────────────────────

  const workoutTime = `${timer.mins}:${timer.secs}`;
  const restTime = restTimer.resting
    ? `${pad(restTimer.restMins)}:${pad(restTimer.restSecs)}`
    : "00:00";

  const completedSetsForCurrent = session.completedSets ?? 0;
  const totalSetsForCurrent =
    session.currentExercise?.sets ?? currentExView?.sets ?? 0;
  const totalRepsForCurrent =
    session.currentExercise?.reps ?? currentExView?.reps ?? 0;

  const currentMuscles: string[] = currentExView?.exercise.musclesWorked ?? [
    muscleGroup,
  ];

  const completeHandler =
    session.phase === "paused"
      ? handleResume
      : restTimer.resting
        ? restTimer.skipRest
        : session.currentExercise
          ? session.handleCompleteSet
          : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    // Outer wrapper — full screen, sits outside SafeAreaView so FlowModeOverlay
    // can cover the entire display including safe-area insets.
    <View
      style={[s.rootWrap, { backgroundColor: theme.bg }]}
      // Capture-phase touch handler: resets idle timer WITHOUT consuming events.
      // Children still receive and handle their own touches normally.
      onStartShouldSetResponderCapture={() => {
        resetFlow();
        return false;
      }}
    >
      <SafeAreaView
        style={[s.safe, { backgroundColor: theme.bg }]}
        edges={["top", "bottom"]}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.content,
            { paddingHorizontal: rs(16, 20, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1 — Progress Header */}
          <ProgressHeader
            current={currentExIdx + 1}
            total={total}
            accentColor={accentColor}
          />

          {/* 2 — Exercise Header */}
          {currentExView && (
            <ExerciseHeader
              level={levelLabel}
              focus={focus}
              exerciseName={currentExView.exercise.name}
              muscles={currentMuscles}
              accentColor={accentColor}
              onOpenPip={() => setPipActive(true)}
              rs={rs}
            />
          )}

          {/* 3 — Video Player (or compact summary when hidden) */}
          {videoHidden ? (
            <VideoHiddenCard
              workoutTime={workoutTime}
              completedSets={completedSetsForCurrent}
              totalSets={totalSetsForCurrent}
              nextExerciseName={nextExView?.exercise.name ?? null}
              accentColor={accentColor}
              onShowVideo={() => setVideoHidden(false)}
              rs={rs}
            />
          ) : (
            <VideoPlayerCard
              thumbnailUrl={
                currentExView ? thumbFor(currentExView.exercise.id) : null
              }
              onHideVideo={() => setVideoHidden(true)}
              rs={rs}
            />
          )}

          {/* 4 — Metrics */}
          <MetricsCard
            totalReps={totalRepsForCurrent}
            completedSets={completedSetsForCurrent}
            totalSets={totalSetsForCurrent}
            accentColor={accentColor}
            rs={rs}
          />

          {/* 5 — Up Next */}
          {nextExView && (
            <UpNextCard
              exerciseName={nextExView.exercise.name}
              equipment={nextExView.exercise.equipment?.name ?? undefined}
              thumbnailUrl={thumbFor(nextExView.exercise.id)}
              accentColor={accentColor}
              rs={rs}
            />
          )}

          {/* 6 — Action Controls */}
          <ActionControls
            onBack={() => setCurrentExIdx((i) => Math.max(0, i - 1))}
            onComplete={completeHandler}
            onNext={() => setCurrentExIdx((i) => Math.min(total - 1, i + 1))}
            disabled={session.phase === "ending"}
            accentColor={accentColor}
            phase={session.phase}
            resting={restTimer.resting}
            rs={rs}
          />

          {/* 7 — Workout Footer */}
          <WorkoutFooter
            workoutTime={workoutTime}
            restTime={restTime}
            resting={restTimer.resting}
            phase={session.phase}
            accentColor={accentColor}
            onPauseResume={handleOpenSheet}
            onEnd={() => session.handleEndSession(false)}
            rs={rs}
          />

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Floating mini-player (in-app PiP) */}
        <PipOverlay
          visible={pipActive}
          paused={session.phase === "paused"}
          exerciseName={currentExView?.exercise.name ?? ""}
          onTogglePause={() => {
            if (session.phase === "paused") {
              handleResume();
            } else {
              handleOpenSheet();
            }
          }}
          onClose={() => setPipActive(false)}
          onExpand={() => setPipActive(false)}
        />

        {/* Pause / Exit Sheet */}
        {showSheet && (
          <PauseExitSheet
            visible={showSheet}
            onResume={handleResume}
            onSaveDraftAndLeave={handleSaveDraftAndLeave}
            onEndAndSave={handleEndAndSave}
          />
        )}
      </SafeAreaView>

      {/* ── Flow / Hide Mode Overlay ─────────────────────────────────────────
          Renders outside SafeAreaView so video fills edge-to-edge.
          zIndex 90 sits above PipOverlay (zIndex 200 handles PiP separately).
          Tap anywhere to exit; PiP/Hide buttons intercept their own presses. */}
      <FlowModeOverlay
        visible={isFlowMode && !showSheet && !showCompletion}
        current={currentExIdx + 1}
        total={total}
        level={levelLabel}
        focus={focus}
        exerciseName={currentExView?.exercise.name ?? ""}
        workoutTime={workoutTime}
        thumbnailUrl={
          currentExView ? thumbFor(currentExView.exercise.id) : null
        }
        accentColor={accentColor}
        onTap={resetFlow}
        onPip={() => {
          setPipActive(true);
          resetFlow();
        }}
        onHideVideo={() => {
          setVideoHidden(true);
          resetFlow();
        }}
      />

      {/* ── Workout Completion Overlay ──────────────────────────────────────── */}
      <WorkoutCompleteOverlay
        visible={showCompletion}
        workoutSeconds={completionSecondsRef.current}
        dayNumber={dayNumber}
        accentColor={accentColor}
        onContinue={() => router.replace("/(tabs)/training")}
        onViewSummary={() => router.replace("/(tabs)/progress")}
      />
    </View>
  );
}

// Styles

const s = StyleSheet.create({
  rootWrap: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingTop: 16,
    gap: 14,
    paddingBottom: 32,
  },

  // ── Progress Header ──
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressCount: {
    fontSize: 13,
    fontFamily: fonts.brandMedium,
    letterSpacing: 0.4,
    minWidth: 32,
    textAlign: "right",
  },

  // ── Exercise Header ──
  exerciseHeader: {
    gap: 12,
  },
  exerciseHeaderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  exerciseMeta: {
    fontSize: 11,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  exerciseTitle: {
    fontFamily: fonts.brandBold,
    lineHeight: 32,
  },
  exerciseIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  pipButtonWrap: {
    alignItems: "center",
    gap: 6,
  },
  pipLabel: {
    fontSize: 9,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.2,
  },
  musclePillRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  musclePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  musclePillText: {
    fontSize: 9,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 0.8,
  },

  // ── Video Card ──
  videoCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  videoThumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbInner: {
    ...StyleSheet.absoluteFillObject,
  },
  videoTopBar: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  videoMenuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  videoControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  videoTime: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: fonts.brandMedium,
  },
  videoTimeline: {
    flex: 1,
    height: 20,
    justifyContent: "center",
  },
  videoTimelineTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "visible",
    position: "relative",
  },
  videoTimelineFill: {
    height: "100%",
    borderRadius: 2,
  },
  videoScrubber: {
    position: "absolute",
    top: -5,
    width: 13,
    height: 13,
    borderRadius: 7,
    marginLeft: -6,
  },

  // ── Hidden Video (compact summary) ──
  hiddenCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  hiddenStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hiddenStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  hiddenUpNextRow: {
    gap: 3,
  },
  hiddenUpNextName: {
    fontFamily: fonts.brandBold,
    fontSize: 16,
  },
  showVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  showVideoLabel: {
    fontSize: 12,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1,
  },

  // ── PiP floating mini-player ──
  pipOverlay: {
    position: "absolute",
    top: 56,
    right: 16,
    width: 132,
    height: 88,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 200,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 20,
  },
  pipThumb: {
    flex: 1,
    backgroundColor: "#15181a",
  },
  pipCloseBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  pipFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 6,
  },
  pipName: {
    flex: 1,
    color: "#fff",
    fontSize: 10,
    fontFamily: fonts.brandMedium,
  },
  pipControls: {
    flexDirection: "row",
    gap: 8,
  },

  // ── Metrics Card ──
  metricsCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  metricIconRow: {
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: fonts.brandBold,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.2,
  },
  metricDivider: {
    width: 1,
    marginVertical: 16,
  },

  // ── Up Next ──
  upNextCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    paddingRight: 16,
    gap: 0,
  },
  upNextThumb: {
    width: 110,
    height: 90,
  },
  upNextInfo: {
    flex: 1,
    paddingLeft: 16,
    paddingVertical: 16,
    gap: 3,
  },
  upNextLabel: {
    fontSize: 10,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.2,
  },
  upNextName: {
    fontFamily: fonts.brandBold,
    lineHeight: 24,
  },
  upNextEquipment: {
    fontSize: 13,
    fontFamily: fonts.brandMedium,
  },
  upNextAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },

  // ── Action Controls ──
  actionControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  actionSideBtn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  actionSecBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCenter: {
    alignItems: "center",
    gap: 8,
  },
  actionPrimaryBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnLabel: {
    fontSize: 10,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.2,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 6,
    borderTopWidth: 1,
  },
  footerTimer: {
    alignItems: "flex-start",
    gap: 4,
    flex: 1,
  },
  footerTimerValue: {
    fontFamily: fonts.brandBold,
    letterSpacing: -0.5,
  },
  footerTimerLabel: {
    fontSize: 9,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.2,
  },
  footerCenter: {
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  footerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerActionLabel: {
    fontSize: 12,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 0.8,
  },
  pauseIconRow: {
    flexDirection: "row",
    gap: 3,
  },
  pauseBar: {
    width: 3,
    height: 12,
    borderRadius: 2,
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 2,
  },
});

// ─── Flow Mode Stylesheet ─────────────────────────────────────────────────────

const fm = StyleSheet.create({
  // Full-screen dark overlay
  overlay: {
    zIndex: 90,
    backgroundColor: "#0C0E10",
  },
  // Absolute fill that holds the layout — sits on top of the Pressable tap catcher
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },

  // ── Progress bar ──
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressCount: {
    fontSize: 12,
    fontFamily: fonts.brandMedium,
    letterSpacing: 0.4,
    minWidth: 30,
    textAlign: "right",
  },

  // ── Exercise identity ──
  identity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  exerciseMeta: {
    fontSize: 11,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  exerciseTitle: {
    fontFamily: fonts.brandBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },

  // ── Video fill — cinematic, edge-to-edge ──
  videoWrap: {
    flex: 1,
    position: "relative",
    marginBottom: 20,
    // No horizontal margin: video goes edge-to-edge
  },
  videoFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },
  // Simulate bottom gradient without LinearGradient dep
  videoVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: "rgba(0,0,0,0.40)",
  },

  // Eye-off button — floats top-right of video
  eyeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  eyeBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bottom HUD ──
  bottomArea: {
    alignItems: "center",
    gap: 14,
  },

  // Glass pill — width ~180-220px, height 56px
  hudPill: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    gap: 12,
    // maxWidth keeps it compact at ~pill spec
    maxWidth: 230,
    // backdrop blur is only achievable with BlurView — fallback is semi-opaque bg
  },
  hudLabel: {
    fontSize: 10,
    fontFamily: fonts.brandSemiBold,
    letterSpacing: 0.9,
    // truncate long exercise names gracefully
    flex: 1,
    flexShrink: 1,
  },
  hudDivider: {
    width: 1,
    height: 18,
  },
  hudTime: {
    fontFamily: fonts.brandBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  // Tiny pulsing circle — accent active indicator
  hudDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ── Tap hint ──
  tapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  tapHint: {
    fontSize: 13,
    fontFamily: fonts.brandMedium,
    letterSpacing: 0.1,
  },
});

// ─── Workout Completion Stylesheet ────────────────────────────────────────────

const wc = StyleSheet.create({
  root: {
    zIndex: 300,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(7,9,10,0.88)",
  },

  // ── Sheet layout ──
  sheetWrap: {
    paddingHorizontal: 16,
    gap: 14,
  },

  // ── Reward card ──
  card: {
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#1A1F23",
    paddingTop: 44,
    paddingBottom: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 0,
    // Very soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },

  // ── Success ring ──
  ringWrap: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glowOuter: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  glowInner: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  ring: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ringFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 56,
  },

  // ── Copy ──
  title: {
    fontFamily: "Barlow_700Bold",
    fontSize: 32,
    letterSpacing: -0.6,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Barlow_400Regular",
    fontSize: 15,
    textAlign: "center",
    maxWidth: "70%",
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Metrics ──
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 28,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  metricValue: {
    fontFamily: "Barlow_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  metricLabel: {
    fontFamily: "Barlow_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  metricSep: {
    width: 1,
    height: 44,
  },

  // ── Divider + quote ──
  divider: {
    width: "100%",
    height: 1,
    marginBottom: 20,
  },
  quote: {
    fontFamily: "Barlow_400Regular",
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: "center",
    fontStyle: "italic",
  },

  // ── CTA ──
  ctaWrap: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  cta: {
    width: "90%",
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: "Barlow_800ExtraBold",
    fontSize: 16,
    letterSpacing: 1.8,
  },
  secondaryBtn: {
    paddingVertical: 4,
  },
  secondaryText: {
    fontFamily: "Barlow_500Medium",
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
