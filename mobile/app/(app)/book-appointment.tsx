import { useState } from "react";
import { View, Pressable, ScrollView, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { bookAppointment } from "@/api/booking";
import { useTheme } from "@/theme/useTheme";

const TYPES = [
  "Initial Assessment", "Follow-up", "Physiotherapy", "Sports Therapy",
  "Biomechanical Assessment", "Foot Scan", "Review",
];

function generateDates(): { label: string; value: string; day: string; date: number }[] {
  const dates = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue; // skip sunday
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    dates.push({
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      value: d.toISOString().split("T")[0],
      day: days[d.getDay()],
      date: d.getDate(),
    });
  }
  return dates;
}

const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

export default function BookAppointment() {
  const t = useTheme();
  const qc = useQueryClient();
  const [type, setType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const dates = generateDates();

  const mutation = useMutation({
    mutationFn: () => {
      if (!type || !selectedDate || !selectedTime) throw new Error("Preencha todos os campos.");
      return bookAppointment({
        dateTime: `${selectedDate}T${selectedTime}:00.000Z`,
        treatmentType: type,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      Alert.alert("Agendado!", "Sua consulta foi agendada com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (e) => Alert.alert("Erro", (e as Error).message || "Não foi possível agendar."),
  });

  return (
    <Screen scroll testID="book-appointment-screen">
      <Stack.Screen
        options={{ headerShown: true, title: "Agendar", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 20 }}>
        <Text variant="title">Agendar Consulta</Text>

        {/* Type */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Tipo de consulta</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TYPES.map(t2 => (
              <Pressable key={t2} onPress={() => setType(t2)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: type === t2 ? "rgba(93,201,192,0.2)" : "rgba(74,124,138,0.08)", borderWidth: 1, borderColor: type === t2 ? "rgba(93,201,192,0.4)" : "rgba(74,124,138,0.12)" }}>
                <Text variant="caption" color={type === t2 ? "#5dc9c0" : t.colors.textSecondary}>{t2}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Date */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dates.map(d => (
              <Pressable key={d.value} onPress={() => setSelectedDate(d.value)}
                style={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: selectedDate === d.value ? "rgba(93,201,192,0.2)" : "rgba(74,124,138,0.06)", borderWidth: 1, borderColor: selectedDate === d.value ? "rgba(93,201,192,0.4)" : "rgba(74,124,138,0.1)" }}>
                <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10 }}>{d.day}</Text>
                <Text variant="subtitle" color={selectedDate === d.value ? "#5dc9c0" : t.colors.text} style={{ fontSize: 18 }}>{d.date}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {/* Time */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Horário</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TIMES.map(time => (
              <Pressable key={time} onPress={() => setSelectedTime(time)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: selectedTime === time ? "rgba(93,201,192,0.2)" : "rgba(74,124,138,0.06)", borderWidth: 1, borderColor: selectedTime === time ? "rgba(93,201,192,0.4)" : "rgba(74,124,138,0.1)" }}>
                <Text variant="label" color={selectedTime === time ? "#5dc9c0" : t.colors.textSecondary}>{time}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Notes */}
        <Input label="Observações (opcional)" value={notes} onChangeText={setNotes} placeholder="Alguma informação adicional..." multiline style={{ minHeight: 60, textAlignVertical: "top" }} />

        {/* Submit */}
        <Pressable
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending || !type || !selectedDate || !selectedTime}
          style={{ borderRadius: 14, overflow: "hidden", opacity: (!type || !selectedDate || !selectedTime) ? 0.5 : 1 }}
        >
          <LinearGradient colors={["#4a7c8a", "#2c4f58"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
            <Text variant="label" color="#fff" style={{ fontWeight: "700", fontSize: 16 }}>
              {mutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}
