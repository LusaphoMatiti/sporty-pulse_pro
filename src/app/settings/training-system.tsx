import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SPText } from "../../components/ui/SPText";
import { SPButton } from "../../components/ui/SPButton";
import { getEquipmentIcon } from "../../components/icons/Empticons";
import { api, getEquipment } from "../../lib/api";
import { useAppTheme } from "../../theme/ThemeContext";
import { useResponsive, ResponsiveUtils } from "../../hooks/useResponsive";
import { spacing, radii, borders, fonts } from "../../theme";

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
  rs,
}: {
  options: Record<string, string>;
  selected: string;
  onSelect: (value: string) => void;
  rs: ResponsiveUtils["rs"];
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
              paddingVertical: rs(6, 8, 8, 10),
              paddingHorizontal: rs(12, 16, 16, 18),
              borderRadius: radii.lg,
              borderWidth: borders.thin,
              borderColor: isSelected ? theme.accent : theme.border,
              backgroundColor: isSelected ? theme.accent + "26" : theme.surface,
            }}
          >
            <SPText
              style={{
                color: isSelected ? theme.accent : theme.text,
                fontSize: rs(12, 13, 13, 14),
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
  rs,
}: {
  title: string;
  children: React.ReactNode;
  rs: ResponsiveUtils["rs"];
}) {
  const { theme } = useAppTheme();
  return (
    <View style={{ marginBottom: spacing[6] }}>
      <SPText
        style={{
          color: theme.muted,
          fontSize: rs(10, 11, 11, 12),
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
  const { rs, rsp } = useResponsive();

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
      contentContainerStyle={{
        padding: rsp(spacing[5]),
        paddingTop: rsp(spacing[6]),
        maxWidth: 640,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ marginBottom: rsp(spacing[4]), alignSelf: "flex-start" }}
      >
        <ChevronLeft size={rs(22, 24, 24, 26)} color={theme.text} />
      </Pressable>

      <SPText
        style={{
          color: theme.text,
          fontFamily: fonts.brandBold,
          fontSize: rs(24, 28, 28, 32),
          marginBottom: rsp(spacing[6]),
        }}
      >
        Training System
      </SPText>

      <FieldSection title="Goal" rs={rs}>
        <OptionRow
          options={GOAL_LABEL}
          selected={data.primaryGoal}
          onSelect={(value) => setData((d) => ({ ...d, primaryGoal: value }))}
          rs={rs}
        />
      </FieldSection>

      <FieldSection title="Where you train" rs={rs}>
        <OptionRow
          options={LOCATION_LABEL}
          selected={data.trainingLocation}
          onSelect={(value) =>
            setData((d) => ({ ...d, trainingLocation: value }))
          }
          rs={rs}
        />
      </FieldSection>

      <FieldSection title="Biological sex" rs={rs}>
        <OptionRow
          options={SEX_LABEL}
          selected={data.biologicalSex}
          onSelect={(value) => setData((d) => ({ ...d, biologicalSex: value }))}
          rs={rs}
        />
      </FieldSection>

      <FieldSection title="Experience level" rs={rs}>
        <OptionRow
          options={LEVEL_LABEL}
          selected={data.experienceLevel}
          onSelect={(value) =>
            setData((d) => ({ ...d, experienceLevel: value }))
          }
          rs={rs}
        />
      </FieldSection>

      <FieldSection title="Equipment" rs={rs}>
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
                  padding: rsp(spacing[3]),
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
                    size={rs(18, 20, 20, 22)}
                    color={isSelected ? theme.accent : theme.text}
                    strokeWidth={2}
                  />
                )}
                <SPText
                  style={{
                    color: isSelected ? theme.accent : theme.text,
                    fontSize: rs(12, 13, 13, 14),
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
            fontSize: rs(12, 13, 13, 14),
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
