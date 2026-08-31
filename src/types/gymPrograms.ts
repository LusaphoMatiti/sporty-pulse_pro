export type MuscleFocus =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "SHOULDERS"
  | "ARMS"
  | "PUSH"
  | "PULL"
  | "UPPER"
  | "LOWER"
  | "FULLBODY"
  | "CONDITIONING"
  | "CORE"
  | "RECOVERY"
  | "REST";

export interface ScheduleExercise {
  id: string;
  name: string;
  repsScheme: number[]; // one rep count per set, in order — e.g. [12,12] or [15,12,10]
}

export interface ScheduleDay {
  dayIndex: number; // 0 = Monday ... 6 = Sunday
  dayLabel: string; // "Monday"
  dayAbbrev: string; // "MON"
  sessionNumber: number | null;
  focus: string | null; // raw focus string from PlannedSession, e.g. "Chest"
  estimatedMinutes: number | null;
  difficulty: string | null; // from WorkoutPlan.difficulty
  exercises: ScheduleExercise[];
  isRestDay: boolean;
  isToday: boolean;
  plannedSessionId: string | null; // needed to persist a drag-and-drop reorder
}

export interface HeroSplitData {
  planName: string; // e.g. "Push Pull Legs"
  description: string; // "Generated based on your preferences."
}

export interface GymProgramsData {
  hero: HeroSplitData | null;
  days: ScheduleDay[];
}

export type BottomNavTab = "HOME" | "TRAINING" | "PROGRESS" | "SETTINGS";
