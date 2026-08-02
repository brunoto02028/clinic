import { View, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Text,
  Card,
  Button,
  Pill,
  Avatar,
  ListItem,
} from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

// ---------------------------------------------------------------------------
// TriBar (inline, progress-style: N of M filled)
// ---------------------------------------------------------------------------

function ProgressBar({
  filled,
  total,
  color,
}: {
  filled: number;
  total: number;
  color: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 4, marginVertical: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            backgroundColor: i < filled ? color : "#E4E3DF",
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hardcoded data
// ---------------------------------------------------------------------------

const CURRENT_COURSE = {
  name: "Responsible Director",
  module: "Module 5 · Closing or pausing a company",
  filledModules: 3,
  totalModules: 5,
  minutesLeft: 8,
};

const COURSES = [
  {
    id: "1",
    title: "Responsible Director",
    subtitle: "UK compliance, in Portuguese · 7 modules",
    pill: { label: "Owned", variant: "ok" as const },
  },
  {
    id: "2",
    title: "Bookkeeping in Practice",
    subtitle: "Module 1 free · 9 modules",
    price: "£97",
  },
  {
    id: "3",
    title: "Pricing your trade",
    subtitle: "Coming soon",
    pill: { label: "Soon", variant: "work" as const },
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Learn() {
  const t = useTheme();
  const progress = Math.round(
    (CURRENT_COURSE.filledModules / CURRENT_COURSE.totalModules) * 100,
  );

  return (
    <Screen scroll testID="learn-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Learn",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 20 }}>
        {/* Continue card */}
        <Card accent="work">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              variant="eyebrow"
              color={t.colors.work}
              style={{ textTransform: "uppercase" }}
            >
              CONTINUE
            </Text>
            <Text variant="caption" color={t.colors.textMuted}>
              {progress}%
            </Text>
          </View>

          <Text
            variant="heading"
            style={{ fontFamily: "Sora_700Bold", fontSize: 15 }}
          >
            {CURRENT_COURSE.name}
          </Text>
          <Text variant="caption" color={t.colors.textMuted}>
            {CURRENT_COURSE.module}
          </Text>

          <ProgressBar
            filled={CURRENT_COURSE.filledModules}
            total={CURRENT_COURSE.totalModules}
            color={t.colors.work}
          />

          <Button
            title={`Resume — ${CURRENT_COURSE.minutesLeft} min left`}
            variant="work"
            size="sm"
            onPress={() => {}}
          />
        </Card>

        {/* Courses label */}
        <Text
          variant="eyebrow"
          color={t.colors.textMuted}
          style={{ textTransform: "uppercase" }}
        >
          COURSES
        </Text>

        {/* Course list */}
        <Card>
          {COURSES.map((course, i) => (
            <ListItem
              key={course.id}
              icon={<Avatar label="📖" pillar="work" size={36} />}
              title={course.title}
              subtitle={course.subtitle}
              last={i === COURSES.length - 1}
              onPress={() => {}}
              right={
                course.pill ? (
                  <Pill
                    label={course.pill.label}
                    variant={course.pill.variant}
                  />
                ) : course.price ? (
                  <Text
                    variant="label"
                    style={{ fontFamily: "Sora_700Bold", fontSize: 13 }}
                  >
                    {course.price}
                  </Text>
                ) : null
              }
            />
          ))}
        </Card>

        {/* Badge CTA */}
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                backgroundColor: t.colors.workSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="ribbon" size={20} color={t.colors.work} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label">Finish a course, earn a badge</Text>
              <Text
                variant="caption"
                color={t.colors.textMuted}
                style={{ marginTop: 1 }}
              >
                Badges show on your community profile
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
