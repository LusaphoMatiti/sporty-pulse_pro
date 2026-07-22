"use client";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";

import { SPText } from "../components/ui";
import { SPButton } from "../components/ui";
import { api, clearSessionToken } from "../lib/api";
import { useAppTheme } from "../theme/ThemeContext";
import { useTabBarHeight } from "../hooks/Usetabbarheight";
import { SPIcon } from "../components/icons/SPIcon";
import { SPSkeleton } from "../components/ui/SPSkeleton";
import { fonts } from "../theme";

import type { SPUser, UserLevel } from "../types/session";

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Premium membership spec: luxury, calm, minimal, structured.

const D = {
  space: {
    micro: 4,
    tight: 8,
    std: 16,
    section: 24,
    large: 32,
    major: 48,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 22, // row-style cards (Training System)
    xl: 26, // grouped cards (Preferences / More)
    xxl: 28, // hero card (Profile)
    full: 9999,
  },
  type: {
    h1: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const },
    h2: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
    body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
    subtext: { fontSize: 15, lineHeight: 20, fontWeight: "500" as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
  },
  button: { height: 64, borderRadius: 20 },
  input: { height: 50, borderRadius: 12 },
  row: { height: 72 },
  spring: { damping: 18, stiffness: 260, mass: 0.8 },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Identity = "REBUILD" | "OPERATOR" | "EXECUTIVE_PERFORMANCE";

interface SettingsData {
  user: SPUser;
  currentLevel: UserLevel;
  plan: string;
  identity: Identity | null;
}

// ─── Identity config ──────────────────────────────────────────────────────────

const IDENTITY_LABEL: Record<Identity, string> = {
  REBUILD: "Rebuild",
  OPERATOR: "Operator",
  EXECUTIVE_PERFORMANCE: "Exec Perf",
};

// ─── Training levels ──────────────────────────────────────────────────────────

const TRAINING_LEVELS: { value: UserLevel; label: string; sub: string }[] = [
  { value: "BEGINNER", label: "Beginner", sub: "0–1 yr" },
  { value: "INTERMEDIATE", label: "Intermediate", sub: "1–3 yrs" },
  { value: "ADVANCED", label: "Advanced", sub: "3–6 yrs" },
];

const CACHE_KEY = "sp_settings_cache";

// ─── PressableScale ───────────────────────────────────────────────────────────

function PressableScale({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[aStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!onPress || disabled) return;
          scale.value = withSpring(0.97, D.spring);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, D.spring);
        }}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── PremiumSwitch (iOS-style toggle, accent on, surface2 off) ───────────────

function PremiumSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { theme } = useAppTheme();
  const translateX = useSharedValue(value ? 20 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 20 : 0, D.spring);
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(!value);
      }}
      style={[
        switchStyles.track,
        { backgroundColor: value ? theme.accent : theme.surface2 },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[
          switchStyles.thumb,
          thumbStyle,
          { backgroundColor: value ? theme.bg : "#FFFFFF" },
        ]}
      />
    </Pressable>
  );
}

const switchStyles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: D.radius.full,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: D.radius.full,
  },
});

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return (
    <SPText
      style={[
        D.type.caption,
        {
          color: theme.muted,
          fontFamily: fonts.brandMedium,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          paddingHorizontal: D.space.micro,
        },
      ]}
    >
      {children}
    </SPText>
  );
}

// ─── GroupedCard (rows with dividers, used for Preferences / More) ───────────

function GroupedCard({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        cardStyles.groupedCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  groupedCard: {
    borderRadius: D.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
});

// ─── Row (generic settings row, icon + label + right content) ───────────────

function Row({
  icon,
  label,
  value,
  danger,
  rightEl,
  onPress,
  last,
  minHeight = D.row.height,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  rightEl?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  minHeight?: number;
}) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelColor = danger ? theme.danger : theme.text;

  return (
    <Animated.View style={aStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!onPress) return;
          scale.value = withSpring(0.985, D.spring);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, D.spring);
        }}
        disabled={!onPress}
        style={[
          rowStyles.row,
          { minHeight },
          !last && { borderBottomWidth: 1, borderBottomColor: theme.border },
        ]}
      >
        {icon ? <View style={rowStyles.iconSlot}>{icon}</View> : null}
        <SPText
          style={[
            D.type.subtext,
            { fontFamily: fonts.brandMedium, color: labelColor, flex: 1 },
          ]}
        >
          {label}
        </SPText>
        <View style={rowStyles.right}>
          {value && (
            <SPText style={[D.type.subtext, { color: theme.muted2 }]}>
              {value}
            </SPText>
          )}
          {rightEl ??
            (onPress ? (
              <SPIcon
                name="forward"
                size={18}
                color={danger ? theme.danger : theme.muted}
              />
            ) : null)}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: D.space.section,
    gap: D.space.std,
  },
  iconSlot: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: D.space.tight,
  },
});

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 56 }: { user: SPUser; size?: number }) {
  const { theme } = useAppTheme();
  const r = size / 2;

  if (user.image) {
    return (
      <Image
        source={{ uri: user.image }}
        style={{
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: theme.surface2,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SPText
        style={{
          fontFamily: fonts.brandBold,
          fontSize: size * 0.36,
          color: theme.accent,
          lineHeight: size * 0.42,
        }}
      >
        {user.name?.charAt(0).toUpperCase() ?? "?"}
      </SPText>
    </View>
  );
}

// ─── EditProfileSheet ─────────────────────────────────────────────────────────

function EditProfileSheet({
  user,
  currentLevel,
  onClose,
  onSaved,
}: {
  user: SPUser;
  currentLevel: UserLevel;
  onClose: () => void;
  onSaved: (newName: string, newImage: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const [name, setName] = useState(user.name ?? "");
  const [level, setLevel] = useState<UserLevel>(currentLevel);
  const [photoUri, setPhotoUri] = useState<string | null>(user.image);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameFocused, setNameFocused] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());

      if (photoChanged && photoUri) {
        const filename = photoUri.split("/").pop() ?? "photo.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("photo", {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      }

      const profileRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? ""}/api/user/profile`,
        { method: "PATCH", body: formData },
      );
      const profileData = await profileRes.json();
      if (!profileRes.ok)
        throw new Error(profileData.error ?? "Failed to save profile");

      const levelRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? ""}/api/user/level`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level }),
        },
      );
      if (!levelRes.ok) {
        const d = await levelRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update level");
      }

      onSaved(name.trim(), profileData.user?.image ?? null);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ justifyContent: "flex-end" }}
        >
          <Pressable
            style={[
              sheetStyles.sheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                paddingBottom:
                  Math.max(insets.bottom, D.space.std) + D.space.std,
              },
            ]}
          >
            {/* Handle */}
            <View
              style={[
                sheetStyles.handle,
                { backgroundColor: theme.muted + "40" },
              ]}
            />

            {/* Header */}
            <View style={sheetStyles.header}>
              <View style={{ gap: D.space.micro }}>
                <SPText
                  style={[
                    D.type.caption,
                    {
                      color: theme.muted,
                      fontFamily: fonts.brandMedium,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    },
                  ]}
                >
                  Account
                </SPText>
                <SPText
                  style={[
                    D.type.h2,
                    { color: theme.text, fontFamily: fonts.brandBold },
                  ]}
                >
                  Edit Profile
                </SPText>
              </View>
              <PressableScale onPress={onClose}>
                <View
                  style={[
                    sheetStyles.closeBtn,
                    { backgroundColor: theme.surface2 },
                  ]}
                >
                  <SPIcon name="close" size={16} color={theme.muted2} />
                </View>
              </PressableScale>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
            >
              {/* Photo picker */}
              <View style={sheetStyles.photoPicker}>
                <PressableScale onPress={pickPhoto}>
                  <View style={{ position: "relative" }}>
                    {photoUri ? (
                      <Image
                        source={{ uri: photoUri }}
                        style={[
                          sheetStyles.photoImg,
                          { borderColor: theme.border },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          sheetStyles.photoFallback,
                          {
                            backgroundColor: theme.accentDim,
                            borderColor: theme.accent + "40",
                          },
                        ]}
                      >
                        <SPText
                          style={{
                            fontFamily: fonts.brandBold,
                            fontSize: 30,
                            color: theme.accent,
                          }}
                        >
                          {name.charAt(0).toUpperCase() || "?"}
                        </SPText>
                      </View>
                    )}
                    <View
                      style={[
                        sheetStyles.cameraBadge,
                        { backgroundColor: theme.accent },
                      ]}
                    >
                      <SPIcon name="camera" size={14} color={theme.bg} />
                    </View>
                  </View>
                </PressableScale>
                <SPText style={[D.type.caption, { color: theme.muted }]}>
                  Tap to change photo
                </SPText>
              </View>

              {/* Name input */}
              <View
                style={{ marginBottom: D.space.section, gap: D.space.tight }}
              >
                <SPText
                  style={[
                    D.type.caption,
                    {
                      color: theme.muted,
                      fontFamily: fonts.brandMedium,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      paddingHorizontal: D.space.micro,
                    },
                  ]}
                >
                  Display Name
                </SPText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Your name"
                  placeholderTextColor={theme.muted}
                  style={[
                    sheetStyles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.surface2,
                      borderColor: nameFocused ? theme.accent : theme.border,
                      fontFamily: fonts.brandRegular,
                    },
                  ]}
                />
              </View>

              {/* Level picker */}
              <View
                style={{ marginBottom: D.space.section, gap: D.space.tight }}
              >
                <SPText
                  style={[
                    D.type.caption,
                    {
                      color: theme.muted,
                      fontFamily: fonts.brandMedium,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      paddingHorizontal: D.space.micro,
                    },
                  ]}
                >
                  Training Level
                </SPText>
                <View style={{ flexDirection: "row", gap: D.space.tight }}>
                  {TRAINING_LEVELS.map((l) => {
                    const sel = level === l.value;
                    return (
                      <PressableScale
                        key={l.value}
                        onPress={() => {
                          setLevel(l.value);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }}
                        style={{ flex: 1 }}
                      >
                        <View
                          style={[
                            sheetStyles.levelCard,
                            {
                              backgroundColor: sel
                                ? theme.accentDim
                                : theme.surface2,
                              borderColor: sel
                                ? theme.accent + "40"
                                : theme.border,
                            },
                          ]}
                        >
                          <SPText
                            style={[
                              D.type.subtext,
                              {
                                fontFamily: fonts.brandBold,
                                color: sel ? theme.accent : theme.muted2,
                              },
                            ]}
                          >
                            {l.label}
                          </SPText>
                          <SPText
                            style={[D.type.caption, { color: theme.muted }]}
                          >
                            {l.sub}
                          </SPText>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {error ? (
                <SPText
                  style={[
                    D.type.caption,
                    {
                      color: theme.danger,
                      textAlign: "center",
                      marginBottom: D.space.std,
                    },
                  ]}
                >
                  {error}
                </SPText>
              ) : null}
            </ScrollView>

            <View style={{ marginTop: D.space.std }}>
              <SPButton onPress={handleSave} loading={saving} fullWidth>
                Save Changes
              </SPButton>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: D.radius.xxl,
    borderTopRightRadius: D.radius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: D.space.std,
    paddingTop: D.space.std,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: D.space.section,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: D.space.section,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPicker: {
    alignItems: "center",
    marginBottom: D.space.section,
    gap: D.space.tight,
  },
  photoImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
  },
  photoFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: D.input.height,
    borderWidth: 1,
    borderRadius: D.input.borderRadius,
    paddingHorizontal: D.space.std,
    fontSize: D.type.body.fontSize,
  },
  levelCard: {
    borderRadius: D.radius.sm,
    borderWidth: 1,
    padding: D.space.std,
    gap: D.space.micro,
  },
});

// ─── SettingsSkeleton ─────────────────────────────────────────────────────────

function SettingsSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  // mainStyles.content has no paddingBottom at all — without this, the
  // skeleton (and the real screen below) render their last items
  // underneath the floating SPTabBar.
  const tabBarHeight = useTabBarHeight();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        mainStyles.content,
        {
          paddingTop: insets.top + D.space.large,
          paddingBottom: tabBarHeight + D.space.section,
        },
      ]}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          mainStyles.profileCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <SPSkeleton width={56} height={56} radius={28} />
        <View style={{ flex: 1, gap: D.space.tight }}>
          <SPSkeleton width="55%" height={16} />
          <SPSkeleton width="40%" height={12} />
        </View>
        <SPSkeleton width={18} height={18} radius={4} />
      </View>

      <View
        style={[
          cardStyles.groupedCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              rowStyles.row,
              { minHeight: D.row.height },
              i === 0 && {
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <SPSkeleton width={24} height={24} radius={6} />
            <SPSkeleton width="45%" height={14} />
          </View>
        ))}
      </View>

      {[
        ["Preferences", 2],
        ["Subscription", 1],
        ["More", 3],
      ].map(([title, count]) => (
        <View key={title as string} style={{ gap: D.space.tight }}>
          <SPSkeleton width={80} height={11} />
          <View
            style={[
              cardStyles.groupedCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            {Array.from({ length: count as number }).map((_, i) => (
              <View
                key={i}
                style={[
                  rowStyles.row,
                  { minHeight: D.row.height },
                  i < (count as number) - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <SPSkeleton width="45%" height={13} />
                <SPSkeleton width={50} height={30} radius={D.radius.full} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch {
        // cache miss
      }
    }
    try {
      if (isRefresh) setRefreshing(true);
      const d = await api.get<SettingsData>("/api/settings");
      setData(d);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(d));
    } catch (e) {
      console.error("[SettingsScreen] fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearSessionToken();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  }

  async function handleManageSubscription() {
    Alert.alert(
      "Cancel Pro Subscription",
      "You'll lose access to Pro features immediately. This can't be undone -- you'd need to subscribe again to get Pro back.",
      [
        { text: "Keep Pro", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/api/payfast/cancel", {});
              await fetchData(true);
              Alert.alert(
                "Subscription cancelled",
                "You're back on the Starter plan.",
              );
            } catch (err) {
              console.error(err);
              Alert.alert(
                "Something went wrong",
                "Could not cancel your subscription. Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  if (loading || !data) {
    return (
      <View style={[mainStyles.fill, { backgroundColor: theme.bg }]}>
        <SettingsSkeleton />
      </View>
    );
  }

  const { user, currentLevel, plan, identity } = data;
  const isPro = plan === "PRO";

  return (
    <View style={[mainStyles.fill, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={mainStyles.fill}
        contentContainerStyle={[
          mainStyles.content,
          {
            paddingTop: insets.top + D.space.large,
            paddingBottom: tabBarHeight + D.space.section,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        {/* ── Header (Account / Settings — left as-is) ── */}
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ gap: D.space.micro }}
        >
          <SPText
            style={[
              D.type.caption,
              {
                color: theme.muted,
                fontFamily: fonts.brandMedium,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              },
            ]}
          >
            Account
          </SPText>
          <SPText
            style={[
              D.type.h1,
              {
                color: theme.text,
                fontFamily: fonts.brandBold,
                letterSpacing: -0.5,
              },
            ]}
          >
            Settings
          </SPText>
        </Animated.View>

        {/* ── Profile Card ── */}
        <Animated.View entering={FadeIn.duration(220).delay(40)}>
          <PressableScale onPress={() => setEditSheetOpen(true)}>
            <View
              style={[
                mainStyles.profileCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Avatar user={user} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <SPText
                  style={[
                    D.type.body,
                    {
                      color: theme.text,
                      fontFamily: fonts.brandBold,
                      fontSize: 18,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {user.name ?? "Athlete"}
                </SPText>
                <SPText
                  style={[D.type.caption, { color: theme.muted2 }]}
                  numberOfLines={1}
                >
                  {user.email ?? "Manage your account and preferences"}
                </SPText>
              </View>
              <SPIcon name="forward" size={18} color={theme.muted} />
            </View>
          </PressableScale>
        </Animated.View>

        {/* ── Edit Profile + Training System ── */}
        <Animated.View entering={FadeIn.duration(220).delay(80)}>
          <GroupedCard>
            <Row
              icon={<SPIcon name="pulse" size={20} color={theme.accent} />}
              label="Edit Profile"
              onPress={() => setEditSheetOpen(true)}
            />
            <Row
              icon={<SPIcon name="sliders" size={20} color={theme.accent} />}
              label="Training System"
              onPress={() => router.push("/settings/identity" as any)}
              last
              value={identity ? IDENTITY_LABEL[identity] : undefined}
            />
          </GroupedCard>
        </Animated.View>

        {/* ── Preferences ── */}
        <Animated.View
          entering={FadeIn.duration(220).delay(120)}
          style={{ gap: D.space.tight }}
        >
          <SectionLabel>Preferences</SectionLabel>
          <GroupedCard>
            <Row
              icon={<SPIcon name="bell" size={20} color={theme.accent} />}
              label="Push Notifications"
              rightEl={
                <PremiumSwitch
                  value={notifEnabled}
                  onChange={setNotifEnabled}
                />
              }
            />
            <Row
              icon={<SPIcon name="moon" size={20} color={theme.accent} />}
              label="Dark Mode"
              last
              rightEl={
                <PremiumSwitch value={isDark} onChange={() => toggleTheme()} />
              }
            />
          </GroupedCard>
        </Animated.View>

        {/* ── Subscription ── */}
        <Animated.View
          entering={FadeIn.duration(220).delay(160)}
          style={{ gap: D.space.tight }}
        >
          <SectionLabel>Subscription</SectionLabel>
          <View
            style={[
              cardStyles.groupedCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                padding: D.space.section,
                gap: D.space.section,
              },
            ]}
          >
            <View style={mainStyles.planRow}>
              <SPText
                style={[
                  D.type.subtext,
                  { fontFamily: fonts.brandMedium, color: theme.text },
                ]}
              >
                Current Plan
              </SPText>
              <SPText style={[D.type.subtext, { color: theme.muted2 }]}>
                {isPro ? "Pro" : "Starter"}
              </SPText>
            </View>

            {isPro ? (
              <PressableScale onPress={handleManageSubscription}>
                <View
                  style={[
                    mainStyles.upgradeBtn,
                    { backgroundColor: theme.surface2 },
                  ]}
                >
                  <SPText
                    style={{
                      fontFamily: fonts.brandBold,
                      fontSize: 15,
                      letterSpacing: 0.5,
                      color: theme.text,
                      textTransform: "uppercase",
                    }}
                  >
                    Manage Subscription
                  </SPText>
                </View>
              </PressableScale>
            ) : (
              <PressableScale onPress={() => router.push("/pricing" as any)}>
                <View
                  style={[
                    mainStyles.upgradeBtn,
                    { backgroundColor: theme.accent },
                  ]}
                >
                  <SPText
                    style={{
                      fontFamily: fonts.brandBold,
                      fontSize: 15,
                      letterSpacing: 0.5,
                      color: theme.bg,
                      textTransform: "uppercase",
                    }}
                  >
                    Upgrade to Pro
                  </SPText>
                  <SPIcon name="crown" size={18} color={theme.bg} />
                </View>
              </PressableScale>
            )}
          </View>
        </Animated.View>

        {/* ── More ── */}
        <Animated.View
          entering={FadeIn.duration(220).delay(200)}
          style={{ gap: D.space.tight }}
        >
          <SectionLabel>More</SectionLabel>
          <GroupedCard>
            <Row
              icon={<SPIcon name="info" size={20} color={theme.accent} />}
              label="About Us"
              onPress={() => router.push("/about" as any)}
            />
            <Row
              icon={
                <SPIcon name="shieldCheck" size={20} color={theme.accent} />
              }
              label="Privacy Policy"
              onPress={() => router.push("/privacy" as any)}
            />
            <Row
              icon={<SPIcon name="fileText" size={20} color={theme.accent} />}
              label="Terms & Conditions"
              onPress={() => router.push("/terms" as any)}
              last
            />
          </GroupedCard>
        </Animated.View>

        {/* ── Danger Zone ── */}
        <Animated.View
          entering={FadeIn.duration(220).delay(240)}
          style={{ gap: D.space.tight, marginTop: D.space.tight }}
        >
          <SectionLabel>Danger Zone</SectionLabel>
          <GroupedCard>
            <Row
              icon={<SPIcon name="logOut" size={20} color={theme.danger} />}
              label="Sign Out"
              danger
              onPress={handleSignOut}
              last
            />
          </GroupedCard>
        </Animated.View>

        {/* Bottom clearance for tab bar — kept tight since _layout.tsx
            already reserves a real row for SPTabBar; this is just a
            small breathing-room gap above it, specific to this screen */}
        <View style={{ height: D.space.std }} />
      </ScrollView>

      {editSheetOpen && (
        <EditProfileSheet
          user={user}
          currentLevel={currentLevel}
          onClose={() => setEditSheetOpen(false)}
          onSaved={async (newName, newImage) => {
            setData((d) =>
              d
                ? {
                    ...d,
                    user: {
                      ...d.user,
                      name: newName,
                      image: newImage ?? d.user.image,
                    },
                  }
                : d,
            );
            await AsyncStorage.removeItem(CACHE_KEY);
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mainStyles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingHorizontal: D.space.section,
    gap: D.space.section,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: D.space.std,
    borderRadius: D.radius.xxl,
    borderWidth: 1,
    padding: D.space.section,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: D.space.tight,
    height: D.button.height,
    borderRadius: D.button.borderRadius,
  },
});
