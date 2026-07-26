import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import type { ScheduleExercise } from "../../types/gymPrograms";

interface ExpandableWorkoutListProps {
  exercises: ScheduleExercise[];
  onStartSession: () => void;
}

export function ExpandableWorkoutList({
  exercises,
  onStartSession,
}: ExpandableWorkoutListProps) {
  return (
    <View style={styles.container}>
      {exercises.map((ex, i) => (
        <View
          key={ex.id}
          style={[
            styles.exerciseRow,
            i === exercises.length - 1 && styles.exerciseRowLast,
          ]}
        >
          <SPText style={styles.exerciseName}>{ex.name}</SPText>
          <SPText style={styles.exerciseSetsReps}>
            {ex.sets} x {ex.reps}
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
          pressed && styles.startButtonPressed,
        ]}
      >
        <SPText style={styles.startButtonLabel}>START SESSION</SPText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: GT.s16,
    paddingBottom: GT.s8,
    gap: GT.s4,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: GT.s10,
    borderBottomWidth: 1,
    borderBottomColor: GT.border,
  },
  exerciseRowLast: {
    borderBottomWidth: 0,
  },
  exerciseName: {
    fontFamily: GT.font.medium,
    fontSize: 15,
    color: GT.text,
  },
  exerciseSetsReps: {
    fontFamily: GT.font.medium,
    fontSize: 14,
    color: GT.muted,
  },
  startButton: {
    marginTop: GT.s16,
    height: 52,
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
    fontSize: 14,
    letterSpacing: 1,
    color: GT.void,
  },
});
