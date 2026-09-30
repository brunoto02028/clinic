/**
 * @jest-environment node
 *
 * O painel não oferece medir pressão pela câmera (115 T-1).
 *
 * O Bruno, 30/09/2026, olhando `/admin/blood-pressure`:
 *
 * > *"Não é para medir a pressão assim… eu já havia falado isso outras vezes,
 * > para tirar qualquer possibilidade de a gente oferecer medição de pressão
 * > pela câmera do celular."*
 *
 * A tela anunciava, à clínica: **Scan to Measure Blood Pressure** — *the patient
 * can measure via camera PPG (photoplethysmography)*. E o diálogo do QR, por
 * paciente, dizia *"they can measure using the camera PPG method"*.
 *
 * A decisão não era nova. A **atividade 006** já tinha marcado essa linha com
 * ❌ e o motivo — *"clínico/regulatório: é screening, não medição"* — e foi
 * aplicada **só ao app**, que por isso nunca teve câmera. A web e o painel
 * ficaram com o que já tinham. Este teste existe para que a decisão não dependa
 * de alguém se lembrar dela outra vez.
 *
 * ## As duas coisas que não podem ser confundidas
 *
 * - **Oferecer** medir por câmera — é o que sai.
 * - **Desenhar uma leitura antiga** medida assim — é o que fica. Há leituras
 *   gravadas com `CAMERA_PPG`, e o crachá tem de continuar a saber desenhá-las.
 *   Apagar isso seria reescrever o que aconteceu.
 *
 * Por isso a varredura **remove o identificador `CAMERA_PPG`** antes de
 * procurar, e só então proíbe o resto.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

/**
 * Onde a varredura anda.
 *
 * Comecou so pelo painel (T-1) e alargou com a T-2/T-3, quando a captura e os 65
 * textos sairam. Alargar **antes** deixaria o teste vermelho por trabalho ainda
 * nao feito — e um teste vermelho por tarefa futura e um teste que se desliga.
 *
 * `app` inteiro cobre o painel **e** a web do paciente, que era onde a captura
 * vivia de facto.
 */
const ONDE = ["app", "components", "lib", "mobile/app", "mobile/src"];

/** O que nenhuma tela pode dizer. */
const PROIBIDAS = [
  /camera\s*ppg/i,
  /photoplethysmo/i,
  /scan to measure/i,
  /measure\s+(using|via|with)\s+(the\s+)?(phone\s+|mobile\s+)?camera/i,
  /medir\s+(pela|com a|usando a)\s+câmera/i,
];

function arquivos(): string[] {
  const achados: string[] = [];
  const anda = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        anda(p);
        continue;
      }
      if (/\.tsx?$/.test(nome)) achados.push(p);
    }
  };
  for (const base of ONDE) anda(path.join(RAIZ, base));
  return achados;
}

/**
 * O texto a julgar: sem comentários e **sem o identificador do histórico**.
 *
 * Os comentários contam a história da remoção, e castigar quem documentou é como
 * se aprende a não documentar.
 */
function textoJulgavel(p: string): string {
  return fs
    .readFileSync(p, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/CAMERA_PPG/g, "");
}

function relativo(p: string): string {
  return p.slice(RAIZ.length + 1).split(path.sep).join("/");
}

describe("o painel não oferece medir pela câmera", () => {
  it("**nenhuma tela do painel oferece**", () => {
    const culpadas: string[] = [];
    for (const p of arquivos()) {
      const texto = textoJulgavel(p);
      for (const proibida of PROIBIDAS) {
        if (proibida.test(texto)) culpadas.push(`${relativo(p)} → ${proibida}`);
      }
    }
    expect(culpadas).toEqual([]);
  });

  it("**nem a palavra solta** — era assim que ela aparecia no diálogo", () => {
    // `PPG` sozinho, fora do identificador, é sempre texto de tela.
    const culpadas = arquivos()
      .filter((p) => /\bPPG\b/.test(textoJulgavel(p)))
      .map(relativo);
    expect(culpadas).toEqual([]);
  });

  it("a varredura lê mesmo os arquivos — senão aprova o vazio", () => {
    expect(arquivos().length).toBeGreaterThan(200);
  });

  it("**a tela do paciente não pede a câmera**", () => {
    // A captura vivia aqui: acesso à câmera, flash, análise do sinal. Mil e
    // duzentas linhas, num arquivo de duas mil.
    const fonte = fs.readFileSync(
      path.join(RAIZ, "app", "dashboard", "blood-pressure", "page.tsx"),
      "utf8"
    );
    const codigo = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(codigo).not.toMatch(/getUserMedia|videoRef|torch|facingMode/i);
  });

  it("**e continua a aceitar a leitura de um aparelho**", () => {
    // Tirar a câmera não podia tirar o caminho que sobrou. Se a tela deixar de
    // gravar, isto cai — e era fácil de acontecer, cortando mil linhas.
    const fonte = fs.readFileSync(
      path.join(RAIZ, "app", "dashboard", "blood-pressure", "page.tsx"),
      "utf8"
    );
    // Procurado **dentro** do `handleManualSubmit`, e nao no arquivo inteiro: a
    // primeira versao deste teste passava com a gravacao quebrada, porque a
    // string `method: "MANUAL"` tambem aparece na declaracao do tipo da leitura.
    // Foi a mutacao que apanhou — o teste que nao morre nao mede nada.
    const i = fonte.indexOf("const handleManualSubmit");
    expect(i).toBeGreaterThan(0);
    const corpo = fonte.slice(i, i + 1200);
    expect(corpo).toContain("saveReading(");
    expect(corpo).toContain('method: "MANUAL"');
  });
});

describe("mas a leitura antiga continua a aparecer", () => {
  it("**o crachá ainda sabe desenhar `CAMERA_PPG`**", () => {
    // Uma leitura medida por câmera não vira uma leitura digitada porque o
    // produto mudou de ideia. Se alguém apagar isto para "limpar", a tela passa
    // a mentir sobre a origem de leituras que existem no banco.
    const fonte = fs.readFileSync(
      path.join(RAIZ, "app", "admin", "blood-pressure", "page.tsx"),
      "utf8"
    );
    expect(fonte).toContain('CAMERA_PPG');
  });

  it("e o enum continua a ter o valor", () => {
    const schema = fs.readFileSync(path.join(RAIZ, "prisma", "schema.prisma"), "utf8");
    expect(schema).toContain("CAMERA_PPG");
  });
});
