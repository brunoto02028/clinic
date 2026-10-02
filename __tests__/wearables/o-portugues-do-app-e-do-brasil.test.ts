/**
 * @jest-environment node
 *
 * O português que o paciente lê é **do Brasil**.
 *
 * ## Porque isto existe
 *
 * > *"o PT é do Brasil no app ok?"* — Bruno, 02/10/2026
 *
 * Ele teve de me dizer. Eu venho escorregando para português europeu há várias
 * tarefas — *"A preparar…"*, *"Guardar"*, *"este registo"*, *"fibrilhação"*,
 * *"está a ser medido"* — e nada avisava, porque tudo isso é português correto.
 * Só não é o português de quem usa o app.
 *
 * O custo não é de estilo. Um paciente brasileiro que lê *"Ainda sem registos"*
 * ou *"A sua clínica envia-os"* percebe, mas percebe também que o texto não foi
 * escrito para ele — e num produto de saúde essa distância é a mesma que faz
 * alguém não confiar no número que está ao lado.
 *
 * ## O que se varre, e o que não
 *
 * Só o que **chega à tela**: as chaves `pt:` dos dicionários de tradução e os
 * dicionários dos dois papéis. Comentários e nomes de variáveis ficam de fora —
 * metade deste repositório está comentado em português europeu, e reescrever
 * comentários não muda uma palavra do que o paciente vê.
 *
 * A lista é de formas **inequivocamente** europeias. Palavras que existem nas
 * duas variantes — "guardar" no sentido de conservar, "ligação", "aparelho" —
 * não entram: bani-las produziria falsos positivos e o teste seria desligado na
 * primeira vez que atrapalhasse.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.resolve(__dirname, "..", "..");

/** Onde vive texto que o paciente lê. */
const LUGARES = [
  "mobile/src",
  "mobile/app",
  "lib/ecg-pdf.ts",
  "lib/patient-report.ts",
  "lib/ecg-tracado.ts",
];

/**
 * As formas que não são do Brasil, com o que se diz em vez delas.
 *
 * Cada uma apanhada numa string que já foi para a tela — nenhuma é hipotética.
 */
const FORMAS_EUROPEIAS: Array<[RegExp, string]> = [
  [/\bregistos?\b/i, "registro(s)"],
  [/\bfibrilhação\b/i, "fibrilação"],
  [/\btelemóvel\b/i, "celular"],
  [/\becrã\b/i, "tela"],
  [/\butilizadors?\b/i, "usuário"],
  [/\bA (preparar|guardar|carregar|enviar|gravar)\b/, "gerúndio: Preparando, Salvando, …"],
  [/\bestá a (ser|fazer|correr|medir)\b/i, "está sendo / está medindo"],
  [/\bestão a (ser|fazer)\b/i, "estão sendo"],
  [/\bpartilhar\b/i, "compartilhar"],
  [/\bcontacte\b/i, "fale com / entre em contato"],
  [/\becrãs\b/i, "telas"],
  [/\bautocarro\b/i, "ônibus"],
  [/\bcasa de banho\b/i, "banheiro"],
];

/** Todos os ficheiros de código sob os lugares acima. */
function ficheiros(): string[] {
  const saida: string[] = [];
  const visitar = (alvo: string) => {
    const completo = path.join(RAIZ, alvo);
    if (!fs.existsSync(completo)) return;
    if (fs.statSync(completo).isFile()) {
      saida.push(completo);
      return;
    }
    for (const nome of fs.readdirSync(completo)) {
      if (nome === "node_modules" || nome.startsWith(".")) continue;
      visitar(path.join(alvo, nome));
    }
  };
  for (const l of LUGARES) visitar(l);
  return saida.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
}

/**
 * As linhas que carregam texto em português **para a tela**.
 *
 * Uma linha conta quando tem uma chave `pt:` com um literal, ou quando está
 * dentro do bloco `pt: {` de um dos dicionários dos papéis. Comentários — `*`,
 * `//`, `/*` — ficam de fora: é lá que vive o português europeu que não faz mal
 * a ninguém.
 */
/**
 * Só as palavras que alguém lê — nunca nomes de variáveis.
 *
 * A primeira versão varria a linha inteira e acusou `d.registos.length`, que é o
 * nome de uma propriedade. Um teste que dá falso positivo é um teste que a
 * próxima pessoa desliga.
 *
 * Fica com o que está entre aspas, e **tira o que está dentro de `${}`**: num
 * template literal a interpolação é código, e o código tem os nomes antigos.
 */
export function soAsPalavras(linha: string): string {
  const pedacos: string[] = [];

  /* Aspas: não aninham, logo cada uma é uma palavra inteira. */
  for (const m of linha.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g) ?? []) {
    pedacos.push(m);
  }

  /*
   * Crases: aninham. Uma template literal engole as aspas que estão dentro das
   * suas interpolações, então guarda-se apenas o texto **fora** de `${}` — o
   * que está dentro já foi apanhado acima, se for texto, e é código se não for.
   */
  for (const m of linha.match(/`(?:\\.|[^`\\])*`/g) ?? []) {
    pedacos.push(m.replace(/\$\{[^}]*\}/g, " "));
  }

  return pedacos.join(" ");
}

function linhasDeTexto(conteudo: string): Array<{ n: number; texto: string }> {
  const linhas = conteudo.split("\n");
  const saida: Array<{ n: number; texto: string }> = [];
  let dentroDoDicionarioPt = false;
  let profundidade = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const semEspaco = linha.trim();

    /* Comentários não vão para a tela. */
    const ehComentario =
      semEspaco.startsWith("*") || semEspaco.startsWith("//") || semEspaco.startsWith("/*");

    if (/^\s*pt\s*:\s*\{\s*$/.test(linha)) {
      dentroDoDicionarioPt = true;
      profundidade = 0;
      continue;
    }
    if (dentroDoDicionarioPt) {
      profundidade += (linha.match(/\{/g) ?? []).length;
      profundidade -= (linha.match(/\}/g) ?? []).length;
      if (profundidade < 0) {
        dentroDoDicionarioPt = false;
        continue;
      }
      if (!ehComentario) saida.push({ n: i + 1, texto: soAsPalavras(linha) });
      continue;
    }

    if (!ehComentario && /\bpt\s*:\s*["'`]/.test(linha)) {
      saida.push({ n: i + 1, texto: soAsPalavras(linha) });
    }
  }
  return saida;
}

describe("o texto que o paciente lê é português do Brasil", () => {
  it("**nenhuma forma europeia chega à tela**", () => {
    const problemas: string[] = [];

    for (const f of ficheiros()) {
      const conteudo = fs.readFileSync(f, "utf8");
      for (const { n, texto } of linhasDeTexto(conteudo)) {
        for (const [forma, emVez] of FORMAS_EUROPEIAS) {
          if (forma.test(texto)) {
            const curto = path.relative(RAIZ, f).replace(/\\/g, "/");
            problemas.push(`${curto}:${n} — ${forma.source} (use: ${emVez})\n    ${texto.trim().slice(0, 120)}`);
          }
        }
      }
    }

    expect(problemas.join("\n")).toBe("");
  });

  it("e a varredura **olha mesmo** para as linhas certas", () => {
    /*
     * Um teste que não encontra nada porque não está a olhar passa para sempre.
     * Isto prova que o colector vê texto de tela e ignora comentários.
     */
    const amostra = [
      "/** Um comentário com a palavra registo lá dentro. */",
      '  pt: "Ainda sem registos.",',
      "  // outro comentário com telemóvel",
      '  pt: "Tudo certo",',
    ].join("\n");

    const vistas = linhasDeTexto(amostra);
    expect(vistas).toHaveLength(2);
    expect(vistas[0].texto).toContain("registos");
    expect(vistas.some((v) => v.texto.includes("telemóvel"))).toBe(false);
  });

  it("**e um nome de variável não é uma palavra que alguém lê**", () => {
    /*
     * O caso real que fez esta função existir: a linha abaixo mostra
     * `"registros"` — certo — e acusava, porque a propriedade a seguir se chama
     * `registos`. Acusar isso ensina a ignorar o teste.
     */
    const linha = '` · ${d.registos.length} ${tr(lang, { en: "recordings", pt: "registros" })}`';
    expect(soAsPalavras(linha)).not.toContain("registos.length");
    expect(soAsPalavras(linha)).toContain("registros");
    expect(FORMAS_EUROPEIAS.some(([f]) => f.test(soAsPalavras(linha)))).toBe(false);
  });

  it("e encontra os dicionários `pt: {` dos papéis", () => {
    const amostra = [
      "const T = {",
      "  en: {",
      '    titulo: "ECG recording",',
      "  },",
      "  pt: {",
      '    titulo: "Registo de ECG",',
      "  },",
      "};",
    ].join("\n");

    const vistas = linhasDeTexto(amostra);
    expect(vistas.some((v) => v.texto.includes("Registo de ECG"))).toBe(true);
  });

  it("**e a lista de formas apanha o que já escapou**", () => {
    // Cada uma destas esteve mesmo numa tela ou num papel deste produto.
    const jaEscaparam = [
      '  pt: "A preparar…",',
      '  pt: "Ainda sem registos.",',
      '  pt: "sinais de fibrilhação atrial",',
      '  pt: "Nada está a ser medido.",',
      '  pt: "Abra no telemóvel",',
    ];
    for (const linha of jaEscaparam) {
      expect(FORMAS_EUROPEIAS.some(([f]) => f.test(linha))).toBe(true);
    }
  });

  it("e **não** apanha português do Brasil correto", () => {
    /*
     * Um teste que dá falso positivo é um teste que alguém desliga. "Guardar o
     * resultado", "a ligação com a Withings" e "o aparelho" são todos BR.
     */
    const bons = [
      '  pt: "Preparando…",',
      '  pt: "Ainda sem registros.",',
      '  pt: "um lugar para guardar o resultado",',
      '  pt: "Nenhum aparelho conectado ainda.",',
      '  pt: "Fale com seu terapeuta.",',
      '  pt: "Salvar",',
    ];
    for (const linha of bons) {
      expect(FORMAS_EUROPEIAS.some(([f]) => f.test(linha))).toBe(false);
    }
  });
});
