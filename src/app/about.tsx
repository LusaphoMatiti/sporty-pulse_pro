import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SPText } from "../components/ui/SPText";
import { useAppTheme } from "../theme/ThemeContext";
import { useResponsive } from "../hooks/useResponsive";
import { spacing, radii, borders, fonts } from "../theme";

const SECTIONS = [
  {
    title: "What is Sporty Pulse Pro?",
    body: "Sporty Pulse Pro is a personal training platform built for people who take their fitness seriously but can't always make it to the gym. It brings structured, equipment-based workout programs directly to your phone, wherever you are.\n\nEvery program is built around the equipment you own. Whether you train with kettlebells, resistance bands, a pull-up bar, or a full rack — Sporty Pulse Pro meets you where you are.",
  },
  {
    title: "Why it exists",
    body: "Most fitness apps are built for the gym or for bodyweight training. Very few are designed around the equipment you already own at home. Sporty Pulse Pro was built to fill that gap, giving you guided, progressive programs that make full use of your equipment, track your progress, and adapt to your level.",
  },
];

const FEATURES = [
  "Structured workout programs for your equipment",
  "Beginner, intermediate and advanced levels",
  "Session tracking and progress history",
  "Streak monitoring to keep you consistent",
  "AI coaching on the Pro tier",
  "Programs that grow with you",
];

export default function AboutScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { rs, rsp } = useResponsive();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: rsp(spacing[5]),
        paddingTop: rsp(spacing[6]),
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
        The app
      </SPText>
      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: rs(26, 28, 30, 34),
          marginBottom: rsp(spacing[6]),
        }}
      >
        About Us
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
            marginBottom: rsp(spacing[4]),
          }}
        >
          <SPText
            style={{
              color: theme.text,
              fontFamily: fonts.brandBold,
              fontSize: rs(15, 16, 16, 17),
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

      <View
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: borders.thin,
          borderRadius: radii.xl,
          padding: rsp(spacing[4]),
          marginBottom: rsp(spacing[4]),
          gap: spacing[2],
        }}
      >
        <SPText
          style={{
            color: theme.text,
            fontFamily: fonts.brandBold,
            fontSize: rs(15, 16, 16, 17),
            marginBottom: spacing[1],
          }}
        >
          What you get
        </SPText>
        {FEATURES.map((item) => (
          <SPText
            key={item}
            style={{
              color: theme.muted2,
              fontSize: rs(13, 13, 14, 14),
              lineHeight: rs(19, 20, 21, 22),
            }}
          >
            ✓ {item}
          </SPText>
        ))}
      </View>

      <View
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: borders.thin,
          borderRadius: radii.xl,
          padding: rsp(spacing[4]),
        }}
      >
        <SPText
          style={{
            color: theme.text,
            fontFamily: fonts.brandBold,
            fontSize: rs(15, 16, 16, 17),
            marginBottom: spacing[2],
          }}
        >
          Built by LMDEVPRO
        </SPText>
        <SPText
          style={{
            color: theme.muted2,
            fontSize: rs(13, 13, 14, 14),
            lineHeight: rs(19, 20, 21, 22),
            marginBottom: spacing[2],
          }}
        >
          Sporty Pulse Pro is an independent project — designed, built, and
          maintained by LMDEVPRO, they believe that great training tools
          shouldn't require a gym membership or a personal trainer.
        </SPText>
        <SPText
          style={{
            color: theme.muted2,
            fontSize: rs(13, 13, 14, 14),
            lineHeight: rs(19, 20, 21, 22),
          }}
        >
          This is version one. It will keep getting better.
        </SPText>
      </View>
    </ScrollView>
  );
}
