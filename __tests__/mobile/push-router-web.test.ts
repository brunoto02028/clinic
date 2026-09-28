/**
 * @jest-environment node
 *
 * O app do paciente tem de carregar no navegador (26/09/2026).
 *
 * `PushRouter` chamava `Notifications.useLastNotificationResponse()` sem olhar a
 * plataforma. Na web o módulo nativo não existe e o hook estoura com
 * `UnavailabilityError: ExpoNotifications.getLastNotificationResponse is not
 * available on web`. Como o componente vive dentro do `RootLayout`, a exceção
 * derrubava **o app inteiro**: página branca.
 *
 * O custo disso não foi cosmético. **Três rodadas de QA não conseguiram testar
 * nenhuma tela do paciente** — o campo de cupom, o preço riscado, a recusa com
 * motivo, a porta do laboratório, todos verificados só no servidor e no código.
 * Um crash que impede medir esconde todos os outros.
 *
 * Depois do conserto: `http://localhost:8081` carrega com 0 erros de console e
 * renderiza logo, "Your recovery, step by step." e "Get started".
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..", "mobile");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

/**
 * O código sem os comentários.
 *
 * O arquivo **cita** `useLastNotificationResponse` no comentário que explica o
 * conserto, e o comentário vem antes da guarda — então a primeira versão deste
 * teste reprovou o código certo. Terceira vez que isto me pega hoje; a regra é
 * tirar os comentários antes de asserir sobre ordem.
 */
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const push = ler("src", "components", "PushRouter.tsx");
const codigo = semComentarios(push);

describe("PushRouter não derruba o app na web", () => {
  it("sai antes de chamar o hook quando a plataforma é web", () => {
    expect(push).toMatch(/if \(Platform\.OS === "web"\) return null;/);
  });

  it("e o `return` vem ANTES de qualquer hook", () => {
    // A ordem é o conserto: um `if` depois do hook não evita a exceção.
    const guarda = codigo.indexOf('Platform.OS === "web"');
    const hook = codigo.indexOf("useLastNotificationResponse");
    expect(guarda).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(hook);
  });

  it("os hooks vivem num componente separado, então a regra dos hooks segue de pé", () => {
    // Um `return` condicional antes de hooks no **mesmo** componente é o que a
    // regra proíbe; o ramo aqui escolhe entre dois componentes.
    expect(push).toMatch(/function PushRouterNativo\(\)/);
    expect(push).toMatch(/return <PushRouterNativo \/>;/);
  });

  it("`Platform` é importado de react-native, não inferido", () => {
    expect(push).toMatch(/import \{ Platform \} from "react-native";/);
  });

  it("o comportamento nativo não mudou: os dois caminhos continuam lá", () => {
    // App fechado (o hook) e app aberto (o listener). Perder o segundo faria a
    // notificação abrir a home em vez do assunto.
    expect(push).toContain("useLastNotificationResponse");
    expect(push).toContain("addNotificationResponseReceivedListener");
    expect(push).toMatch(/sub\.remove\(\)/);
  });
});

describe("os outros módulos nativos já se protegiam", () => {
  it("o registro de push sai fora do aparelho", () => {
    expect(ler("src", "lib", "push.ts")).toMatch(/if \(!Device\.isDevice\) return null;/);
  });

  it("e a biometria conhece a web", () => {
    expect(ler("src", "lib", "biometrics.ts")).toMatch(/const isWeb = Platform\.OS === "web";/);
  });
});
