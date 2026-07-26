import React from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SPText } from "../components/ui/SPText";
import { useAppTheme } from "../theme/ThemeContext";
import { spacing, radii, borders, fonts } from "../theme";

const LAST_UPDATED = "April 2026";

const SECTIONS = [
  {
    title: "What we collect",
    body: "We collect your name, email address, and the equipment you train with. If you sign in with Google, we receive your name, email, and profile photo from Google. We also collect data about your workout sessions, exercises completed, sets, reps, and session duration, to power your progress tracking.",
  },
  {
    title: "How we use your data",
    body: "Your data is used exclusively to run the app. We use it to personalise your training programs, track your progress, maintain your streak, and improve your experience. We do not sell your data. We do not share it with third parties for advertising purposes.",
  },
  {
    title: "Authentication",
    body: "Passwords are hashed using bcrypt before being stored, we never store your plain-text password. If you use Google sign-in, your password is managed entirely by Google and never touches our servers.",
  },
  {
    title: "Session data",
    body: "We use secure, HTTP-only JWT cookies to keep you signed in. These cookies cannot be accessed by JavaScript and are cleared when you sign out.",
  },
  {
    title: "Third-party services",
    body: "We use Supabase to store your data securely in a PostgreSQL database hosted in the EU. We use Google OAuth for sign-in. These services have their own privacy policies which govern how they handle data.",
  },
  {
    title: "Data retention",
    body: "Your data is retained for as long as your account is active. If you request account deletion, all your personal data and workout history will be permanently removed within 30 days.",
  },
  {
    title: "Your rights",
    body: "You have the right to access the data we hold about you, request corrections, or request deletion of your account and all associated data. To exercise these rights, use the contact information on the Help section.",
  },
  {
    title: "Contact",
    body: "If you have any questions about this privacy policy or how your data is handled, please reach out through the Help section of the app.",
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: spacing[5], paddingTop: spacing[6] }}
    >
      <ChevronLeft
        size={24}
        color={theme.text}
        onPress={() => router.back()}
        style={{ marginBottom: spacing[4] }}
      />

      <SPText
        style={{
          color: theme.muted,
          fontSize: 11,
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
          fontSize: 32,
          marginBottom: spacing[1],
        }}
      >
        Privacy Policy
      </SPText>
      <SPText
        style={{ color: theme.muted, fontSize: 12, marginBottom: spacing[6] }}
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
            padding: spacing[4],
            marginBottom: spacing[3],
          }}
        >
          <SPText
            style={{
              color: theme.text,
              fontFamily: fonts.brandBold,
              fontSize: 15,
              marginBottom: spacing[2],
            }}
          >
            {section.title}
          </SPText>
          <SPText style={{ color: theme.muted2, fontSize: 13, lineHeight: 20 }}>
            {section.body}
          </SPText>
        </View>
      ))}
    </ScrollView>
  );
}
