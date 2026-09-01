import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { SPText } from "../ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useAppTheme } from "../../theme/ThemeContext";
import { MUSCLE_ICON_MAP, DefaultFocusIcon } from "../icons/MuscleIcons";
import { resolveMuscleFocus } from "../../../contants/gymFocusMap";

interface DragGhostProps {
  label: string; // e.g. "Chest", or "Rest Day"
  isRestDay: boolean;
  x: SharedValue<number>; // absolute screen coordinates, updated by the
  y: SharedValue<number>; // Pan gesture in GymProgramsScreen.tsx
}

// Centered on the finger via a fixed offset — simpler and more robust
// than measuring the ghost's own rendered size, since it's a fixed-size
// chip.
const GHOST_WIDTH = 150;
const GHOST_HEIGHT = 48;

export function DragGhost({ label, isRestDay, x, y }: DragGhostProps) {
  const { theme } = useAppTheme();
  const IconComp = isRestDay
    ? MUSCLE_ICON_MAP.REST
    : (MUSCLE_ICON_MAP[resolveMuscleFocus(label)] ?? DefaultFocusIcon);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - GHOST_WIDTH / 2 },
      { translateY: y.value - GHOST_HEIGHT / 2 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ghost,
        animatedStyle,
        { backgroundColor: theme.surface2, borderColor: theme.accent },
      ]}
    >
      <IconComp size={16} color={theme.accent} strokeWidth={1.75} />
      <SPText style={[styles.label, { color: theme.text }]} numberOfLines={1}>
        {label}
      </SPText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: "absolute",
    top: 0,
    left: 0,
    width: GHOST_WIDTH,
    height: GHOST_HEIGHT,
    borderRadius: GT.r16,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: GT.s8,
    paddingHorizontal: GT.s12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 999,
  },
  label: {
    fontFamily: GT.font.semiBold,
    fontSize: 13,
    flexShrink: 1,
  },
});
