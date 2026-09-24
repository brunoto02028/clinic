import { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, Logo } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { capability, type BiometricCapability } from "@/lib/biometrics";
import { deviceLang, t as tr } from "@/lib/i18n";

/**
 * A tela de tranca.
 *
 * Aparece quando existe sessão guardada e o paciente ligou a biometria. Ela
 * tem duas saídas, sempre — o rosto e a senha. A segunda é o que impede a
 * tranca de virar armadilha: quem trocou de telefone, apagou a digital ou
 * simplesmente não consegue passar pelo sensor ainda entra na conta dele.
 *
 * Nada do paciente é buscado antes de destrancar: o `bootstrap` para aqui e só
 * chama o servidor depois do rosto confirmado.
 */
export default function Lock() {
  const status = useAuth((s) => s.status);
  const unlock = useAuth((s) => s.unlock);
  const logout = useAuth((s) => s.logout);
  const [lang] = useState(deviceLang);
  const [cap, setCap] = useState<BiometricCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"none" | "refused" | "offline">("none");
  const asked = useRef(false);
  const running = useRef(false);

  useEffect(() => {
    void capability().then(setCap);
  }, []);

  const attempt = useCallback(async () => {
    // `useRef`, não o state `busy`: dois toques no mesmo frame leem o mesmo
    // `busy` antigo e disparam dois prompts.
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setOutcome("none");
    try {
      const res = await unlock();
      // "ok" navega pelo efeito de status; os outros dois precisam dizer
      // coisas diferentes — sem rede não é rosto recusado, e a saída não é a
      // mesma.
      if (res !== "ok") setOutcome(res);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [unlock]);

  // Pede o rosto sozinho ao abrir — é o que o aparelho faz em todo outro app
  // com tranca, e obrigar um toque antes do prompt seria um passo a mais sem
  // motivo. Uma vez só: se falhar, o botão fica lá para tentar de novo.
  useEffect(() => {
    if (cap === null || asked.current) return;
    asked.current = true;
    void attempt();
  }, [cap, attempt]);

  useEffect(() => {
    if (status === "authenticated") router.replace("/(app)/module-select");
    if (status === "unauthenticated") router.replace("/login");
  }, [status]);

  const label = cap?.label ?? { en: "biometrics", pt: "biometria" };
  const icon: keyof typeof Ionicons.glyphMap =
    cap?.kind === "face" ? "scan-outline" : "finger-print-outline";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#20242D" }}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 20 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 20 }}>
          <Logo tone="bone" height={108} />
          <Ionicons name={icon} size={44} color="#8A8F9A" />
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#B9BDC6",
              textAlign: "center",
            }}
          >
            {outcome === "offline"
              ? tr(lang, {
                  en: "No connection. Your session is safe — try again when you are back online.",
                  pt: "Sem conexão. Sua sessão está guardada — tente de novo quando voltar a rede.",
                })
              : outcome === "refused"
              ? tr(lang, {
                  en: `Could not confirm your ${label.en}.`,
                  pt: `Não foi possível confirmar seu ${label.pt}.`,
                })
              : tr(lang, {
                  en: `Unlock with ${label.en} to continue.`,
                  pt: `Use o ${label.pt} para continuar.`,
                })}
          </Text>
        </View>

        <View style={{ gap: 14, paddingBottom: 36 }}>
          <Button
            title={
              outcome === "offline"
                ? tr(lang, { en: "Try again", pt: "Tentar de novo" })
                : tr(lang, { en: `Unlock with ${label.en}`, pt: `Destravar com ${label.pt}` })
            }
            variant="greige"
            size="lg"
            onPress={attempt}
            loading={busy}
            testID="lock-unlock"
          />
          {/* A saída. Sem ela, um sensor que parou de funcionar tranca a
              pessoa para fora da própria conta. */}
          <Pressable
            onPress={() => void logout()}
            style={{ alignItems: "center", paddingVertical: 14 }}
            testID="lock-use-password"
          >
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11.5, color: "#FFFFFF" }}>
              {tr(lang, { en: "Sign in with password", pt: "Entrar com a senha" })}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
