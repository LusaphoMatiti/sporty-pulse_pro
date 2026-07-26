// Maps the free-text PlannedSession.focus string (e.g. "Chest", "Legs")
// to a known MuscleFocus icon key. Falls back gracefully for any custom
// catalog copy that doesn't match exactly, so new content never breaks
// the icon lookup.

import type { MuscleFocus } from "../src/types/gymPrograms";

const FOCUS_KEYWORDS: { keyword: string; focus: MuscleFocus }[] = [
  { keyword: "chest", focus: "CHEST" },
  { keyword: "back", focus: "BACK" },
  { keyword: "leg", focus: "LEGS" },
  { keyword: "shoulder", focus: "SHOULDERS" },
  { keyword: "arm", focus: "ARMS" },
  { keyword: "bicep", focus: "ARMS" },
  { keyword: "tricep", focus: "ARMS" },
  { keyword: "recover", focus: "RECOVERY" },
  { keyword: "mobility", focus: "RECOVERY" },
];

export function resolveMuscleFocus(focus: string | null): MuscleFocus {
  if (!focus) return "REST";
  const lower = focus.toLowerCase();
  const match = FOCUS_KEYWORDS.find((f) => lower.includes(f.keyword));
  return match?.focus ?? "RECOVERY";
}

export const DAY_ABBREV = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
