import { useEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { goBackOr } from "@/lib/go-back";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { PlanGate } from "@/components/PlanGate";
import { fetchScreening, saveScreening, type ScreeningData } from "@/api/screening";
import { fetchScreeningConfig } from "@/api/screening-config";
import { useLang, t as tr, pick } from "@/lib/i18n";

const STEPS = [
  { key: "profile", label: { en: "Profile", pt: "Perfil" }, icon: "person-outline" as const },
  { key: "lifestyle", label: { en: "Lifestyle", pt: "Estilo de vida" }, icon: "heart-outline" as const },
  { key: "pain", label: { en: "Pain & complaint", pt: "Dor & Queixa" }, icon: "pulse-outline" as const },
  { key: "functional", label: { en: "Functional impact", pt: "Impacto funcional" }, icon: "walk-outline" as const },
  { key: "treatment", label: { en: "Previous treatment", pt: "Tratamento anterior" }, icon: "medical-outline" as const },
  { key: "goals", label: { en: "Goals", pt: "Objetivos" }, icon: "flag-outline" as const },
  { key: "health", label: { en: "Health history", pt: "Histórico de saúde" }, icon: "clipboard-outline" as const },
  { key: "redflags", label: { en: "Red flags", pt: "Sinais de alerta" }, icon: "warning-outline" as const },
  { key: "consent", label: { en: "Consent", pt: "Consentimento" }, icon: "shield-checkmark-outline" as const },
];

/** Yes/No for the safety questions. No pre-selected value: "not answered"
 *  must never look like "No". */
function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  const lang = useLang();
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
      {[
        { v: true, label: tr(lang, { en: "Yes", pt: "Sim" }) },
        { v: false, label: tr(lang, { en: "No", pt: "Não" }) },
      ].map(o => {
        const active = value === o.v;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.v)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: active ? t.colors.accent : t.colors.border,
              backgroundColor: active ? t.colors.accent : "transparent",
            }}
          >
            <Text variant="label" color={active ? t.colors.primaryFg : t.colors.text}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChipSelect({ options, selected, onSelect }: {
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
              backgroundColor: active ? t.colors.healthSoft : t.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: active ? t.colors.health : t.colors.borderSubtle,
            }}
          >
            <Text variant="label" color={active ? t.colors.health : t.colors.textSecondary}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScreeningScreen() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ScreeningData>({});

  const { data: existing, isLoading, isError: loadError, refetch } = useQuery({
    queryKey: ["screening"],
    queryFn: fetchScreening,
    // Um formulário sendo preenchido não pode ser sobrescrito pelo servidor.
    // Com a revalidação no foco da T-12, atender uma ligação no meio da
    // triagem apagava a etapa atual — e, pior, as red flags confirmadas
    // continuavam contadas como respondidas enquanto os valores voltavam para
    // `false`, deixando enviar "não" em perguntas que a pessoa respondeu
    // "sim". Esta tela lê o servidor uma vez e depois é dona do que tem.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Semeia **uma vez**, na primeira resposta do servidor.
  //
  // `null` is a real answer — this patient has no screening yet — and must
  // reset the form. `if (existing)` skipped it, so a form already holding
  // someone's answers kept them: with another account's screening in the
  // cache, the first autosave wrote that person's health data here.
  // `undefined` is "still loading" and leaves the form alone.
  //
  // A troca de conta continua coberta: `clearSessionCache` limpa o cache antes
  // de a identidade mudar e a tela desmonta no redirect para o login, então a
  // próxima montagem semeia de novo, do zero.
  const seeded = useRef(false);
  useEffect(() => {
    if (existing === undefined || seeded.current) return;
    seeded.current = true;
    setForm(existing ?? {});
  }, [existing]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const { data: config, isError: configError, isPending: configPending } = useQuery({
    queryKey: ["screening-config"],
    queryFn: fetchScreeningConfig,
  });

  const redFlags = (config?.redFlagQuestions ?? []).filter(q => q.enabled !== false);
  // The config carries both languages and this used to take `.pt` always, so a
  // patient whose record says en-GB was asked to tick an informed-consent they
  // could not read. Consent in a language the person does not speak is not
  // consent. Same for the red-flag questions below (`q.pt` → pick).
  const consentText = pick(lang, config?.consentText?.en, config?.consentText?.pt) || null;
  // A red flag counts as answered only once the patient taps it in this
  // session. The stored value cannot be trusted for that: the columns are
  // `Boolean @default(false)` and the screening API writes `?? false` for
  // anything a save leaves out, so a draft reopened after its first autosave
  // came back with all twelve "No" pre-selected — the warning vanished and the
  // screening could be submitted as twelve denials nobody gave. The loaded
  // value is still kept in `form` and sent back on autosave, so a real answer
  // saved on the web is never overwritten; it just has to be confirmed.
  // App-only by design: the web behaves as it always has.
  const [confirmedFlags, setConfirmedFlags] = useState<Set<string>>(() => new Set());
  const confirmFlag = (key: string, value: boolean) => {
    set(key, value);
    setConfirmedFlags(prev => new Set(prev).add(key));
  };
  const unanswered = redFlags.filter(q => !confirmedFlags.has(q.key)).length;

  // #2 — Without the config there are no questions and no consent text, and
  // `unanswered` would read 0. Submission must not be possible then: the
  // screen already says it cannot be sent without them.
  // `configPending` is not `configError`. Without it the wizard told a
  // patient the safety questions had failed to load while the request was
  // still in flight — the same loading/failure confusion fixed elsewhere.
  const configMissing = configPending || configError || redFlags.length === 0 || !consentText;

  const autosave = useMutation({
    mutationFn: () => saveScreening(form, true),
  });

  const submit = useMutation({
    // `consentGiven` comes from the form, not from here. It used to be pinned to
    // `true` to get past the route's own gate, which recorded a consent the
    // patient never gave.
    mutationFn: () => saveScreening(form, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screening"] });
      // O recém-cadastrado chega aqui por `replace`, sem histórico: um
      // `router.back()` puro não fazia nada, e a pessoa terminava nove etapas,
      // apertava Enviar e via a mesma tela, sem pista de que tinha salvo.
      goBackOr();
    },
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  if (isLoading) return <Screen><Spinner center /></Screen>;

  // Never open the wizard on a failed load. It autosaves the whole form on
  // every step, so a blank wizard shown in place of the patient's saved
  // answers would write that blank over them one step later.
  if (loadError) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 }}>
          <Ionicons name="cloud-offline-outline" size={32} color={t.colors.textMuted} />
          <Text variant="body" style={{ textAlign: "center" }}>
            {tr(lang, { en: "We could not load your assessment.", pt: "Não foi possível carregar sua avaliação." })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
            {tr(lang, {
              en: "Opening it now could erase what you have already answered.",
              pt: "Abrir agora poderia apagar o que você já respondeu.",
            })}
          </Text>
          <Button title={tr(lang, { en: "Try again", pt: "Tentar de novo" })} variant="health" size="sm" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="screening-screen">
      <Stack.Screen
        options={{
          headerShown: true, title: tr(lang, { en: "Assessment", pt: "Avaliação" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text, headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 20 }}>
        {/* Progress */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {/* The header already says "Assessment"; repeating it here read as
                "Assessment Assessment". The step is what this row is for. */}
            <Text variant="subtitle">{tr(lang, STEPS[step].label)}</Text>
            <Text variant="caption" color={t.colors.textSecondary}>{step + 1} / {STEPS.length}</Text>
          </View>
          <View style={{ height: 4, backgroundColor: t.colors.borderSubtle, borderRadius: 2 }}>
            <View style={{ height: 4, width: `${progress}%`, backgroundColor: t.colors.health, borderRadius: 2 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {STEPS.map((s, i) => (
              <Pressable key={s.key} onPress={() => { autosave.mutate(); setStep(i); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: i === step ? t.colors.healthSoft : "transparent" }}>
                <Ionicons name={s.icon} size={14} color={i <= step ? t.colors.health : t.colors.textMuted} />
                <Text variant="caption" color={i === step ? t.colors.health : t.colors.textMuted} style={{ fontSize: 11 }}>{tr(lang, s.label)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Card variant="highlight">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={t.colors.health} />
            <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }}>
              {tr(lang, {
                en: "Reviewed by a healthcare professional. Your data is protected and saved automatically.",
                pt: "Revisado por profissional de saúde. Seus dados são protegidos e salvos automaticamente.",
              })}
            </Text>
          </View>
        </Card>

        {/* Step 0: Profile */}
        {step === 0 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Patient profile", pt: "Perfil do paciente" })}</Text>
            <Input label={tr(lang, { en: "Occupation", pt: "Ocupação" })} value={form.occupation ?? ""} onChangeText={v => set("occupation", v)} placeholder={tr(lang, { en: "e.g. Developer", pt: "Ex: Desenvolvedor" })} />
            <Text variant="label" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>{tr(lang, { en: "Dominant hand", pt: "Mão dominante" })}</Text>
            <ChipSelect options={[{ value: "Right", label: tr(lang, { en: "Right", pt: "Direita" }) }, { value: "Left", label: tr(lang, { en: "Left", pt: "Esquerda" }) }, { value: "Both", label: tr(lang, { en: "Both", pt: "Ambas" }) }]} selected={form.dominantSide ?? null} onSelect={v => set("dominantSide", v)} />
            <Text variant="label" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>{tr(lang, { en: "Dominant foot", pt: "Pé dominante" })}</Text>
            <ChipSelect options={[{ value: "Right", label: tr(lang, { en: "Right", pt: "Direito" }) }, { value: "Left", label: tr(lang, { en: "Left", pt: "Esquerdo" }) }, { value: "Both", label: tr(lang, { en: "Both", pt: "Ambos" }) }]} selected={form.dominantFootSide ?? null} onSelect={v => set("dominantFootSide", v)} />
            <Text variant="label" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>{tr(lang, { en: "Activity level", pt: "Nível de atividade" })}</Text>
            <ChipSelect options={[{ value: "Sedentary", label: tr(lang, { en: "Sedentary", pt: "Sedentário" }) }, { value: "Lightly active", label: tr(lang, { en: "Light", pt: "Leve" }) }, { value: "Moderately active", label: tr(lang, { en: "Moderate", pt: "Moderado" }) }, { value: "Very active", label: tr(lang, { en: "Very active", pt: "Muito ativo" }) }]} selected={form.activityLevel ?? null} onSelect={v => set("activityLevel", v)} />
            <Input label={tr(lang, { en: "Hobbies & sports", pt: "Hobbies & esportes" })} value={form.hobbiesSports ?? ""} onChangeText={v => set("hobbiesSports", v)} placeholder={tr(lang, { en: "e.g. Running, swimming...", pt: "Ex: Corrida, natação..." })} style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Step 1: Lifestyle */}
        {step === 1 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Lifestyle", pt: "Estilo de vida" })}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Input label={tr(lang, { en: "Height (cm)", pt: "Altura (cm)" })} value={form.height ?? ""} onChangeText={v => set("height", v)} keyboardType="number-pad" placeholder="175" /></View>
              <View style={{ flex: 1 }}><Input label={tr(lang, { en: "Weight (kg)", pt: "Peso (kg)" })} value={form.weight ?? ""} onChangeText={v => set("weight", v)} keyboardType="number-pad" placeholder="70" /></View>
            </View>
            {/* The column is a Boolean: the chip used to send "no"/"yes"/"ex" and the
                save blew up. "Ex-smoker" is gone because the record cannot tell it
                apart from "non-smoker" — inventing a third state here would be a lie. */}
            <ChipSelect
              options={[{ value: "no", label: tr(lang, { en: "Non-smoker", pt: "Não fumante" }) }, { value: "yes", label: tr(lang, { en: "Smoker", pt: "Fumante" }) }]}
              selected={form.smoker === true ? "yes" : form.smoker === false ? "no" : null}
              onSelect={v => set("smoker", v === "yes")}
            />
          </Card>
        )}

        {/* Step 2: Pain */}
        {step === 2 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Pain & main complaint", pt: "Dor & Queixa principal" })}</Text>
            <Input label={tr(lang, { en: "Main complaint", pt: "Queixa principal" })} value={form.chiefComplaint ?? ""} onChangeText={v => set("chiefComplaint", v)} placeholder={tr(lang, { en: "Describe your complaint...", pt: "Descreva sua queixa..." })} multiline style={{ minHeight: 60, textAlignVertical: "top" }} />
            <Input label={tr(lang, { en: "Pain location", pt: "Local da dor" })} value={form.painLocation ?? ""} onChangeText={v => set("painLocation", v)} placeholder={tr(lang, { en: "e.g. Lower back, right knee...", pt: "Ex: Lombar, joelho direito..." })} />
            <Input label={tr(lang, { en: "How long for", pt: "Há quanto tempo" })} value={form.painDuration ?? ""} onChangeText={v => set("painDuration", v)} placeholder={tr(lang, { en: "e.g. 3 months", pt: "Ex: 3 meses" })} />
            <Input label={tr(lang, { en: "What makes it worse", pt: "O que piora" })} value={form.painAggravating ?? ""} onChangeText={v => set("painAggravating", v)} placeholder={tr(lang, { en: "e.g. Sitting for a long time", pt: "Ex: Ficar sentado muito tempo" })} />
            <Input label={tr(lang, { en: "What makes it better", pt: "O que alivia" })} value={form.painRelieving ?? ""} onChangeText={v => set("painRelieving", v)} placeholder={tr(lang, { en: "e.g. Ice, rest", pt: "Ex: Gelo, descanso" })} />
          </Card>
        )}

        {/* Step 3: Functional impact */}
        {step === 3 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Functional impact", pt: "Impacto funcional" })}</Text>
            <Input label={tr(lang, { en: "Functional limitations", pt: "Limitações funcionais" })} value={form.functionalLimitations ?? ""} onChangeText={v => set("functionalLimitations", v)} placeholder={tr(lang, { en: "What can you no longer do?", pt: "O que você não consegue fazer?" })} multiline style={{ minHeight: 60, textAlignVertical: "top" }} />
            {[
              { key: "sleepAffected", label: tr(lang, { en: "Does it affect your sleep?", pt: "Afeta o sono?" }) },
              { key: "workAffected", label: tr(lang, { en: "Does it affect your work?", pt: "Afeta o trabalho?" }) },
              { key: "mobilityAffected", label: tr(lang, { en: "Does it affect your mobility?", pt: "Afeta a mobilidade?" }) },
            ].map(item => (
              <Pressable key={item.key} onPress={() => set(item.key, !form[item.key])}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: form[item.key] ? t.colors.health : t.colors.border, backgroundColor: form[item.key] ? t.colors.healthSoft : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {form[item.key] && <Ionicons name="checkmark" size={16} color={t.colors.health} />}
                </View>
                <Text variant="body" color={t.colors.textSecondary}>{item.label}</Text>
              </Pressable>
            ))}
          </Card>
        )}

        {/* Step 4: Previous treatment */}
        {step === 4 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Previous treatment", pt: "Tratamento anterior" })}</Text>
            <ChipSelect options={[{ value: "yes", label: tr(lang, { en: "Yes, I had therapy", pt: "Sim, fiz terapia" }) }, { value: "no", label: tr(lang, { en: "No", pt: "Não" }) }]} selected={form.previousPhysio ? "yes" : form.previousPhysio === false ? "no" : null} onSelect={v => set("previousPhysio", v === "yes")} />
            {form.previousPhysio && <Input label={tr(lang, { en: "Details", pt: "Detalhes" })} value={form.previousPhysioDetails ?? ""} onChangeText={v => set("previousPhysioDetails", v)} placeholder={tr(lang, { en: "When, where, outcome...", pt: "Quando, onde, resultado..." })} multiline style={{ minHeight: 60, textAlignVertical: "top" }} />}
          </Card>
        )}

        {/* Step 5: Goals */}
        {step === 5 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Your goals", pt: "Seus objetivos" })}</Text>
            <Input label={tr(lang, { en: "What do you hope to achieve?", pt: "O que espera alcançar?" })} value={form.treatmentGoals ?? ""} onChangeText={v => set("treatmentGoals", v)} placeholder={tr(lang, { en: "e.g. Run again without pain...", pt: "Ex: Voltar a correr sem dor..." })} multiline style={{ minHeight: 80, textAlignVertical: "top" }} />
          </Card>
        )}

        {/* Step 6: Health history */}
        {step === 6 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Health history", pt: "Histórico de saúde" })}</Text>
            <Input label={tr(lang, { en: "Current medication", pt: "Medicamentos atuais" })} value={form.currentMedications ?? ""} onChangeText={v => set("currentMedications", v)} placeholder={tr(lang, { en: "e.g. Ibuprofen 400mg", pt: "Ex: Ibuprofeno 400mg" })} />
            <Input label={tr(lang, { en: "Allergies", pt: "Alergias" })} value={form.allergies ?? ""} onChangeText={v => set("allergies", v)} placeholder={tr(lang, { en: "e.g. Penicillin", pt: "Ex: Penicilina" })} />
            <Input label={tr(lang, { en: "Previous surgery", pt: "Cirurgias anteriores" })} value={form.surgicalHistory ?? ""} onChangeText={v => set("surgicalHistory", v)} placeholder={tr(lang, { en: "e.g. Knee arthroscopy 2020", pt: "Ex: Artroscopia joelho 2020" })} />
            <Input label={tr(lang, { en: "Other conditions", pt: "Outras condições" })} value={form.otherConditions ?? ""} onChangeText={v => set("otherConditions", v)} placeholder={tr(lang, { en: "e.g. Diabetes, hypertension...", pt: "Ex: Diabetes, hipertensão..." })} />
          </Card>
        )}

        {/* Step 7: Red flags — as perguntas de segurança, vindas do config da clínica */}
        {step === 7 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 4 }}>{tr(lang, { en: "Red flags", pt: "Sinais de alerta" })}</Text>
            <Text variant="caption" color={t.colors.textSecondary} style={{ marginBottom: 16 }}>
              {tr(lang, { en: "Please answer honestly. These questions exist for your safety during treatment.", pt: "Responda com honestidade. Estas perguntas existem para a sua segurança durante o tratamento." })}
            </Text>

            {configPending ? (
              <Spinner />
            ) : configError || redFlags.length === 0 ? (
              <Text variant="caption" color={t.colors.danger}>
                {tr(lang, {
                  en: "We could not load the safety questions. Please try again later — the assessment cannot be submitted without them.",
                  pt: "Não foi possível carregar as perguntas de segurança. Tente novamente mais tarde — a avaliação não pode ser enviada sem elas.",
                })}
              </Text>
            ) : (
              redFlags.map(q => (
                <View key={q.key} style={{ marginBottom: 18 }}>
                  <Text variant="body">{pick(lang, q.en, q.pt)}</Text>
                  <YesNo
                    value={confirmedFlags.has(q.key) ? (form[q.key] as boolean) : undefined}
                    onChange={v => confirmFlag(q.key, v)}
                  />
                </View>
              ))
            )}
          </Card>
        )}

        {/* Step 8: Consentimento */}
        {step === 8 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>{tr(lang, { en: "Consent", pt: "Consentimento" })}</Text>

            {configPending ? (
              <Spinner />
            ) : consentText ? (
              <>
                <Pressable
                  onPress={() => set("consentGiven", !form.consentGiven)}
                  style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 24, height: 24, borderRadius: 6, marginTop: 2,
                      borderWidth: 1.5,
                      borderColor: form.consentGiven ? t.colors.accent : t.colors.border,
                      backgroundColor: form.consentGiven ? t.colors.accent : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {form.consentGiven ? <Ionicons name="checkmark" size={16} color={t.colors.primaryFg} /> : null}
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>{consentText}</Text>
                </Pressable>

                {unanswered > 0 && (
                  <Text variant="caption" color={t.colors.danger} style={{ marginTop: 16 }}>
                    {lang === "pt"
                      ? `Faltam ${unanswered} ${unanswered === 1 ? "pergunta" : "perguntas"} de segurança. Volte à etapa anterior antes de enviar.`
                      : `${unanswered} safety ${unanswered === 1 ? "question is" : "questions are"} still unanswered. Go back a step before submitting.`}
                  </Text>
                )}
              </>
            ) : (
              <Text variant="caption" color={t.colors.danger}>
                {tr(lang, {
                  en: "We could not load the consent text. The assessment cannot be submitted without it.",
                  pt: "Não foi possível carregar o termo de consentimento. A avaliação não pode ser enviada sem ele.",
                })}
              </Text>
            )}
          </Card>
        )}

        {/* Navigation */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {step > 0 && (
            <Pressable onPress={() => { autosave.mutate(); setStep(s => s - 1); }}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border }}>
              <Ionicons name="chevron-back" size={16} color={t.colors.accent} />
              <Text variant="label" color={t.colors.accent}>{tr(lang, { en: "Back", pt: "Anterior" })}</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Button
              variant="health"
              // Nove etapas de dado clínico e o toque final não dava retorno
              // nenhum: `submit.isPending` existia e ninguém lia. Dois toques
              // viravam dois POST.
              loading={step === STEPS.length - 1 && submit.isPending}
              title={step < STEPS.length - 1
                ? tr(lang, { en: "Next", pt: "Próximo" })
                : tr(lang, { en: "Submit assessment", pt: "Enviar avaliação" })}
              // Mirrors the web, which disables submission without consent. Here it
              // covers the safety questions too: submitting without them would
              // record a "No" the patient never gave.
              disabled={step === STEPS.length - 1 && (configMissing || !form.consentGiven || unanswered > 0)}
              onPress={() => {
                if (step < STEPS.length - 1) { autosave.mutate(); setStep(s => s + 1); }
                else submit.mutate();
              }}
              icon={<Ionicons name={step < STEPS.length - 1 ? "chevron-forward" : "checkmark"} size={16} color={t.colors.accentFg} />}
            />
          </View>
        </View>

        {submit.isError && (
          <Text variant="caption" color={t.colors.danger} style={{ textAlign: "center" }}>
            {(submit.error as Error)?.message
              || tr(lang, { en: "Could not submit.", pt: "Erro ao enviar." })}
          </Text>
        )}
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_screening` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function Screening() {
  return (
    <PlanGate module="mod_screening">
      <ScreeningScreen />
    </PlanGate>
  );
}
