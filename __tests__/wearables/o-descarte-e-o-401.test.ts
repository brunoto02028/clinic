/**
 * @jest-environment node
 *
 * Os três achados do QA da 092 que não estavam em cenário nenhum.
 *
 * ## O que liga os três
 *
 * Nenhum deles é uma conta errada. Todos são **uma notícia que não chega a
 * ninguém**: uma leitura descartada sem log, um manguito com alarme permanente,
 * e um 401 que o navegador converte em erro de parse. O produto inteiro desta
 * atividade é "parar de falhar em silêncio", e estes eram os três silêncios que
 * sobraram depois de os reviews passarem.
 */

import { deliveryState } from "@/lib/withings-subscriptions";
import { WITHINGS_APPLI } from "@/lib/withings";
import { ler } from "../helpers/codigo";

const ONTEM = new Date(Date.now() - 24 * 3600_000);

describe("o descarte do webhook deixou de ser silencioso", () => {
  const webhook = ler("app", "api", "wearables", "withings", "webhook", "route.ts");

  it("**o `return ok()` seco virou um registro**", () => {
    // Era `if (!connection || connection.status !== "CONNECTED") return ok();`.
    // A Withings recebia status 0 e ficava satisfeita, a leitura ia para o
    // lixo, e não havia lugar nenhum onde alguém descobrisse.
    expect(webhook).toMatch(/await logSystem\(\{/);
    expect(webhook).toMatch(/message: `Withings descartou notificação: \$\{motivo\}`/);
    expect(webhook).toMatch(/source: "api\/wearables\/withings\/webhook"/);
  });

  it("e diz **qual** dos dois motivos foi", () => {
    // "Conta desconhecida" é assinatura órfã de paciente desconectado, e é
    // esperado. "Conexão DISCONNECTED" no aparelho da clínica é o defeito.
    // Quem lê o log precisa separar os dois sem abrir o banco.
    expect(webhook).toMatch(/const motivo = !connection \? "conta desconhecida" : `conexão \$\{connection\.status\}`/);
    expect(webhook).toMatch(/esperado: !connection,/);
  });

  it("carrega o que identifica a conexão", () => {
    const i = webhook.indexOf("Withings descartou");
    const bloco = webhook.slice(i, i + 700);
    for (const campo of ["providerUserId", "appli", "connectionId", "connectionStatus", "isClinicDevice"]) {
      expect(bloco).toContain(campo);
    }
  });

  it("**e o log que falha não derruba o webhook**", () => {
    // Responder `{"status":0}` à Withings é a obrigação; registrar é o extra.
    // Trocar um pelo outro enche a fila de retry deles.
    expect(webhook).toMatch(/\}\)\.catch\(\(e\) => console\.error\("\[withings\/webhook\] log falhou:"/);
    const i = webhook.indexOf("log falhou");
    expect(webhook.slice(i, i + 120)).toMatch(/return ok\(\);/);
  });
});

describe("o manguito deixou de ter alarme permanente", () => {
  // `WITHINGS_APPLI_WE_WANT` pede pressão, peso, passos e sono. Um BPM Connect
  // não produz passos nem sono — então `partial` era o estado normal e eterno
  // dele, e o painel dizia para sempre "a Withings não confirmou que vai
  // enviar leituras" com a pressão confirmada.
  const conta = (appli: number[]) => ({ notifyConfirmedAppli: appli, notifyCheckedAt: ONTEM });

  it("**o que um manguito confirma conta como `receiving`**", () => {
    expect(deliveryState(conta([WITHINGS_APPLI.BLOOD_PRESSURE, 1]), { soPressao: true })).toBe("receiving");
  });

  it("e sem `soPressao` a mesma conta seria `partial` — o defeito", () => {
    // A prova de que o argumento é o que decide, e não outra mudança junto.
    expect(deliveryState(conta([WITHINGS_APPLI.BLOOD_PRESSURE, 1]))).toBe("partial");
  });

  it("**mas pressão faltando continua sendo `partial`**, que é o alarme que serve", () => {
    expect(deliveryState(conta([1, 16, 44]), { soPressao: true })).toBe("partial");
  });

  it("nenhuma confirmação continua `silent`", () => {
    expect(deliveryState(conta([]), { soPressao: true })).toBe("silent");
  });

  it("e nunca perguntado continua `unchecked`", () => {
    // Estado próprio, não falha: uma conexão de antes disto existir nunca foi
    // perguntada, e dizer que está muda seria tão errado quanto dizer que está bem.
    expect(
      deliveryState({ notifyConfirmedAppli: [], notifyCheckedAt: null }, { soPressao: true })
    ).toBe("unchecked");
  });

  it("e o painel da clínica é quem pede `soPressao`", () => {
    expect(ler("app", "api", "admin", "measurement-sessions", "route.ts")).toMatch(
      /deliveryState\(device, \{ soPressao: true \}\)/
    );
  });

  it("**e as telas do paciente continuam pedindo tudo**", () => {
    // Lá o aparelho pode ser uma balança ou um relógio, e sono faltando é
    // notícia de verdade. A mudança é do manguito, não da regra.
    expect(ler("app", "api", "wearables", "connections", "route.ts")).toMatch(/deliveryState\(c\)/);
    expect(ler("app", "api", "biohacking", "patients", "route.ts")).toMatch(/deliveryState\(c\)/);
  });
});

describe("uma API sem sessão responde 401, não um redirect", () => {
  const mw = ler("middleware.ts");

  it("**o 307 virou 401 em JSON para `/api`**", () => {
    // O navegador **segue** o 307, recebe 200 com o HTML do /login, e o
    // `res.json()` do chamador estoura num erro de parse. A terapeuta não lê
    // "sua sessão expirou", lê um erro de sintaxe.
    const i = mw.indexOf("if (!token) {");
    const bloco = mw.slice(i, i + 1400);
    expect(bloco).toMatch(/if \(pathname\.startsWith\('\/api'\)\) \{/);
    expect(bloco).toMatch(/status: 401/);
    expect(bloco).toMatch(/code: 'session_expired'/);
  });

  it("nas duas línguas, como o resto da atividade", () => {
    expect(mw).toMatch(/errorPt: 'Sua sessão expirou\. Entre de novo\.'/);
  });

  it("**e a página continua indo para o login** — lá o redirect é o certo", () => {
    const i = mw.indexOf("if (!token) {");
    const bloco = mw.slice(i, i + 1400);
    expect(bloco).toMatch(/const loginUrl = new URL\('\/login', request\.url\)/);
    expect(bloco).toMatch(/loginUrl\.searchParams\.set\('callbackUrl', pathname\)/);
    // E na ordem certa: o 401 tem de vir antes, senão não muda nada.
    expect(bloco.indexOf("status: 401")).toBeLessThan(bloco.indexOf("const loginUrl"));
  });

  it("e leva os cabeçalhos de segurança, como as outras recusas do arquivo", () => {
    const i = mw.indexOf("code: 'session_expired'");
    expect(mw.slice(i, i + 200)).toMatch(/\.\.\.SECURITY_HEADERS/);
  });
});
