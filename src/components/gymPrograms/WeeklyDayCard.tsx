import React, { forwardRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
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
  dragEnabled?: boolean;
  onDragActiveChange?: (active: boolean) => void;
  onDropAt?: (sourceDay: ScheduleDay, dropAbsoluteY: number) => void;
}

// Focus icon badges — swapped per theme (light: #C8F135, dark: #55CC88).
// Path is 3 levels up from src/components/gymPrograms/ to reach root/assets/images,
// matching the depth used by the "../../../contants/gymFocusMap" import above.
const chestLight = require("../../assets/images/Chest_Logo__Darkmode_.png");
const chestDark = require("../../assets/images/Chest_Logo.png");
const backLight = require("../../assets/images/Back_Logo__(Darkmode).png");
const backDark = require("../../assets/images/Back_Logo.png");

const shoulderLight = require("../../assets/images/Shoulder_Logo__Darkmode_.png");
const shoulderDark = require("../../assets/images/Shoulder_Logo.png");
const armLight = require("../../assets/images/Arm_Logo__Darkmode_.png");
const armDark = require("../../assets/images/Arm_Logo.png");
const legLight = require("../../assets/images/Leg_Logo__Darkmode_.png");
const legDark = require("../../assets/images/Leg_Logo.png");

// Keyed to match whatever resolveMuscleFocus(day.focus) / MUSCLE_ICON_MAP use.
// No Core asset yet, so Core (and Rest) keep using the vector IconComp below.
const MUSCLE_ICON_IMAGE_MAP: Record<string, { light: number; dark: number }> = {
  CHEST: { light: chestLight, dark: chestDark },
  BACK: { light: backLight, dark: backDark },
  SHOULDERS: { light: shoulderLight, dark: shoulderDark },
  ARMS: { light: armLight, dark: armDark },
  LEGS: { light: legLight, dark: legDark },
};

export const WeeklyDayCard = forwardRef<View, WeeklyDayCardProps>(
  function WeeklyDayCard(
    { day, onStartSession, dragEnabled = true, onDragActiveChange, onDropAt },
    ref,
  ) {
    const { rs } = useResponsive();
    const { theme, isDark } = useAppTheme();
    const [expanded, setExpanded] = useState(false);

    const chevronRotation = useSharedValue(0);

    const contentTranslateX = useSharedValue(0);
    const contentTranslateY = useSharedValue(0);
    const isDragging = useSharedValue(0);
    const isPressed = useSharedValue(0);

    const isLocked = day.isRestDay;
    const titleLabel = day.isRestDay ? "Rest Day" : (day.focus ?? "Session");
    const sessionCountLabel = day.isRestDay
      ? "Rest & Recover"
      : `${day.exercises.length} Session${day.exercises.length === 1 ? "" : "s"}`;

    const focusKey = day.isRestDay ? null : resolveMuscleFocus(day.focus);
    const IconComp = day.isRestDay
      ? MUSCLE_ICON_MAP.REST
      : ((focusKey ? MUSCLE_ICON_MAP[focusKey] : undefined) ??
        DefaultFocusIcon);
    // Raster badge for this focus, if we have real art for it yet (Core/Rest don't).
    const focusIconImage = focusKey ? MUSCLE_ICON_IMAGE_MAP[focusKey] : null;

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
        // haptics unsupported
      }
      const next = !expanded;
      setExpanded(next);
      chevronRotation.value = withTiming(next ? 1 : 0, { duration: 280 });
    }

    function handlePickUp() {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // haptics unsupported
      }
      onDragActiveChange?.(true);
    }

    function handleDrop(dropAbsoluteY: number) {
      onDragActiveChange?.(false);
      onDropAt?.(day, dropAbsoluteY);
    }

    // Tap gesture for the draggable content (icon, text, metadata)
    const tapGesture = Gesture.Tap()
      .maxDuration(220)
      .onBegin(() => {
        isPressed.value = withSpring(1, GYM_PRESS_SPRING);
      })
      .onFinalize(() => {
        isPressed.value = withSpring(0, GYM_PRESS_SPRING);
      });

    const panGesture = Gesture.Pan()
      .enabled(dragEnabled && !isLocked)
      .activateAfterLongPress(220)
      .minDistance(0)
      .onStart(() => {
        isDragging.value = 1;
        runOnJS(handlePickUp)();
      })
      .onUpdate((event) => {
        contentTranslateX.value = event.translationX;
        contentTranslateY.value = event.translationY;
      })
      .onEnd((event) => {
        isDragging.value = 0;
        contentTranslateX.value = withSpring(0, GYM_PRESS_SPRING);
        contentTranslateY.value = withSpring(0, GYM_PRESS_SPRING);
        runOnJS(handleDrop)(event.absoluteY);
      })
      .onFinalize(() => {
        isDragging.value = 0;
        contentTranslateX.value = withSpring(0, GYM_PRESS_SPRING);
        contentTranslateY.value = withSpring(0, GYM_PRESS_SPRING);
      });

    // Composed gesture: pan (drag) OR tap (press feedback) - no expand toggle here
    const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${chevronRotation.value * 90}deg` }],
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => {
      const dragging = isDragging.value === 1;
      const pressedScale = isPressed.value === 1 && !dragging ? 0.98 : 1;
      return {
        transform: [
          { translateX: contentTranslateX.value },
          { translateY: contentTranslateY.value },
          { scale: dragging ? 1.03 : pressedScale },
        ],
        zIndex: dragging ? 50 : 0,
        backgroundColor: dragging ? theme.surface : "transparent",
        borderRadius: dragging ? GT.r20 : 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: dragging ? 6 : 0 },
        shadowOpacity: dragging ? 0.3 : 0,
        shadowRadius: dragging ? 10 : 0,
        elevation: dragging ? 14 : 0,
      };
    });

    const wrapperAnimatedStyle = useAnimatedStyle(() => {
      const dragging = isDragging.value === 1;
      return {
        zIndex: dragging ? 50 : 0,
        elevation: dragging ? 2 : 0,
      };
    });

    const cardOverflowAnimatedStyle = useAnimatedStyle(() => {
      const settled =
        contentTranslateX.value === 0 && contentTranslateY.value === 0;
      return {
        overflow: isDragging.value === 1 || !settled ? "visible" : "hidden",
      };
    });

    return (
      <Animated.View
        ref={ref}
        style={[
          styles.cardWrapper,
          { marginBottom: cardMarginBottom },
          wrapperAnimatedStyle,
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
            day.isToday && [
              styles.cardToday,
              {
                borderColor: theme.accent,
                backgroundColor: theme.surface2,
                shadowColor: theme.accent,
              },
            ],
            isLocked && styles.cardLocked,
          ]}
        >
          <View
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
            {/* Day label column - no gesture */}
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
                  <SPText
                    style={[styles.todayBadgeText, { color: theme.void }]}
                  >
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

            {/* Draggable content */}
            <View style={[styles.contentRow, { gap: rowGap, flex: 1 }]}>
              <GestureDetector gesture={composedGesture}>
                <Animated.View
                  style={[
                    styles.draggableContent,
                    { gap: rowGap },
                    contentAnimatedStyle,
                  ]}
                >
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
                    {focusIconImage ? (
                      <Image
                        source={
                          isDark ? focusIconImage.dark : focusIconImage.light
                        }
                        style={{
                          width: iconSize,
                          height: iconSize,
                          borderRadius: 4,
                        }}
                        contentFit="contain"
                      />
                    ) : (
                      <IconComp
                        size={iconSize}
                        color={iconColor}
                        strokeWidth={1.5}
                      />
                    )}
                  </View>

                  <View style={styles.textCol}>
                    <SPText
                      style={[
                        styles.title,
                        { fontSize: titleSize, color: titleColor },
                      ]}
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
                          day.estimatedMinutes
                            ? `${day.estimatedMinutes} MIN`
                            : null
                        }
                        difficultyLabel={day.difficulty}
                      />
                    ) : null}
                  </View>
                </Animated.View>
              </GestureDetector>

              {/* Expand button - OUTSIDE the GestureDetector */}
              <View style={styles.actionCol}>
                {isLocked ? (
                  <Lock
                    size={rs(16, 17, 18, 18)}
                    color={theme.muted2}
                    strokeWidth={1.75}
                  />
                ) : (
                  <Pressable
                    onPress={toggleExpand}
                    style={({ pressed }) => [
                      styles.arrowCircle,
                      {
                        width: arrowCircleSize,
                        height: arrowCircleSize,
                        borderRadius: arrowCircleSize / 2,
                        borderColor: theme.text + "33",
                        backgroundColor: pressed
                          ? theme.surface2
                          : "transparent",
                      },
                    ]}
                  >
                    <Animated.View style={chevronAnimatedStyle}>
                      {expanded ? (
                        <ChevronDown
                          size={14}
                          color={theme.accent}
                          strokeWidth={2}
                        />
                      ) : (
                        <ChevronRight
                          size={14}
                          color={theme.text}
                          strokeWidth={2}
                        />
                      )}
                    </Animated.View>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {!isLocked && expanded ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={[
                styles.expandMeasure,
                {
                  paddingHorizontal: expandPaddingH,
                  paddingBottom: expandPaddingBottom,
                },
              ]}
            >
              <View
                style={[
                  styles.expandDivider,
                  { backgroundColor: theme.border },
                ]}
              />
              <ExpandableWorkoutList
                exercises={day.exercises}
                onStartSession={() => onStartSession(day)}
              />
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  cardWrapper: {},
  card: {
    borderRadius: GT.r20,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardToday: {
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
  },
  dayLabelCol: {
    gap: GT.s4,
  },
  dayAbbrev: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 0.5,
  },
  todayBadge: {
    borderRadius: GT.r8,
    paddingHorizontal: GT.s6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  todayBadgeText: {
    fontFamily: GT.font.semiBold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  draggableContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: GT.font.display,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: GT.font.medium,
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
  },
  expandMeasure: {},
  expandDivider: {
    height: 1,
    marginBottom: GT.s4,
  },
});
