import { ler, lerCodigo } from "../helpers/codigo";

/**
 * O caminho até a consulta por vídeo (095 T-2, 27/09/2026).
 *
 * O Bruno não achou onde ver nem como testar. A funcionalidade estava inteira:
 * a agenda cria com modo vídeo, mostra selo, e tem os botões de entrar e
 * chamar; `/admin/video-consultations` agenda e lista.
 *
 * Duas coisas explicam não ter achado. A agenda dele é de **presenciais** — não
 * havia selo nenhum para ver — e **não existia como transformar uma consulta já
 * marcada**: o modo só aparecia na criação, então a única saída era apagar e
 * remarcar, perdendo horário e histórico.
 *
 * Uma tela que só tem conteúdo depois que alguém já soube usá-la não ensina
 * ninguém. É isso que estes testes prendem.
 */

const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");
const rota = lerCodigo("app", "api", "appointments", "[id]", "route.ts");
const painel = lerCodigo("app", "admin", "video-consultations", "page.tsx");

describe("virar uma consulta já marcada para vídeo", () => {
  it("a rota aceita o modo, e só ele entre os campos novos", () => {
    expect(rota).toMatch(/if \(body\?\.mode !== undefined\)/);
    expect(rota).toMatch(/updateData\.mode = body\.mode/);
  });

  it("e recusa qualquer valor que não seja um dos dois", () => {
    expect(rota).toMatch(/body\.mode !== "IN_PERSON" && body\.mode !== "VIDEO"/);
    expect(rota).toMatch(/mode must be IN_PERSON or VIDEO/);
  });

  it("o paciente continua só podendo cancelar", () => {
    // A guarda existente recusa qualquer campo que não seja `status:
    // CANCELLED` vindo do paciente — inclusive este. Mudar o formato do próprio
    // atendimento é decisão de quem atende.
    expect(rota).toMatch(/Patients can only cancel appointments/);
  });

  it("o formulário de edição tem o formato, nos dois estados", () => {
    expect(agenda).toMatch(/mode: "IN_PERSON" as "IN_PERSON" \| "VIDEO"/);
    expect(agenda).toMatch(/setEditForm\(\{ \.\.\.editForm, mode: "VIDEO" \}\)/);
    expect(agenda).toMatch(/setEditForm\(\{ \.\.\.editForm, mode: "IN_PERSON" \}\)/);
  });

  it("e abrir o diálogo traz o modo da consulta, não um palpite", () => {
    // Consulta antiga não tem `mode` gravado: ela é presencial.
    const vezes = (agenda.match(/mode: appointment\.mode === "VIDEO"|mode: a\.mode === "VIDEO"/g) || []).length;
    expect(vezes).toBe(2); // o botão Edit e a célula do calendário
  });

  it("o que foi editado chega ao servidor", () => {
    expect(agenda).toMatch(/mode: editForm\.mode,/);
  });
});

describe("achar as que já existem", () => {
  it("há um filtro de só-vídeo", () => {
    expect(agenda).toMatch(/const \[soVideo, setSoVideo\]/);
    expect(agenda).toMatch(/const matchesModo = !soVideo \|\| a\.mode === "VIDEO"/);
  });

  it("e ele conta quantas são, inclusive quando são zero", () => {
    // "Tenho alguma hoje?" é a pergunta mais comum, e um filtro que não conta
    // obriga a ligá-lo para descobrir que não há nada.
    expect(agenda).toMatch(/appointments\.filter\(\(a\) => a\.mode === "VIDEO"\)\.length/);
  });
});

describe("a tela vazia ensina", () => {
  it("diz os dois caminhos, em vez de só oferecer um botão", () => {
    expect(painel).toMatch(/There are two ways in/);
    expect(painel).toMatch(/change its format to Remote/);
  });

  it("e leva à agenda, que é o outro caminho", () => {
    const cru = ler("app", "admin", "video-consultations", "page.tsx");
    expect(cru).toMatch(/href="\/admin\/appointments"/);
  });

  it("tem um atalho de teste, com a hora já preenchida", () => {
    expect(painel).toContain("const agendarTeste = ()");
    expect(painel).toMatch(/Date\.now\(\) \+ 5 \* 60000/);
    expect(painel).toMatch(/TEST — video call/);
  });

  it("mas **não** inventa um paciente", () => {
    /**
     * Criar paciente por botão encheria a lista de gente que não existe, e a
     * regra da casa é que QA usa paciente de teste **identificado** — quem
     * identifica é quem sabe qual é. O atalho preenche a hora; a pessoa é
     * escolhida por quem clica.
     */
    // Fatiado até a última linha da própria função: 800 caracteres cegos
    // alcançavam o código vizinho, e o teste acusava o `fetch` de outra coisa.
    const i = painel.indexOf("const agendarTeste = ()");
    const acao = painel.slice(i, painel.indexOf("setShowDialog(true);", i));
    expect(acao).not.toMatch(/patientId: "/);
    expect(acao).not.toMatch(/fetch\(/);
  });

  it("e diz a janela da sala, que é o que mais confunde", () => {
    expect(painel).toMatch(/opens ten minutes before .* closes thirty after/);
  });
});
