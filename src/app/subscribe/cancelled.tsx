import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { SPText } from "../../components/ui/SPText";
import { SPButton } from "../../components/ui/SPButton";
import { useAppTheme } from "../../theme/ThemeContext";
import { spacing, fonts } from "../../theme";

export default function SubscribeCancelledScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing[6],
        gap: spacing[4],
      }}
    >
      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: 22,
          textAlign: "center",
        }}
      >
        Checkout cancelled
      </SPText>
      <SPText
        style={{
          color: theme.muted2,
          fontSize: 14,
          textAlign: "center",
        }}
      >
        No charge was made. You can subscribe anytime from your profile.
      </SPText>
      <SPButton
        variant="primary"
        onPress={() => router.replace("/(tabs)" as any)}
      >
        Back to app
      </SPButton>
    </View>
  );
}
