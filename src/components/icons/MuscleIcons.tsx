// ─────────────────────────────────────────────
// Minimalist line-art muscle-group glyphs matching the design's outline
// style (thin accent stroke, no fill). Chest/Back/Legs/Shoulders/Arms
// don't exist in lucide-react-native, so these are custom SVG paths.
// Recovery and Rest reuse existing lucide icons (HeartPulse, BedDouble)
// since those are standard, recognizable glyphs already available.
// ─────────────────────────────────────────────

import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { HeartPulse, BedDouble, Dumbbell } from "lucide-react-native";
import type { MuscleFocus } from "../../types/gymPrograms";

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function ChestIcon({
  size = 24,
  color = "#C8F135",
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5c-1.6-1.6-4-2-5.5-.5C4.8 6.3 4.5 9 5 11.5 5.6 14.5 7.8 17.5 12 20c4.2-2.5 6.4-5.5 7-8.5.5-2.5.2-5.2-1.5-7C16 3 13.6 3.4 12 5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M12 5v15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BackIcon({
  size = 24,
  color = "#C8F135",
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4c0 3-1.5 4.5-3.5 6C3 11.2 3 13.5 4 16c1.2 3 3.2 4.5 4.5 4.5.9 0 1.3-1 1.3-2.5v-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M16 4c0 3 1.5 4.5 3.5 6 1.5 1.2 1.5 3.5.5 6-1.2 3-3.2 4.5-4.5 4.5-.9 0-1.3-1-1.3-2.5v-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M12 4v16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LegsIcon({
  size = 24,
  color = "#C8F135",
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3h6v6.5c0 1.8.4 3.6 1.2 5.2l1.3 4.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 3v6.5c0 1.8-.4 3.6-1.2 5.2l-1.3 4.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 9.5h6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ShouldersIcon({
  size = 24,
  color = "#C8F135",
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 13c0-3 1.8-5 4-5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M20 13c0-3-1.8-5-4-5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M8 7.5c1.2-1 2.6-1.5 4-1.5s2.8.5 4 1.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M4 13c1 3 3 5.5 5 7M20 13c-1 3-3 5.5-5 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ArmsIcon({
  size = 24,
  color = "#C8F135",
  strokeWidth = 1.5,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 20c-1.5-2-2-4.5-1.2-7.2C6.4 10 8 8.5 8 8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 8.5c-.6-1.4-.2-3 1.2-3.8 1.4-.8 3.2-.3 4 1.1.7 1.2.5 2.7-.4 3.7C14.8 8 17 8.6 17.6 11c.6 2.5-1 4.6-3.4 5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9.3" cy="7" r="0.6" fill={color} />
    </Svg>
  );
}

// Keyed lookup used by WeeklyDayCard — keeps that component free of a
// giant switch statement and easy to extend with new focuses later.
export const MUSCLE_ICON_MAP: Record<
  MuscleFocus,
  React.ComponentType<IconProps>
> = {
  CHEST: ChestIcon,
  BACK: BackIcon,
  LEGS: LegsIcon,
  SHOULDERS: ShouldersIcon,
  ARMS: ArmsIcon,
  RECOVERY: HeartPulse,
  REST: BedDouble,
};

// Fallback used if a session's `focus` string doesn't match a known key
// (e.g. custom catalog copy) — keeps the UI from breaking on new content.
export const DefaultFocusIcon = Dumbbell;
