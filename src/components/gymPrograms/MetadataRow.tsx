// components/gymPrograms/MetadataRow.tsx

import React from "react";
import { View, StyleSheet } from "react-native";
import { Clock, BarChart3 } from "lucide-react-native";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useAppTheme } from "../../theme/ThemeContext";

interface MetadataRowProps {
  durationLabel: string | null; // e.g. "45 MIN"
  difficultyLabel: string | null; // e.g. "INTERMEDIATE"
  muted?: boolean;
}

export function MetadataRow({
  durationLabel,
  difficultyLabel,
  muted = false,
}: MetadataRowProps) {
  const { theme } = useAppTheme();
  if (!durationLabel && !difficultyLabel) return null;

  const color = muted ? theme.muted2 : theme.muted;

  return (
    <View style={styles.row}>
      {durationLabel ? (
        <View style={styles.item}>
          <Clock size={12} color={color} strokeWidth={2} />
          <SPText style={[styles.text, { color }]}>{durationLabel}</SPText>
        </View>
      ) : null}
      {durationLabel && difficultyLabel ? (
        <SPText style={[styles.dot, { color }]}>•</SPText>
      ) : null}
      {difficultyLabel ? (
        <View style={styles.item}>
          <BarChart3 size={12} color={color} strokeWidth={2} />
          <SPText style={[styles.text, { color }]}>{difficultyLabel}</SPText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: GT.s8,
    marginTop: GT.s4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: GT.s4,
  },
  text: {
    fontFamily: GT.font.medium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  dot: {
    fontSize: 12,
  },
});
