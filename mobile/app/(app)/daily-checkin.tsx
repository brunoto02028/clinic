import { useEffect, useState } from "react";
import { View, Pressable, TextInput, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchCheckIns, submitCheckIn } from "@/api/daily-checkin";

const MOODS = [
  { v: 1, emoji: "😞" },
  { v: 2, emoji: "😕" },
  { v: 3, emoji: "😐" },
  { v: 4, emoji: "🙂" },
  { v: 5, emoji: "😄" },
];

function SliderRow({
  label,
  value,
  onChange,
  color = "#5dc9c0",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="label">{label}</Text>
        <Text variant="label" style={{ color, fontWeight: "700" }}>
          {value}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: i === value ? color : "rgba(26, 39, 64, 0.8)",
              borderWidth: 1,
              borderColor: i === value ? color : "rgba(255, 255, 255, 0.06)",
            }}
          >
            <Text style={{ fontSize: 10, color: i === value ? "#fff" : "rgba(255,255,255,0.4)" }}>{i}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function DailyCheckIn() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["daily-checkin"],
    queryFn: fetchCheckIns,
  });

  const [pain, setPain] = useState(3);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [stress, setStress] = useState(5);
  const [exercises, setExercises] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!data?.today) return;
    const ci = data.today;
    setPain(ci.painLevel ?? 3);
    setMood(ci.moodLevel ?? 3);
    setEnergy(ci.energyLevel ?? 5);
    setSleep(ci.sleepQuality ?? 5);
    setStress(ci.stressLevel ?? 5);
    setExercises(ci.exercisesDone ?? false);
    setNotes(ci.notes ?? "");
  }, [data?.today]);

  const mutation = useMutation({
    mutationFn: submitCheckIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-checkin"] });
      Alert.alert("Salvo", "Check-in registrado com sucesso!");
      router.back();
    },
    onError: (e) => Alert.alert("Erro", (e as Error).message),
  });

  const handleSave = () => {
    mutation.mutate({
      painLevel: pain,
      moodLevel: mood,
      energyLevel: energy,
      sleepQuality: sleep,
      stressLevel: stress,
      exercisesDone: exercises,
      notes: notes || undefined,
    });
  };

  return (
    <Screen scroll testID="daily-checkin-screen">
      <Stack.Screen options={{ headerShown: true, title: "Check-in Diário", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      {isLoading ? (
        <Spinner center />
      ) : (
        <View style={{ gap: 20 }}>
          <Text variant="title">Como você está hoje?</Text>

          <SliderRow label="Dor" value={pain} onChange={setPain} color="#f87171" />
          <SliderRow label="Energia" value={energy} onChange={setEnergy} color="#fbbf24" />
          <SliderRow label="Qualidade do Sono" value={sleep} onChange={setSleep} color="#818cf8" />
          <SliderRow label="Estresse" value={stress} onChange={setStress} color="#a78bfa" />

          <View style={{ gap: 4 }}>
            <Text variant="label">Humor</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {MOODS.map((m) => (
                <Pressable
                  key={m.v}
                  onPress={() => setMood(m.v)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: mood === m.v ? "rgba(93, 201, 192, 0.2)" : "rgba(26, 39, 64, 0.8)",
                    borderWidth: 1,
                    borderColor: mood === m.v ? "rgba(93, 201, 192, 0.4)" : "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setExercises((v) => !v)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 16,
              borderRadius: t.radius.lg,
              backgroundColor: exercises ? "rgba(93, 201, 192, 0.1)" : "rgba(26, 39, 64, 0.8)",
              borderWidth: 1,
              borderColor: exercises ? "rgba(93, 201, 192, 0.3)" : "rgba(255, 255, 255, 0.06)",
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: exercises ? "#5dc9c0" : "transparent",
                borderWidth: exercises ? 0 : 1.5,
                borderColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {exercises && <Text style={{ color: "#fff", fontSize: 14 }}>✓</Text>}
            </View>
            <Text variant="label">Exercícios do dia realizados</Text>
          </Pressable>

          <View style={{ gap: 4 }}>
            <Text variant="label">Notas (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Como você se sente hoje?"
              placeholderTextColor={t.colors.textMuted}
              multiline
              numberOfLines={3}
              style={{
                padding: 12,
                borderRadius: t.radius.lg,
                backgroundColor: "rgba(26, 39, 64, 0.8)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.06)",
                color: "#fff",
                fontSize: 14,
                textAlignVertical: "top",
                minHeight: 80,
              }}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={mutation.isPending}
            style={{
              padding: 16,
              borderRadius: t.radius.lg,
              backgroundColor: "#5dc9c0",
              alignItems: "center",
              opacity: mutation.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {mutation.isPending ? "Salvando..." : data?.today ? "Atualizar" : "Salvar"}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
