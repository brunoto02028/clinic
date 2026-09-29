import { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, AppState } from "react-native";
import { Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
/**
 * Pelo módulo da casa, e não pelo pacote direto: ele arrasta o WebRTC nativo,
 * que quebra ao carregar no navegador — e derruba o app inteiro, porque o
 * `expo-router` importa todas as rotas na abertura. Ver `src/lib/daily-nativo.ts`.
 */
import Daily, {
  DailyMediaView,
  type DailyCall,
  type DailyEvent,
  type DailyParticipant,
} from "@/lib/daily-nativo";
import { Text, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { entrarNaConsulta, NaoDeuParaEntrar } from "@/api/video";

/**
 * A consulta por vídeo, **dentro do app** (089 T-3).
 *
 * ## Por que o SDK, e não um navegador
 *
 * O Bruno: *"quero a videochamada dentro do app"*. Abrir a sala no navegador de
 * dentro do app seria mais barato — nenhuma dependência nativa, nenhum build —
 * mas numa consulta clínica é justamente onde um WebView falha: roteamento de
 * áudio (alto-falante × fone), o app indo para segundo plano, e reconexão
 * depois de uma queda de rede. Numa conversa entre terapeuta e paciente, áudio
 * que sai no fone quando deveria sair no alto-falante é a chamada inteira.
 *
 * Isto custou quatro dependências nativas e **exige um build novo**. As
 * permissões de câmera e microfone já existiam no `app.json`, então não é
 * capability nova — o provisioning não precisa ser regenerado.
 *
 * ## O que esta tela decide, e o que ela não decide
 *
 * Ela não decide **nada** sobre quem entra. Pede ao servidor, e ele responde com
 * a sala e um token preso a esta pessoa e à janela do horário — ou recusa, com o
 * motivo. Um botão escondido continuaria sendo uma requisição que alguém pode
 * fazer à mão.
 */

const UI = {
  en: {
    title: "Video consultation",
    joining: "Joining…",
    waiting: "Waiting for the other person to join…",
    leave: "Leave",
    leaveAsk: "Leave the consultation?",
    micOn: "Mute",
    micOff: "Unmute",
    camOn: "Turn camera off",
    camOff: "Turn camera on",
    flip: "Flip camera",
    tryAgain: "Try again",
    back: "Go back",
    reconnecting: "Connection lost — reconnecting…",
  },
  pt: {
    title: "Consulta por vídeo",
    joining: "Entrando…",
    waiting: "Esperando a outra pessoa entrar…",
    leave: "Sair",
    leaveAsk: "Sair da consulta?",
    micOn: "Desligar o microfone",
    micOff: "Ligar o microfone",
    camOn: "Desligar a câmera",
    camOff: "Ligar a câmera",
    flip: "Virar a câmera",
    tryAgain: "Tentar de novo",
    back: "Voltar",
    reconnecting: "Conexão caiu — reconectando…",
  },
} as const;

export default function ConsultaVideo() {
  const t = useTheme();
  const lang = useLang();
  const ui = UI[lang];
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const chamada = useRef<DailyCall | null>(null);
  const [estado, setEstado] = useState<"entrando" | "na-chamada" | "reconectando" | "erro">("entrando");
  const [erro, setErro] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<Record<string, DailyParticipant>>({});
  const [micLigado, setMicLigado] = useState(true);
  const [camLigada, setCamLigada] = useState(true);

  const sair = useCallback(async () => {
    const c = chamada.current;
    chamada.current = null;
    if (c) {
      // `leave` antes de `destroy`: destruir sem sair deixa a outra pessoa
      // olhando para um participante fantasma até o servidor expirar a sessão.
      await c.leave().catch(() => {});
      await c.destroy().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        const entrada = await entrarNaConsulta(String(id));
        if (!vivo) return;

        const c = Daily.createCallObject();
        chamada.current = c;

        const atualizar = () => {
          if (!vivo) return;
          setParticipantes({ ...c.participants() });
        };

        const eventos: DailyEvent[] = [
          "participant-joined",
          "participant-updated",
          "participant-left",
        ];
        for (const e of eventos) c.on(e, atualizar);

        c.on("joined-meeting", () => {
          if (!vivo) return;
          setEstado("na-chamada");
          atualizar();
        });

        // Queda de rede não é erro: é uma pausa. Dizer "erro" faria a pessoa
        // sair de uma chamada que ia voltar sozinha.
        c.on("network-connection", (ev: any) => {
          if (!vivo) return;
          if (ev?.event === "interrupted") setEstado("reconectando");
          if (ev?.event === "connected") setEstado("na-chamada");
        });

        c.on("error", (ev: any) => {
          if (!vivo) return;
          setErro(ev?.errorMsg || "A chamada caiu.");
          setEstado("erro");
        });

        await c.join({ url: entrada.url, token: entrada.token });
      } catch (e) {
        if (!vivo) return;
        // `e.texto(lang)`: a escolha do idioma e da tela, que e quem sabe qual e.
        setErro(
          e instanceof NaoDeuParaEntrar
            ? e.texto(lang)
            : tr(lang, { en: "Could not join the consultation.", pt: "Não foi possível entrar na consulta." })
        );
        setEstado("erro");
      }
    })();

    return () => {
      vivo = false;
      void sair();
    };
  }, [id, sair]);

  /**
   * O app indo para segundo plano desliga a câmera, e só ela.
   *
   * Sem isto, a câmera continua transmitindo com o telefone no bolso ou com a
   * pessoa lendo outra coisa — a outra ponta vê o teto, ou pior. O microfone
   * fica, porque numa consulta é comum olhar outra tela e continuar falando.
   */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      const c = chamada.current;
      if (!c) return;
      if (s !== "active") c.setLocalVideo(false);
      else if (camLigada) c.setLocalVideo(true);
    });
    return () => sub.remove();
  }, [camLigada]);

  const eu = Object.values(participantes).find((p) => p.local);
  const outro = Object.values(participantes).find((p) => !p.local);

  if (estado === "erro") {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, padding: 24, justifyContent: "center", gap: 16 }}>
        <Stack.Screen options={{ title: ui.title }} />
        <Text variant="body" style={{ textAlign: "center" }}>
          {erro}
        </Text>
        <Button title={ui.back} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ title: ui.title, headerShown: false }} />

      {/* A outra pessoa ocupa a tela; eu fico no canto. É a consulta que
          importa, não a própria imagem. */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {outro?.videoTrack ? (
          <DailyMediaView
            videoTrack={outro.videoTrack || null}
            audioTrack={outro.audioTrack || null}
            mirror={false}
            objectFit="cover"
            style={{ flex: 1, width: "100%" }}
          />
        ) : (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Spinner />
            <Text variant="body" color="#FFF">
              {estado === "entrando" ? ui.joining : estado === "reconectando" ? ui.reconnecting : ui.waiting}
            </Text>
          </View>
        )}
      </View>

      {eu?.videoTrack && (
        <View
          style={{
            position: "absolute",
            top: 56,
            right: 16,
            width: 104,
            height: 148,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#111",
          }}
        >
          <DailyMediaView videoTrack={eu.videoTrack || null} audioTrack={null} mirror objectFit="cover" style={{ flex: 1 }} />
        </View>
      )}

      {/* Os controles ficam grandes e no rodapé: numa chamada, a pessoa procura
          "desligar" com pressa, e um alvo pequeno é o pior lugar para isso. */}
      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <Botao
          icone={micLigado ? "mic" : "mic-off"}
          rotulo={micLigado ? ui.micOn : ui.micOff}
          ativo={micLigado}
          onPress={() => {
            const novo = !micLigado;
            setMicLigado(novo);
            chamada.current?.setLocalAudio(novo);
          }}
        />
        <Botao
          icone={camLigada ? "videocam" : "videocam-off"}
          rotulo={camLigada ? ui.camOn : ui.camOff}
          ativo={camLigada}
          onPress={() => {
            const novo = !camLigada;
            setCamLigada(novo);
            chamada.current?.setLocalVideo(novo);
          }}
        />
        <Botao
          icone="camera-reverse"
          rotulo={ui.flip}
          ativo
          onPress={() => void chamada.current?.cycleCamera().catch(() => {})}
        />
        <Botao
          icone="call"
          rotulo={ui.leave}
          encerrar
          ativo
          onPress={async () => {
            await sair();
            navigation.goBack();
          }}
        />
      </View>
    </View>
  );
}

function Botao({
  icone,
  rotulo,
  ativo,
  encerrar,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  ativo: boolean;
  encerrar?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: encerrar ? "#D64545" : ativo ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.4)",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={icone}
        size={24}
        color="#FFF"
        // O ícone de encerrar aponta para baixo: é o desenho que todo mundo já
        // lê como "desligar", e numa chamada não é hora de aprender símbolo.
        style={encerrar ? { transform: [{ rotate: "135deg" }] } : undefined}
      />
    </Pressable>
  );
}
