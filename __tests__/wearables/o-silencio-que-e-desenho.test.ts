/**
 * @jest-environment node
 *
 * O silêncio que é desenho não vira alarme (achado do Bruno, 30/09).
 *
 * Ele abriu a tela de dispositivos depois do update e mandou a captura:
 *
 * > **Withings** · Last reading: 24 Sep 2026
 * > *Nothing has arrived for 6 days. Check the device, or reconnect.*
 *
 * O aviso funcionava — e estava **errado**. O aparelho dele mede todos os dias;
 * não há nada para verificar nem para reconectar.
 *
 * ## Porque a ligação pessoal nunca recebe nada
 *
 * Quando a mesma conta Withings está ligada duas vezes — uma como aparelho da
 * clínica, outra como pessoal —, a pessoal **não processa pressão**: num
 * aparelho partilhado, só a da clínica sabe de quem é a leitura (092 T-1, e o
 * review de 27/09 que derrubou o atalho).
 *
 * Um medidor de pressão **só produz pressão**. Então a ligação pessoal não
 * recebe sono, nem passos, nem nada — e o relógio do silêncio dela cresce para
 * sempre.
 *
 * Duas regras certas, cada uma pelo seu motivo, produzindo juntas um alarme
 * permanente sobre um aparelho que está perfeitamente bem. **Isto não aparecia
 * antes porque a tela não dizia há quantos dias**: o defeito nasceu junto com a
 * frase que o tornou visível.
 *
 * Um aviso que manda arranjar o que não está partido gasta a paciência de quem
 * o lê, e da terceira vez ninguém lê mais. É a mesma razão pela qual a 114 T-7
 * separa *"o provedor não avisa"* de *"o aparelho está calado"*.
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

const ROTA = ["app", "api", "wearables", "connections", "route.ts"];
const TELA = ["mobile", "app", "(app)", "(clinica)", "wearables.tsx"];

describe("a rota sabe quando o silêncio é desenho", () => {
  it("**encontra as contas que também são da clínica**", () => {
    const c = codigo(...ROTA);
    expect(c).toContain("isClinicDevice: true");
    expect(c).toMatch(/providerUserId: \{ in:/);
  });

  it("**e então não chama isso de silêncio**", () => {
    // O `isSilent` continua a valer para todas as outras: o que muda é só o
    // caso em que a conta entrega pelo outro lado.
    const c = codigo(...ROTA);
    expect(c).toMatch(/pressaoPelaClinica/);
    expect(c).toMatch(/\?\s*false\s*\n?\s*:\s*isSilent\(c, limite\)/);
  });

  it("**o aparelho da clínica não é afetado**", () => {
    // Só a ligação **pessoal** fica muda para pressão. A da clínica é a que
    // recebe, e o silêncio dela é notícia de verdade.
    expect(codigo(...ROTA)).toMatch(/c\.isClinicDevice !== true/);
  });
});

describe("a tela diz o que é verdade", () => {
  it("**não pinta de alarme uma ligação que entrega pelo outro lado**", () => {
    const c = codigo(...TELA);
    expect(c).toMatch(/pelaClinica = conn\?\.pressaoPelaClinica === true/);
    // **Na atribuição do `silent`**, e não em qualquer sítio do arquivo: a
    // primeira versão procurava `isConnected && !pelaClinica &&` solto, e a
    // mutação que o tirava da condição passava incólume porque o mesmo texto
    // existe no JSX, a decidir qual frase mostrar. É a terceira vez hoje que
    // um teste de texto apanha a ocorrência errada.
    expect(c).toMatch(/const silent = isConnected && !pelaClinica &&/);
  });

  it("**e explica por onde a pressão entra**", () => {
    // Em vez de "nada chega há 6 dias", que é verdade sobre esta ligação e
    // mentira sobre o aparelho.
    const c = codigo(...TELA);
    expect(c).toMatch(/comes in through the clinic|entra pelo aparelho da clínica/);
  });

  it("**a contagem de dias some para esse caso**", () => {
    // Ela mediria o tempo desde uma leitura que esta ligação nunca vai
    // receber — um número correto sobre a pergunta errada.
    const c = codigo(...TELA);
    const i = c.indexOf("pelaClinica &&");
    expect(i).toBeGreaterThan(0);
    expect(c.slice(i, i + 500)).not.toContain("daysSilent");
  });
});

describe("o cartão cabe na tela", () => {
  it("**a informação em cima, os botões por baixo**", () => {
    // Era uma linha: texto à esquerda, três botões à direita. Quando a frase
    // de estado cresceu, o **Remover saiu da tela**. O texto que explica o
    // problema e os botões que o resolvem disputavam a mesma largura — e
    // quanto pior o problema, menos espaço sobrava para a solução.
    const c = codigo(...TELA);
    expect(c).toMatch(/flexDirection: "column",\s*\n\s*gap: 12,\s*\n\s*padding: 16/);
  });

  it("**e os botões quebram linha**", () => {
    expect(codigo(...TELA)).toMatch(/flexDirection: "row", gap: 8, flexWrap: "wrap"/);
  });

  it("**a frase de estado não tem largura cravada**", () => {
    // O `maxWidth: 190` existia para ela não empurrar os botões que ficavam ao
    // lado. Com eles por baixo, ele só apertaria a frase justamente quando há
    // mais a dizer.
    const c = codigo(...TELA);
    expect(c).not.toMatch(/marginTop: 2, maxWidth: 190/);
  });
});

describe("a sincronia presta contas", () => {
  it("**não diz mais 'em breve'**", () => {
    // Uma promessa sem prazo e sem resultado: a tela ficava igual e a pessoa
    // não sabia se tinha vindo alguma coisa.
    const c = codigo(...TELA);
    expect(c).not.toMatch(/Sync started\. Your data will be updated shortly/);
  });

  it("**diz quantas leituras chegaram**", () => {
    const c = codigo(...TELA);
    expect(c).toMatch(/r\.bloodPressure \?\? 0/);
    expect(c).toMatch(/new blood-pressure reading|leitura\(s\) nova\(s\) de pressão/);
  });

  it("**e separa 'a Withings não tem nada' de 'veio e foi para outro lugar'**", () => {
    // `bloodPressureRead` conta o que a Withings devolveu, salvo ou não. É o
    // número que diagnostica o aparelho partilhado — sem ele, as duas
    // situações davam a mesma tela muda.
    const c = codigo(...TELA);
    expect(c).toMatch(/r\.bloodPressureRead \?\? 0/);
    expect(c).toMatch(/handled by the clinic|entram pelo aparelho da clínica/);
    expect(c).toMatch(/had no measurements in this window|não tinha medições nesta janela/);
  });

  it("**e a tela recarrega depois de sincronizar**", () => {
    // Sem isto o cartão continuava a dizer o que dizia antes da sincronia —
    // o resultado no alerta e a tela por baixo a discordarem.
    const c = codigo(...TELA);
    const i = c.indexOf("mutationFn: syncProvider");
    expect(i).toBeGreaterThan(0);
    expect(c.slice(i, i + 600)).toMatch(/invalidateQueries/);
  });
});
