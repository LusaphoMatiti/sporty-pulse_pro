import { useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "../lib/api";
import { ALL_CHANNELS } from "../lib/notifications/style";

type RegisterResult =
  | { success: true }
  | { success: false; reason: "not-device" | "permission-denied" | "error" };

export function usePushRegistration() {
  const registerForPushNotifications =
    useCallback(async (): Promise<RegisterResult> => {
      // Push tokens don't exist on simulators/emulators
      if (!Device.isDevice) return { success: false, reason: "not-device" };

      // Android 8+ silently drops notifications with no channel — required, not optional.
      // Create one channel per notification style (daily-habit, streak-saver,
      // recovery, reschedule, milestone) so each gets its own vibration
      // pattern and can be individually managed by the user in system
      // settings. Safe to call every time -- Android only locks importance/
      // vibration/sound after a channel's FIRST creation; re-calling with
      // the same id + same config is a no-op.
      if (Platform.OS === "android") {
        await Promise.all(
          ALL_CHANNELS.map((style) =>
            Notifications.setNotificationChannelAsync(style.channelId, {
              name: style.channelName,
              importance: style.importance,
              vibrationPattern: style.vibrationPattern,
            }),
          ),
        );
        // Fallback channel for anything that doesn't specify a channelId.
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        return { success: false, reason: "permission-denied" };
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) throw new Error("Missing EAS projectId in app config");

        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        await api.post("/api/notifications/register-device", {
          pushToken,
          timezone,
        });

        return { success: true };
      } catch (err) {
        console.error("[usePushRegistration] failed:", err);
        return { success: false, reason: "error" };
      }
    }, []);

  return { registerForPushNotifications };
}
