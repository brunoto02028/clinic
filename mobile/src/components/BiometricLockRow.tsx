import { useEffect, useState } from "react";
import { AppState, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ListItem } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { capability, prompt, type BiometricCapability } from "@/lib/biometrics";
import { lockPreference } from "@/lib/secure-storage";

/**
 * A opção de tranca biométrica no perfil.
 *
 * O rótulo não é nosso: vem do aparelho. Num iPhone com TrueDepth lê-se
 * "Face ID", num iPhone SE "Touch ID", num Android "digital". Escrever
 * "Face ID" para todo mundo mandaria metade dos pacientes procurar um botão
 * que o telefone deles não tem.
 *
 * Três estados, e o do meio é o que costuma ser esquecido:
 *  - sem sensor        → a linha nem aparece;
 *  - sensor sem cadastro → aparece desligada, dizendo o que fazer no aparelho;
 *  - pronto            → liga e desliga.
 *
 * Ligar pede o rosto na hora. É de propósito: confirma que o sensor funciona
 * para esta pessoa **antes** de a tranca começar a valer, em vez de descobrir
 * na próxima abertura que ela não consegue entrar.
 */
/**
 * O que este aparelho oferece. Fica separado da linha porque quem desenha a
 * lista precisa saber, **antes**, se ela vai existir: sem isto o item acima
 * ficava com uma borda pendurada embaixo de nada num telefone sem sensor.
 */
export function useBiometricCapability(): BiometricCapability | null {
  const [cap, setCap] = useState<BiometricCapability | null>(null);
  useEffect(() => {
    const read = () => {
      void capability().then(setCap);
    };
    read();
    // O paciente lê "configure o Face ID no aparelho", vai aos Ajustes e
    // volta. Sem reler aqui, o interruptor continuava desligado e sem
    // explicação até a tela ser desmontada e montada de novo.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") read();
    });
    return () => sub.remove();
  }, []);
  return cap;
}

export function BiometricLockRow({ cap, last }: { cap: BiometricCapability; last?: boolean }) {
  const t = useTheme();
  const lang = useLang();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void lockPreference.get().then(setOn);
  }, []);

  const name = lang === "pt" ? cap.label.pt : cap.label.en;

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const ok = await prompt(
          { en: `Enable ${cap.label.en} for BPR`, pt: `Ativar ${cap.label.pt} no BPR` },
          lang
        );
        if (!ok) return;
      }
      await lockPreference.set(next);
      setOn(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListItem
      title={tr(lang, { en: `Unlock with ${name}`, pt: `Destravar com ${name}` })}
      subtitle={
        cap.isEnrolled
          ? tr(lang, {
              en: "Ask for it when the app opens.",
              pt: "Pedir ao abrir o app.",
            })
          : tr(lang, {
              en: `Set up ${name} on your device to use this.`,
              pt: `Configure o ${name} no aparelho para usar isto.`,
            })
      }
      icon={
        <Ionicons
          name={cap.kind === "face" ? "scan-outline" : "finger-print-outline"}
          size={18}
          color={t.colors.text}
        />
      }
      right={
        <Switch
          value={on}
          onValueChange={(v) => void toggle(v)}
          disabled={!cap.isEnrolled || busy}
          testID="biometric-lock-switch"
        />
      }
      last={last}
    />
  );
}
