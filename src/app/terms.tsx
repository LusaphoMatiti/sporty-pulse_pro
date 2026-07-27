import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { SPText } from "../components/ui/SPText";
import { useAppTheme } from "../theme/ThemeContext";
import { useResponsive } from "../hooks/useResponsive";
import { spacing, radii, borders, fonts } from "../theme";

const LAST_UPDATED = "April 2026";

const SECTIONS = [
  {
    title: "Acceptance of terms",
    body: "By creating an account and using Sporty Pulse Pro, you agree to these terms. If you do not agree, please do not use the app.",
  },
  {
    title: "Who can use this app",
    body: "You must be at least 16 years old to use Sporty Pulse Pro. By registering, you confirm that the information you provide is accurate and that you are of eligible age.",
  },
  {
    title: "Your account",
    body: "You are responsible for keeping your account credentials secure. Do not share your password with anyone. You are responsible for all activity that occurs under your account. If you suspect unauthorised access, sign out immediately and change your password.",
  },
  {
    title: "Health and fitness disclaimer",
    body: "Sporty Pulse Pro provides workout programs and tracking tools for informational and fitness purposes only. It is not a substitute for professional medical advice. Before starting any new exercise program, consult a qualified healthcare provider, especially if you have any pre-existing medical conditions or injuries. You exercise at your own risk.",
  },
  {
    title: "Equipment disclaimer",
    body: "You are responsible for ensuring that any equipment you use is safe, properly maintained, and used correctly. Sporty Pulse Pro is not liable for injuries resulting from improper use of equipment.",
  },
  {
    title: "Subscription and billing",
    body: "Sporty Pulse Pro offers a free tier and paid subscription tiers. Paid subscriptions are billed in advance on a recurring basis. You may cancel at any time. Cancellation takes effect at the end of the current billing period. Refunds are not issued for unused portions of a billing period.",
  },
  {
    title: "Intellectual property",
    body: "All content within Sporty Pulse Pro — including workout programs, design, text, and code — is the property of the developer. You may not copy, reproduce, or distribute any part of the app without explicit written permission.",
  },
  {
    title: "Termination",
    body: "We reserve the right to suspend or terminate your account if you violate these terms, abuse the platform, or engage in any behaviour that harms other users or the integrity of the service.",
  },
  {
    title: "Changes to these terms",
    body: "These terms may be updated from time to time. When changes are made, the 'Last updated' date at the top of this page will be revised. Continued use of the app after changes constitutes acceptance of the new terms.",
  },
  {
    title: "Limitation of liability",
    body: "Sporty Pulse Pro is provided as-is. To the maximum extent permitted by law, the developer is not liable for any indirect, incidental, or consequential damages arising from your use of the app.",
  },
  {
    title: "Contact",
    body: "If you have questions about these terms, please reach out through the Help section of the app.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { rs, rsp } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: rsp(spacing[5]),
        paddingTop: rsp(spacing[6]),
        paddingBottom: insets.bottom + rsp(64),
        maxWidth: 640,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ marginBottom: rsp(spacing[4]), alignSelf: "flex-start" }}
      >
        <ChevronLeft size={rs(22, 24, 24, 26)} color={theme.text} />
      </Pressable>

      <SPText
        style={{
          color: theme.muted,
          fontSize: rs(10, 11, 11, 12),
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: spacing[1],
        }}
      >
        Legal
      </SPText>
      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: rs(26, 28, 30, 34),
          marginBottom: spacing[1],
        }}
      >
        Terms & Conditions
      </SPText>
      <SPText
        style={{
          color: theme.muted,
          fontSize: rs(11, 12, 12, 13),
          marginBottom: rsp(spacing[6]),
        }}
      >
        Last updated: {LAST_UPDATED}
      </SPText>

      {SECTIONS.map((section) => (
        <View
          key={section.title}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: borders.thin,
            borderRadius: radii.xl,
            padding: rsp(spacing[4]),
            marginBottom: rsp(spacing[3]),
          }}
        >
          <SPText
            style={{
              color: theme.text,
              fontFamily: fonts.brandBold,
              fontSize: rs(14, 15, 15, 16),
              marginBottom: spacing[2],
            }}
          >
            {section.title}
          </SPText>
          <SPText
            style={{
              color: theme.muted2,
              fontSize: rs(13, 13, 14, 14),
              lineHeight: rs(19, 20, 21, 22),
            }}
          >
            {section.body}
          </SPText>
        </View>
      ))}
    </ScrollView>
  );
}
