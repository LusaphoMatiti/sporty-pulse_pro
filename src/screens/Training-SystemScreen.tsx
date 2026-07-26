import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SPText } from "../components/ui/SPText";
import { SPButton } from "../components/ui/SPButton";
import { getEquipmentIcon } from "../components/icons/Empticons";
import { api, getEquipment } from "../lib/api";
import { useAppTheme } from "../theme/ThemeContext";
import { spacing, radii, borders, fonts } from "../theme";

// Values and labels confirmed directly against OnboardingScreen.tsx --
// not invented, matched exactly so saved values stay compatible with
// everything else that already reads them.
const GOAL_LABEL: Record<string, string> = {
  LOSE_WEIGHT: "Lose Weight",
  BUILD_MUSCLE: "Build Muscle",
  GET_FIT: "Get Fit",
};
const LOCATION_LABEL: Record<string, string> = { HOME: "Home", GYM: "Gym" };
const SEX_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  NOT_SPECIFIED: "Prefer not to say",
};
const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

type EquipmentItem = { id: string; name: string };

type TrainingSystemData = {
  primaryGoal: string;
  trainingLocation: string;
  biologicalSex: string;
  experienceLevel: string;
  equipmentId: string | null;
};

function OptionRow({
  options,
  selected,
  onSelect,
}: {
  options: Record<string, string>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
      {Object.entries(options).map(([value, label]) => {
        const isSelected = value === selected;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={{
              paddingVertical: spacing[2],
              paddingHorizontal: spacing[4],
              borderRadius: radii.lg,
              borderWidth: borders.thin,
              borderColor: isSelected ? theme.accent : theme.border,
              backgroundColor: isSelected ? theme.accent + "26" : theme.surface,
            }}
          >
            <SPText
              style={{
                color: isSelected ? theme.accent : theme.text,
                fontSize: 13,
                fontFamily: isSelected ? fonts.brandBold : undefined,
              }}
            >
              {label}
            </SPText>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={{ marginBottom: spacing[6] }}>
      <SPText
        style={{
          color: theme.muted,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: spacing[3],
        }}
      >
        {title}
      </SPText>
      {children}
    </View>
  );
}

export default function TrainingSystemScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);

  const [data, setData] = useState<TrainingSystemData>({
    primaryGoal: "",
    trainingLocation: "",
    biologicalSex: "",
    experienceLevel: "",
    equipmentId: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, equipment] = await Promise.all([
        api.get<TrainingSystemData>("/api/settings/training-system"),
        getEquipment(),
      ]);
      if (current) {
        setData(current);
      } else {
        setError("Could not load your training system. Please try again.");
      }
      setEquipmentList(equipment?.equipment ?? []);
    } catch (err) {
      console.error(err);
      setError("Could not load your training system. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/settings/training-system", data);
      router.back();
    } catch (err) {
      console.error(err);
      setError("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SPText style={{ color: theme.muted }}>Loading...</SPText>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: spacing[5], paddingTop: spacing[6] }}
    >
      <ChevronLeft
        size={24}
        color={theme.text}
        onPress={() => router.back()}
        style={{ marginBottom: spacing[4] }}
      />

      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: 28,
          marginBottom: spacing[6],
        }}
      >
        Training System
      </SPText>

      <FieldSection title="Goal">
        <OptionRow
          options={GOAL_LABEL}
          selected={data.primaryGoal}
          onSelect={(value) => setData((d) => ({ ...d, primaryGoal: value }))}
        />
      </FieldSection>

      <FieldSection title="Where you train">
        <OptionRow
          options={LOCATION_LABEL}
          selected={data.trainingLocation}
          onSelect={(value) =>
            setData((d) => ({ ...d, trainingLocation: value }))
          }
        />
      </FieldSection>

      <FieldSection title="Biological sex">
        <OptionRow
          options={SEX_LABEL}
          selected={data.biologicalSex}
          onSelect={(value) => setData((d) => ({ ...d, biologicalSex: value }))}
        />
      </FieldSection>

      <FieldSection title="Experience level">
        <OptionRow
          options={LEVEL_LABEL}
          selected={data.experienceLevel}
          onSelect={(value) =>
            setData((d) => ({ ...d, experienceLevel: value }))
          }
        />
      </FieldSection>

      <FieldSection title="Equipment">
        <View style={{ gap: spacing[2] }}>
          {equipmentList.map((item) => {
            const isSelected = item.id === data.equipmentId;
            const EquipmentIcon = getEquipmentIcon(item.name, undefined);
            return (
              <Pressable
                key={item.id}
                onPress={() => setData((d) => ({ ...d, equipmentId: item.id }))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[3],
                  padding: spacing[3],
                  borderRadius: radii.lg,
                  borderWidth: borders.thin,
                  borderColor: isSelected ? theme.accent : theme.border,
                  backgroundColor: isSelected
                    ? theme.accent + "26"
                    : theme.surface,
                }}
              >
                {EquipmentIcon && (
                  <EquipmentIcon
                    size={20}
                    color={isSelected ? theme.accent : theme.text}
                    strokeWidth={2}
                  />
                )}
                <SPText
                  style={{
                    color: isSelected ? theme.accent : theme.text,
                    fontSize: 13,
                  }}
                >
                  {item.name}
                </SPText>
              </Pressable>
            );
          })}
        </View>
      </FieldSection>

      {error && (
        <SPText
          style={{
            color: "#ef4444",
            fontSize: 13,
            textAlign: "center",
            marginBottom: spacing[3],
          }}
        >
          {error}
        </SPText>
      )}

      <SPButton variant="primary" onPress={handleSave} loading={saving}>
        Save Changes
      </SPButton>
    </ScrollView>
  );
}
