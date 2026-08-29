import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Home, Dumbbell, TrendingUp, Settings } from "lucide-react-native";
import { SPText } from "../../components/ui/SPText";
import { GT } from "../../theme/gymProgramsTheme";
import { useAppTheme } from "../../theme/ThemeContext";
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
  const { theme } = useAppTheme();

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
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.blur,
          // Was a hardcoded dark rgba blur regardless of theme -- appending
          // alpha to theme.surface (a plain hex color) keeps the same
          // translucent-blur look but in whichever mode is active.
          { backgroundColor: theme.surface + "B8", paddingTop, paddingBottom },
        ]}
      >
        <View style={[styles.indicatorTrack, { marginHorizontal: sideMargin }]}>
          <View
            style={[
              styles.indicator,
              {
                left: `${NAV_ITEMS.findIndex((i) => i.key === activeTab) * 25}%`,
                backgroundColor: theme.accent,
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
                    isActive && { backgroundColor: theme.accentDim },
                  ]}
                >
                  <item.Icon
                    size={iconSize}
                    color={isActive ? theme.accent : theme.muted}
                    strokeWidth={1.75}
                  />
                </View>
                <SPText
                  style={[
                    styles.label,
                    { fontSize: labelSize, color: theme.muted },
                    isActive && { color: theme.accent },
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
    // borderColor applied inline from theme.border
  },
  blur: {
    // backgroundColor applied inline from theme.surface (+ alpha)
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
    // backgroundColor applied inline from theme.accent
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
  label: {
    fontFamily: GT.font.medium,
    letterSpacing: 0.6,
    // color applied inline from theme.muted / theme.accent
  },
});
