import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import { SPTabBar, type TabKey } from "../../components/ui/SPTabBar";
import { useAppTheme } from "../../theme/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_KEYS } from "../../lib/cacheKeys";

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
  // FIX: this used to be `colors.void` from a static "../../theme" import —
  // a plain object resolved once at import time, with no connection to
  // ThemeContext. It never updated with isDark, which is why the root
  // background stayed black regardless of theme mode. useAppTheme() reads
  // the live context, so theme.void now actually switches between
  // darkTheme.void ("#0A0A0A") and lightTheme.void ("#F0F2F5").
  const { theme } = useAppTheme();

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
      {/*
        Tabs now fills the entire root — no sibling wrapper carving out
        space above the bar. Screen content extends full-bleed behind it.
      */}
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="training" />
        <Tabs.Screen name="programs" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="settings" />
      </Tabs>

      {/*
        SPTabBar is absolutely positioned over the content instead of
        occupying its own row, so it floats on top of whatever is
        scrolling underneath rather than reserving its own footprint.
        pointerEvents="box-none" lets touches pass through the empty
        margin area around the bar to the content below, while the
        bar itself (and its buttons) still receives touches normally.
        Hidden entirely on the session screen — mid-workout shouldn't
        expose a way to tab away, and the bar would just sit on top of
        the session UI's own controls.
      */}
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
