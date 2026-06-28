import React from "react";
import { View, Modal, Pressable, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { SPText } from "./SPText";
import { SPButton } from "./SPButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radii, borders, fonts } from "../../theme";
import { useAppTheme } from "../../theme/ThemeContext";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UpgradeTrigger =
  | "cap_reached"
  | "equipment_required"
  | "upgrade_required"
  | "trial_expired"
  | "ai_coach"
  | "analytics"
  | "personalized"
  | "not_purchased"
  | "volume_history";

type Props = {
  trigger: UpgradeTrigger;
  open: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
};

type TriggerMeta = {
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
  features: string[];
};

// ─── Content map — ported 1:1 from the web UpgradePrompt ───────────────────

const triggerMeta: Record<UpgradeTrigger, TriggerMeta> = {
  cap_reached: {
    eyebrow: "Program limit reached",
    heading: "Go Pro for\nunlimited programs",
    body: "You're on the free plan, which supports 2 active programs. Upgrade to Pro to run as many as you want — simultaneously.",
    cta: "Upgrade to Pro",
    features: [
      "Unlimited active programs",
      "AI Coach — personalised advice",
      "Advanced analytics & volume history",
      "Personalised program generation",
    ],
  },
  ai_coach: {
    eyebrow: "Pro feature",
    heading: "Meet your\nAI Coach",
    body: "Get real-time, personalised coaching based on your training history, recovery, and goals — available 24/7.",
    cta: "Unlock AI Coach",
    features: [
      "Personalised session feedback",
      "Recovery & readiness scoring",
      "Adaptive program adjustments",
      "Chat with your coach anytime",
    ],
  },
  equipment_required: {
    eyebrow: "Equipment required",
    heading: "Unlock equipment\nbased programs",
    body: "This program requires equipment you don't have access to. Upgrade to Pro to unlock all equipment programs.",
    cta: "Unlock programs",
    features: [
      "Access all equipment programs",
      "Train with dumbbells, barbells & more",
      "No restrictions on program types",
      "Full training library unlocked",
    ],
  },
  upgrade_required: {
    eyebrow: "Free plan limit",
    heading: "Unlock more\nprograms",
    body: "You're currently on the free plan. Upgrade to Pro to access more than 2 programs and unlock the full library.",
    cta: "Upgrade to Pro",
    features: [
      "Unlimited program access",
      "All bodyweight & equipment programs",
      "No restrictions",
      "Full training library",
    ],
  },
  trial_expired: {
    eyebrow: "Trial ended",
    heading: "Your trial\nhas expired",
    body: "Your equipment trial has ended. Upgrade to continue using equipment-based programs.",
    cta: "Continue with Pro",
    features: [
      "Restore equipment access",
      "Continue your current programs",
      "Unlimited training options",
      "Full feature access",
    ],
  },
  analytics: {
    eyebrow: "Pro feature",
    heading: "Advanced\nanalytics",
    body: "Visualise your strength curves, volume trends, and muscle balance. Know exactly where you're improving — and where you're not.",
    cta: "Unlock Analytics",
    features: [
      "Strength curve per exercise",
      "Weekly & monthly volume charts",
      "Muscle group balance heatmap",
      "Personal record progression",
    ],
  },
  personalized: {
    eyebrow: "Pro feature",
    heading: "Programs built\nfor you",
    body: "Stop following generic plans. Pro generates a program tailored to your equipment, goals, level, and schedule.",
    cta: "Unlock Personalised Plans",
    features: [
      "AI-generated 4–12 week programs",
      "Adapts to your equipment",
      "Goal-specific periodisation",
      "Adjusts weekly based on progress",
    ],
  },
  volume_history: {
    eyebrow: "Pro feature",
    heading: "Full volume\nhistory",
    body: "See your total volume lifted over any time range — weekly, monthly, all-time — broken down by muscle group.",
    cta: "Unlock Volume History",
    features: [
      "All-time volume tracking",
      "Breakdown by muscle group",
      "Week-on-week comparisons",
      "Export your data",
    ],
  },
  not_purchased: {
    eyebrow: "Equipment required",
    heading: "Get access\nto this program",
    body: "This program requires equipment you haven't purchased. Unlock it to start training.",
    cta: "Get Access",
    features: [
      "Unlock this equipment",
      "Start the program today",
      "Track progress & reps",
      "Full video guidance",
    ],
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function UpgradePrompt({
  trigger,
  open,
  onClose,
  onUpgrade,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const meta = triggerMeta[trigger];

  if (!open) return null;

  // TODO: no Pro upgrade/paywall screen exists yet in the app. Once one is
  // built, replace this with a real navigation call (and keep onUpgrade as
  // an optional override for callers that need custom behavior, same as
  // the web version's handleCta).
  const handleCta = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      onClose();
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            sheetStyles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + spacing[6],
            },
          ]}
        >
          {/* Handle */}
          <View
            style={[
              sheetStyles.handle,
              { backgroundColor: theme.muted + "55" },
            ]}
          />

          {/* Eyebrow */}
          <SPText
            style={{
              color: theme.muted,
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: spacing[2],
            }}
          >
            {meta.eyebrow}
          </SPText>

          {/* Heading */}
          <SPText
            style={{
              color: theme.text,
              fontFamily: fonts.brandBold,
              fontSize: 28,
              lineHeight: 32,
              letterSpacing: -0.3,
              textAlign: "center",
              marginBottom: spacing[3],
            }}
          >
            {meta.heading}
          </SPText>

          {/* Body */}
          <SPText
            style={{
              color: theme.muted2,
              fontSize: 13,
              lineHeight: 19,
              textAlign: "center",
              marginBottom: spacing[5],
              paddingHorizontal: spacing[2],
            }}
          >
            {meta.body}
          </SPText>

          {/* Feature list */}
          <View
            style={[
              sheetStyles.featureCard,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            {meta.features.map((feat) => (
              <View key={feat} style={sheetStyles.featureRow}>
                <View
                  style={[
                    sheetStyles.checkBubble,
                    {
                      backgroundColor: theme.accent + "26",
                      borderColor: theme.accent + "4D",
                    },
                  ]}
                >
                  <Check size={10} color={theme.accent} strokeWidth={3} />
                </View>
                <SPText style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                  {feat}
                </SPText>
              </View>
            ))}
          </View>

          {/* Primary CTA */}
          <SPButton variant="primary" onPress={handleCta}>
            {meta.cta}
          </SPButton>

          {/* Dismiss */}
          <Pressable
            onPress={onClose}
            style={{
              marginTop: spacing[3],
              alignItems: "center",
              paddingVertical: spacing[2],
            }}
          >
            <SPText
              style={{
                color: theme.muted,
                fontSize: 11,
                fontFamily: fonts.brandBold,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Not now
            </SPText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    borderWidth: borders.thin,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing[5],
  },
  featureCard: {
    borderWidth: borders.thin,
    borderRadius: radii.xl,
    padding: spacing[4],
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  checkBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: borders.thin,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
