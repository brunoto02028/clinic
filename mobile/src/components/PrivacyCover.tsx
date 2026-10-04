import { useEffect, useRef, useState } from "react";
import { themes } from "@/theme";
import { AppState, View } from "react-native";
import { Logo } from "@/components/ui";
import { lockIsActive, biometriaEmAndamento } from "@/lib/biometrics";

/**
 * A cortina que o multitarefa fotografa.
 *
 * O iOS tira um print do app quando ele deixa de ser o app ativo, e é esse
 * print que aparece no seletor de apps — para sempre, até a próxima vez. A
 * re-tranca acontece **depois**, na volta, então sem isto a última tela do
 * prontuário ficava lá, visível para quem pegasse o telefone. Era exatamente
 * o caso que a tranca existe para cobrir.
 *
 * Por isso a cortina sobe de forma **síncrona** no evento, sem esperar
 * promessa nenhuma: o print acontece em seguida, e um `await` no meio perderia
 * a corrida. O que é assíncrono — se a tranca está armada neste aparelho —
 * fica pré-calculado num ref, atualizado toda vez que o app volta.
 *
 * Só cobre quem ligou a tranca. Para os demais, o print do multitarefa é o que
 * eles esperam ver.
 */
export function PrivacyCover() {
  const [covered, setCovered] = useState(false);
  const armed = useRef(false);
  // O app já esteve aberto alguma vez nesta execução?
  //
  // No iOS a abertura passa por `inactive` antes de `active`, e com a tranca
  // armada isso pintava a cortina **escura** por um quadro em cima do splash
  // claro — a piscada preta que aparecia ao abrir o app. A cortina existe para
  // o print do multitarefa, que só faz sentido depois de a pessoa ter visto
  // alguma coisa.
  const jaEsteveAtivo = useRef(false);

  useEffect(() => {
    const refresh = () => {
      void lockIsActive(true).then((v) => {
        armed.current = v;
      });
    };
    refresh();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        jaEsteveAtivo.current = true;
        setCovered(false);
        refresh();
        return;
      }
      // `inactive` é onde o print é tirado (troca de app, central de controle).
      // Nada de `await` aqui.
      //
      // **Mas `inactive` causado por nós não conta.** A folha de Face ID do
      // iOS também põe o app em `inactive`, e cobrir nela fazia a cortina
      // subir por cima da tela de tranca e descer logo em seguida — o app
      // "gaguejando" ao abrir, que o Bruno viu em 27/09/2026. O print do
      // multitarefa não acontece durante o nosso próprio prompt.
      if (biometriaEmAndamento()) return;
      if (armed.current && jaEsteveAtivo.current) setCovered(true);
    });
    return () => sub.remove();
  }, []);

  if (!covered) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        /*
         * O escuro **cravado**, não o tema de quem está a usar: a capa é a
         * mesma nos dois tons, porque o que ela faz é apagar a tela no
         * alternador de apps. Sai do token em vez de um literal só para
         * acompanhar a paleta — em 118 T-10 ela foi para quase preto. O
         * `tone="bone"` do logo é escolhido para este fundo, não para o tema.
         */
        backgroundColor: themes.dark.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Logo tone="bone" height={96} />
    </View>
  );
}
