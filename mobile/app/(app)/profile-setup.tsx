import { useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { updateProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * O perfil que o laboratório exige (083).
 *
 * Quatro campos, e cada um diz **por que** existe. Nada aqui é burocracia
 * nossa: é o que a London Medical Laboratory precisa para o kit chegar, a
 * amostra ser identificada e a faixa de referência ser a certa — a de
 * ferritina, por exemplo, é diferente conforme o sexo biológico.
 *
 * Um formulário que se explica é um formulário que a pessoa termina. E dá
 * para pular: o pedido volta a pedir o que faltar, e recusar a compra sem
 * endereço é honesto — recusar o cadastro não seria.
 */
export default function ProfileSetup() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();

  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"F" | "M" | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const salvar = useMutation({
    mutationFn: () =>
      updateProfile({
        ...(dob.trim() ? { dateOfBirth: isoDate(dob) } : {}),
        ...(sex ? { sex } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: [address.trim(), postcode.trim()].filter(Boolean).join(", ") } : {}),
      } as any),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      router.replace("/(app)/(lab)/(tabs)");
    },
  });

  const Campo = ({
    rotulo, porque, children,
  }: { rotulo: string; porque: string; children: React.ReactNode }) => (
    <View style={{ gap: 4 }}>
      <Text variant="label" style={{ fontSize: 12.5 }}>{rotulo}</Text>
      <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 11, lineHeight: 15 }}>{porque}</Text>
      {children}
    </View>
  );

  return (
    <Screen scroll testID="profile-setup-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 18, paddingTop: 20 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "Your profile", pt: "Seu perfil" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 7, lineHeight: 18 }}>
            {tr(lang, {
              en: "Four fields. Each one is required by the laboratory so your kit arrives and your sample is identified.",
              pt: "Quatro campos. Cada um é exigido pelo laboratório para o kit chegar e a amostra ser identificada.",
            })}
          </Text>
        </View>

        <Card>
          <View style={{ gap: 16 }}>
            <Campo
              rotulo={tr(lang, { en: "Date of birth", pt: "Data de nascimento" })}
              porque={tr(lang, {
                en: "The laboratory uses your age to work out the reference ranges.",
                pt: "O laboratório usa a idade para calcular as faixas de referência.",
              })}
            >
              <Input value={dob} onChangeText={setDob} placeholder={tr(lang, { en: "DD / MM / YYYY", pt: "DD / MM / AAAA" })} keyboardType="numbers-and-punctuation" testID="setup-dob" />
            </Campo>

            <Campo
              rotulo={tr(lang, { en: "Biological sex", pt: "Sexo biológico" })}
              porque={tr(lang, {
                en: "Many reference ranges differ — ferritin and haemoglobin, for example.",
                pt: "Muitas faixas de referência são diferentes — ferritina e hemoglobina, por exemplo.",
              })}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["F", "M"] as const).map((v) => (
                  <Pressable
                    key={v} onPress={() => setSex(v)} testID={`setup-sex-${v}`}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                      backgroundColor: sex === v ? t.colors.healthSoft : t.colors.surface,
                      borderWidth: 1, borderColor: sex === v ? t.colors.health : t.colors.border,
                    }}
                  >
                    <Text variant="caption" color={sex === v ? t.colors.text : t.colors.textSecondary}>
                      {v === "F" ? tr(lang, { en: "Female", pt: "Feminino" }) : tr(lang, { en: "Male", pt: "Masculino" })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Campo>

            <Campo
              rotulo={tr(lang, { en: "Phone", pt: "Telefone" })}
              porque={tr(lang, {
                en: "The laboratory tells you when your sample arrives, and calls if something goes wrong with it.",
                pt: "O laboratório avisa quando a amostra chega, e liga se algo der errado com ela.",
              })}
            >
              <Input value={phone} onChangeText={setPhone} placeholder="+44 7700 900000" keyboardType="phone-pad" testID="setup-phone" />
            </Campo>

            <Campo
              rotulo={tr(lang, { en: "Delivery address", pt: "Endereço de entrega" })}
              porque={tr(lang, {
                en: "Where the kit goes. You can change it on each order.",
                pt: "É para onde o kit vai. Você pode mudar em cada pedido.",
              })}
            >
              <Input value={address} onChangeText={setAddress} placeholder="12 Harley Street, London" testID="setup-address" />
              <Input value={postcode} onChangeText={setPostcode} placeholder="W1G 9QD" autoCapitalize="characters" style={{ marginTop: 8 }} testID="setup-postcode" />
            </Campo>
          </View>
        </Card>

        <Button
          title={salvar.isPending ? tr(lang, { en: "Saving…", pt: "Salvando…" }) : tr(lang, { en: "Done", pt: "Concluir" })}
          variant="health" size="lg" testID="setup-done"
          onPress={() => salvar.mutate()} loading={salvar.isPending} disabled={salvar.isPending}
        />

        {/* Pular é honesto: o pedido volta a pedir o que faltar, e é lá que a
            falta importa. Prender a pessoa aqui seria cobrar antes da hora. */}
        <Button
          title={tr(lang, { en: "Fill this in later", pt: "Preencher depois" })}
          variant="ghost" size="md" testID="setup-skip"
          onPress={() => router.replace("/(app)/(lab)/(tabs)")}
        />
      </View>
    </Screen>
  );
}

/** `DD/MM/AAAA` para ISO. Qualquer outra coisa volta como está e o servidor recusa. */
function isoDate(v: string): string {
  const m = v.replace(/\s/g, "").match(/^(\d{2})\/?(\d{2})\/?(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
}
