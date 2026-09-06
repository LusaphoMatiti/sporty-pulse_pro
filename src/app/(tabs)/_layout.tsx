import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import { SPTabBar, type TabKey } from "../../components/ui/SPTabBar";
import { useAppTheme } from "../../theme/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "../../lib/cacheKeys";
import { api } from "../../lib/api";

function getActiveTab(segments: string[]): TabKey {
  const last = segments[segments.length - 1];
  if (last === "index" || last === "(tabs)") return "home";
  if (last === "training" || last === "programs") return "training";
  if (last === "progress") return "progress";
  if (last === "settings") return "settings";
  return "home";
}

// The active workout session ("/(tabs)/training/session/[instanceId]/[sessionNumber]")
// is still nested under this (tabs) group, so it renders through this same
// layout — it just isn't a screen that should show the bottom tab bar at all
// (full-screen workout flow, not a place you tab away from mid-set).
function isSessionScreen(segments: string[]): boolean {
  return segments.includes("session");
}

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const activeTab = getActiveTab(segments);
  const hideTabBar = isSessionScreen(segments);
  const { theme } = useAppTheme();

  // ── Redirect GYM users to programs tab ────────────────────────────
  useEffect(() => {
    // Only run this check once on mount, and only if we're on the home tab
    if (activeTab === "home" && !segments.includes("session")) {
      const checkUserLocation = async () => {
        try {
          // Get the user's training location from AsyncStorage
          const location = await AsyncStorage.getItem("user_training_location");

          if (location === "GYM") {
            // Redirect GYM users to the programs tab
            router.replace("/(tabs)/programs" as any);
          } else {
            // Also check from API if not in storage
            try {
              const response = await api.get<{ trainingLocation?: string }>(
                "/api/user/training-location",
              );
              if (response?.trainingLocation === "GYM") {
                await AsyncStorage.setItem("user_training_location", "GYM");
                router.replace("/(tabs)/programs" as any);
              }
            } catch {
              // ignore API error
            }
          }
        } catch {
          // ignore storage error
        }
      };

      checkUserLocation();
    }
  }, []);

  const handleTrainingPress = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.training);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.instanceId) {
          router.navigate("/(tabs)/training" as any);
          return;
        }
      }
    } catch {
      // fall through
    }
    // No active plan in cache → go to Programs tab (which forks to
    // GymProgramsScreen for GYM users). This cache is deliberately cleared
    // by training-system.tsx on save, so right after a Home/Gym switch this
    // always falls through here rather than trusting a stale instanceId
    // left over from the previous location.
    router.navigate("/(tabs)/programs" as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.void }]}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="training" />
        <Tabs.Screen name="programs" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="settings" />
      </Tabs>

      {!hideTabBar && (
        <View style={styles.floatingTabBar} pointerEvents="box-none">
          <SPTabBar
            activeTab={activeTab}
            onTabPress={(tab) => {
              if (tab.key === "home") router.navigate("/(tabs)" as any);
              else if (tab.key === "training") handleTrainingPress();
              else router.navigate(tab.href as any);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  floatingTabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
