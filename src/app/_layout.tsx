import React, { useEffect, useState } from "react";
import { View, StatusBar, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { jwtDecode } from "jwt-decode";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  getSessionToken,
  clearSessionToken,
  storeSessionToken,
} from "../lib/api";
import * as Notifications from "expo-notifications";
import { ThemeProvider, useAppTheme } from "../theme/ThemeContext";
import PrivacyPolicyModal from "../components/ui/PrivacyPolicyModal";

SplashScreen.preventAutoHideAsync();

// ─── Foreground notification display ───────────────────────────────────────
//
// Without this, expo-notifications shows nothing while the app is
// foregrounded — background/killed-state delivery is unaffected either way.
// Guarded for web since expo-notifications isn't supported there and app.json
// still declares a web target.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false, // no badge-count system yet — flip on if you add one
    }),
  });
}

// ─── Auth deep link handling ────────────────────────────────────────────────
//
// +native-intent.tsx tells Expo Router NOT to automatically resolve
// sporty-pulse-pro://auth links against the file-based route tree. Without
// that, Router's own automatic deep-link resolution and auth.tsx's
// useEffect were independently racing to land on /welcome, and Router's
// pass would occasionally re-settle there a second/third time without the
// firstName/email params attached. Now this is the ONE place that handles
// that URL, on both cold launch (getInitialURL) and warm resume (the "url"
// event) — so there's nothing left for it to race against.

async function handleAuthDeepLink(
  url: string,
  router: ReturnType<typeof useRouter>,
) {
  const parsed = Linking.parse(url);
  const params = parsed.queryParams ?? {};

  const token = typeof params.token === "string" ? params.token : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  if (error) {
    router.replace({ pathname: "/(auth)/login", params: { error } } as any);
    return;
  }

  if (!token) {
    router.replace("/(auth)/login" as any);
    return;
  }

  await storeSessionToken(token);

  let firstName = "Athlete";
  let email = "";
  try {
    const payload = jwtDecode<{ name?: string; email?: string }>(token);
    firstName = payload.name?.split(" ")[0] ?? "Athlete";
    email = payload.email ?? "";
  } catch {
    // Fall back to defaults — welcome screens still render fine.
  }

  const isNew = params.isNew === "true";
  if (isNew) {
    router.replace({ pathname: "/welcome", params: { firstName } } as any);
  } else {
    router.replace({
      pathname: "/welcome-back",
      params: { firstName, email },
    } as any);
  }
}

const NOTIFICATION_ROUTES: Record<string, string> = {
  DAILY_HABIT: "/training",
  STREAK_SAVER: "/training",
  RESCHEDULE_SUGGESTION: "/training",
  RECOVERY_NUDGE: "/",
  MILESTONE: "/progress",
};

function handleNotificationTap(
  response: Notifications.NotificationResponse,
  router: ReturnType<typeof useRouter>,
) {
  const data = response.notification.request.content.data as
    | { type?: string }
    | undefined;
  const path = (data?.type && NOTIFICATION_ROUTES[data.type]) || "/";
  router.push(path as any);
}

// ─── ThemedApp ────────────────────────────────────────────────────────────────
// Receives the resolved auth state so it can redirect declaratively
// *after* the Stack navigator is mounted — avoids the race condition where
// router.replace() fires before the navigator tree exists.
//
// skipRedirect is true when this cold launch came in via the auth deep
// link — in that case handleAuthDeepLink above already owns navigation,
// and this effect must not also redirect based on the token state
// checkAuth() read independently.

interface ThemedAppProps {
  hasToken: boolean;
  skipRedirect: boolean;
}

function ThemedApp({ hasToken, skipRedirect }: ThemedAppProps) {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    if (skipRedirect) return;

    const id = setTimeout(() => {
      if (hasToken) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/login");
      }
    }, 0);
    return () => clearTimeout(id);
  }, [hasToken, skipRedirect]);

  // Notification tap routing — cold start (app launched via tap) and warm
  // (app already running, tap arrives as an event), same split as the auth
  // deep link handling above. Guarded on web for the same reason as the
  // notification handler.
  useEffect(() => {
    if (!hasToken || Platform.OS === "web") return;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationTap(response, router);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => handleNotificationTap(response, router),
    );
    return () => sub.remove();
  }, [hasToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.void}
          translucent={Platform.OS === "android"}
        />
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.bg },
              animation: "slide_from_right",
              animationDuration: 280,
            }}
          >
            <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
            <Stack.Screen
              name="onboarding"
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
          </Stack>
          <PrivacyPolicyModal />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── RootLayout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    "Barlow-Regular": require("../assets/fonts/Barlow-Regular.ttf"),
    "Barlow-Medium": require("../assets/fonts/Barlow-Medium.ttf"),
    "Barlow-SemiBold": require("../assets/fonts/Barlow-SemiBold.ttf"),
    "Barlow-Bold": require("../assets/fonts/Barlow-Bold.ttf"),
    "Barlow-ExtraBold": require("../assets/fonts/Barlow-ExtraBold.ttf"),
  });

  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  // True when this cold launch's URL is the auth callback — resolved once
  // via getInitialURL, which reflects the URL that launched the process.
  const [launchedViaAuthLink, setLaunchedViaAuthLink] = useState<
    boolean | null
  >(null);

  // ── Own the auth deep link end-to-end: cold launch + warm resume ─────────
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const isAuthLink = !!url && url.includes("/auth");
      setLaunchedViaAuthLink(isAuthLink);
      if (isAuthLink && url) {
        handleAuthDeepLink(url, router);
      }
    });

    // Warm resume: app already running, OAuth callback arrives as an event
    // instead of a fresh process launch.
    const sub = Linking.addEventListener("url", (event) => {
      if (event.url.includes("/auth")) {
        handleAuthDeepLink(event.url, router);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Step 1: check token ────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const token = await getSessionToken();

      if (!token) {
        setHasToken(false);
        setAuthChecked(true);
        return;
      }

      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/user/profile`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();

        if (!res.ok || !data?.id) {
          await clearSessionToken();
          setHasToken(false);
        } else {
          setHasToken(true);
        }
      } catch {
        // Network error — keep token, let them try
        setHasToken(!!token);
      }

      setAuthChecked(true);
    }

    checkAuth();
  }, []);

  // ── Step 2: hide splash when fonts + auth are both done ───────────────────
  useEffect(() => {
    if ((fontsLoaded || fontError) && authChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authChecked]);

  // ── Step 3: block render until ready ──────────────────────────────────────
  if (!fontsLoaded && !fontError) return null;
  if (!authChecked || hasToken === null) return null;
  if (launchedViaAuthLink === null) return null;

  return (
    <ThemeProvider>
      <ThemedApp hasToken={hasToken} skipRedirect={launchedViaAuthLink} />
    </ThemeProvider>
  );
}
