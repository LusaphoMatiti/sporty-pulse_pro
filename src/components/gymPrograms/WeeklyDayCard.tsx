import React, { useState } from "react";
import { View, Pressable, StyleSheet, LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ChevronRight, ChevronDown, Lock } from "lucide-react-native";
import { SPText } from "../../components/ui/SPText";
import { GT, GYM_PRESS_SPRING } from "../../theme/gymProgramsTheme";
import { MUSCLE_ICON_MAP, DefaultFocusIcon } from "../icons/MuscleIcons";
import { resolveMuscleFocus } from "../../../contants/gymFocusMap";
import { MetadataRow } from "./MetadataRow";
import { ExpandableWorkoutList } from "./ExpandableWorkoutList";
import type { ScheduleDay } from "../../types/gymPrograms";

interface WeeklyDayCardProps {
  day: ScheduleDay;
  onStartSession: (day: ScheduleDay) => void;
}

export function WeeklyDayCard({ day, onStartSession }: WeeklyDayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const pressScale = useSharedValue(1);
  const expandProgress = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  const isLocked = day.isRestDay;
  const titleLabel = day.isRestDay ? "Rest Day" : (day.focus ?? "Session");
  const sessionCountLabel = day.isRestDay
    ? "Rest & Recover"
    : `${day.exercises.length} Session${day.exercises.length === 1 ? "" : "s"}`;

  const IconComp = day.isRestDay
    ? MUSCLE_ICON_MAP.REST
    : (MUSCLE_ICON_MAP[resolveMuscleFocus(day.focus)] ?? DefaultFocusIcon);

  function toggleExpand() {
    if (isLocked) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unsupported on this device/simulator — ignore
    }
    const next = !expanded;
    setExpanded(next);
    expandProgress.value = withTiming(next ? 1 : 0, { duration: 280 });
    chevronRotation.value = withTiming(next ? 1 : 0, { duration: 280 });
  }

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const expandAnimatedStyle = useAnimatedStyle(() => ({
    height: expandProgress.value * contentHeight,
    opacity: expandProgress.value,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 90}deg` }],
  }));

  function handleMeasure(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== contentHeight) setContentHeight(h);
  }

  return (
    <Animated.View
      style={[
        styles.card,
        day.isToday && styles.cardToday,
        isLocked && styles.cardLocked,
        cardAnimatedStyle,
      ]}
    >
      <Pressable
        disabled={isLocked}
        onPress={toggleExpand}
        onPressIn={() => {
          if (isLocked) return;
          pressScale.value = withSpring(0.98, GYM_PRESS_SPRING);
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, GYM_PRESS_SPRING);
        }}
        style={styles.pressableRow}
      >
        <View style={styles.dayLabelCol}>
          <SPText style={[styles.dayAbbrev, isLocked && styles.mutedText]}>
            {day.dayAbbrev}
          </SPText>
          {day.isToday ? (
            <View style={styles.todayBadge}>
              <SPText style={styles.todayBadgeText}>TODAY</SPText>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={[styles.iconWrap, isLocked && styles.iconWrapLocked]}>
          <IconComp
            size={22}
            color={isLocked ? GT.muted2 : GT.accent}
            strokeWidth={1.5}
          />
        </View>

        <View style={styles.textCol}>
          <SPText
            style={[styles.title, isLocked && styles.mutedTitle]}
            numberOfLines={1}
          >
            {titleLabel.toUpperCase()}
          </SPText>
          <SPText style={[styles.subtitle, isLocked && styles.mutedText]}>
            {sessionCountLabel}
          </SPText>
          {!day.isRestDay ? (
            <MetadataRow
              durationLabel={
                day.estimatedMinutes ? `${day.estimatedMinutes} MIN` : null
              }
              difficultyLabel={day.difficulty}
            />
          ) : null}
        </View>

        <View style={styles.actionCol}>
          {isLocked ? (
            <Lock size={18} color={GT.muted2} strokeWidth={1.75} />
          ) : (
            <Animated.View style={[styles.arrowCircle, chevronAnimatedStyle]}>
              {expanded ? (
                <ChevronDown size={16} color={GT.accent} strokeWidth={2} />
              ) : (
                <ChevronRight size={16} color={GT.text} strokeWidth={2} />
              )}
            </Animated.View>
          )}
        </View>
      </Pressable>

      {!isLocked ? (
        <Animated.View style={[styles.expandWrap, expandAnimatedStyle]}>
          <View
            style={styles.expandMeasure}
            onLayout={handleMeasure}
            pointerEvents={expanded ? "auto" : "none"}
          >
            <View style={styles.expandDivider} />
            <ExpandableWorkoutList
              exercises={day.exercises}
              onStartSession={() => onStartSession(day)}
            />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GT.r20,
    borderWidth: 1,
    borderColor: GT.border,
    backgroundColor: GT.surface,
    marginBottom: GT.s12,
    overflow: "hidden",
  },
  cardToday: {
    borderColor: GT.accent,
    backgroundColor: GT.surface2,
    shadowColor: GT.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    transform: [{ translateY: -1 }],
  },
  cardLocked: {
    opacity: 0.55,
  },
  pressableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: GT.s16,
    paddingHorizontal: GT.s16,
    gap: GT.s12,
    minHeight: 88,
  },
  dayLabelCol: {
    width: 52,
    gap: GT.s4,
  },
  dayAbbrev: {
    fontFamily: GT.font.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: GT.text,
  },
  todayBadge: {
    backgroundColor: GT.accent,
    borderRadius: GT.r8,
    paddingHorizontal: GT.s6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  todayBadgeText: {
    fontFamily: GT.font.semiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: GT.void,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: GT.border,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: GT.r24,
    borderWidth: 1,
    borderColor: GT.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapLocked: {
    borderColor: GT.border,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: GT.font.display,
    fontSize: 17,
    color: GT.text,
    letterSpacing: 0.2,
  },
  mutedTitle: {
    color: GT.muted,
  },
  subtitle: {
    fontFamily: GT.font.medium,
    fontSize: 13,
    color: GT.muted,
  },
  mutedText: {
    color: GT.muted2,
  },
  actionCol: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: GT.r999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  expandWrap: {
    overflow: "hidden",
  },
  expandMeasure: {
    paddingHorizontal: GT.s16,
    paddingBottom: GT.s16,
  },
  expandDivider: {
    height: 1,
    backgroundColor: GT.border,
    marginBottom: GT.s4,
  },
});
