/**
 * @jest-environment node
 *
 * A etiqueta da pressão não nomeia um diagnóstico — e as duas telas concordam.
 *
 * Dois defeitos, achados no mesmo dia:
 *
 * 1. **O rótulo era o nome de uma categoria diagnóstica.** *"Stage 2"* é o nome
 *    curto de *stage 2 hypertension*, e numa tela que o paciente abre sozinho
 *    lê-se como um veredito do aplicativo. Chegava também **por e-mail**, no
 *    `BP_HIGH_ALERT`, que começa com *"Hi {{patientName}}, your recent reading
 *    requires attention"* — diagnóstico não pedido, na caixa de entrada.
 *
 * 2. **O painel e o app discordavam.** O painel tinha um `classifyBP` próprio, e
 *    145/85 saía como *Stage 1* para o terapeuta e `STAGE2` para o paciente. A
 *    mesma leitura, duas severidades, e quem conversa sobre o número é
 *    justamente esse par.
 *
 * O import do mobile é **relativo de propósito**: o SWC reescreve o `@/` antes
 * do `moduleNameMapper` do jest.
 */

import * as fs from "fs";
import * as path from "path";
import { classifyBP, BP_LABELS, BP_GUIDANCE_NOTE, type BPClassification } from "@/lib/blood-pressure";
import {
  classificarPressao,
  ROTULOS_DE_PRESSAO,
  AVISO_DAS_FAIXAS,
} from "../../mobile/src/lib/faixa-de-pressao";

const RAIZ = path.join(__dirname, "..", "..");

/** Leituras de verdade — as das capturas do Bruno, mais as de fronteira. */
const LEITURAS: Array<[number, number]> = [
  [125, 83], [146, 93], [134, 86], [149, 99], [154, 96], [171, 90], [154, 98],
  [145, 85], [135, 95], [115, 95], // as três que o painel classificava diferente
  [119, 79], [120, 79], [129, 79], [130, 80], [139, 89], [140, 90],
  [179, 119], [180, 120], [89, 59], [90, 60],
];

describe("o rótulo não nomeia diagnóstico", () => {
  const PROIBIDAS = [
    "stage 1", "stage 2", "estágio 1", "estágio 2", "estagio 1", "estagio 2",
    "hypertension", "hipertensão", "hipertensao",
    "hypertensive crisis", "crise hipertensiva",
  ];

  it.each(Object.keys(BP_LABELS))("%s: nenhum nome de categoria diagnóstica", (chave) => {
    const rot = BP_LABELS[chave as BPClassification];
    for (const texto of [rot.en, rot.pt]) {
      for (const proibida of PROIBIDAS) {
        expect(texto.toLowerCase()).not.toContain(proibida);
      }
    }
  });

  it("**a frase nega o diagnóstico com todas as letras**, nas duas línguas", () => {
    // Nomear a régua sem negar o veredito deixa metade do trabalho feito: a
    // pessoa continua a ler a etiqueta como julgamento, só que educado.
    expect(BP_GUIDANCE_NOTE.en.toLowerCase()).toContain("not a diagnosis");
    expect(BP_GUIDANCE_NOTE.pt.toLowerCase()).toContain("não são um diagnóstico");
  });

  it("**a frase nomeia a régua** — é o que tira o app do papel de quem julga", () => {
    expect(BP_GUIDANCE_NOTE.en.toLowerCase()).toContain("uk");
    expect(BP_GUIDANCE_NOTE.pt.toLowerCase()).toContain("britânico");
  });

  it("e manda procurar quem diagnostica", () => {
    expect(BP_GUIDANCE_NOTE.en.toLowerCase()).toMatch(/gp|doctor/);
    expect(BP_GUIDANCE_NOTE.pt.toLowerCase()).toContain("médico");
  });

  it("**a leitura alta continua parecendo alta** — a mudança é de palavra", () => {
    // O controle que impede o conserto de virar eufemismo. Se todas as faixas
    // dissessem a mesma coisa amena, os testes acima passariam e a tela
    // deixaria de avisar.
    const rotulos = Object.values(BP_LABELS).map((r) => r.en);
    expect(new Set(rotulos).size).toBe(rotulos.length);
    expect(BP_LABELS.STAGE2.en).not.toBe(BP_LABELS.STAGE1.en);
    expect(BP_LABELS.CRISIS.en.toLowerCase()).toMatch(/now|help/);
  });
});

describe("as duas implementações concordam", () => {
  it("**a mesma faixa para a mesma leitura**, nas vinte", () => {
    for (const [s, d] of LEITURAS) {
      expect(classificarPressao(s, d)).toBe(classifyBP(s, d));
    }
  });

  it("**os rótulos são os mesmos**, nas duas línguas", () => {
    for (const chave of Object.keys(BP_LABELS) as BPClassification[]) {
      expect(ROTULOS_DE_PRESSAO[chave]).toEqual(BP_LABELS[chave]);
    }
  });

  it("a frase é a mesma", () => {
    expect(AVISO_DAS_FAIXAS).toEqual(BP_GUIDANCE_NOTE);
  });

  it("as leituras cobrem as fronteiras — senão o teste acima é fácil", () => {
    // Sem as fronteiras, duas implementações com limiares diferentes passariam:
    // é exatamente onde o painel discordava.
    const faixas = new Set(LEITURAS.map(([s, d]) => classifyBP(s, d)));
    expect(faixas.size).toBeGreaterThanOrEqual(5);
  });
});

describe("o classificador é um só", () => {
  it("**o painel não tem limiares próprios**", () => {
    // Ele tinha, e discordava: 145/85 era Stage 1 para o terapeuta e STAGE2
    // para o paciente. Se alguém reescrever os limiares ali, isto cai.
    const fonte = fs.readFileSync(
      path.join(RAIZ, "app", "admin", "blood-pressure", "page.tsx"),
      "utf8"
    );
    const codigo = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(codigo).toContain("classificarPressao(sys, dia)");
    // Nenhum limiar solto: os números da classificação vivem na lib.
    expect(codigo).not.toMatch(/sys\s*<\s*140\s*\|\|\s*dia\s*<\s*90/);
  });

  it("**a varredura**: nenhum lugar vivo escreve o rótulo antigo", () => {
    // O rótulo aparecia em nove arquivos. Corrigir a tela do app e esquecer o
    // e-mail é o mesmo defeito de sempre — a lista fechada e o detalhe aberto.
    /**
     * **A palavra sozinha também conta** (achado do QA online, 01/10).
     *
     * A lista proibia `hypertensive crisis` e `crise hipertensiva`, e por isso
     * passou verde por cima de uma grade de faixas que dizia apenas
     * `Crisis` / `Crise` — a única da lista que não tinha migrado para
     * `BP_LABELS`, em produção, na tela que o paciente abre sozinho.
     *
     * *Crise* é o nome curto de *crise hipertensiva*. Exigir as duas palavras
     * juntas era pedir que o defeito se identificasse por extenso.
     */
    const proibidas = /stage [12]|está?gio [12]|hypertensive crisis|crise hipertensiva/i;
    /**
     * **A palavra sozinha também conta** (achado do QA online, 01/10).
     *
     * A lista acima proibia `hypertensive crisis` e `crise hipertensiva`, e por
     * isso passou verde por cima de uma grade de faixas que dizia apenas
     * `Crisis` / `Crise` — a única da lista que não tinha migrado para
     * `BP_LABELS`, em produção, na tela que o paciente abre sozinho. *Crise* é
     * o nome curto de *crise hipertensiva*; exigir as duas palavras juntas era
     * pedir que o defeito se identificasse por extenso.
     *
     * **Com distinção de maiúsculas, de propósito.** `CRISIS` é a chave da
     * faixa — identificador, não texto —, e proibi-la obrigaria a renomear o
     * enum inteiro para resolver um problema de rótulo. O que não pode aparecer
     * é a palavra **escrita como se lê**.
     */
    const rotuloDeCrise = /["'`>\s](Crisis|Crise)["'`<\s.,]/;
    const culpadas: string[] = [];

    const anda = (dir: string) => {
      for (const nome of fs.readdirSync(dir)) {
        if (["node_modules", ".next", ".build", "__tests__", "dist"].includes(nome)) continue;
        const p = path.join(dir, nome);
        if (fs.statSync(p).isDirectory()) { anda(p); continue; }
        if (!/\.(ts|tsx)$/.test(nome)) continue;
        const fonte = fs.readFileSync(p, "utf8");
        // Comentários fora: eles contam a história da correção, e castigar quem
        // documentou é como se aprende a não documentar.
        const codigo = fonte
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:])\/\/.*$/gm, "$1");
        if (proibidas.test(codigo) || rotuloDeCrise.test(codigo)) {
          culpadas.push(p.slice(RAIZ.length + 1).split(path.sep).join("/"));
        }
      }
    };
    // `scripts` entrou depois, e nao por simetria: o resto do repositorio
    // estava limpo e o unico residuo vivo estava exatamente no diretorio que a
    // varredura nao percorria — o script que forca `OUTBOUND_MODE=live` e
    // entrega e-mail de verdade. Uma varredura escolhe onde olhar, e o que ela
    // nao percorre e onde o defeito sobrevive.
    for (const base of ["app", "lib", "components", "scripts", "mobile/app", "mobile/src"]) {
      const d = path.join(RAIZ, base);
      if (fs.existsSync(d)) anda(d);
    }
    expect(culpadas).toEqual([]);
  });

  it("a varredura olha mesmo os arquivos — senão aprova o vazio", () => {
    const n = fs.readdirSync(path.join(RAIZ, "lib")).filter((f) => f.endsWith(".ts")).length;
    expect(n).toBeGreaterThan(20);
  });
});
