import React, { useEffect, useState } from "react";
import { View, Modal, ScrollView, StyleSheet } from "react-native";
import { SPText } from "./SPText";
import { SPButton } from "./SPButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radii, borders, fonts } from "../../theme";
import { useAppTheme } from "../../theme/ThemeContext";
import { getSessionToken } from "../../lib/api";

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

export default function PrivacyPolicyModal() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const [visible, setVisible] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = await getSessionToken();
        if (!token) return;

        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/user/privacy-policy-status`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();

        if (data?.needsAcceptance) {
          setVisible(true);
        }
      } catch (err) {
        // Fail silently -- not worth blocking app usage over a network
        // hiccup on this specific check. It'll be checked again next
        // time the app opens.
        console.error("Privacy policy status check failed:", err);
      }
    };

    checkStatus();
  }, []);

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
