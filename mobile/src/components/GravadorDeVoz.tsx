import { useEffect, useRef, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import type { OutgoingAttachment } from "@/api/messages";

/**
 * A mensagem de voz (089).
 *
 * O Bruno: *"nas mensagens também a gente tem que ter a opção de enviar
 * mensagem de voz."*
 *
 * **Segurar, não tocar.** Um toque que começa e outro que para deixa gravação
 * acidental rodando por minutos dentro do bolso de alguém. Segurar enquanto
 * fala é o gesto que toda gente já conhece de outros aplicativos, e soltar
 * termina — sem estado pendurado.
 *
 * O áudio sai como **anexo**, não como tipo de mensagem novo: `ClinicMessage`
 * já tem `attachmentUrl`/`attachmentType`, e a voz herda o envio, o
 * armazenamento e a autenticação que já existem.
 */

/** Dois minutos. Acima disso é conversa, e conversa é consulta. */
const MAX_SEGUNDOS = 120;

export interface GravadorDeVozProps {
  onGravou: (a: OutgoingAttachment) => void;
  desabilitado?: boolean;
}

function comoRelogio(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function GravadorDeVoz({ onGravou, desabilitado }: GravadorDeVozProps) {
  const t = useTheme();
  const lang = useLang();

  const gravador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(gravador);
  const [preparando, setPreparando] = useState(false);
  /** Guarda o corte automático para poder cancelá-lo ao soltar antes. */
  const corte = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (corte.current) clearTimeout(corte.current);
    };
  }, []);

  const comecar = async () => {
    if (desabilitado || estado.isRecording || preparando) return;
    setPreparando(true);
    try {
      const permissao = await AudioModule.requestRecordingPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert(
          tr(lang, { en: "Microphone", pt: "Microfone" }),
          tr(lang, {
            en: "BPR needs the microphone to record a voice message. You can allow it in Settings.",
            pt: "O BPR precisa do microfone para gravar um recado. Você pode permitir nos Ajustes.",
          })
        );
        return;
      }
      // Sem isto o iOS grava em volume baixíssimo quando o app já tocou algo
      // antes — o modo de áudio fica no de reprodução.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await gravador.prepareToRecordAsync();
      gravador.record();
      // O corte automático existe para o caso de o dedo escorregar: sem ele,
      // um toque preso grava até a memória acabar.
      corte.current = setTimeout(() => void terminar(), MAX_SEGUNDOS * 1000);
    } catch {
      Alert.alert(
        tr(lang, { en: "Could not record", pt: "Não foi possível gravar" }),
        tr(lang, { en: "Try again in a moment.", pt: "Tente de novo em instantes." })
      );
    } finally {
      setPreparando(false);
    }
  };

  const terminar = async () => {
    if (corte.current) {
      clearTimeout(corte.current);
      corte.current = null;
    }
    if (!estado.isRecording) return;
    try {
      await gravador.stop();
      const uri = gravador.uri;
      // Menos de um segundo é o dedo escorregando, não um recado. Mandar isso
      // enche a conversa de silêncios de meio segundo.
      if (!uri || (estado.durationMillis ?? 0) < 800) return;
      onGravou({
        uri,
        name: `recado-${Date.now()}.m4a`,
        mimeType: "audio/mp4",
      });
    } catch {
      /* uma gravação que não fecha não tem o que enviar */
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  };

  const gravando = estado.isRecording;

  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <Pressable
        onPressIn={() => void comecar()}
        onPressOut={() => void terminar()}
        disabled={desabilitado}
        accessibilityRole="button"
        accessibilityLabel={tr(lang, {
          en: "Hold to record a voice message",
          pt: "Segure para gravar um recado",
        })}
        testID="gravar-voz"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: gravando ? t.colors.bad : t.colors.surfaceMuted,
          opacity: desabilitado ? 0.4 : 1,
        }}
      >
        <Ionicons
          name="mic"
          size={20}
          color={gravando ? t.colors.accentFg : t.colors.textSecondary}
        />
      </Pressable>

      {/* O tempo só aparece gravando: fora disso é um zero parado que não diz
          nada. Aqui ele é a única prova de que o microfone está ligado. */}
      {gravando && (
        <Text variant="caption" color={t.colors.bad} style={{ fontSize: 10, fontWeight: "700" }}>
          {comoRelogio(estado.durationMillis ?? 0)}
        </Text>
      )}
    </View>
  );
}
