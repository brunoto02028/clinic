import { useState } from "react";
import { View, Pressable, ScrollView, Alert, TextInput, Linking } from "react-native";
import { Stack, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { bookAppointment, fetchAvailability, fetchSchedule, fetchBookingOptions, startAppointmentCheckout, fetchTreatmentTypes } from "@/api/booking";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr, type Lang } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { useAuth } from "@/store/auth";
import { zonedTimeToUtc } from "@/lib/clinic-timezone";
import { openCheckout } from "@/lib/checkout";
import { ApiError } from "@/api/client";
import { CouponField, PrecoComCupom } from "@/components/CouponField";
import type { CouponPreviewOk } from "@/api/coupons";

function generateDates(closedDays: number[], lang: Lang): { label: string; value: string; day: string; date: number }[] {
  const dates = [];
  // Weekday initials in the patient's language, not a hardcoded Portuguese
  // list — the app is read in English by most of these patients.
  const dayNames = lang === "pt"
    ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (closedDays.includes(d.getDay())) continue;
    dates.push({
      label: d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" }),
      // Local parts, not `toISOString()`: the chip is labelled from `getDate()`
      // in the phone's own timezone, and the value was being taken from UTC.
      // In BST a patient opening this between midnight and 01:00 got a value
      // one day BEFORE the chip they tapped; west of UTC it lands one day
      // after. The booking then went to the wrong day.
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: dayNames[d.getDay()],
      date: d.getDate(),
    });
  }
  return dates;
}

function BookAppointmentScreen() {
  const lang = useLang();
  const clinicName = useAuth((s) => s.user?.clinicName ?? null);
  const t = useTheme();
  const qc = useQueryClient();
  const [type, setType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  /**
   * Qual porta este paciente atravessa: primeira consulta, sessão do pacote
   * que ele já comprou, ou sessão extra. **O servidor decide** — só ele sabe
   * se há sessão sobrando, se a triagem foi feita e quanto custa. A tela é o
   * reflexo, nunca a decisão (atividade 080).
   */
  const opcao = useQuery({ queryKey: ["booking-options"], queryFn: fetchBookingOptions });
  const porta = opcao.data;
  const janela = porta?.kind === "FIRST_CONSULTATION" ? "CONSULTATION" : porta?.kind ? "TREATMENT" : undefined;

  // Os tratamentos desta clínica (082): a lista de "Tipo de consulta" deixou
  // de ser escrita no código e passou a ser o que a clínica cadastrou.
  const tipos = useQuery({ queryKey: ["treatment-types"], queryFn: fetchTreatmentTypes });

  const schedule = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });
  // Which days the clinic opens is not something to guess at. When the schedule
  // fails to load, or comes back with no open day at all, `closedDays` was `[]`
  // and this screen offered all fourteen — Sunday included, at a clinic that
  // shuts on Sunday. The patient picked one, waited, and got "No times
  // available". The web says so up front instead, and now so does this.
  const scheduleKnown = schedule.isSuccess && (schedule.data?.length ?? 0) > 0;
  const closedDays = (schedule.data ?? []).filter(d => d.closed).map(d => d.dayOfWeek);
  const dates = scheduleKnown ? generateDates(closedDays, lang) : [];

  const availability = useQuery({
    queryKey: ["availability", selectedDate, janela],
    queryFn: () => fetchAvailability(selectedDate!, janela),
    enabled: !!selectedDate && !!porta?.kind,
  });

  const slots = availability.data?.slots ?? [];
  const detalhados = availability.data?.detailedSlots ?? [];
  const vagasDe = (hora: string) => detalhados.find((s) => s.time === hora)?.spacesLeft ?? null;

  // O cupom aplicado nesta tela (084). `null` é o caso normal: quem não
  // digita nada paga o preço da 082.
  const [cupom, setCupom] = useState<CouponPreviewOk | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!type || !selectedDate || !selectedTime) throw new Error(tr(lang, { en: "Please fill in every field.", pt: "Preencha todos os campos." }));
      return bookAppointment({
        // The slot is clinic wall-clock time, not UTC. Appending "Z" made a
        // 09:00 booking arrive as 09:00Z, which the diary shows as 10:00 for
        // the seven months the UK is on BST.
        dateTime: zonedTimeToUtc(selectedDate, selectedTime).toISOString(),
        treatmentType: type,
        notes: notes || undefined,
      });
    },
    onSuccess: async (res: any) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["booking-options"] });

      // Quando o horário só vale depois de pago, o Checkout abre numa folha
      // **dentro do app** e fecha sozinha ao voltar (083) — antes, `openURL`
      // entregava a pessoa ao Safari no meio do pagamento. A consulta já
      // existe, mas **não** está confirmada: quem confirma é o webhook, quando
      // o dinheiro entra. Se a pessoa fechar a folha, o horário não fica preso.
      if (porta?.requiresPayment && res?.appointment?.id) {
        try {
          // O **código**, não o valor: o servidor recalcula antes de cobrar.
          const url = await startAppointmentCheckout(res.appointment.id, cupom?.code ?? null);
          if (url) {
            await openCheckout(url);
            router.replace("/(app)/(clinica)/(tabs)/appointments");
            return;
          }
        } catch (e) {
          /**
           * A recusa do cupom tem de chegar **inteira** à pessoa.
           *
           * Este `catch` engolia tudo e dizia "marcado, ainda não pago — abra
           * Consultas para pagar", numa tela que não tem botão de pagar. Quem
           * digitou um código expirado ficava com uma consulta pendente e nenhuma
           * pista do motivo (achado do review das correções, 26/09/2026).
           *
           * Agora o motivo do servidor aparece, no idioma do aparelho, e a frase
           * diz o que fazer: tirar o código e marcar de novo.
           */
          const cupomRecusado =
            e instanceof ApiError && (e.code === "coupon_rejected" || e.code === "amount_too_small");
          if (cupomRecusado) {
            Alert.alert(
              tr(lang, { en: "That code did not apply", pt: "Esse código não valeu" }),
              `${(e as ApiError).localizada(lang)}

${tr(lang, {
                en: "Your slot is held. Remove the code and confirm again to pay the normal price.",
                pt: "Seu horário está reservado. Remova o código e confirme de novo para pagar o preço normal.",
              })}`
            );
            router.replace("/(app)/(clinica)/(tabs)/appointments");
            return;
          }
          Alert.alert(
            tr(lang, { en: "Booked, not paid yet", pt: "Marcado, ainda não pago" }),
            tr(lang, {
              en: "Your slot is held as pending. Open Appointments to pay and confirm it.",
              pt: "Seu horário ficou pendente. Abra Consultas para pagar e confirmar.",
            })
          );
          router.replace("/(app)/(clinica)/(tabs)/appointments");
          return;
        }
      }

      const dateObj = new Date(`${selectedDate}T12:00:00`);
      const locale = lang === "pt" ? "pt-BR" : "en-GB";
      const weekday = dateObj.toLocaleDateString(locale, { weekday: "short" });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString(locale, { month: "long" });
      const formattedDateTime = `${weekday} ${day} ${month} · ${selectedTime}`;

      router.replace({
        pathname: "/(app)/(clinica)/booking-confirmed",
        params: {
          serviceName: type ?? "",
          dateTime: formattedDateTime,
          // The patient's own clinic, from their session — this was the string
          // "Ipswich clinic", shown to every tenant. The address is still not
          // available to the app; the confirmation omits it rather than
          // inventing one.
          location: clinicName ?? "",
        },
      });
    },
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message || tr(lang, { en: "We could not book that.", pt: "Não foi possível agendar." })),
  });

  return (
    <Screen scroll testID="book-appointment-screen">
      <Stack.Screen
        options={{ headerShown: true, title: tr(lang, { en: "Book", pt: "Agendar" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 20 }}>
        <Text variant="title">{tr(lang, { en: "Book an appointment", pt: "Agendar Consulta" })}</Text>

        {/* A porta, antes de tudo. Sem isto o paciente descobria o preço
            depois de escolher o horário — ou descobria, pior ainda, que nem
            podia marcar. */}
        {opcao.isLoading ? (
          <Card><Spinner /></Card>
        ) : porta?.blockedReason === "screening_required" ? (
          <Card>
            <View style={{ gap: 10 }}>
              <Text variant="label">
                {tr(lang, { en: "Your screening comes first", pt: "Sua triagem vem antes" })}
              </Text>
              <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 18 }}>
                {tr(lang, {
                  en: "Your clinic needs your health questionnaire before your first appointment. It takes a few minutes.",
                  pt: "Sua clínica precisa do seu questionário de saúde antes da primeira consulta. Leva poucos minutos.",
                })}
              </Text>
              <Button
                title={tr(lang, { en: "Fill it in", pt: "Preencher" })}
                variant="health"
                size="md"
                onPress={() => router.push("/(app)/(clinica)/screening")}
                testID="booking-screening-cta"
              />
            </View>
          </Card>
        ) : porta?.blockedReason === "price_not_set" ? (
          /* A clínica não precificou isto. Antes, este caso virava £60
             inventados na tela do paciente — um número que ninguém escolheu. */
          <Card>
            <View style={{ gap: 10 }}>
              <Text variant="label">
                {tr(lang, { en: "Booking is not open yet", pt: "A marcação ainda não está aberta" })}
              </Text>
              <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 18 }}>
                {tr(lang, {
                  en: "Your clinic has not set the price for this yet. Send them a message and they will sort it out.",
                  pt: "Sua clínica ainda não definiu o preço disto. Mande uma mensagem e eles resolvem.",
                })}
              </Text>
              <Button
                title={tr(lang, { en: "Message the clinic", pt: "Falar com a clínica" })}
                variant="health"
                size="md"
                onPress={() => router.push("/(app)/(clinica)/messages")}
                testID="booking-price-not-set-cta"
              />
            </View>
          </Card>
        ) : porta?.kind === "PACKAGE_SESSION" ? (
          <Card>
            <Text variant="label">
              {tr(lang, { en: "Session from your package", pt: "Sessão do seu pacote" })}
            </Text>
            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
              {porta.sessionsRemaining == null
                ? tr(lang, { en: "Nothing to pay.", pt: "Nada a pagar." })
                : tr(lang, {
                    en: `${porta.sessionsRemaining} of ${porta.sessionsIncluded} left. Nothing to pay.`,
                    pt: `Restam ${porta.sessionsRemaining} de ${porta.sessionsIncluded}. Nada a pagar.`,
                  })}
            </Text>
          </Card>
        ) : porta?.kind ? (
          <Card>
            <Text variant="label">
              {porta.kind === "FIRST_CONSULTATION"
                ? tr(lang, { en: "First consultation", pt: "Primeira consulta" })
                : tr(lang, { en: "Extra session", pt: "Sessão extra" })}
            </Text>
            <View style={{ marginTop: 4, gap: 10 }}>
              <PrecoComCupom
                currency={porta.currency}
                original={porta.price}
                cupom={cupom}
                suffix={
                  porta.requiresPayment
                    ? tr(lang, { en: "paid when you book", pt: "pago ao marcar" })
                    : tr(lang, { en: "added to your invoice", pt: "entra na sua fatura" })
                }
              />
              {/* Só onde há o que descontar: numa sessão do pacote não há nada
                  a pagar, e oferecer cupom ali seria oferecer desconto no nada. */}
              {porta.price > 0 && (
                <CouponField
                  scope={porta.kind === "FIRST_CONSULTATION" ? "CONSULTATION" : "TREATMENT_SESSION"}
                  onChange={setCupom}
                />
              )}
            </View>
          </Card>
        ) : null}

        {/* Tipo — o que ESTA clínica oferece, não sete nomes escritos no
            código. Sem tratamento cadastrado a seção não existe: a consulta
            é marcada do mesmo jeito, e o servidor põe o rótulo. */}
        {(tipos.data ?? []).length > 0 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>{tr(lang, { en: "Appointment type", pt: "Tipo de consulta" })}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(tipos.data ?? []).map((tt) => {
                const rotulo = lang === "pt" ? tt.namePt || tt.name : tt.name;
                return (
                  <Pressable key={tt.id} onPress={() => setType(tt.name)} testID={`appointment-type-${tt.id}`}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: type === tt.name ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: type === tt.name ? t.colors.health : t.colors.borderSubtle }}>
                    <Text variant="caption" color={type === tt.name ? t.colors.health : t.colors.textSecondary}>{rotulo}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* Date */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>{tr(lang, { en: "Date", pt: "Data" })}</Text>
          {schedule.isLoading ? (
            <Spinner />
          ) : dates.length === 0 ? (
            <Text variant="caption" color={t.colors.textMuted}>
              {tr(lang, {
                en: "No available dates at the moment. Please contact the clinic.",
                pt: "Nenhuma data disponível no momento. Fale com a clínica.",
              })}
            </Text>
          ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dates.map(d => (
              <Pressable key={d.value} onPress={() => { setSelectedDate(d.value); setSelectedTime(null); }}
                style={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: selectedDate === d.value ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: selectedDate === d.value ? t.colors.health : t.colors.borderSubtle }}>
                <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 10 }}>{d.day}</Text>
                <Text variant="subtitle" color={selectedDate === d.value ? t.colors.health : t.colors.text} style={{ fontSize: 18 }}>{d.date}</Text>
              </Pressable>
            ))}
          </ScrollView>
          )}
        </Card>

        {/* Time */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>{tr(lang, { en: "Time", pt: "Horário" })}</Text>
          {!selectedDate ? (
            <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "Pick a date first.", pt: "Selecione uma data primeiro." })}</Text>
          ) : availability.isLoading ? (
            <Spinner />
          ) : slots.length === 0 ? (
            <Text variant="caption" color={t.colors.textMuted}>{tr(lang, { en: "No times available on this date.", pt: "Sem horários disponíveis nesta data." })}</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {slots.map(time => {
                // Quantas vagas restam naquele horário — e **nunca** quem
                // ocupa as outras. Quem está na sala é assunto da clínica.
                const vagas = vagasDe(time);
                return (
                <Pressable key={time} onPress={() => setSelectedTime(time)}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: selectedTime === time ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: selectedTime === time ? t.colors.health : t.colors.borderSubtle }}>
                  <Text variant="label" color={selectedTime === time ? t.colors.health : t.colors.textSecondary}>{time}</Text>
                  {vagas != null && vagas > 0 && (
                    <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 11, marginTop: 1 }}>
                      {vagas === 1
                        ? tr(lang, { en: "1 space", pt: "1 vaga" })
                        : tr(lang, { en: `${vagas} spaces`, pt: `${vagas} vagas` })}
                    </Text>
                  )}
                </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {/* Notes */}
        <View style={{ gap: 4 }}>
          <Text variant="label">{tr(lang, { en: "Notes (optional)", pt: "Observações (opcional)" })}</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder={tr(lang, { en: "Anything else we should know…", pt: "Alguma informação adicional..." })} placeholderTextColor={t.colors.textMuted} multiline style={{ padding: 12, borderRadius: 12, backgroundColor: t.colors.surfaceMuted, borderWidth: 1, borderColor: t.colors.borderSubtle, color: t.colors.text, fontSize: 14, minHeight: 60, textAlignVertical: "top" }} />
        </View>

        {/* Submit */}
        <Button
          variant="health"
          title={mutation.isPending
            ? tr(lang, { en: "Booking...", pt: "Agendando..." })
            : tr(lang, { en: "Confirm booking", pt: "Confirmar agendamento" })}
          onPress={() => mutation.mutate()}
          disabled={!type || !selectedDate || !selectedTime}
          loading={mutation.isPending}
          size="lg"
        />
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_appointments` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function BookAppointment() {
  return (
    <PlanGate module="mod_appointments">
      <BookAppointmentScreen />
    </PlanGate>
  );
}
