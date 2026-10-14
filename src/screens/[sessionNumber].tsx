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
import { cacheSessionStart, getCachedSessionStart } from "../lib/offilne";
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

    getSessionStart(instanceId, n)
      .then((res) => {
        if (cancelled) return;
        if (!res?.success || !res.data) {
          setState({ status: "error", message: "Session not found" });
        } else {
          setState({ status: "ready", data: res.data });
          // Keep a copy for offline use, and also save the next workout
          cacheSessionStart(instanceId, n, res.data);
          getSessionStart(instanceId, n + 1)
            .then((next) => {
              if (next?.success && next.data) {
                cacheSessionStart(instanceId, n + 1, next.data);
              }
            })
            .catch(() => {});
        }
      })
      .catch(async (err: Error) => {
        if (cancelled) return;
        // The server answered with an error — don't hide it behind the cache
        if (err instanceof ApiRequestError) {
          setState({ status: "error", message: err.message });
          return;
        }
        // No connection: open the saved copy. Drafts can't be loaded offline,
        // so the workout starts fresh instead of resuming a stale draft.
        const cached = await getCachedSessionStart(instanceId, n);
        if (cancelled) return;
        if (cached) {
          setState({ status: "ready", data: { ...cached, draft: null } });
        } else {
          setState({
            status: "error",
            message:
              "No connection, and this workout isn't saved on your phone yet. Open it once while online and it will work offline next time.",
          });
        }
      });

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
