import { useState } from "react";
import { View, Pressable, ScrollView, Alert, TextInput } from "react-native";
import { Stack, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { bookAppointment, fetchAvailability, fetchSchedule } from "@/api/booking";
import { useTheme } from "@/theme/useTheme";

const TYPES = [
  "Initial Assessment", "Follow-up", "Physiotherapy", "Sports Therapy",
  "Biomechanical Assessment", "Foot Scan", "Review",
];

function generateDates(closedDays: number[]): { label: string; value: string; day: string; date: number }[] {
  const dates = [];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (closedDays.includes(d.getDay())) continue;
    dates.push({
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      value: d.toISOString().split("T")[0],
      day: dayNames[d.getDay()],
      date: d.getDate(),
    });
  }
  return dates;
}

export default function BookAppointment() {
  const t = useTheme();
  const qc = useQueryClient();
  const [type, setType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const schedule = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });
  const closedDays = (schedule.data ?? []).filter(d => d.closed).map(d => d.dayOfWeek);
  const dates = generateDates(closedDays);

  const availability = useQuery({
    queryKey: ["availability", selectedDate],
    queryFn: () => fetchAvailability(selectedDate!),
    enabled: !!selectedDate,
  });

  const slots = availability.data?.slots ?? [];

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
      const dateObj = new Date(`${selectedDate}T12:00:00`);
      const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: "long" });
      const formattedDateTime = `${weekday} ${day} ${month} · ${selectedTime}`;

      router.replace({
        pathname: "/(app)/(clinica)/booking-confirmed",
        params: {
          serviceName: type ?? "",
          dateTime: formattedDateTime,
          location: "Ipswich clinic",
        },
      });
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
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: type === t2 ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: type === t2 ? t.colors.health : t.colors.borderSubtle }}>
                <Text variant="caption" color={type === t2 ? t.colors.health : t.colors.textSecondary}>{t2}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Date */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dates.map(d => (
              <Pressable key={d.value} onPress={() => { setSelectedDate(d.value); setSelectedTime(null); }}
                style={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: selectedDate === d.value ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: selectedDate === d.value ? t.colors.health : t.colors.borderSubtle }}>
                <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10 }}>{d.day}</Text>
                <Text variant="subtitle" color={selectedDate === d.value ? t.colors.health : t.colors.text} style={{ fontSize: 18 }}>{d.date}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {/* Time */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>Horário</Text>
          {!selectedDate ? (
            <Text variant="caption" color={t.colors.textMuted}>Selecione uma data primeiro.</Text>
          ) : availability.isLoading ? (
            <Spinner />
          ) : slots.length === 0 ? (
            <Text variant="caption" color={t.colors.textMuted}>Sem horários disponíveis nesta data.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {slots.map(time => (
                <Pressable key={time} onPress={() => setSelectedTime(time)}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: selectedTime === time ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: selectedTime === time ? t.colors.health : t.colors.borderSubtle }}>
                  <Text variant="label" color={selectedTime === time ? t.colors.health : t.colors.textSecondary}>{time}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {/* Notes */}
        <View style={{ gap: 4 }}>
          <Text variant="label">Observações (opcional)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Alguma informação adicional..." placeholderTextColor={t.colors.textMuted} multiline style={{ padding: 12, borderRadius: 12, backgroundColor: t.colors.surfaceMuted, borderWidth: 1, borderColor: t.colors.borderSubtle, color: t.colors.text, fontSize: 14, minHeight: 60, textAlignVertical: "top" }} />
        </View>

        {/* Submit */}
        <Button
          variant="health"
          title={mutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
          onPress={() => mutation.mutate()}
          disabled={!type || !selectedDate || !selectedTime}
          loading={mutation.isPending}
          size="lg"
        />
      </View>
    </Screen>
  );
}
