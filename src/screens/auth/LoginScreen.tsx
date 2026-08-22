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
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
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
import { api, storeSessionToken, ApiRequestError } from "../../lib/api";
import { spring } from "../../theme";
import { LoginSkeleton } from "./LoginSkeleton";

WebBrowser.maybeCompleteAuthSession();

// ─── Design tokens ────────────────────────────────────────────────────────────

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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const isSmall = SCREEN_H < 668;
const isLarge = SCREEN_H > 900;

const HERO_FLEX = isSmall ? 0.52 : isLarge ? 0.58 : 0.55;
const SHEET_FLEX = 1 - HERO_FLEX;
const SHEET_OVERLAP = 72;

// ─── Error messages ───────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is registered with a password. Please sign in with email instead.",
  CredentialsSignin: "Invalid email or password.",
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
          {/* "G" glyph — uses tag variant (bold, uppercase-ready) with explicit color */}
          <SPText variant="tag" color={T.text}>
            G
          </SPText>
        </View>
        {/* bodyMd matches the original 14px medium spec */}
        <SPText variant="bodyMd" color={T.text}>
          Continue with Google
        </SPText>
      </Pressable>
    </Animated.View>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({
  message,
  actionLabel,
  onActionPress,
}: {
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <SPIcon name="warning" size={14} color={T.danger} />
      <View style={styles.errorFlex}>
        {/* caption variant: 12px regular — matches original spec; color overridden to danger */}
        <SPText variant="caption" color={T.danger}>
          {message}
        </SPText>
        {!!actionLabel && !!onActionPress && (
          <Pressable onPress={onActionPress} style={styles.errorActionBtn}>
            <SPText variant="caption" color={T.accent}>
              {actionLabel}
            </SPText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── No-account modal ─────────────────────────────────────────────────────────
// Floating prompt shown whenever a login attempt (email/password OR Google)
// comes back with ACCOUNT_NOT_FOUND — makes "you need to sign up" impossible
// to miss, instead of relying on the inline banner alone.

function NoAccountModal({
  visible,
  message,
  onSignUp,
  onDismiss,
}: {
  visible: boolean;
  message: string;
  onSignUp: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        {/* inner Pressable with no-op onPress swallows taps so they don't
            bubble to the overlay and dismiss the modal */}
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalIconBox}>
            <SPIcon name="warning" size={20} color={T.accent} />
          </View>
          <SPText variant="h2" color={T.text} center>
            No account found
          </SPText>
          <SPText
            variant="bodyMd"
            color={T.muted2}
            center
            style={styles.modalMessage}
          >
            {message}
          </SPText>
          <SPButton onPress={onSignUp}>Sign Up</SPButton>
          <Pressable onPress={onDismiss} style={styles.modalDismissBtn}>
            <SPText variant="caption" color={T.muted2}>
              Try a different email
            </SPText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main LoginScreen ─────────────────────────────────────────────────────────

export function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Staggered entrance — 3 layers, 80 ms stagger
  const op1 = useSharedValue(0);
  const ty1 = useSharedValue(20);
  const op2 = useSharedValue(0);
  const ty2 = useSharedValue(20);
  const op3 = useSharedValue(0);
  const ty3 = useSharedValue(20);

  // Sheet slides in from the bottom on mount / focus
  const sheetTY = useSharedValue(SCREEN_H);

  const skeletonOp = useSharedValue(1);

  // ── Animated styles ───────────────────────────────────────────────────────
  const s1 = useAnimatedStyle(() => ({
    opacity: op1.value,
    transform: [{ translateY: ty1.value }],
  }));
  const s2 = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTY.value }],
    opacity: op2.value,
  }));
  const s3 = useAnimatedStyle(() => ({
    opacity: op3.value,
    transform: [{ translateY: ty3.value }],
  }));
  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOp.value,
    pointerEvents: skeletonOp.value === 0 ? "none" : "auto",
  }));

  // ── Runs on mount AND every time this screen comes back into focus ────────
  useFocusEffect(
    React.useCallback(() => {
      // Reset all animation values
      op1.value = 0;
      ty1.value = 20;
      op2.value = 0;
      ty2.value = 20;
      op3.value = 0;
      ty3.value = 20;
      sheetTY.value = SCREEN_H;
      skeletonOp.value = 1;

      const ease = { duration: 250, easing: Easing.out(Easing.cubic) };

      // Fade skeleton out as real screen animates in
      skeletonOp.value = withDelay(400, withTiming(0, { duration: 200 }));

      const t = setTimeout(() => {
        op1.value = withTiming(1, ease);
        ty1.value = withSpring(0, spring.smooth);
        op2.value = withDelay(80, withTiming(1, ease));
        ty2.value = withDelay(80, withSpring(0, spring.smooth));
        op3.value = withDelay(160, withTiming(1, ease));
        ty3.value = withDelay(160, withSpring(0, spring.smooth));
        sheetTY.value = withDelay(
          120,
          withSpring(0, { damping: 28, stiffness: 280, mass: 0.8 }),
        );
      }, 400);

      return () => clearTimeout(t);
    }, []),
  );

  // ── Navigate to Register — sheet slides down before pushing ──────────────
  function navigateToRegister() {
    router.push("/register" as any);
  }
  function handleGoToRegister() {
    sheetTY.value = withSpring(
      SCREEN_H,
      { damping: 28, stiffness: 280, mass: 0.8 },
      () => runOnJS(navigateToRegister)(),
    );
  }

  // ── Credentials sign-in ───────────────────────────────────────────────────
  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    setErrorCode(null);
    try {
      const res = await api.post<{
        success?: boolean;
        data?: { token?: string };
        token?: string;
        error?: string;
      }>("/api/auth/mobile-signin", { email, password });

      // mobile-signin responds via apiSuccess({ token }), which wraps the
      // payload as { success: true, data: { token } } — not a flat
      // { token } at the top level. Reading res.token directly always
      // returned undefined here, even with correct credentials, which is
      // why every login attempt fell through to "Invalid email or
      // password" regardless of whether the password was right.
      const token = res?.data?.token ?? res?.token;

      if (token) {
        await storeSessionToken(token);
        router.replace("/welcome-back" as any);
      } else {
        setError(ERROR_MESSAGES.CredentialsSignin);
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "ACCOUNT_NOT_FOUND") {
        setErrorCode("ACCOUNT_NOT_FOUND");
        setError("No account found for that email.");
      } else {
        setError(ERROR_MESSAGES.CredentialsSignin);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    setErrorCode(null);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const redirectUrl = Linking.createURL("auth");

      const authUrl = `${baseUrl}/api/auth/mobile-initiate?redirectUri=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl,
      );

      console.log("=== GOOGLE AUTH RESULT ===");
      console.log("type:", result.type);
      console.log("url:", "url" in result ? result.url : "(none)");

      if (result.type !== "success" || !result.url) {
        console.log("=== GOOGLE AUTH: bailing, not a success result ===");
        return;
      }

      const parsed = new URL(result.url);
      const token = parsed.searchParams.get("token");
      const isNew = parsed.searchParams.get("isNew") === "true";
      const errorParam = parsed.searchParams.get("error");

      console.log("=== GOOGLE AUTH PARSED ===");
      console.log("hasToken:", !!token, "isNew:", isNew, "error:", errorParam);

      if (!token) {
        if (errorParam === "no_user") {
          // A short delay lets the in-app browser sheet fully finish
          // dismissing before we present the native Modal — presenting it
          // immediately after openAuthSessionAsync resolves can collide
          // with that dismiss animation and get silently dropped.
          setTimeout(() => {
            setErrorCode("ACCOUNT_NOT_FOUND");
            setError("No account found for that Google account.");
          }, 400);
        } else {
          setError("Google sign-in failed.");
        }
        return;
      }

      await storeSessionToken(token);
      router.replace(isNew ? ("/welcome" as any) : ("/welcome-back" as any));
    } catch (e: any) {
      console.log("=== GOOGLE AUTH ERROR ===", e?.message ?? e);
      setError("Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <NoAccountModal
        visible={errorCode === "ACCOUNT_NOT_FOUND"}
        message={
          error ||
          "We couldn't find an account for that email. Want to create one?"
        }
        onSignUp={() => {
          setError("");
          setErrorCode(null);
          handleGoToRegister();
        }}
        onDismiss={() => {
          setError("");
          setErrorCode(null);
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ── Hero image ── */}
        <Animated.View style={[{ flex: HERO_FLEX }, s1]}>
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
                {/* h1 variant for screen title; accent color override */}
                <SPText variant="h1" color={T.accent}>
                  Sporty Pulse Pro
                </SPText>
                {/* h2 variant for the tagline */}
                <SPText variant="h2" color={T.text}>
                  Every Session Counts.
                </SPText>
              </View>
            </View>
            <LinearGradient
              colors={["transparent", T.bg]}
              style={styles.heroFade}
              pointerEvents="none"
            />
          </ImageBackground>
        </Animated.View>

        {/* ── Bottom sheet ── */}
        <Animated.View
          style={[
            styles.bottomSheet,
            { flex: SHEET_FLEX, marginTop: -SHEET_OVERLAP },
            s2,
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
            {/* h1 variant for the sheet title */}
            <SPText variant="h1" color={T.text}>
              Log In
            </SPText>

            {!!error && errorCode !== "ACCOUNT_NOT_FOUND" && (
              <ErrorBanner message={error} />
            )}

            <View style={styles.fields}>
              <AuthInput
                label="Email"
                value={email}
                onChangeText={(t) => {
                  setError("");
                  setErrorCode(null);
                  setEmail(t);
                }}
              />
              <AuthInput
                label="Password"
                isPassword
                value={password}
                onChangeText={(t) => {
                  setError("");
                  setErrorCode(null);
                  setPassword(t);
                }}
              />
            </View>

            <Pressable
              onPress={() => router.push("/forgot-password" as any)}
              style={styles.forgotBtn}
            >
              {/* caption variant: 12px, muted2 color */}
              <SPText variant="caption" color={T.muted2}>
                Forgot password?
              </SPText>
            </Pressable>

            <SPButton onPress={handleSignIn} loading={loading}>
              Log In
            </SPButton>

            {/* caption variant for the divider label */}
            <SPText variant="caption" color={T.muted} center>
              or continue with
            </SPText>

            <GoogleButton onPress={handleGoogle} loading={googleLoading} />

            <Animated.View style={[styles.footer, s3]}>
              {/* caption variant for footer prose */}
              <SPText variant="caption" color={T.muted2}>
                Don't have an account?{" "}
              </SPText>
              <Pressable onPress={handleGoToRegister}>
                {/* caption variant, accent color for the CTA link */}
                <SPText variant="caption" color={T.accent}>
                  Sign up
                </SPText>
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

  fields: { gap: T.s16 },

  forgotBtn: { alignSelf: "flex-end", marginTop: -T.s8 },

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
  // flex:1 can't go on SPText directly via variant — kept as a supplemental style
  errorFlex: { flex: 1, gap: T.s4 },
  errorActionBtn: { alignSelf: "flex-start" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: T.s8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: T.s24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.s24,
    alignItems: "center",
    gap: T.s12,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.s4,
  },
  modalMessage: {
    marginBottom: T.s8,
  },
  modalDismissBtn: {
    marginTop: T.s4,
    padding: T.s8,
  },
});
