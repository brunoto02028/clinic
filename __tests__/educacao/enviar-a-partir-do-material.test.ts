/**
 * @jest-environment node
 *
 * Enviar começa no material (096 T-6).
 *
 * O Bruno: *"temos os artigos ali, mas eu não sei como encaminhar a um paciente
 * em específico ou a todos. Quando vou em atribuir está vazia a página."*
 *
 * **As peças já existiam todas** — importar sem duplicar, atribuir a um, enviar
 * a todos, enviar por condição, e a prévia com a contagem (`dryRun`). O que
 * faltava era **achar**: saía-se do material, ia-se a uma tela separada, e lá
 * escolhia-se o material outra vez.
 *
 * E a tela de atribuições lista o que **já foi** atribuído — numa clínica que
 * ainda não atribuiu nada, abre vazia. Ele leu certo: *uma tela vazia que não
 * diz o que fazer é indistinguível de uma quebrada.* Essa metade já tinha sido
 * corrigida num lote anterior, e este teste guarda-a.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

function ler(...partes: string[]): string {
  return fs.readFileSync(path.join(RAIZ, ...partes), "utf8");
}

function codigo(...partes: string[]): string {
  return ler(...partes)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const DIALOGO = ["components", "admin", "enviar-material.tsx"];
const LISTA = ["app", "admin", "education", "page.tsx"];

describe("a porta está no material", () => {
  it("**o cartão do material tem o botão de enviar**", () => {
    const c = codigo(...LISTA);
    expect(c).toContain("EnviarMaterial");
    expect(c).toMatch(/contentId=\{item\.id\}/);
  });

  it("**os três destinos existem**", () => {
    // "Quem tem a condição" é o achado da tarefa: a capacidade existe no
    // servidor e não tinha porta nenhuma. Mandar um artigo de isquiotibial
    // para toda a clínica é ruído.
    const c = codigo(...DIALOGO);
    expect(c).toMatch(/"um", "One patient"/);
    expect(c).toMatch(/"todos", "Everyone"/);
    expect(c).toMatch(/"condicao", "Whoever has the condition"/);
  });

  it("**a contagem vem da prévia do servidor, antes de escolher**", () => {
    // Descobrir o tamanho depois de clicar é como se manda um artigo a trinta
    // e quatro pessoas sem querer. O `dryRun` já existia e não tinha quem o
    // chamasse.
    const c = codigo(...DIALOGO);
    expect(c).toContain("dryRun: true");
    expect(c).toMatch(/previa\.wouldSend/);
  });

  it("**não dá para enviar antes de a contagem dizer que alcança alguém**", () => {
    // Um "Send" activo com zero destinatários é um botão que não faz nada e
    // não diz porquê.
    const c = codigo(...DIALOGO);
    expect(c).toMatch(/previa\?\.wouldSend \?\? 0\) > 0/);
    expect(c).toMatch(/disabled=\{!podeEnviar\}/);
  });

  it("um paciente vai pela rota de atribuição; muitos, pela de envio", () => {
    const c = codigo(...DIALOGO);
    expect(c).toContain("/api/admin/education/assignments");
    expect(c).toContain("/api/admin/education/send");
  });
});

describe("enviar não é avisar", () => {
  it("**o diálogo não dispara aviso nenhum**", () => {
    // Atribuir põe o material na área do paciente; avisar é um segundo ato,
    // com a sua própria prévia. A casa decidiu que nada alcança ninguém sem
    // alguém ver antes, e separar os dois é o que mantém isso verdadeiro.
    const c = codigo(...DIALOGO);
    expect(c).not.toContain("/notify");
    expect(c).not.toMatch(/notifyPatient|sendTemplatedEmail/);
  });

  it("e o aviso continua a ser o outro botão, ao lado", () => {
    expect(codigo(...LISTA)).toContain("AvisarMaterial");
  });
});

describe("a tela de atribuições vazia explica", () => {
  const vazia = () => ler("app", "admin", "education", "assignments", "page.tsx");

  it("**sem material, diz que o primeiro passo é trazer artigos**", () => {
    const c = vazia();
    expect(c).toMatch(/No material in the clinic yet|Nenhum material na clínica ainda/);
    expect(c).toMatch(/Bring articles from the site|Trazer artigos do site/);
  });

  it("**com material e sem atribuição, diz qual é o passo que falta**", () => {
    const c = vazia();
    expect(c).toMatch(/No assignments yet|Nenhuma atribuição ainda/);
    expect(c).toMatch(/that is what makes it appear in the patient|o faz aparecer no aplicativo do paciente/);
  });
});
