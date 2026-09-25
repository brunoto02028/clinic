import { useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { LoadFailure } from "@/components/LoadFailure";
import { NonEmergencyNotice } from "@/components/NonEmergencyNotice";
import { formatDate } from "@/lib/format";
import {
  fetchBloodPressure,
  saveBloodPressure,
  bpBand,
  type BpBand, bpNeedsAttentionNow} from "@/api/blood-pressure";

function Field({
  label, value, onChangeText, placeholder, suffix,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; suffix?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textMuted}
          keyboardType="number-pad"
          maxLength={3}
          style={{
            flex: 1, padding: 12, borderRadius: 12,
            backgroundColor: t.colors.surfaceMuted,
            borderWidth: 1, borderColor: t.colors.borderSubtle,
            color: t.colors.text, fontSize: 18, textAlign: "center",
          }}
        />
        {suffix ? (
          <Text variant="caption" color={t.colors.textMuted}>{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function BloodPressureScreen() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["blood-pressure"],
    queryFn: () => fetchBloodPressure(30),
  });

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");

  /**
   * Cinco faixas cabiam em três cores, e as duas colisões eram justamente as
   * que importam: `elevated` era igual a `stage1`, e **`crisis` era pixel a
   * pixel igual a `stage2`** — 180/120 com a mesma aparência de 140/90.
   *
   * Agora cada faixa tem a sua, a crise fica em texto branco sobre vermelho
   * cheio (é a única que grita, e deve gritar sozinha), e a hipotensão entra
   * com a cor do pilar Work, que é o azul da identidade — a web já pinta de
   * azul, e baixo não é uma versão mais fraca de alto.
   */
  const BAND: Record<BpBand, { label: string; color: string; bg: string }> = {
    low: { label: tr(lang, { en: "Low", pt: "Baixa" }), color: t.colors.work, bg: t.colors.workSoft },
    normal: { label: tr(lang, { en: "Normal", pt: "Normal" }), color: t.colors.ok, bg: t.colors.okSoft },
    elevated: { label: tr(lang, { en: "Elevated", pt: "Elevada" }), color: t.colors.warn, bg: t.colors.warnSoft },
    stage1: { label: tr(lang, { en: "Stage 1", pt: "Estágio 1" }), color: t.colors.bad, bg: t.colors.badSoft },
    stage2: { label: tr(lang, { en: "Stage 2", pt: "Estágio 2" }), color: "#FFFFFF", bg: t.colors.bad },
    crisis: { label: tr(lang, { en: "Crisis", pt: "Crise" }), color: "#FFFFFF", bg: "#8C2F22" },
  };

  const sys = parseInt(systolic, 10);
  const dia = parseInt(diastolic, 10);
  // The same rules the route enforces, checked before the request so the
  // patient is told here rather than by a 400 they cannot read.
  const invalid =
    !systolic || !diastolic ||
    Number.isNaN(sys) || Number.isNaN(dia) ||
    sys < 50 || sys > 300 || dia < 30 || dia > 200 || dia >= sys;

  const save = useMutation({
    mutationFn: () => saveBloodPressure({
      systolic: sys,
      diastolic: dia,
      heartRate: heartRate ? parseInt(heartRate, 10) : null,
    }),
    onSuccess: () => {
      // A liberação do treino é derivada da pressão que acabou de ser salva; sem
      // isto a tela de exercícios continuava mostrando o veredito anterior até
      // o app ser reaberto (auditoria de paridade, F5).
      qc.invalidateQueries({ queryKey: ["blood-pressure"] });
      qc.invalidateQueries({ queryKey: ["exercise-clearance"] });
      setSystolic(""); setDiastolic(""); setHeartRate("");
    },
    onError: (e) => Alert.alert(
      tr(lang, { en: "Error", pt: "Erro" }),
      (e as Error).message || tr(lang, { en: "We could not save that reading.", pt: "Não foi possível salvar a leitura." }),
    ),
  });

  const readings = data ?? [];
  const latest = readings[0];

  return (
    <Screen scroll testID="blood-pressure-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Blood pressure", pt: "Pressão arterial" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 16 }}>
        <Text variant="body" color={t.colors.textSecondary}>
          {tr(lang, {
            en: "Record a reading from your monitor. Your therapist sees these with the rest of your record.",
            pt: "Registre a leitura do seu aparelho. Seu terapeuta vê junto com o resto do seu prontuário.",
          })}
        </Text>

        {/* Latest */}
        {latest && (
          <Card variant="highlight">
            <Text variant="caption" color={t.colors.textSecondary}>
              {tr(lang, { en: "Most recent", pt: "Mais recente" })}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 }}>
              <Text variant="title" style={{ fontSize: 34 }}>
                {latest.systolic}/{latest.diastolic}
              </Text>
              <Text variant="caption" color={t.colors.textMuted} style={{ marginBottom: 8 }}>mmHg</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{
                backgroundColor: BAND[bpBand(latest.systolic, latest.diastolic)].bg,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
              }}>
                <Text variant="caption" style={{ fontWeight: "700", fontSize: 10, color: BAND[bpBand(latest.systolic, latest.diastolic)].color }}>
                  {BAND[bpBand(latest.systolic, latest.diastolic)].label}
                </Text>
              </View>
              <Text variant="caption" color={t.colors.textSecondary}>
                {formatDate(latest.measuredAt, lang)}
              </Text>
            </View>

            {/* A crise dizia o que precisava dizer num selo de 10px, do mesmo
                tamanho de "Normal". A web mostra um bloco de aviso e manda
                procurar atendimento; o app dava a mesma informação num
                sussurro. Um número que pede ação agora não pode ter o formato
                de um número que pede registro. */}
            {bpNeedsAttentionNow(bpBand(latest.systolic, latest.diastolic)) && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: "#8C2F22",
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "flex-start",
                }}
                accessibilityRole="alert"
              >
                <Ionicons name="warning" size={18} color="#FFFFFF" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                    {tr(lang, {
                      en: "Hypertensive crisis",
                      pt: "Crise hipertensiva",
                    })}
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 18, marginTop: 2 }}>
                    {tr(lang, {
                      en: "Do not wait for your therapist. Call 999 if you feel unwell, or 111 for urgent advice.",
                      pt: "Não espere seu terapeuta. Ligue 999 se estiver passando mal, ou 111 para orientação urgente.",
                    })}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* New reading */}
        <Card>
          <Text variant="label" style={{ fontWeight: "600", marginBottom: 10 }}>
            {tr(lang, { en: "New reading", pt: "Nova leitura" })}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field
              label={tr(lang, { en: "Systolic", pt: "Sistólica" })}
              value={systolic} onChangeText={setSystolic} placeholder="120"
            />
            <Field
              label={tr(lang, { en: "Diastolic", pt: "Diastólica" })}
              value={diastolic} onChangeText={setDiastolic} placeholder="80"
            />
            <Field
              label={tr(lang, { en: "Pulse", pt: "Pulso" })}
              value={heartRate} onChangeText={setHeartRate} placeholder="70"
            />
          </View>
          {systolic && diastolic && invalid ? (
            <Text variant="caption" color={t.colors.danger} style={{ marginTop: 8 }}>
              {tr(lang, {
                en: "Check the numbers: the lower value must be smaller than the upper one.",
                pt: "Confira os números: o valor menor precisa ser menor que o maior.",
              })}
            </Text>
          ) : null}
          <View style={{ marginTop: 12 }}>
            <Button
              title={tr(lang, { en: "Save reading", pt: "Salvar leitura" })}
              variant="health"
              onPress={() => save.mutate()}
              loading={save.isPending}
              disabled={invalid || save.isPending}
            />
          </View>
        </Card>

        {/* Quem acabou de ver um número alto precisa saber, aqui, que ninguém
            está olhando em tempo real (activity 074, T-13). */}
        <NonEmergencyNotice />

        {/* History */}
        <View style={{ gap: 8 }}>
          <Text variant="label" style={{ fontWeight: "600" }}>
            {tr(lang, { en: "Last 30 days", pt: "Últimos 30 dias" })}
          </Text>
          {isLoading ? (
            <Spinner center />
          ) : isError ? (
            <LoadFailure error={error} onRetry={() => refetch()} />
          ) : readings.length === 0 ? (
            <Card>
              <View style={{ alignItems: "center", gap: 10, paddingVertical: 20 }}>
                <Ionicons name="pulse-outline" size={40} color={t.colors.textMuted} />
                <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
                  {tr(lang, {
                    en: "No readings yet. The first one you save appears here.",
                    pt: "Nenhuma leitura ainda. A primeira que você salvar aparece aqui.",
                  })}
                </Text>
              </View>
            </Card>
          ) : (
            readings.map((r) => {
              const band = BAND[bpBand(r.systolic, r.diastolic)];
              return (
                <Card key={r.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>
                        {r.systolic}/{r.diastolic} mmHg
                        {r.heartRate ? ` · ${r.heartRate} bpm` : ""}
                      </Text>
                      <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 2 }}>
                        {formatDate(r.measuredAt, lang)}
                        {/* Where it was taken, and — when it was the clinic's
                            own cuff — whether it was before or after the
                            session. Home and clinic readings share this list,
                            so the patient is told which is which. */}
                        {r.source === "CLINIC_DEVICE" || r.recordedById
                          ? ` · ${tr(lang, { en: "taken at the clinic", pt: "medida na clínica" })}`
                          : r.source === "PATIENT_DEVICE"
                            ? ` · ${tr(lang, { en: "from your device", pt: "do seu aparelho" })}`
                            : ""}
                        {r.source === "CLINIC_DEVICE" && r.context === "PRE_SESSION"
                          ? ` (${tr(lang, { en: "before the session", pt: "antes da sessão" })})`
                          : r.source === "CLINIC_DEVICE" && r.context === "POST_SESSION"
                            ? ` (${tr(lang, { en: "after the session", pt: "depois da sessão" })})`
                            : ""}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: band.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Text variant="caption" style={{ fontWeight: "700", fontSize: 10, color: band.color }}>
                        {band.label}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </View>
    </Screen>
  );
}
