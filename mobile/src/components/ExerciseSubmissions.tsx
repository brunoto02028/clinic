import { useState } from "react";
import { View, Pressable, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { explainDeniedPermission } from "@/lib/ask-permission";
import { SubmissionVideo } from "@/components/SubmissionVideo";
import {
  fetchSubmissions,
  uploadSubmission,
  deleteSubmission,
  type ExerciseSubmission,
} from "@/api/exercise-submissions";

/**
 * "Mostre como você faz em casa."
 *
 * No atendimento híbrido ninguém vê a execução, e o terapeuta corrige o que não
 * viu. Aqui o paciente grava um minuto do próprio exercício, e o retorno volta
 * preso àquele envio — não numa conversa solta.
 *
 * **O limite é dito antes de gravar.** O gravador do iPhone para sozinho no
 * tempo combinado, então a pessoa vê o limite acontecer em vez de descobrir,
 * depois do esforço, que o arquivo não serve.
 *
 * **E dá para rever o que se mandou**: quem acabou de gravar o próprio
 * exercício precisa conferir se pegou o movimento inteiro, e depois rever a
 * execução ao lado da correção que o terapeuta escreveu. O arquivo é privado,
 * então o player leva a credencial — ver `SubmissionVideo`.
 */
export function ExerciseSubmissions({ prescriptionId }: { prescriptionId: string }) {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const caminho = usePathname();
  const [enviando, setEnviando] = useState(false);
  // Um player por vez. Vários montados na mesma tela disputam áudio e memória,
  // e ninguém assiste dois vídeos ao mesmo tempo.
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["exercise-submissions", prescriptionId],
    queryFn: () => fetchSubmissions(prescriptionId),
  });

  const maxSegundos = data?.maxDurationSeconds ?? 60;
  const envios = data?.submissions ?? [];

  const apagar = useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercise-submissions", prescriptionId] }),
    onError: (e: any) =>
      Alert.alert(
        tr(lang, { en: "Could not remove", pt: "Não foi possível remover" }),
        e?.message ||
          tr(lang, { en: "Try again.", pt: "Tente de novo." })
      ),
  });

  const gravar = async (origem: "camera" | "galeria") => {
    const permissao =
      origem === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      explainDeniedPermission(permissao, origem === "camera" ? "camera" : "library", lang, caminho);
      return;
    }

    const opcoes = {
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      // O gravador do próprio sistema para aqui. É o limite virando
      // comportamento, em vez de virar recusa depois.
      videoMaxDuration: maxSegundos,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    } as const;

    const r =
      origem === "camera"
        ? await ImagePicker.launchCameraAsync(opcoes as any)
        : await ImagePicker.launchImageLibraryAsync(opcoes as any);
    if (r.canceled || !r.assets[0]) return;

    const a = r.assets[0];
    const segundos = a.duration != null ? a.duration / 1000 : null;

    // Vídeo escolhido da galeria não passou pelo gravador, então pode vir
    // maior. Recusado aqui, com o motivo, em vez de subir para voltar 400.
    if (segundos != null && segundos > maxSegundos + 1) {
      Alert.alert(
        tr(lang, { en: "Video too long", pt: "Vídeo muito longo" }),
        tr(lang, {
          en: `Send up to ${maxSegundos} seconds. Record a shorter one, or trim this one first.`,
          pt: `Envie até ${maxSegundos} segundos. Grave um mais curto, ou corte este antes.`,
        })
      );
      return;
    }

    setEnviando(true);
    try {
      await uploadSubmission({
        uri: a.uri,
        name: a.fileName ?? `exercicio-${Date.now()}.mp4`,
        mimeType: a.mimeType ?? "video/mp4",
        exercisePrescriptionId: prescriptionId,
        durationSeconds: segundos,
      });
      await qc.invalidateQueries({ queryKey: ["exercise-submissions", prescriptionId] });
    } catch (e: any) {
      Alert.alert(
        tr(lang, { en: "Could not send", pt: "Não foi possível enviar" }),
        // A razão do servidor quando ele dá uma: "muito longo" é acionável,
        // "não foi possível" não é.
        e?.message || tr(lang, { en: "Try again.", pt: "Tente de novo." })
      );
    } finally {
      setEnviando(false);
    }
  };

  const escolher = () => {
    Alert.alert(
      tr(lang, { en: "Show how you do it", pt: "Mostre como você faz" }),
      tr(lang, {
        en: `Record up to ${maxSegundos} seconds. Your therapist watches it and replies here.`,
        pt: `Grave até ${maxSegundos} segundos. Seu terapeuta assiste e responde aqui.`,
      }),
      [
        { text: tr(lang, { en: "Record now", pt: "Gravar agora" }), onPress: () => void gravar("camera") },
        { text: tr(lang, { en: "Choose a video", pt: "Escolher um vídeo" }), onPress: () => void gravar("galeria") },
        { text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const confirmarApagar = (s: ExerciseSubmission) =>
    Alert.alert(
      tr(lang, { en: "Remove this video?", pt: "Remover este vídeo?" }),
      tr(lang, {
        en: "Your therapist has not replied to it yet.",
        pt: "Seu terapeuta ainda não respondeu a ele.",
      }),
      [
        { text: tr(lang, { en: "Keep", pt: "Manter" }), style: "cancel" },
        {
          text: tr(lang, { en: "Remove", pt: "Remover" }),
          style: "destructive",
          onPress: () => apagar.mutate(s.id),
        },
      ],
      { cancelable: true }
    );

  return (
    <Card>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="videocam-outline" size={18} color={t.colors.health} />
          <Text variant="label">
            {tr(lang, { en: "Show how you do it", pt: "Mostre como você faz" })}
          </Text>
        </View>

        <Text variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 17 }}>
          {tr(lang, {
            en: `Record up to ${maxSegundos} seconds of this exercise at home. Your therapist watches it and replies here.`,
            pt: `Grave até ${maxSegundos} segundos deste exercício em casa. Seu terapeuta assiste e responde aqui.`,
          })}
        </Text>

        <Button
          title={
            enviando
              ? tr(lang, { en: "Sending…", pt: "Enviando…" })
              : tr(lang, { en: "Send a video", pt: "Enviar um vídeo" })
          }
          variant="health"
          size="md"
          loading={enviando}
          onPress={escolher}
          testID="exercise-submission-send"
        />

        {envios.length > 0 && (
          <View style={{ gap: 8 }}>
            {envios.map((s) => (
              <View
                key={s.id}
                style={{
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons
                    name={s.reviewedAt ? "checkmark-circle" : "time-outline"}
                    size={15}
                    color={s.reviewedAt ? t.colors.ok : t.colors.textSecondary}
                  />
                  <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }}>
                    {new Date(s.submittedAt).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                    {s.durationSeconds ? ` · ${Math.round(s.durationSeconds)}s` : ""}
                  </Text>

                  {/* Apagar só enquanto ninguém comentou: um vídeo já
                      respondido faz parte do registro. */}
                  {!s.reviewedAt && (
                    <Pressable
                      onPress={() => confirmarApagar(s)}
                      accessibilityRole="button"
                      accessibilityLabel={tr(lang, { en: "Remove", pt: "Remover" })}
                      hitSlop={10}
                      style={{ padding: 4 }}
                    >
                      {apagar.isPending ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Ionicons name="trash-outline" size={15} color={t.colors.textSecondary} />
                      )}
                    </Pressable>
                  )}
                </View>

                {abertoId === s.id ? (
                  <SubmissionVideo id={s.id} kind={s.kind} />
                ) : (
                  <Pressable
                    onPress={() => setAbertoId(s.id)}
                    accessibilityRole="button"
                    accessibilityLabel={tr(lang, { en: "Watch", pt: "Assistir" })}
                    testID="exercise-submission-play"
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}
                  >
                    <Ionicons
                      name={s.kind === "PHOTO" ? "image-outline" : "play-circle-outline"}
                      size={18}
                      color={t.colors.health}
                    />
                    <Text variant="caption" color={t.colors.health}>
                      {s.kind === "PHOTO"
                        ? tr(lang, { en: "See the photo", pt: "Ver a foto" })
                        : tr(lang, { en: "Watch what you sent", pt: "Assistir o que você mandou" })}
                    </Text>
                  </Pressable>
                )}

                {s.reviewedAt ? (
                  s.reviewNote ? (
                    <Text variant="body" style={{ fontSize: 13, lineHeight: 19 }}>
                      {s.reviewNote}
                    </Text>
                  ) : (
                    <Text variant="caption" color={t.colors.ok}>
                      {tr(lang, {
                        en: "Your therapist watched it — nothing to correct.",
                        pt: "Seu terapeuta assistiu — nada a corrigir.",
                      })}
                    </Text>
                  )
                ) : (
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {tr(lang, {
                      en: "Waiting for your therapist.",
                      pt: "Aguardando seu terapeuta.",
                    })}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}
