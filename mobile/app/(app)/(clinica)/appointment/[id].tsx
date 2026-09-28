import { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchAppointment } from "@/api/appointments";
import { janelaAberta } from "@/api/video";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr, type Lang } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { statusStyle } from "@/lib/appointment-status";
import { startAppointmentCheckout } from "@/api/booking";
import { openCheckout } from "@/lib/checkout";
import { estadoDoPagamento, TEXTO_DO_PAGAMENTO } from "@/lib/pagamento-da-consulta";

/** The date in the patient's language. The weekday and month names were two
 *  hardcoded Portuguese arrays, so an en-GB patient read "Qua, 24 Set 2026" on
 *  their own appointment. */
function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The clock in the patient's language — a module helper cannot read a hook. */
function formatTime(iso: string, lang: Lang) {
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}

function AppointmentDetailScreen() {
  const lang = useLang();
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();


  const qc = useQueryClient();
  const [pagando, setPagando] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => fetchAppointment(id),
    enabled: !!id,
  });

  /**
   * Pagar — e, com isso, confirmar (101 T-3).
   *
   * A maquina ja existia inteira: a rota de checkout, a folha dentro do app e
   * o webhook que move a consulta para `CONFIRMED` quando o dinheiro entra.
   * **Faltava a porta**: `startAppointmentCheckout` so era chamado no instante
   * em que o paciente marcava, entao uma consulta marcada pela clinica ficava
   * pendente para sempre — sem botao nenhum no telefone.
   *
   * Depois da folha ninguem afirma que pagou: quem sabe e o servidor, pelo
   * webhook. A tela recarrega e mostra o estado real.
   */
  const pagar = async () => {
    if (!data) return;
    setPagando(true);
    try {
      const url = await startAppointmentCheckout(data.id);
      if (!url) {
        // Sem URL o servidor ja resolveu sozinho (cortesia de 100%, por
        // exemplo) — recarregar mostra a consulta confirmada.
        await refetch();
        return;
      }
      await openCheckout(url);
      // Sempre recarrega, em qualquer desfecho da folha: "fechou" nao quer
      // dizer "desistiu", e dizer que cancelou seria inventar.
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ["appointments"] }),
      ]);
    } catch (e: any) {
      Alert.alert(
        tr(lang, { en: "Could not open the payment", pt: "Nao foi possivel abrir o pagamento" }),
        e?.messagePt && lang === "pt" ? e.messagePt : e?.message ||
          tr(lang, { en: "Try again in a moment.", pt: "Tente de novo daqui a pouco." })
      );
    } finally {
      setPagando(false);
    }
  };

  return (
    <Screen scroll testID="appointment-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Appointment", pt: "Consulta" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Therapist card */}
          <Card variant="elevated">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: t.colors.surfaceMuted,
                borderWidth: 1.5,
                borderColor: t.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="person-outline" size={28} color={t.colors.ok} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle">
                  {data.therapist ? `${data.therapist.firstName} ${data.therapist.lastName}` : tr(lang, { en: "Therapist", pt: "Terapeuta" })}
                </Text>
                <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                  {data.treatmentType}
                </Text>
              </View>
              {data.price ? (
                <Text variant="subtitle" color={t.colors.secondary}>
                  £{data.price}
                </Text>
              ) : null}
            </View>
          </Card>

          {/* Status badge */}
          {(() => {
            const s = statusStyle(t, data.status, lang);
            return (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                alignSelf: "flex-start",
                backgroundColor: s.bg,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <Ionicons name={s.icon as any} size={16} color={s.text} />
                <Text variant="label" color={s.text} style={{ fontWeight: "600" }}>{s.label}</Text>
              </View>
            );
          })()}

          {/* `appointment.notes` is not rendered here, and the web's patient
              view does not render it either. The column is written by both
              sides — the patient's own note at booking (/api/appointments) and
              the therapist's (/api/admin/appointments) — so showing it to the
              patient hands them whatever staff typed into the same field. */}

          {/* Date & Time info */}
          <Card>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: t.colors.okSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="calendar-outline" size={20} color={t.colors.ok} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Date", pt: "Data" })}</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatDate(data.dateTime, lang)}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: t.colors.workSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="time-outline" size={20} color={t.colors.work} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Time", pt: "Horário" })}</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatTime(data.dateTime, lang)}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />

              {/* A consulta por vídeo, quando é uma (089 T-3).
                  A janela é conferida aqui **só para decidir o que mostrar** —
                  quem autoriza é o servidor, e ele confere de novo. Fora da hora
                  a linha continua dizendo que a consulta é por vídeo, em vez de
                  sumir: saber o formato importa antes da hora, e mais que na
                  hora. */}
              {/* Cancelada nao oferece entrada. O servidor ja recusa com
    `not_scheduled`, mas um botao verde ao lado da tarja vermelha
    "Cancelada" e a tela contradizendo a si mesma. */}
                  {data.mode === "VIDEO" && data.status !== "CANCELLED" && data.status !== "NO_SHOW" && (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: t.colors.healthSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="videocam-outline" size={20} color={t.colors.health} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="caption" color={t.colors.textMuted}>
                        {tr(lang, { en: "Format", pt: "Formato" })}
                      </Text>
                      <Text variant="label" style={{ fontWeight: "600" }}>
                        {tr(lang, { en: "Video consultation", pt: "Consulta por vídeo" })}
                      </Text>
                    </View>
                  </View>

                  {janelaAberta(data.dateTime, data.duration) ? (
                    <Pressable
                      onPress={() => router.push(`/(app)/(clinica)/consulta-video?id=${data.id}` as never)}
                      accessibilityRole="button"
                      testID="entrar-na-consulta"
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: t.colors.health,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="videocam" size={18} color={t.colors.accentFg} />
                      <Text variant="label" color={t.colors.accentFg} style={{ fontWeight: "700" }}>
                        {tr(lang, { en: "Join the consultation", pt: "Entrar na consulta" })}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text variant="caption" color={t.colors.textMuted}>
                      {tr(lang, {
                        en: "You can join from ten minutes before the start time.",
                        pt: "Você pode entrar a partir de dez minutos antes do horário.",
                      })}
                    </Text>
                  )}

                  <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />
                </>
              )}

              {/* O pagamento, e a confirmacao que vem com ele (101 T-3).

                  O Bruno: *"o paciente vai ter que pagar e fazer a confirmacao
                  do agendamento. No pagamento ja e a confirmacao"*. A consulta
                  marcada pela clinica chegava aqui sem dizer que esperava
                  alguma coisa, e sem botao nenhum.

                  As quatro situacoes moram em `lib/pagamento-da-consulta`, num
                  lugar so — a lista faz a mesma pergunta. */}
              {(() => {
                const estado = estadoDoPagamento(data);
                if (estado === "resolvido") return null;
                const texto = TEXTO_DO_PAGAMENTO[estado][lang === "pt" ? "pt" : "en"];
                const esperaCartao = estado === "espera_cartao";
                return (
                  <>
                    <View
                      style={{
                        gap: 10,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: esperaCartao ? t.colors.warnSoft : t.colors.surfaceMuted,
                        borderWidth: 1,
                        borderColor: esperaCartao ? t.colors.warn : t.colors.borderSubtle,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons
                          name={esperaCartao ? "card-outline" : "checkmark-circle-outline"}
                          size={20}
                          color={esperaCartao ? t.colors.warn : t.colors.textMuted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text variant="label" style={{ fontWeight: "700" }}>{texto.titulo}</Text>
                          <Text variant="caption" color={t.colors.textMuted}>{texto.corpo}</Text>
                        </View>
                      </View>

                      {esperaCartao && (
                        <Pressable
                          testID="pagar-consulta"
                          accessibilityRole="button"
                          disabled={pagando}
                          onPress={pagar}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            paddingVertical: 14,
                            borderRadius: 12,
                            backgroundColor: t.colors.health,
                            opacity: pressed || pagando ? 0.7 : 1,
                          })}
                        >
                          <Ionicons name="lock-closed" size={16} color={t.colors.accentFg} />
                          <Text variant="label" color={t.colors.accentFg} style={{ fontWeight: "700" }}>
                            {pagando
                              ? tr(lang, { en: "Opening…", pt: "Abrindo…" })
                              : tr(lang, {
                                  en: `Pay £${data.price} and confirm`,
                                  pt: `Pagar £${data.price} e confirmar`,
                                })}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />
                  </>
                );
              })()}

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: t.colors.warnSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="hourglass-outline" size={20} color={t.colors.warn} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Duration", pt: "Duração" })}</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{data.duration} {tr(lang, { en: "minutes", pt: "minutos" })}</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
}

/**
 * Gated on `mod_appointments` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function AppointmentDetail() {
  return (
    <PlanGate module="mod_appointments">
      <AppointmentDetailScreen />
    </PlanGate>
  );
}
