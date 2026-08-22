import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Home, Dumbbell, TrendingUp, Settings } from "lucide-react-native";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useResponsive } from "../../hooks/useResponsive";
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
  const { rs } = useResponsive();

  const sideMargin = rs(12, 14, 15, 16);
  const paddingTop = rs(6, 7, 8, 8);
  const paddingBottom = rs(9, 10, 11, 12);
  const iconWrapSize = rs(30, 32, 34, 36);
  const iconSize = rs(17, 18, 19, 20);
  const labelSize = rs(9, 9, 10, 10);
  const itemGap = rs(4, 5, 6, 6);

  return (
    <View
      style={[
        styles.wrap,
        {
          left: sideMargin,
          right: sideMargin,
          bottom: bottomInset + GT.s12,
        },
      ]}
    >
      <View style={[styles.blur, { paddingTop, paddingBottom }]}>
        <View style={[styles.indicatorTrack, { marginHorizontal: sideMargin }]}>
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
                style={[styles.item, { gap: itemGap }]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      width: iconWrapSize,
                      height: iconWrapSize,
                      borderRadius: iconWrapSize / 2,
                    },
                    isActive && styles.iconWrapActive,
                  ]}
                >
                  <item.Icon
                    size={iconSize}
                    color={isActive ? GT.accent : GT.muted}
                    strokeWidth={1.75}
                  />
                </View>
                <SPText
                  style={[
                    styles.label,
                    { fontSize: labelSize },
                    isActive && styles.labelActive,
                  ]}
                >
                  {item.label}
                </SPText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    borderRadius: GT.r24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GT.border,
  },
  blur: {
    backgroundColor: "rgba(19,23,26,0.72)",
  },
  indicatorTrack: {
    height: 2,
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
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: GT.accentDim,
  },
  label: {
    fontFamily: GT.font.medium,
    letterSpacing: 0.6,
    color: GT.muted,
  },
  labelActive: {
    color: GT.accent,
  },
});
