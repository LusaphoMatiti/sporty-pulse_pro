import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Home, Dumbbell, TrendingUp, Settings } from "lucide-react-native";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import type { BottomNavTab } from "../../types/gymPrograms";

interface NavItem {
  key: BottomNavTab;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: "HOME", label: "HOME", Icon: Home },
  { key: "TRAINING", label: "TRAINING", Icon: Dumbbell },
  { key: "PROGRESS", label: "PROGRESS", Icon: TrendingUp },
  { key: "SETTINGS", label: "SETTINGS", Icon: Settings },
];

interface FloatingBottomNavigationProps {
  activeTab: BottomNavTab;
  onTabPress: (tab: BottomNavTab) => void;
  bottomInset: number;
}

export function FloatingBottomNavigation({
  activeTab,
  onTabPress,
  bottomInset,
}: FloatingBottomNavigationProps) {
  return (
    <View style={[styles.wrap, { bottom: bottomInset + GT.s12 }]}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        <View style={styles.indicatorTrack}>
          <View
            style={[
              styles.indicator,
              {
                left: `${NAV_ITEMS.findIndex((i) => i.key === activeTab) * 25}%`,
              },
            ]}
          />
        </View>
        <View style={styles.row}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {
                    // haptics unsupported on this device/simulator — ignore
                  }
                  onTabPress(item.key);
                }}
                style={styles.item}
              >
                <View
                  style={[styles.iconWrap, isActive && styles.iconWrapActive]}
                >
                  <item.Icon
                    size={20}
                    color={isActive ? GT.accent : GT.muted}
                    strokeWidth={1.75}
                  />
                </View>
                <SPText style={[styles.label, isActive && styles.labelActive]}>
                  {item.label}
                </SPText>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: GT.s16,
    right: GT.s16,
    borderRadius: GT.r24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GT.border,
  },
  blur: {
    paddingTop: GT.s8,
    paddingBottom: GT.s12,
    backgroundColor: "rgba(19,23,26,0.72)",
  },
  indicatorTrack: {
    height: 2,
    marginHorizontal: GT.s16,
    marginBottom: GT.s8,
  },
  indicator: {
    position: "absolute",
    width: "25%",
    height: 2,
    borderRadius: 1,
    backgroundColor: GT.accent,
  },
  row: {
    flexDirection: "row",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: GT.s6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: GT.r999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: GT.accentDim,
  },
  label: {
    fontFamily: GT.font.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: GT.muted,
  },
  labelActive: {
    color: GT.accent,
  },
});
