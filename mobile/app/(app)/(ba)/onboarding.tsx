import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Input, Chip } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

type PillarOption = {
  key: Pillar;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
};

type CompanyType = "limited" | "sole-trader" | "not-yet";

const COMPANY_OPTIONS: { key: CompanyType; label: string }[] = [
  { key: "limited", label: "Yes — limited company" },
  { key: "sole-trader", label: "Sole trader" },
  { key: "not-yet", label: "Not yet" },
];

export default function Onboarding() {
  const t = useTheme();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPillars, setSelectedPillars] = useState<Set<Pillar>>(new Set());

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType | null>(null);

  const pillars: PillarOption[] = [
    {
      key: "work",
      icon: "briefcase-outline",
      title: "Grow my business",
      subtitle: "Quotes, invoices, compliance, courses",
      color: t.colors.work,
    },
    {
      key: "health",
      icon: "medkit-outline",
      title: "Fix pain, move better",
      subtitle: "Clinic sessions, rehab plans, check-ins",
      color: t.colors.health,
    },
    {
      key: "community",
      icon: "people-outline",
      title: "Meet people like me",
      subtitle: "Community, groups, trusted directory",
      color: t.colors.community,
    },
  ];

  function togglePillar(key: Pillar) {
    setSelectedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleContinue() {
    setStep(2);
  }

  function handleCreate() {
    router.replace("/(app)/(ba)/(tabs)");
  }

  return (
    <Screen scroll testID="onboarding-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <Text variant="caption" color={t.colors.textMuted} style={styles.stepIndicator}>
        {`Step ${step} of 2`}
      </Text>

      {step === 1 ? (
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="hero">What brings you here?</Text>
            <Text variant="body" color={t.colors.textMuted} style={styles.subtitle}>
              Pick as many as you like. Your home screen adapts to you.
            </Text>
          </View>

          <View style={styles.pillarList}>
            {pillars.map((pillar) => {
              const isSelected = selectedPillars.has(pillar.key);
              return (
                <Pressable key={pillar.key} onPress={() => togglePillar(pillar.key)}>
                  <Card accent={pillar.key}>
                    <View style={styles.pillarRow}>
                      <View style={styles.pillarIcon}>
                        <Ionicons name={pillar.icon} size={24} color={pillar.color} />
                      </View>
                      <View style={styles.pillarText}>
                        <Text variant="heading">{pillar.title}</Text>
                        <Text variant="caption" color={t.colors.textMuted}>
                          {pillar.subtitle}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected ? pillar.color : "transparent",
                            borderColor: isSelected ? pillar.color : t.colors.border,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Button
            title="Continue"
            variant="greige"
            size="lg"
            onPress={handleContinue}
            disabled={selectedPillars.size === 0}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="hero">About you</Text>
            <Text variant="body" color={t.colors.textMuted} style={styles.subtitle}>
              This builds your profile card. You can edit it any time.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <Input
              label="What do you do?"
              placeholder="e.g. Physiotherapist, Personal Trainer"
              value={role}
              onChangeText={setRole}
            />
            <Input
              label="Where do you work?"
              placeholder="e.g. Active Health Clinic"
              value={workplace}
              onChangeText={setWorkplace}
            />

            <View style={styles.companySection}>
              <Text variant="label" color={t.colors.textMuted}>
                Company type
              </Text>
              <View style={styles.chipRow}>
                {COMPANY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={companyType === opt.key}
                    onPress={() => setCompanyType(opt.key)}
                    accentColor={t.colors.greige}
                  />
                ))}
              </View>
              <Text variant="caption" color={t.colors.textMuted}>
                We use this to set up your compliance calendar.
              </Text>
            </View>
          </View>

          <Button
            title="Create my account"
            variant="greige"
            size="lg"
            onPress={handleCreate}
            disabled={!fullName.trim()}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepIndicator: {
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    gap: 28,
  },
  header: {
    gap: 8,
  },
  subtitle: {
    lineHeight: 18,
  },
  pillarList: {
    gap: 12,
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pillarText: {
    flex: 1,
    gap: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: 4,
  },
  companySection: {
    gap: 8,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
