import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointments } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { statusStyle } from "@/lib/appointment-status";


function AppointmentsScreen() {
  const lang = useLang();
  const t = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const sorted = (data ?? [])
    .slice()
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <Screen testID="appointments-screen">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text variant="title">{tr(lang, { en: "Appointments", pt: "Agenda" })}</Text>
        <Pressable
          onPress={() => router.push("/book-appointment")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.colors.healthSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: t.colors.health }}
        >
          <Ionicons name="add" size={16} color={t.colors.health} />
          <Text variant="caption" color={t.colors.health} style={{ fontWeight: "600" }}>{tr(lang, { en: "Book", pt: "Agendar" })}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>{tr(lang, { en: "We could not load your appointments.", pt: "Não foi possível carregar a agenda." })}</Text>
          </View>
        </Card>
      ) : sorted.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="calendar-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="appointments-empty">{tr(lang, { en: "You have no appointments.", pt: "Você não tem agendamentos." })}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = statusStyle(t, item.status);
            return (
              <Pressable
                testID={`appt-${item.id}`}
                onPress={() => router.push(`/appointment/${item.id}`)}
              >
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: t.colors.healthSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="medical-outline" size={22} color={t.colors.health} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>{item.treatmentType}</Text>
                      <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                        {formatDateTime(item.dateTime, lang)}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: status.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                    }}>
                      <Text variant="caption" color={status.text} style={{ fontWeight: "600", fontSize: 11 }}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  {item.therapist ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginLeft: 56 }}>
                      <Ionicons name="person-outline" size={14} color={t.colors.textMuted} />
                      <Text variant="caption" muted>
                        {item.therapist.firstName} {item.therapist.lastName}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

/**
 * Gated on `mod_appointments` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function Appointments() {
  return (
    <PlanGate module="mod_appointments">
      <AppointmentsScreen />
    </PlanGate>
  );
}
