import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ImageBackground,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { SPText } from "../../components/ui/SPText";
import { SPButton } from "../../components/ui/SPButton";
import { SPIcon } from "../../components/icons/SPIcon";
import { AuthInput } from "../../components/settings/AuthInput";
import { api, storeSessionToken } from "../../lib/api";
import { spring } from "../../theme";

WebBrowser.maybeCompleteAuthSession();

// ─── Design tokens (mirrors LoginScreen) ─────────────────────────────────────

const T = {
  bg: "#0C0E10",
  surface: "#13171A",
  surface2: "#1A1F23",
  border: "rgba(255,255,255,0.07)",
  text: "#F0EDE4",
  muted: "#6B6B62",
  muted2: "#9A9A90",
  accent: "#C8F135",
  accentDim: "rgba(200,241,53,0.10)",
  void: "#0A0A0A",
  raised: "#1E1E1E",
  danger: "#FF4D4D",
  dangerDim: "rgba(255,77,77,0.08)",
  dangerBorder: "rgba(255,77,77,0.20)",

  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s48: 48,

  r12: 12,
  r16: 16,
};

// ─── Responsive helpers ───────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get("window");
const isSmall = SCREEN_H < 668;
const isLarge = SCREEN_H > 900;

// Hero fills the full screen behind the sheet
const HERO_FLEX = 1;

// Sheet sits absolutely — starts offscreen below, slides to SHEET_TOP
const SHEET_TOP = 24;

// ─── Error messages ───────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  EmailAlreadyExists: "An account with this email already exists.",
  default: "Something went wrong. Please try again.",
};

// ─── Google button ────────────────────────────────────────────────────────────

function GoogleButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading: boolean;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={aStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, spring.snappy);
        }}
        disabled={loading}
        style={styles.googleBtn}
      >
        <View style={styles.googleIconBox}>
          <SPText style={styles.googleG}>G</SPText>
        </View>
        <SPText style={styles.googleLabel}>Continue with Google</SPText>
      </Pressable>
    </Animated.View>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <SPIcon name="warning" size={14} color={T.danger} />
      <SPText style={styles.errorText}>{message}</SPText>
    </View>
  );
}

// ─── Main RegisterScreen ──────────────────────────────────────────────────────

export function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Entrance: hero fades in, then sheet slides up from bottom ────────────
  const op1 = useSharedValue(0);
  const ty1 = useSharedValue(20);
  const sheetY = useSharedValue(SCREEN_H); // starts fully offscreen below
  const op3 = useSharedValue(0);
  const ty3 = useSharedValue(20);

  const skeletonOp = useSharedValue(1);

  React.useEffect(() => {
    skeletonOp.value = 1; // skeleton visible immediately on mount

    // Fade skeleton out at 400ms as real screen animates in
    skeletonOp.value = withDelay(400, withTiming(0, { duration: 200 }));

    const t = setTimeout(() => {
      const ease = { duration: 250, easing: Easing.out(Easing.cubic) };
      op1.value = withTiming(1, ease);
      ty1.value = withSpring(0, spring.smooth);
      sheetY.value = withDelay(
        120,
        withSpring(SHEET_TOP, { damping: 28, stiffness: 280, mass: 0.8 }),
      );
      op3.value = withDelay(300, withTiming(1, ease));
      ty3.value = withDelay(300, withSpring(0, spring.smooth));
    }, 400);

    return () => clearTimeout(t);
  }, []);
  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOp.value,
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: op1.value,
    transform: [{ translateY: ty1.value }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    top: sheetY.value,
  }));

  const s3 = useAnimatedStyle(() => ({
    opacity: op3.value,
    transform: [{ translateY: ty3.value }],
  }));

  // ── Navigate back — sheet slides back down, then router.back() ───────────
  function navigateBack() {
    router.back();
  }

  function handleGoToLogin() {
    sheetY.value = withSpring(
      SCREEN_H,
      { damping: 28, stiffness: 280, mass: 0.8 },
      () => runOnJS(navigateBack)(),
    );
  }

  // ── Register ─────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token?: string; error?: string }>(
        "/api/auth/register",
        { name, email, password },
      );
      if (res?.token) {
        await storeSessionToken(res.token);
        router.replace("/welcome" as any);
      } else {
        setError(
          res?.error
            ? (ERROR_MESSAGES[res.error] ?? ERROR_MESSAGES.default)
            : ERROR_MESSAGES.default,
        );
      }
    } catch {
      setError(ERROR_MESSAGES.default);
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const redirectUrl = Linking.createURL("auth");
      const authUrl = `${baseUrl}/api/auth/mobile-initiate?redirectUri=${encodeURIComponent(redirectUrl)}&intent=register`;
      // Storing the token and navigating on success is owned exclusively by
      // the centralized deep-link handler in app/_layout.tsx
      // (handleAuthDeepLink), which receives this same redirect via its own
      // Linking "url" listener. Handling it again here raced against that
      // handler — sometimes losing a token write, sometimes double-
      // navigating — so this call now only opens the browser and lets
      // _layout.tsx take it from there.
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl,
      );

      if (result.type !== "success") {
        // User backed out, or the OS foregrounded the app via the deep
        // link before this promise resolved — either way there's nothing
        // to do here; _layout.tsx's listener handles a real success.
        return;
      }
    } catch {
      setError("Google sign-up failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ── Hero — same background as LoginScreen, briefly visible on enter ── */}
        <Animated.View style={[{ flex: HERO_FLEX }, heroStyle]}>
          <ImageBackground
            source={require("../../../assets/images/all_set.png")}
            style={styles.imageBg}
            resizeMode="cover"
          >
            <View
              style={[
                styles.overlay,
                { paddingTop: Math.max(insets.top + T.s16, T.s48) },
              ]}
            >
              <Image
                source={require("../../../assets/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={[styles.heroText, styles.heroTextWithLogo]}>
                <SPText style={[styles.h1, styles.h1Accent]}>
                  Sporty Pulse Pro
                </SPText>
                <SPText style={styles.subtext}>Every Session Counts.</SPText>
              </View>
            </View>
            <LinearGradient
              colors={["transparent", T.bg]}
              style={styles.heroFade}
              pointerEvents="none"
            />
          </ImageBackground>
        </Animated.View>

        {/* ── Sheet — slides up from bottom to fill the full screen ── */}
        <Animated.View
          style={[
            styles.bottomSheet,
            { position: "absolute", left: 0, right: 0, bottom: 0 },
            sheetStyle,
          ]}
        >
          <View style={styles.dragHandleRow}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + T.s16, T.s24) },
            ]}
          >
            {/* Back to login */}
            <Pressable style={styles.backRow} onPress={handleGoToLogin}>
              <SPIcon name="back" size={16} color={T.accent} />
              <SPText style={styles.backText}>Back to Log In</SPText>
            </Pressable>

            <SPText style={styles.h1}>Create Account</SPText>
            <SPText style={styles.subtitle}>
              Start your training journey today.
            </SPText>

            {!!error && <ErrorBanner message={error} />}

            <View style={styles.fields}>
              <AuthInput
                label="Full Name"
                value={name}
                onChangeText={(t) => {
                  setError("");
                  setName(t);
                }}
              />
              <AuthInput
                label="Email"
                value={email}
                onChangeText={(t) => {
                  setError("");
                  setEmail(t);
                }}
              />
              <AuthInput
                label="Password"
                isPassword
                value={password}
                onChangeText={(t) => {
                  setError("");
                  setPassword(t);
                }}
              />
            </View>

            <SPButton onPress={handleRegister} loading={loading}>
              Create Account
            </SPButton>

            <SPText style={styles.orText}>or continue with</SPText>

            <GoogleButton onPress={handleGoogle} loading={googleLoading} />

            <Animated.View style={[styles.footer, s3]}>
              <SPText style={styles.footerText}>
                Already have an account?{" "}
              </SPText>
              <Pressable onPress={handleGoToLogin}>
                <SPText style={styles.footerLink}>Log In</SPText>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },

  imageBg: { flex: 1 },

  overlay: {
    flex: 1,
    paddingHorizontal: T.s16,
    justifyContent: "flex-start",
    backgroundColor: "rgba(12,14,16,0.58)",
  },
  heroFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  logo: {
    position: "absolute",
    top: 0,
    left: T.s16,
    marginTop: 30,
    borderRadius: 14,
    width: 60,
    height: 60,
  },
  heroText: {
    marginTop: T.s32,
    gap: T.s8,
  },
  heroTextWithLogo: {
    marginTop: 70,
  },

  bottomSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
  },

  scrollContent: {
    paddingHorizontal: T.s24,
    paddingTop: T.s16,
    gap: T.s20,
  } as any,

  dragHandleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.s4,
    alignSelf: "flex-start",
    marginBottom: T.s4,
  },
  backText: {
    fontFamily: "Barlow-Medium",
    fontSize: 13,
    color: T.accent,
  },

  h1: {
    fontFamily: "Barlow-Bold",
    fontSize: isSmall ? 26 : 30,
    lineHeight: isSmall ? 32 : 36,
    color: T.text,
  },
  h1Accent: { color: T.accent },
  subtitle: {
    fontFamily: "Barlow-Regular",
    fontSize: 15,
    color: T.muted2,
    marginTop: -T.s12,
  },
  subtext: {
    fontFamily: "Barlow-SemiBold",
    fontSize: 16,
    color: T.text,
    marginTop: T.s4,
  },

  fields: { gap: T.s16 },

  orText: {
    textAlign: "center",
    fontFamily: "Barlow-Medium",
    fontSize: 12,
    color: T.muted,
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: T.s8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r16,
    height: 52,
    paddingHorizontal: T.s16,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: { fontFamily: "Barlow-Bold", fontSize: 13, color: T.text },
  googleLabel: { fontFamily: "Barlow-Medium", fontSize: 14, color: T.text },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.s8,
    backgroundColor: T.dangerDim,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    borderRadius: T.r12,
    padding: T.s16,
  },
  errorText: {
    fontFamily: "Barlow-Regular",
    fontSize: 12,
    color: T.danger,
    flex: 1,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: T.s8,
  },
  footerText: { fontFamily: "Barlow-Regular", fontSize: 12, color: T.muted2 },
  footerLink: { fontFamily: "Barlow-Medium", fontSize: 12, color: T.accent },
});