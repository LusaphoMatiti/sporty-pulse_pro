import React, { useCallback, useState } from "react";
import { View, Modal, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SPText } from "./SPText";
import { SPButton } from "./SPButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radii, borders, fonts } from "../../theme";
import { useAppTheme } from "../../theme/ThemeContext";
import { getSessionToken } from "../../lib/api";

// Local fast-path cache. The backend flag (checked via
// /api/user/privacy-policy-status) is still the source of truth, but once
// we know acceptance happened we never want to hit the network -- or show
// a flash of the modal -- again on this device, for this user.
//
// Scoped per user id -- NOT a single device-wide flag. Multiple accounts
// can be used on the same device (test accounts, account switching), and
// one user's acceptance must never suppress the modal for a different
// user who hasn't accepted anything yet.
const cacheKeyFor = (userId: string) => `sp_privacy_policy_accepted:${userId}`;

// Guards against re-checking more than once per app session, per user,
// once we've gotten a conclusive answer for that user. Before that,
// useFocusEffect below will keep retrying every time Home regains focus --
// this is what recovers from the token not being ready yet on the very
// first check right after onboarding.
const checkedUserIds = new Set<string>();

const SUMMARY_POINTS = [
  "We collect your account, training, and equipment data to run your programs.",
  "If you buy equipment on Sporty Pulse Store, we use your email to automatically unlock it here.",
  "Payments are processed by PayFast -- we never see or store your card details.",
  "Your data is never sold to anyone.",
];

const FULL_POLICY_TEXT = `
Sporty Pulse Pro collects your account information (name, email), training information (goals, location, equipment, workout history), and subscription status.

If you sign in with Google, we receive your name, email, and profile picture from Google. If you subscribe to Pro, payments are processed directly by PayFast -- we never see or store your full card details.

If you purchase fitness equipment on Sporty Pulse Store, we use your email address to recognize you here and automatically unlock training content for what you bought, whether you register before or after your purchase. Only your email and purchased equipment are shared this way -- never your payment details or address.

We keep your information for as long as your account is active, and delete it within a reasonable period after account deletion, except where we're legally required to retain records.

Under POPIA, you can request access to, correction of, or deletion of your personal information at any time by contacting us.

We do not sell your personal information to anyone.
`.trim();

export default function PrivacyPolicyModal({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const [visible, setVisible] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Already got a conclusive answer for this user, this session --
      // don't check again.
      if (checkedUserIds.has(userId)) return;

      const checkStatus = async () => {
        try {
          // Fast path: if we've already recorded acceptance for this
          // user on this device, skip the network call entirely and
          // never show the sheet.
          const cached = await AsyncStorage.getItem(cacheKeyFor(userId));
          if (cached === "true") {
            checkedUserIds.add(userId);
            return;
          }

          const token = await getSessionToken();
          if (!token) {
            // Session not ready yet -- e.g. right after onboarding,
            // before the token has finished persisting. Don't lock --
            // this will retry the next time Home regains focus.
            return;
          }

          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/user/privacy-policy-status`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const data = await res.json();

          // We got a real answer from the backend -- this is conclusive,
          // lock it in for this user for the session either way.
          checkedUserIds.add(userId);

          if (data?.needsAcceptance) {
            setVisible(true);
          } else {
            // Backend already has this accepted (e.g. accepted
            // previously, or on another device) -- cache locally so we
            // never ask this user again.
            await AsyncStorage.setItem(cacheKeyFor(userId), "true");
          }
        } catch (err) {
          // Fail silently -- not worth blocking app usage over a network
          // hiccup. Deliberately NOT locking this user in here, so the
          // next focus gets another shot.
          console.error("Privacy policy status check failed:", err);
        }
      };

      checkStatus();
    }, [userId]),
  );

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const token = await getSessionToken();
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/user/accept-privacy-policy`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      await AsyncStorage.setItem(cacheKeyFor(userId), "true");
      setVisible(false);
    } catch (err) {
      console.error("Failed to record privacy policy acceptance:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    // No onRequestClose / backdrop dismiss -- acceptance is required,
    // not optional, unlike the upgrade prompts this is styled after.
    <Modal visible transparent animationType="slide">
      <View style={sheetStyles.backdrop}>
        <View
          style={[
            sheetStyles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + spacing[6],
              maxHeight: "85%",
            },
          ]}
        >
          <View
            style={[
              sheetStyles.handle,
              { backgroundColor: theme.muted + "55" },
            ]}
          />

          <SPText
            style={{
              color: theme.text,
              fontFamily: fonts.brandBold,
              fontSize: 24,
              textAlign: "center",
              marginBottom: spacing[4],
            }}
          >
            Your Privacy
          </SPText>

          <ScrollView style={{ marginBottom: spacing[4] }}>
            {!showFullPolicy ? (
              <View style={{ gap: spacing[3] }}>
                {SUMMARY_POINTS.map((point) => (
                  <SPText
                    key={point}
                    style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}
                  >
                    • {point}
                  </SPText>
                ))}
              </View>
            ) : (
              <SPText
                style={{ color: theme.muted2, fontSize: 12, lineHeight: 18 }}
              >
                {FULL_POLICY_TEXT}
              </SPText>
            )}
          </ScrollView>

          <SPButton
            variant="secondary"
            onPress={() => setShowFullPolicy((prev) => !prev)}
            containerStyle={{ marginBottom: spacing[3] }}
          >
            {showFullPolicy ? "Show summary" : "Read full policy"}
          </SPButton>

          <SPButton
            variant="primary"
            onPress={handleAccept}
            disabled={submitting}
            loading={submitting}
          >
            I Agree & Continue
          </SPButton>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    borderWidth: borders.thin,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing[5],
  },
});
