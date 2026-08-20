import * as Notifications from "expo-notifications";

export type NotificationTypeKey =
  | "DAILY_HABIT"
  | "STREAK_SAVER"
  | "RECOVERY_NUDGE"
  | "RECOVERY_READY"
  | "RESCHEDULE_SUGGESTION"
  | "MILESTONE";

export type NotificationStyle = {
  channelId: string;
  channelName: string;
  importance: Notifications.AndroidImportance;
  vibrationPattern: number[];
};

export const NOTIFICATION_STYLE: Record<
  NotificationTypeKey,
  NotificationStyle
> = {
  DAILY_HABIT: {
    channelId: "daily-habit",
    channelName: "Daily Session Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150],
  },
  STREAK_SAVER: {
    channelId: "streak-saver",
    channelName: "Streak Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150, 100, 150],
  },
  RECOVERY_NUDGE: {
    channelId: "recovery",
    channelName: "Recovery",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100],
  },
  RECOVERY_READY: {
    // Intentionally shares the "recovery" channel with RECOVERY_NUDGE.
    channelId: "recovery",
    channelName: "Recovery",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150],
  },
  RESCHEDULE_SUGGESTION: {
    channelId: "reschedule",
    channelName: "Reschedule Suggestions",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150],
  },
  MILESTONE: {
    channelId: "milestone",
    channelName: "Milestones",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100, 80, 100, 80, 150],
  },
};

// Deduped by channelId (RECOVERY_NUDGE + RECOVERY_READY intentionally
// share one), for iterating when creating channels on-device.
export const ALL_CHANNELS: NotificationStyle[] = Object.values(
  NOTIFICATION_STYLE,
).filter(
  (style, idx, arr) =>
    arr.findIndex((s) => s.channelId === style.channelId) === idx,
);
