import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SessionScreen from "../screens/SessionScreen";
import { SPText } from "../components/ui/SPText";
import {
  ApiRequestError,
  getSessionStart,
  type SessionStartData,
} from "../lib/api";
import {
  cacheSessionStart,
  getCachedSessionStart,
  getLocalDraft,
} from "../lib/offline";
import { useAppTheme } from "../theme/ThemeContext";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: SessionStartData };

export default function SessionRoute() {
  const { instanceId, sessionNumber } = useLocalSearchParams<{
    instanceId: string;
    sessionNumber: string;
  }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!instanceId || !sessionNumber) {
      setState({ status: "error", message: "Missing route params" });
      return;
    }

    let cancelled = false;

    const n = Number(sessionNumber);

    const load = async () => {
      const cached = await getCachedSessionStart(instanceId, n);
      const local = await getLocalDraft(instanceId, n);
      console.log(
        "[session] saved copy:",
        cached ? "yes" : "NO",
        "| progress saved on phone:",
        local ? "yes" : "no",
      );

      try {
        const request = getSessionStart(instanceId, n);
        // With a saved copy, don't wait on a connection that is "up" but not
        // really working (e.g. Wi-Fi with no internet) — fall back after 3s.
        const res = cached
          ? await Promise.race([
              request,
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 3000),
              ),
            ])
          : await request;
        if (cancelled) return;

        if (!res?.success || !res.data) {
          setState({ status: "error", message: "Session not found" });
          return;
        }

        // Progress saved on this phone is at least as new as the server's
        setState({
          status: "ready",
          data: local ? { ...res.data, draft: local } : res.data,
        });
        // Keep a copy for offline use, and also save the next workout
        cacheSessionStart(instanceId, n, res.data);
        getSessionStart(instanceId, n + 1)
          .then((next) => {
            if (next?.success && next.data) {
              cacheSessionStart(instanceId, n + 1, next.data);
            }
          })
          .catch(() => {});
      } catch (err) {
        if (cancelled) return;
        // The server answered with an error — don't hide it behind the cache
        if (err instanceof ApiRequestError) {
          setState({ status: "error", message: err.message });
          return;
        }
        // No (working) connection: open the saved copy, resuming any progress
        // that was saved on this phone.
        console.log(
          "[session] offline, using saved copy:",
          cached ? "yes" : "NO",
        );
        if (cached) {
          setState({ status: "ready", data: { ...cached, draft: local } });
        } else {
          setState({
            status: "error",
            message:
              "No connection, and this workout isn't saved on your phone yet. Open it once while online and it will work offline next time.",
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [instanceId, sessionNumber]);

  if (state.status === "loading") {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.bg }]}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  if (state.status === "error") {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.bg }]}
        edges={["top", "bottom"]}
      >
        <SPText style={{ color: theme.muted, marginBottom: 16 }}>
          {state.message}
        </SPText>
        <SPText
          style={{ color: theme.accent }}
          onPress={() => router.replace("/(tabs)/training")}
        >
          ← Back to training
        </SPText>
      </SafeAreaView>
    );
  }

  return <SessionScreen {...state.data} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
