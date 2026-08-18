import { useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "../lib/api";

type RegisterResult =
  | { success: true }
  | { success: false; reason: "not-device" | "permission-denied" | "error" };

export function usePushRegistration() {
  const registerForPushNotifications =
    useCallback(async (): Promise<RegisterResult> => {
      // Push tokens don't exist on simulators/emulators
      if (!Device.isDevice) return { success: false, reason: "not-device" };

      // Android 8+ silently drops notifications with no channel — required, not optional
      if (Platform.OS === "android") {
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
