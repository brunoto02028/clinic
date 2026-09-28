import { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { focusManager } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, Logo } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { capability, type BiometricCapability } from "@/lib/biometrics";
import { deviceLang, t as tr } from "@/lib/i18n";

import { useTheme } from "@/theme/useTheme";
/**
 * A tranca é uma cortina, não um destino.
 *
 * Ela já foi uma rota: o guarda do `(app)` trocava o `<Stack>` inteiro por um
 * `<Redirect href="/lock" />`. Isso **desmontava o navegador**, e um `<Stack>`
 * remontado nasce com histórico vazio — ou seja, bastavam dois minutos no
 * WhatsApp para o paciente voltar e descobrir que o botão de voltar tinha
 * parado de funcionar em todas as telas. O mesmo padrão que derrubava a pilha
 * no `ModuleGuard`, e desta vez no Stack pai de tudo. Auditoria de navegação,
 * 24/09/2026.
 *
 * Como cortina, ela cobre o que existe em vez de substituí-lo: ninguém vê
 * nada, e a navegação continua exatamente onde estava quando o paciente
 * destranca.
 *
 * Duas saídas, sempre — o rosto e a senha. A segunda é o que impede a tranca
 * de virar armadilha para quem trocou de telefone ou não passa mais pelo
 * sensor.
 */
export function LockOverlay() {
  const t = useTheme();
  const status = useAuth((s) => s.status);
  const unlock = useAuth((s) => s.unlock);
  const logout = useAuth((s) => s.logout);
  const [lang] = useState(deviceLang);
  const [cap, setCap] = useState<BiometricCapability | null>(null);
  const [outcome, setOutcome] = useState<"none" | "refused" | "offline">("none");
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);
  const running = useRef(false);

  const locked = status === "locked";

  /**
   * Com as telas cobertas mas **montadas**, as consultas continuariam
   * revalidando ao voltar do segundo plano — buscando dado clínico por trás de
   * uma tranca fechada. Tirar o foco do React Query enquanto trancado é o que
   * mantém a promessa: nada do paciente é buscado antes de destrancar.
   */
  useEffect(() => {
    if (!locked) return;
    focusManager.setFocused(false);
    return () => focusManager.setFocused(true);
  }, [locked]);

  useEffect(() => {
    if (!locked) {
      asked.current = false;
      setOutcome("none");
      return;
    }
    void capability().then(setCap);
  }, [locked]);

  const attempt = useCallback(async () => {
    // `useRef`, não o state: dois toques no mesmo frame leem o mesmo `busy`
    // antigo e disparam dois prompts.
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setOutcome("none");
    try {
      const res = await unlock();
      if (res !== "ok") setOutcome(res);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [unlock]);

  // Pede o rosto sozinho ao trancar — é o que todo outro app com tranca faz.
  // Uma vez só: falhando, o botão fica lá para tentar de novo.
  useEffect(() => {
    if (!locked || cap === null || asked.current) return;
    asked.current = true;
    void attempt();
  }, [locked, cap, attempt]);

  if (!locked) return null;

  const label = cap?.label ?? { en: "biometrics", pt: "biometria" };
  const icon: keyof typeof Ionicons.glyphMap =
    cap?.kind === "face" ? "scan-outline" : "finger-print-outline";

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 20 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Logo tone="bone" height={108} />
            <Ionicons name={icon} size={44} color={t.colors.textMuted} />
            <Text
              style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: t.colors.textSecondary, textAlign: "center" }}
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
            {/* A saída. O rótulo diz o que de fato acontece: isto **encerra a
                sessão** e devolve à tela de entrada. Dizia "Entrar com a
                senha", o que soava como um atalho e apagava a sessão guardada
                sem avisar. */}
            <Pressable
              onPress={() => void logout()}
              style={{ alignItems: "center", paddingVertical: 14 }}
              testID="lock-use-password"
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11.5, color: t.colors.primaryFg }}>
                {tr(lang, { en: "Sign out and use password", pt: "Sair e entrar com a senha" })}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
