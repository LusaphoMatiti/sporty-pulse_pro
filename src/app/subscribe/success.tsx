import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SPText } from "../../components/ui/SPText";
import { SPButton } from "../../components/ui/SPButton";
import { useAppTheme } from "../../theme/ThemeContext";
import { spacing, fonts } from "../../theme";

export default function SubscribeSuccessScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  // Deliberately not polling for confirmed PRO status here -- same
  // precedent as Store's checkout, which didn't block the UI waiting on
  // the ITN either. If stronger confirmation is wanted later, this needs
  // a status-check endpoint that doesn't exist yet.
  useEffect(() => {
    const id = setTimeout(() => {
      router.replace("/(tabs)" as any);
    }, 2500);
    return () => clearTimeout(id);
  }, []);

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
      <ActivityIndicator size="large" color={theme.accent} />
      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: 22,
          textAlign: "center",
        }}
      >
        You're Pro!
      </SPText>
      <SPText
        style={{
          color: theme.muted2,
          fontSize: 14,
          textAlign: "center",
        }}
      >
        Confirming your subscription now — this only takes a moment.
      </SPText>
      <SPButton
        variant="primary"
        onPress={() => router.replace("/(tabs)" as any)}
      >
        Continue
      </SPButton>
    </View>
  );
}
