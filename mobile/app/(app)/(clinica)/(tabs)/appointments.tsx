import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointments, type Appointment } from "@/api/appointments";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { statusStyle } from "@/lib/appointment-status";
import { usePullToRefresh } from "@/lib/pull-to-refresh";
import { janelaAberta } from "@/api/video";
import { estadoDoPagamento } from "@/lib/pagamento-da-consulta";


function AppointmentsScreen() {
  const lang = useLang();
  const t = useTheme();
  const { controle } = usePullToRefresh();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const sorted = (data ?? [])
    .slice()
    .sort((a: Appointment, b: Appointment) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <Screen testID="appointments-screen">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text variant="title">{tr(lang, { en: "Appointments", pt: "Consultas" })}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* **Com quem** (102 T-5).

              Marcar com a reabilitação continua a um toque, como sempre foi —
              não dá para pôr uma escolha a mais no caminho de quem já sabe
              onde vai. Escolher profissional é um botão ao lado, e não um
              passo antes.

              Sem este botão a tela de catálogo existiria e ninguém chegaria
              nela, que é a falha que a varredura da 100 T-4 nasceu para pegar. */}
          <Pressable
            testID="escolher-profissional"
            onPress={() => router.push("/(app)/(clinica)/escolher-profissional" as never)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border }}
          >
            <Ionicons name="people-outline" size={16} color={t.colors.textSecondary} />
            <Text variant="caption" color={t.colors.textSecondary} style={{ fontWeight: "600" }}>{tr(lang, { en: "Professionals", pt: "Profissionais" })}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/book-appointment")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.colors.healthSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: t.colors.health }}
          >
            <Ionicons name="add" size={16} color={t.colors.health} />
            <Text variant="caption" color={t.colors.health} style={{ fontWeight: "600" }}>{tr(lang, { en: "Book", pt: "Agendar" })}</Text>
          </Pressable>
        </View>
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
            refreshControl={controle}
          data={sorted}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = statusStyle(t, item.status, lang);
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
                      {/* O ícone conta o formato. Era sempre o mesmo, e o
                          paciente só descobria que a consulta era por vídeo
                          abrindo a tela dela. */}
                      <Ionicons
                        name={
                          item.mode === "VIDEO"
                            ? "videocam-outline"
                            : item.mode === "HOME_VISIT"
                              ? "home-outline"
                              : "medical-outline"
                        }
                        size={22}
                        color={t.colors.health}
                      />
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

                  {/* Espera pagamento — **na lista** (101 T-3).

                      Uma consulta marcada pela clínica chega igual a qualquer
                      outra, e a diferença é que ela só existe de verdade depois
                      de paga. Quem abre a lista e vê "pendente" não tem como
                      saber que a pendência é dele. */}
                  {estadoDoPagamento(item) === "espera_cartao" && (
                    <Pressable
                      testID={`pagar-${item.id}`}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/(app)/(clinica)/appointment/${item.id}` as never);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 10,
                        marginLeft: 56,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons name="card-outline" size={14} color={t.colors.warn} />
                      <Text variant="caption" color={t.colors.warn} style={{ fontWeight: "600" }}>
                        {tr(lang, {
                          en: `Waiting for your payment — £${item.price}`,
                          pt: `Esperando seu pagamento — £${item.price}`,
                        })}
                      </Text>
                    </Pressable>
                  )}

                  {/* A consulta à distância se anuncia **aqui**, na lista (089).
                      O Bruno: *"se agendamento for uma consulta à distância, eu
                      quero que já apareça para o paciente essa opção"*. Estava
                      só na tela da consulta, e o paciente vê a lista primeiro —
                      saber que é por vídeo muda o que a pessoa faz antes da hora:
                      onde ela vai estar, e se precisa sair de casa.

                      Fora da janela a linha continua dizendo o formato, em vez
                      de sumir. Some o botão, não a informação. */}
                  {/* Cancelada nao oferece entrada. O servidor ja recusa com
    `not_scheduled`, mas um botao verde ao lado da tarja vermelha
    "Cancelada" e a tela contradizendo a si mesma. */}
                  {item.mode === "VIDEO" && item.status !== "CANCELLED" && item.status !== "NO_SHOW" && (
                    <View style={{ marginTop: 10, marginLeft: 56 }}>
                      {janelaAberta(item.dateTime, item.duration) ? (
                        <Pressable
                          testID={`entrar-video-${item.id}`}
                          onPress={(e) => {
                            // Sem isto o toque sobe para o cartão e abre o detalhe:
                            // quem toca em "entrar" quer entrar, não ler.
                            e.stopPropagation?.();
                            router.push(`/(app)/(clinica)/consulta-video?id=${item.id}` as never);
                          }}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: t.colors.health,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <Ionicons name="videocam" size={16} color={t.colors.accentFg} />
                          <Text variant="caption" color={t.colors.accentFg} style={{ fontWeight: "700" }}>
                            {tr(lang, { en: "Join now", pt: "Entrar agora" })}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="videocam-outline" size={14} color={t.colors.textMuted} />
                          <Text variant="caption" muted>
                            {tr(lang, { en: "Video consultation", pt: "Consulta por vídeo" })}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* O que aconteceu com o formato pedido (098 T-4).
                      Nada disto é enviado ao paciente: ele lê aqui quando abre,
                      e quem avisa é a clínica, num botão. */}
                  {item.requestedMode && !item.modeApprovedAt && !item.modeRefusedReason && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <Ionicons name="time-outline" size={14} color={t.colors.textMuted} />
                      <Text variant="caption" muted style={{ flex: 1 }}>
                        {item.requestedMode === "VIDEO"
                          ? tr(lang, {
                              en: "Video consultation requested — waiting for the clinic",
                              pt: "Consulta por vídeo pedida — aguardando a clínica",
                            })
                          : tr(lang, {
                              en: "Home visit requested — waiting for the clinic",
                              pt: "Atendimento em casa pedido — aguardando a clínica",
                            })}
                      </Text>
                    </View>
                  )}
                  {item.modeRefusedReason && (
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 }}>
                      <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
                      <Text variant="caption" muted style={{ flex: 1 }}>
                        {tr(lang, {
                          en: "The clinic kept this one at the clinic: ",
                          pt: "A clínica manteve esta na clínica: ",
                        })}
                        {item.modeRefusedReason}
                      </Text>
                    </View>
                  )}
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
