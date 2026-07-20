import React, { useState } from "react";
import { View, ScrollView, Linking } from "react-native";
import { Check } from "lucide-react-native";
import { SPText } from "../components/ui/SPText";
import { SPButton } from "../components/ui/SPButton";
import { useAppTheme } from "../theme/ThemeContext";
import { spacing, radii, borders, fonts } from "../theme";
import { getSessionToken } from "../lib/api";

const FEATURES = [
  "Unlimited active programs",
  "All equipment programs unlocked",
  "AI Coach — personalised advice",
  "Advanced analytics & volume history",
  "Personalised program generation",
];

export default function PricingScreen() {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = await getSessionToken();
      if (!token) {
        setError("Please log in first.");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/payfast/subscribe`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await res.json();

      if (!res.ok || !data?.checkoutUrl) {
        setError("Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      // System browser, not an in-app WebView -- matches the earlier
      // decision (better 3DS/autofill reliability).
      await Linking.openURL(data.checkoutUrl);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: spacing[5], paddingTop: spacing[8] }}
    >
      <SPText
        style={{
          color: theme.muted,
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: spacing[2],
        }}
      >
        Sporty Pulse Pro
      </SPText>

      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: 32,
          textAlign: "center",
          marginBottom: spacing[2],
        }}
      >
        R50{" "}
        <SPText style={{ fontSize: 16, color: theme.muted }}>/ month</SPText>
      </SPText>

      <SPText
        style={{
          color: theme.muted2,
          fontSize: 14,
          textAlign: "center",
          marginBottom: spacing[6],
        }}
      >
        Everything unlocked. Cancel anytime.
      </SPText>

      <View
        style={{
          borderWidth: borders.thin,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          borderRadius: radii.xl,
          padding: spacing[4],
          marginBottom: spacing[6],
          gap: spacing[3],
        }}
      >
        {FEATURES.map((feat) => (
          <View
            key={feat}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: borders.thin,
                borderColor: theme.accent + "4D",
                backgroundColor: theme.accent + "26",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={10} color={theme.accent} strokeWidth={3} />
            </View>
            <SPText style={{ color: theme.text, fontSize: 13, flex: 1 }}>
              {feat}
            </SPText>
          </View>
        ))}
      </View>

      {error && (
        <SPText
          style={{
            color: "#ef4444",
            fontSize: 13,
            textAlign: "center",
            marginBottom: spacing[3],
          }}
        >
          {error}
        </SPText>
      )}

      <SPButton variant="primary" onPress={handleSubscribe} disabled={loading}>
        {loading ? "Starting checkout..." : "Subscribe — R50/month"}
      </SPButton>
    </ScrollView>
  );
}
