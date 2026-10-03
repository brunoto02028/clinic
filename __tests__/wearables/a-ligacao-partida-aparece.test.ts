/**
 * @jest-environment node
 *
 * A ligação partida aparece, e cada causa tem a sua frase (114, achados do QA).
 *
 * O QA da atividade reprovou duas tarefas, e as duas pelo **mesmo tipo de
 * defeito** — o que esta atividade tinha aberto para consertar:
 *
 * ## 1. A ligação em `ERROR` sumia da tela do paciente (T-2)
 *
 * `/api/wearables/connections` filtrava `status: 'CONNECTED'`. Uma ligação
 * partida — token recusado, autorização caída — **não vinha na lista**, e o
 * paciente via o convite *Connect*, como se nunca tivesse ligado nada. Com a
 * lista vazia, perdia também o caminho *Ver meus dados*.
 *
 * Era o pior caso possível: **exatamente quando a ligação cai** — o momento em
 * que a T-7 existe para avisar — ele deixava de ver que havia algo a resolver.
 *
 * `lib/wearable-silence.ts` já distinguia: isenta o `DISCONNECTED`, porque quem
 * desligou sabe, e **não** isenta o `ERROR`, com um comentário a dizer que é
 * *"justamente o que precisa aparecer"*. Esse cuidado era inalcançável daqui.
 *
 * ## 2. A ficha da clínica dava uma frase só para quatro causas (T-6)
 *
 * Uma ligação nunca perguntada, que recebeu dado **hoje**, aparecia como
 * *"nothing received for 0 day(s) — may need reconnecting"* ao lado de *"last
 * reading: 30 Sept, 17:50"*. A frase contradizia-se, e o conselho estava errado.
 *
 * A tela do paciente já separava os casos e já tinha as frases. Era esta que não
 * as tinha copiado.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

function codigo(...partes: string[]): string {
  return fs
    .readFileSync(path.join(RAIZ, ...partes), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("a ligação partida chega à tela do paciente", () => {
  it("**a rota não filtra mais por `CONNECTED`**", () => {
    const c = codigo("app", "api", "wearables", "connections", "route.ts");
    expect(c).not.toMatch(/where:\s*\{\s*userId:\s*eff\.userId,\s*status:\s*'CONNECTED'\s*\}/);
    expect(c).toMatch(/status:\s*\{\s*not:\s*'DISCONNECTED'\s*\}/);
  });

  it("**`DISCONNECTED` continua de fora** — quem desligou sabe que desligou", () => {
    // Avisar aqui seria avisar a pessoa de uma decisão dela própria, e é a
    // mesma isenção que `isSilent` já fazia.
    expect(codigo("app", "api", "wearables", "connections", "route.ts")).toContain("DISCONNECTED");
  });

  it("**a tela trata `ERROR` como não-verde e diz o que fazer**", () => {
    const c = codigo("mobile", "app", "(app)", "(clinica)", "wearables.tsx");
    expect(c).toMatch(/quebrada = conn\?\.status === "ERROR"/);
    expect(c).toMatch(/naoEntrega \|\| calada \|\| quebrada/);
    expect(c).toMatch(/connection stopped working|conexão parou de funcionar/);
  });
});

describe("cada causa tem a sua frase na ficha da clínica", () => {
  const tab = () => codigo("components", "admin", "blood-pressure-tab.tsx");

  it("**as quatro causas são separadas**", () => {
    /*
     * **Pela origem de cada causa, e não pela grafia da expressão.**
     *
     * Isto fixava `const quebrada = c.status === "ERROR"` à letra, e quebrou
     * quando a 121 T-4 acrescentou o `needsReauthAt` — **sem que nada do que
     * este teste protege tivesse mudado**. A causa "a ligação parou" continua
     * separada das outras três; o que mudou foi de onde ela vem.
     *
     * O que importa é que as quatro causas existem e vêm de sítios diferentes:
     * uma do estado da ligação, duas da entrega, uma do silêncio.
     */
    const c = tab();
    expect(c).toMatch(/const quebrada = .*needsReauthAt|const quebrada = .*status === "ERROR"/);
    expect(c).toMatch(/const naoEntrega = c\.delivery === "silent"/);
    expect(c).toMatch(/const mal = c\.silent \|\| naoEntrega \|\| naoConfirmada \|\| quebrada/);
  });

  it("**e a que parou vem do estado, não de um palpite** (121 T-4)", () => {
    /*
     * Era inferida de `status === "ERROR"` — e **nada punha a ligação em
     * `ERROR`** nesse caminho. A do Bruno ficou `CONNECTED` e morta 27 dias,
     * com esta tela a ler `CONNECTED`.
     */
    expect(tab()).toMatch(/Boolean\(c\.needsReauthAt\)/);
  });

  it("**a frase dos dias só sai quando a causa é mesmo o silêncio**", () => {
    // Era o que produzia "nada recebido há 0 dias" numa ligação que recebeu
    // dado hoje: a contagem de dias servia de explicação para tudo.
    const c = tab();
    const i = c.indexOf("nothing received for");
    expect(i).toBeGreaterThan(0);
    const antes = c.slice(Math.max(0, i - 400), i);
    expect(antes).toMatch(/c\.silent/);
  });

  it("**a ligação partida diz que parou, e não que está calada**", () => {
    expect(tab()).toMatch(/connection stopped|conexão parou/);
  });

  it("**a nunca confirmada diz isso**, e não conta dias", () => {
    expect(tab()).toMatch(/not confirmed as sending|não confirmamos que está enviando/);
  });
});

describe("os dois arranhões da T-5", () => {
  it("**`recordedById` nulo deixa de significar 'foi o paciente'**", () => {
    // Uma leitura do aparelho da clínica, atribuída por regra, não tem quem a
    // registou — e a coluna dizia "autorregistrada pela paciente" ao lado de
    // "atribuída automaticamente". Duas colunas a discordar sobre a mesma
    // leitura, e uma delas a inventar um facto.
    const c = tab();
    expect(c).toMatch(/r\.autoAttributed\s*\n?\s*\?/);
    expect(c).toMatch(/nobody — attributed by rule|ninguém — atribuída por regra/);
  });

  it("**a limpeza é sobre o texto, e não sobre o estado da leitura**", () => {
    // A primeira correção condicionava ao estado — `leitura.autoAttributed` —
    // e apagava **qualquer** nota que estivesse ali. O QA achou: a ficha
    // oferece o lápis em todas as linhas, e o botão de mover aparece
    // exatamente nas auto-atribuídas. Dois cliques e a observação de uma
    // terapeuta desaparecia.
    //
    // E o teste anterior fixava justamente a condição defeituosa, o que o
    // tornava incapaz de a apanhar. Era verdadeiro **por causa** do defeito.
    const c = codigo("app", "api", "admin", "blood-pressure", "[id]", "move", "route.ts");
    expect(c).not.toMatch(/leitura\.autoAttributed \? \{ notes: null \}/);
    expect(c).toMatch(/leitura\.notes === NOTA_DA_ATRIBUICAO_AUTOMATICA \? \{ notes: null \}/);
  });

  it("**a frase é uma constante partilhada com quem a escreve**", () => {
    // Duas cópias do mesmo texto, uma na escrita e outra na limpeza, divergem
    // por uma vírgula — e aí a limpeza deixa de encontrar o que apagar.
    const move = codigo("app", "api", "admin", "blood-pressure", "[id]", "move", "route.ts");
    const device = codigo("lib", "clinic-device.ts");
    expect(move).toContain("NOTA_DA_ATRIBUICAO_AUTOMATICA");
    expect(device).toContain("export const NOTA_DA_ATRIBUICAO_AUTOMATICA");
    expect(device).toContain("notes: NOTA_DA_ATRIBUICAO_AUTOMATICA");
  });

  it("**e a rota lê a nota antes de decidir**", () => {
    // Sem `notes` no `select`, a comparação é sempre contra `undefined` e a
    // limpeza nunca acontece — o defeito oposto, e igualmente silencioso.
    const c = codigo("app", "api", "admin", "blood-pressure", "[id]", "move", "route.ts");
    const i = c.indexOf("bloodPressureReading.findUnique");
    expect(i).toBeGreaterThan(0);
    expect(c.slice(i, i + 400)).toContain("notes: true");
  });
});

function tab(): string {
  return codigo("components", "admin", "blood-pressure-tab.tsx");
}
