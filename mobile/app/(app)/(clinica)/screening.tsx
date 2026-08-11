import { useEffect, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchScreening, saveScreening, type ScreeningData } from "@/api/screening";

const STEPS = [
  { key: "profile", label: "Perfil", icon: "person-outline" as const },
  { key: "lifestyle", label: "Estilo de vida", icon: "heart-outline" as const },
  { key: "pain", label: "Dor & Queixa", icon: "pulse-outline" as const },
  { key: "functional", label: "Impacto funcional", icon: "walk-outline" as const },
  { key: "treatment", label: "Tratamento anterior", icon: "medical-outline" as const },
  { key: "goals", label: "Objetivos", icon: "flag-outline" as const },
  { key: "health", label: "Histórico de saúde", icon: "clipboard-outline" as const },
];

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

export default function Screening() {
  const t = useTheme();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ScreeningData>({});

  const { data: existing, isLoading } = useQuery({
    queryKey: ["screening"],
    queryFn: fetchScreening,
  });

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const autosave = useMutation({
    mutationFn: () => saveScreening(form, true),
  });

  const submit = useMutation({
    mutationFn: () => saveScreening({ ...form, consentGiven: true }, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screening"] });
      router.back();
    },
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  if (isLoading) return <Screen><Spinner center /></Screen>;

  return (
    <Screen scroll testID="screening-screen">
      <Stack.Screen
        options={{
          headerShown: true, title: "Avaliação",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text, headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 20 }}>
        {/* Progress */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="subtitle">Avaliação</Text>
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
                <Text variant="caption" color={i === step ? t.colors.health : t.colors.textMuted} style={{ fontSize: 11 }}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Card variant="highlight">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={t.colors.health} />
            <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }}>
              Revisado por profissional de saúde. Seus dados são protegidos e salvos automaticamente.
            </Text>
          </View>
        </Card>

        {/* Step 0: Profile */}
        {step === 0 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Perfil do paciente</Text>
            <Input label="Ocupação" value={form.occupation ?? ""} onChangeText={v => set("occupation", v)} placeholder="Ex: Desenvolvedor" />
            <Text variant="label" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Mão dominante</Text>
            <ChipSelect options={[{ value: "Right", label: "Direita" }, { value: "Left", label: "Esquerda" }, { value: "Both", label: "Ambas" }]} selected={form.dominantSide ?? null} onSelect={v => set("dominantSide", v)} />
            <Text variant="label" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Pé dominante</Text>
            <ChipSelect options={[{ value: "Right", label: "Direito" }, { value: "Left", label: "Esquerdo" }, { value: "Both", label: "Ambos" }]} selected={form.dominantFootSide ?? null} onSelect={v => set("dominantFootSide", v)} />
            <Text variant="label" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Nível de atividade</Text>
            <ChipSelect options={[{ value: "Sedentary", label: "Sedentário" }, { value: "Lightly active", label: "Leve" }, { value: "Moderately active", label: "Moderado" }, { value: "Very active", label: "Muito ativo" }]} selected={form.activityLevel ?? null} onSelect={v => set("activityLevel", v)} />
            <Input label="Hobbies & esportes" value={form.hobbiesSports ?? ""} onChangeText={v => set("hobbiesSports", v)} placeholder="Ex: Corrida, natação..." style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Step 1: Lifestyle */}
        {step === 1 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Estilo de vida</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Input label="Altura (cm)" value={form.height ?? ""} onChangeText={v => set("height", v)} keyboardType="number-pad" placeholder="175" /></View>
              <View style={{ flex: 1 }}><Input label="Peso (kg)" value={form.weight ?? ""} onChangeText={v => set("weight", v)} keyboardType="number-pad" placeholder="70" /></View>
            </View>
            <ChipSelect options={[{ value: "no", label: "Não fumante" }, { value: "yes", label: "Fumante" }, { value: "ex", label: "Ex-fumante" }]} selected={form.smoker ?? null} onSelect={v => set("smoker", v)} />
          </Card>
        )}

        {/* Step 2: Pain */}
        {step === 2 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Dor & Queixa principal</Text>
            <Input label="Queixa principal" value={form.chiefComplaint ?? ""} onChangeText={v => set("chiefComplaint", v)} placeholder="Descreva sua queixa..." multiline style={{ minHeight: 60, textAlignVertical: "top" }} />
            <Input label="Local da dor" value={form.painLocation ?? ""} onChangeText={v => set("painLocation", v)} placeholder="Ex: Lombar, joelho direito..." />
            <Input label="Há quanto tempo" value={form.painDuration ?? ""} onChangeText={v => set("painDuration", v)} placeholder="Ex: 3 meses" />
            <Input label="O que piora" value={form.painAggravating ?? ""} onChangeText={v => set("painAggravating", v)} placeholder="Ex: Ficar sentado muito tempo" />
            <Input label="O que alivia" value={form.painRelieving ?? ""} onChangeText={v => set("painRelieving", v)} placeholder="Ex: Gelo, descanso" />
          </Card>
        )}

        {/* Step 3: Functional impact */}
        {step === 3 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Impacto funcional</Text>
            <Input label="Limitações funcionais" value={form.functionalLimitations ?? ""} onChangeText={v => set("functionalLimitations", v)} placeholder="O que você não consegue fazer?" multiline style={{ minHeight: 60, textAlignVertical: "top" }} />
            {[
              { key: "sleepAffected", label: "Afeta o sono?" },
              { key: "workAffected", label: "Afeta o trabalho?" },
              { key: "mobilityAffected", label: "Afeta a mobilidade?" },
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
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Tratamento anterior</Text>
            <ChipSelect options={[{ value: "yes", label: "Sim, fiz fisioterapia" }, { value: "no", label: "Não" }]} selected={form.previousPhysio ? "yes" : form.previousPhysio === false ? "no" : null} onSelect={v => set("previousPhysio", v === "yes")} />
            {form.previousPhysio && <Input label="Detalhes" value={form.previousPhysioDetails ?? ""} onChangeText={v => set("previousPhysioDetails", v)} placeholder="Quando, onde, resultado..." multiline style={{ minHeight: 60, textAlignVertical: "top" }} />}
          </Card>
        )}

        {/* Step 5: Goals */}
        {step === 5 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Seus objetivos</Text>
            <Input label="O que espera alcançar?" value={form.treatmentGoals ?? ""} onChangeText={v => set("treatmentGoals", v)} placeholder="Ex: Voltar a correr sem dor..." multiline style={{ minHeight: 80, textAlignVertical: "top" }} />
          </Card>
        )}

        {/* Step 6: Health history */}
        {step === 6 && (
          <Card>
            <Text variant="label" style={{ fontWeight: "600", marginBottom: 12 }}>Histórico de saúde</Text>
            <Input label="Medicamentos atuais" value={form.currentMedications ?? ""} onChangeText={v => set("currentMedications", v)} placeholder="Ex: Ibuprofeno 400mg" />
            <Input label="Alergias" value={form.allergies ?? ""} onChangeText={v => set("allergies", v)} placeholder="Ex: Penicilina" />
            <Input label="Cirurgias anteriores" value={form.surgicalHistory ?? ""} onChangeText={v => set("surgicalHistory", v)} placeholder="Ex: Artroscopia joelho 2020" />
            <Input label="Outras condições" value={form.otherConditions ?? ""} onChangeText={v => set("otherConditions", v)} placeholder="Ex: Diabetes, hipertensão..." />
          </Card>
        )}

        {/* Navigation */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {step > 0 && (
            <Pressable onPress={() => { autosave.mutate(); setStep(s => s - 1); }}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border }}>
              <Ionicons name="chevron-back" size={16} color={t.colors.accent} />
              <Text variant="label" color={t.colors.accent}>Anterior</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Button
              variant="health"
              title={step < STEPS.length - 1 ? "Próximo" : "Enviar avaliação"}
              onPress={() => {
                if (step < STEPS.length - 1) { autosave.mutate(); setStep(s => s + 1); }
                else submit.mutate();
              }}
              icon={<Ionicons name={step < STEPS.length - 1 ? "chevron-forward" : "checkmark"} size={16} color="#fff" />}
            />
          </View>
        </View>

        {submit.isError && (
          <Text variant="caption" color={t.colors.danger} style={{ textAlign: "center" }}>
            {(submit.error as Error)?.message || "Erro ao enviar."}
          </Text>
        )}
      </View>
    </Screen>
  );
}
