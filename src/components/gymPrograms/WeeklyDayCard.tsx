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
import { useAppTheme } from "../../theme/ThemeContext";
import { MUSCLE_ICON_MAP, DefaultFocusIcon } from "../icons/MuscleIcons";
import { resolveMuscleFocus } from "../../../contants/gymFocusMap";
import { MetadataRow } from "./MetadataRow";
import { ExpandableWorkoutList } from "./ExpandableWorkoutList";
import { useResponsive } from "../../hooks/useResponsive";
import type { ScheduleDay } from "../../types/gymPrograms";

interface WeeklyDayCardProps {
  day: ScheduleDay;
  onStartSession: (day: ScheduleDay) => void;
}

export function WeeklyDayCard({ day, onStartSession }: WeeklyDayCardProps) {
  const { rs } = useResponsive();
  const { theme } = useAppTheme();
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

  // This row was fixed at minHeight 88 / 48px icon circle regardless of
  // screen size — the biggest reason the weekly list read oversized.
  // Scaling per breakpoint keeps small phones compact and lets larger
  // phones breathe slightly more, without any single tier looking huge.
  const rowMinHeight = rs(64, 70, 74, 78);
  const rowPaddingV = rs(10, 12, 13, 14);
  const rowPaddingH = rs(12, 14, 15, 16);
  const rowGap = rs(8, 10, 10, 12);
  const dayLabelWidth = rs(40, 44, 46, 48);
  const dayAbbrevSize = rs(11, 12, 12, 13);
  const dividerHeight = rs(28, 32, 34, 36);
  const iconWrapSize = rs(36, 40, 42, 44);
  const iconSize = rs(16, 18, 19, 20);
  const titleSize = rs(13, 14, 15, 16);
  const subtitleSize = rs(11, 12, 12, 13);
  const arrowCircleSize = rs(26, 28, 30, 30);
  const cardMarginBottom = rs(8, 10, 10, 12);
  const expandPaddingH = rs(12, 14, 15, 16);
  const expandPaddingBottom = rs(12, 14, 15, 16);

  // Colors depend on both theme and locked state, so they're computed
  // once here and applied inline everywhere below, rather than mixing
  // static GT-based style fragments with runtime conditionals.
  const dayAbbrevColor = isLocked ? theme.muted2 : theme.text;
  const titleColor = isLocked ? theme.muted : theme.text;
  const subtitleColor = isLocked ? theme.muted2 : theme.muted;
  const iconColor = isLocked ? theme.muted2 : theme.accent;
  const iconBorderColor = isLocked ? theme.border : theme.accentDim;

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
        { backgroundColor: theme.surface, borderColor: theme.border },
        { marginBottom: cardMarginBottom },
        day.isToday && [
          styles.cardToday,
          {
            borderColor: theme.accent,
            backgroundColor: theme.surface2,
            shadowColor: theme.accent,
          },
        ],
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
        style={[
          styles.pressableRow,
          {
            minHeight: rowMinHeight,
            paddingVertical: rowPaddingV,
            paddingHorizontal: rowPaddingH,
            gap: rowGap,
          },
        ]}
      >
        <View style={[styles.dayLabelCol, { width: dayLabelWidth }]}>
          <SPText
            style={[
              styles.dayAbbrev,
              { fontSize: dayAbbrevSize, color: dayAbbrevColor },
            ]}
          >
            {day.dayAbbrev}
          </SPText>
          {day.isToday ? (
            <View
              style={[styles.todayBadge, { backgroundColor: theme.accent }]}
            >
              <SPText style={[styles.todayBadgeText, { color: theme.void }]}>
                TODAY
              </SPText>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.divider,
            { height: dividerHeight, backgroundColor: theme.border },
          ]}
        />

        <View
          style={[
            styles.iconWrap,
            {
              width: iconWrapSize,
              height: iconWrapSize,
              borderRadius: iconWrapSize / 2,
              borderColor: iconBorderColor,
            },
          ]}
        >
          <IconComp size={iconSize} color={iconColor} strokeWidth={1.5} />
        </View>

        <View style={styles.textCol}>
          <SPText
            style={[styles.title, { fontSize: titleSize, color: titleColor }]}
            numberOfLines={1}
          >
            {titleLabel.toUpperCase()}
          </SPText>
          <SPText
            style={[
              styles.subtitle,
              { fontSize: subtitleSize, color: subtitleColor },
            ]}
          >
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
            <Lock
              size={rs(16, 17, 18, 18)}
              color={theme.muted2}
              strokeWidth={1.75}
            />
          ) : (
            <Animated.View
              style={[
                styles.arrowCircle,
                {
                  width: arrowCircleSize,
                  height: arrowCircleSize,
                  borderRadius: arrowCircleSize / 2,
                  // Was a hardcoded white rgba border -- theme.text at low
                  // alpha keeps a faint ring in both modes instead of an
                  // invisible-on-light-bg white line.
                  borderColor: theme.text + "33",
                },
                chevronAnimatedStyle,
              ]}
            >
              {expanded ? (
                <ChevronDown size={14} color={theme.accent} strokeWidth={2} />
              ) : (
                <ChevronRight size={14} color={theme.text} strokeWidth={2} />
              )}
            </Animated.View>
          )}
        </View>
      </Pressable>

      {!isLocked ? (
        <Animated.View style={[styles.expandWrap, expandAnimatedStyle]}>
          <View
            style={[
              styles.expandMeasure,
              {
                paddingHorizontal: expandPaddingH,
                paddingBottom: expandPaddingBottom,
              },
            ]}
            onLayout={handleMeasure}
            pointerEvents={expanded ? "auto" : "none"}
          >
            <View
              style={[styles.expandDivider, { backgroundColor: theme.border }]}
            />
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
    overflow: "hidden",
    // backgroundColor/borderColor applied inline from theme
  },
  cardToday: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    transform: [{ translateY: -1 }],
    // borderColor/backgroundColor/shadowColor applied inline from theme
  },
  cardLocked: {
    opacity: 0.55,
  },
  pressableRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayLabelCol: {
    gap: GT.s4,
  },
  dayAbbrev: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 0.5,
    // color applied inline (theme + locked state)
  },
  todayBadge: {
    borderRadius: GT.r8,
    paddingHorizontal: GT.s6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    // backgroundColor applied inline from theme.accent
  },
  todayBadgeText: {
    fontFamily: GT.font.semiBold,
    fontSize: 8,
    letterSpacing: 0.5,
    // color applied inline from theme.void
  },
  divider: {
    width: 1,
    // backgroundColor applied inline from theme.border
  },
  iconWrap: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    // borderColor applied inline (theme + locked state)
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: GT.font.display,
    letterSpacing: 0.2,
    // color applied inline (theme + locked state)
  },
  subtitle: {
    fontFamily: GT.font.medium,
    // color applied inline (theme + locked state)
  },
  actionCol: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowCircle: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    // borderColor applied inline from theme.text (+ alpha)
  },
  expandWrap: {
    overflow: "hidden",
  },
  expandMeasure: {
    // horizontal/bottom padding applied responsively inline above
  },
  expandDivider: {
    height: 1,
    marginBottom: GT.s4,
    // backgroundColor applied inline from theme.border
  },
});
