import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useResponsive } from "../../hooks/useResponsive";
import type { ScheduleExercise } from "../../types/gymPrograms";

interface ExpandableWorkoutListProps {
  exercises: ScheduleExercise[];
  onStartSession: () => void;
}

// A flat scheme (every set the same rep count, e.g. Beginner's [12,12])
// reads better as compact "2 x 12" gym shorthand. A real pyramid (e.g.
// Intermediate's [15,12,10]) needs every number shown in order — collapsing
// it to "3 x 12" would silently hide the descending structure that's the
// whole point of the scheme.
function formatRepsScheme(scheme: number[]): string {
  if (scheme.length === 0) return "";
  const isFlat = scheme.every((r) => r === scheme[0]);
  return isFlat ? `${scheme.length} x ${scheme[0]}` : scheme.join(" → ");
}

export function ExpandableWorkoutList({
  exercises,
  onStartSession,
}: ExpandableWorkoutListProps) {
  const { rs } = useResponsive();

  const containerPaddingTop = rs(12, 14, 15, 16);
  const rowPaddingV = rs(7, 8, 9, 10);
  const exerciseNameSize = rs(13, 14, 14, 15);
  const exerciseSetsRepsSize = rs(12, 13, 13, 14);
  const buttonHeight = rs(42, 46, 48, 50);
  const buttonMarginTop = rs(12, 14, 15, 16);
  const buttonLabelSize = rs(12, 13, 13, 14);

  return (
    <View style={[styles.container, { paddingTop: containerPaddingTop }]}>
      {exercises.map((ex, i) => (
        <View
          key={ex.id}
          style={[
            styles.exerciseRow,
            { paddingVertical: rowPaddingV },
            i === exercises.length - 1 && styles.exerciseRowLast,
          ]}
        >
          <SPText style={[styles.exerciseName, { fontSize: exerciseNameSize }]}>
            {ex.name}
          </SPText>
          <SPText
            style={[
              styles.exerciseSetsReps,
              { fontSize: exerciseSetsRepsSize },
            ]}
          >
            {formatRepsScheme(ex.repsScheme)}
          </SPText>
        </View>
      ))}

      <Pressable
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {
            // haptics unsupported on this device/simulator — ignore
          }
          onStartSession();
        }}
        style={({ pressed }) => [
          styles.startButton,
          { height: buttonHeight, marginTop: buttonMarginTop },
          pressed && styles.startButtonPressed,
        ]}
      >
        <SPText
          style={[styles.startButtonLabel, { fontSize: buttonLabelSize }]}
        >
          START SESSION
        </SPText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: GT.s8,
    gap: GT.s4,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: GT.border,
  },
  exerciseRowLast: {
    borderBottomWidth: 0,
  },
  exerciseName: {
    fontFamily: GT.font.medium,
    color: GT.text,
  },
  exerciseSetsReps: {
    fontFamily: GT.font.medium,
    color: GT.muted,
  },
  startButton: {
    borderRadius: GT.r999,
    backgroundColor: GT.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  startButtonLabel: {
    fontFamily: GT.font.semiBold,
    letterSpacing: 1,
    color: GT.void,
  },
});
