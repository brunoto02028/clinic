import { useState } from "react";
import { View, Pressable, Alert, TextInput, Linking } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDependentes, type Dependente } from "@/api/dependents";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { bookAppointment, fetchAvailability, fetchSchedule, fetchBookingOptions, startAppointmentCheckout, fetchTreatmentTypes, type DetailedSlot, type ClinicTreatmentType, type FormatoDaConsulta } from "@/api/booking";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";
import { useAuth } from "@/store/auth";
import { zonedTimeToUtc } from "@/lib/clinic-timezone";
import { openCheckout } from "@/lib/checkout";
import { ApiError } from "@/api/client";
import { CouponField, PrecoComCupom } from "@/components/CouponField";
import { CalendarioDeAgenda } from "@/components/CalendarioDeAgenda";
import { fetchAppointments } from "@/api/appointments";
import type { CouponPreviewOk } from "@/api/coupons";

function BookAppointmentScreen() {
  const lang = useLang();
  /**
   * Com quem, quando a pessoa veio do catalogo (102 T-5).
   *
   * Ausente e o caminho de sempre: a reabilitacao. Quem confere se este id
   * pode ser marcado e o servidor — a tela so o carrega.
   */
  const { professionalId } = useLocalSearchParams<{ professionalId?: string }>();
  const comProfissional = typeof professionalId === "string" ? professionalId : null;
  const clinicName = useAuth((s) => s.user?.clinicName ?? null);
  const t = useTheme();
  const qc = useQueryClient();
  const [type, setType] = useState<string | null>(null);
  /**
   * O formato pedido (098 T-2). `IN_PERSON` é o padrão e não é pedido nenhum
   * — é o que acontece quando ninguém pede nada.
   */
  const [formato, setFormato] = useState<FormatoDaConsulta>("IN_PERSON");
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

  /**
   * Os formatos que dá para pedir agora.
   *
   * Do tipo de tratamento quando há um; da clínica quando não há — que é o caso
   * normal aqui, porque o tratamento nasce personalizado depois da avaliação.
   */
  /** O tratamento escolhido — e quem decide quais formatos existem (098). */
  const tipoEscolhido =
    (tipos.data ?? []).find((tt: ClinicTreatmentType) => tt.name === type) ?? null;

  /**
   * Os formatos que dá para pedir agora — do tipo, ou da clínica.
   *
   * Quando existe tipo de tratamento, manda ele: eletroterapia não vira vídeo,
   * e isso é por tratamento. Quando não existe — o caso normal desta clínica —
   * quem responde é a clínica, pela porta de agendamento.
   */
  const formatosDisponiveis: FormatoDaConsulta[] = tipoEscolhido
    ? ((tipoEscolhido.formats ?? ["IN_PERSON"]) as FormatoDaConsulta[])
    : ((porta?.formats ?? ["IN_PERSON"]) as FormatoDaConsulta[]);

  const schedule = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });
  // Which days the clinic opens is not something to guess at. When the schedule
  // fails to load, or comes back with no open day at all, `closedDays` was `[]`
  // and this screen offered all fourteen — Sunday included, at a clinic that
  // shuts on Sunday. The patient picked one, waited, and got "No times
  // available". The web says so up front instead, and now so does this.
  const scheduleKnown = schedule.isSuccess && (schedule.data?.length ?? 0) > 0;
  // O dia fechado deixou de ser filtrado aqui: quem diz que um dia não abre
  // agora é o servidor, dia a dia, junto com o motivo — e ele sabe de feriado e
  // de folga, que uma lista de dias da semana no cliente nunca soube.

  /**
   * O que eu já tenho marcado, para o calendário mostrar junto das vagas
   * (095 T-8).
   *
   * Cancelada não conta: o dia volta a estar livre, e marcar uma barrinha nele
   * faria a pessoa achar que já tem compromisso onde não tem.
   */
  const minhas = useQuery({ queryKey: ["appointments"], queryFn: fetchAppointments });
  const meusDias = (minhas.data ?? [])
    .filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW")
    .map((a) => {
      const d = new Date(a.dateTime);
      return {
        // Data local, nunca `toISOString()`: ele devolve UTC, e uma consulta
        // das 00h30 cairia no dia anterior na grade.
        data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        porVideo: a.mode === "VIDEO",
      };
    });

  const availability = useQuery({
    queryKey: ["availability", selectedDate, janela, comProfissional],
    queryFn: () => fetchAvailability(selectedDate!, janela, comProfissional),
    enabled: !!selectedDate && !!porta?.kind,
  });

  const slots = availability.data?.slots ?? [];
  const detalhados = availability.data?.detailedSlots ?? [];
  const vagasDe = (hora: string) => detalhados.find((s: DetailedSlot) => s.time === hora)?.spacesLeft ?? null;

  // O cupom aplicado nesta tela (084). `null` é o caso normal: quem não
  // digita nada paga o preço da 082.
  const [cupom, setCupom] = useState<CouponPreviewOk | null>(null);

  /**
   * Para quem é esta consulta (089/091).
   *
   * `null` é "para mim", e é o padrão — quem marca para si mesmo não deve ter de
   * escolher nada. A lista só aparece para quem de fato cuida de alguém.
   *
   * Até agora dava para **comprar exame** para uma filha e não dava para marcar
   * consulta: nem esta tela nem a rota conheciam dependente. A mãe cadastrava a
   * filha e ficava presa na metade do caminho.
   */
  const [paraQuem, setParaQuem] = useState<string | null>(null);
  const geridas = useQuery({ queryKey: ["dependentes"], queryFn: fetchDependentes });
  const cuidaDeAlguem = (geridas.data?.length ?? 0) > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (!type || !selectedDate || !selectedTime) throw new Error(tr(lang, { en: "Please fill in every field.", pt: "Preencha todos os campos." }));
      return bookAppointment({
        // The slot is clinic wall-clock time, not UTC. Appending "Z" made a
        // 09:00 booking arrive as 09:00Z, which the diary shows as 10:00 for
        // the seven months the UK is on BST.
        dateTime: zonedTimeToUtc(selectedDate, selectedTime).toISOString(),
        treatmentType: type,
        ...(formato !== "IN_PERSON" ? { requestedMode: formato } : {}),
        notes: notes || undefined,
        // Ausente = para mim. Quem valida o vínculo é o servidor.
        dependentId: paraQuem ?? undefined,
        // Com quem, quando veio do catálogo (102 T-5). Quem confere que este
        // profissional pode ser marcado é o servidor.
        ...(comProfissional ? { professionalId: comProfissional } : {}),
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

        {/* Para quem é a consulta (089/091).
            Antes da porta, de propósito: o preço e a opção dependem de quem vai
            ser atendido, então escolher depois seria escolher duas vezes.
            Só aparece para quem de fato cuida de alguém — quem marca para si
            mesmo não deve ter de responder uma pergunta que só tem uma resposta. */}
        {cuidaDeAlguem && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>
              {tr(lang, { en: "Who is this for?", pt: "Para quem é?" })}
            </Text>
            <View style={{ gap: 8 }}>
              <Pressable
                testID="para-mim"
                onPress={() => setParaQuem(null)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: paraQuem === null ? t.colors.health : t.colors.borderSubtle,
                  backgroundColor: paraQuem === null ? t.colors.healthSoft : "transparent",
                }}
              >
                <Ionicons
                  name={paraQuem === null ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={paraQuem === null ? t.colors.health : t.colors.textMuted}
                />
                <Text variant="body">{tr(lang, { en: "For me", pt: "Para mim" })}</Text>
              </Pressable>

              {(geridas.data ?? []).map((p: Dependente) => (
                <Pressable
                  key={p.id}
                  testID={`para-${p.id}`}
                  onPress={() => setParaQuem(p.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: paraQuem === p.id ? t.colors.health : t.colors.borderSubtle,
                    backgroundColor: paraQuem === p.id ? t.colors.healthSoft : "transparent",
                  }}
                >
                  <Ionicons
                    name={paraQuem === p.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={paraQuem === p.id ? t.colors.health : t.colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{p.firstName} {p.lastName}</Text>
                    {p.menorDeIdade && (
                      <Text variant="caption" color={t.colors.textMuted}>
                        {tr(lang, {
                          en: "A minor is always accompanied by you.",
                          pt: "Um menor está sempre acompanhado por você.",
                        })}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

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
                  /* Zerado pelo cupom não é "pago ao marcar": prometer um
                     pagamento que não vai acontecer, no lugar exato onde a
                     pessoa confere se vai pagar, é o tipo de frase que faz ela
                     desconfiar do resto (N-1 do QA das telas). */
                  cupom && cupom.final === 0
                    ? tr(lang, { en: "nothing to pay", pt: "nada a pagar" })
                    : porta.requiresPayment
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
              {(tipos.data ?? []).map((tt: ClinicTreatmentType) => {
                const rotulo = lang === "pt" ? tt.namePt || tt.name : tt.name;
                return (
                  <Pressable key={tt.id} onPress={() => { setType(tt.name); setFormato("IN_PERSON"); }} testID={`appointment-type-${tt.id}`}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: type === tt.name ? t.colors.healthSoft : t.colors.surfaceMuted, borderWidth: 1, borderColor: type === tt.name ? t.colors.health : t.colors.borderSubtle }}>
                    <Text variant="caption" color={type === tt.name ? t.colors.health : t.colors.textSecondary}>{rotulo}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* O formato — e só o que pode acontecer (098 T-2).
            Opção bloqueada **não aparece**, em vez de aparecer cinza: um botão
            que promete um caminho inexistente é pior que a ausência dele.

            Os formatos saem do tipo de tratamento quando há um, e **da
            clínica** quando não há (29/09/2026). O Bruno: *"os tipos de
            tratamento da clinic só crio personalizado depois de atender o
            paciente"* — ou seja, a primeira consulta, que é a única que o
            paciente marca sozinho, nunca tem tipo. Pendurado só no tipo, este
            seletor existia no código e era invisível na vida real. */}
        {formatosDisponiveis.length > 1 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>
              {tr(lang, { en: "Where", pt: "Onde" })}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {formatosDisponiveis.map((f) => {
                const ativo = formato === f;
                const rotulo =
                  f === "VIDEO"
                    ? tr(lang, { en: "By video", pt: "Por vídeo" })
                    : f === "HOME_VISIT"
                      ? tr(lang, { en: "At my home", pt: "Na minha casa" })
                      : tr(lang, { en: "At the clinic", pt: "Na clínica" });
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFormato(f)}
                    testID={`appointment-format-${f}`}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 18,
                      backgroundColor: ativo ? t.colors.healthSoft : t.colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: ativo ? t.colors.health : t.colors.borderSubtle,
                    }}
                  >
                    <Text variant="caption" color={ativo ? t.colors.health : t.colors.textSecondary}>
                      {rotulo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Dito **antes** de confirmar, e não depois: a pessoa precisa saber
                que está pedindo, não escolhendo. */}
            {formato !== "IN_PERSON" && (
              <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 10 }}>
                {tr(lang, {
                  en: "The clinic confirms the format. Until then, the appointment is booked at the clinic.",
                  pt: "A clínica confirma o formato. Até lá, a consulta fica marcada na clínica.",
                })}
              </Text>
            )}

            {/* Faltar endereço é diferente de o tratamento não sair da clínica:
                a primeira a pessoa resolve em trinta segundos. */}
            {(tipoEscolhido
              ? tipoEscolhido.homeVisitBlockedBy
              : porta?.homeVisitBlockedBy) === "endereco" && (
              <Pressable
                onPress={() => router.push("/profile-edit")}
                style={{ marginTop: 10 }}
                testID="book-complete-address"
              >
                <Text variant="caption" color={t.colors.health}>
                  {tr(lang, {
                    en: "Complete your address in your profile to ask for a home visit.",
                    pt: "Complete o seu endereço no perfil para pedir atendimento em casa.",
                  })}
                </Text>
              </Pressable>
            )}
          </Card>
        )}

        {/* Date */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>{tr(lang, { en: "Date", pt: "Data" })}</Text>
          {schedule.isLoading ? (
            <Spinner />
          ) : !scheduleKnown ? (
            <Text variant="caption" color={t.colors.textMuted}>
              {tr(lang, {
                en: "No available dates at the moment. Please contact the clinic.",
                pt: "Nenhuma data disponível no momento. Fale com a clínica.",
              })}
            </Text>
          ) : (
            /* Era uma tira reta de catorze dias em que **todo dia parecia
               igual**: só tocando em cada um dava para saber se havia vaga.
               Não era desleixo da tela — a rota respondia um dia por chamada
               (087, T-3). */
            <CalendarioDeAgenda
              selecionada={selectedDate}
              onEscolher={(d) => { setSelectedDate(d); setSelectedTime(null); }}
              kind={janela}
              professionalId={comProfissional}
              meusDias={meusDias}
            />
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
              {slots.map((time: string) => {
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
