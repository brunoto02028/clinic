import { lerCodigo } from "../helpers/codigo";

/**
 * A dor de um dia que já passou (095 T-7, 27/09/2026).
 *
 * Pedido do Bruno: *"Ali no Pain Trend por ex, quero que o paciente possa
 * relatar por data."*
 *
 * ## Metade já existia
 *
 * O registro por data entrou na 087: a rota aceita `checkinDate`, recusa o
 * futuro e para em catorze dias atrás — *"além disso não é lembrança, é
 * reconstrução"* —, e a tela do app tem o seletor de dia.
 *
 * ## A metade que faltava
 *
 * O gráfico não dizia **quando o ponto foi escrito**. Um ponto lançado uma
 * semana depois é memória, não medição: a dor lembrada é reconstruída, e quem
 * lê uma tendência para decidir tratamento precisa saber qual é qual.
 *
 * E não precisou de coluna nova: `createdAt` comparado com `checkinDate` já diz.
 */

const rota = lerCodigo("app", "api", "admin", "patients", "[id]", "wellbeing", "route.ts");
const grafico = lerCodigo("components", "admin", "patient-wellbeing-chart.tsx");
const rotaCheckin = lerCodigo("app", "api", "patient", "daily-checkin", "route.ts");
const telaCheckin = lerCodigo("mobile", "app", "(app)", "(clinica)", "daily-checkin.tsx");

describe("registrar um dia que passou", () => {
  it("a rota aceita a data, e nunca o futuro", () => {
    expect(rotaCheckin).toMatch(/pedida > today/);
    expect(rotaCheckin).toMatch(/You cannot check in for a future date/);
  });

  it("e para em catorze dias", () => {
    expect(rotaCheckin).toMatch(/You can only go back 14 days/);
  });

  it("a tela do app escolhe o dia", () => {
    expect(telaCheckin).toMatch(/const \[dia, setDia\]/);
  });

  it("e a resposta **diz** que substituiu (QA 7.4)", () => {
    // O `upsert` devolvia uma resposta idêntica à de um registro novo: nada
    // dizia que algo foi trocado. Quem corrige a dor de ontem merece saber que
    // corrigiu, e não ficar na dúvida se criou um segundo.
    expect(rotaCheckin).toMatch(/const jaHavia = await/);
    expect(rotaCheckin).toMatch(/substituiu: !!jaHavia/);
  });

  it("e o botão do app fala do dia escolhido, não de hoje (QA 7.4)", () => {
    // O rótulo lia `data?.today`: um dia passado com registro mostrava
    // "Salvar" quando ia substituir, e um dia passado vazio mostrava
    // "Atualizar" quando ia criar.
    expect(telaCheckin).toContain("const jaTemRegistro");
    expect(telaCheckin).toMatch(/: jaTemRegistro/);
  });

  it("e regravar o mesmo dia substitui, em vez de duplicar", () => {
    // A chave única é paciente + dia + período: manhã e noite são dois fatos,
    // e a segunda manhã do mesmo dia é correção da primeira.
    expect(rotaCheckin).toMatch(/patientId_checkinDate_period/);
  });
});

describe("o gráfico distingue o retroativo", () => {
  it("a rota diz quando o ponto foi escrito", () => {
    expect(rota).toMatch(/retroativo: getZonedDateString\(l\.createdAt\) > l\.checkinDate/);
  });

  it("e compara o **dia da clínica**, não o UTC", () => {
    /**
     * `toISOString()` devolve UTC, e o `checkinDate` é o dia de Londres. No
     * horário de verão isso abria **uma hora por dia** em que o retroativo se
     * disfarçava de medição: um registro escrito à 00h30 sobre o dia anterior
     * é 23h30Z do próprio dia, e a conta dava "não é retroativo".
     *
     * Achado pelo QA da 095 (7.6). A rota do check-in já usava o helper certo;
     * esta ficou para trás.
     */
    expect(rota).not.toMatch(/createdAt\.toISOString/);
    expect(rota).toMatch(/getZonedDateString/);
  });

  it("sem coluna nova — `createdAt` já sabia", () => {
    const schema = lerCodigo("prisma", "schema.prisma");
    expect(schema).not.toMatch(/retroativo\s+Boolean/);
  });

  it("o ponto retroativo é oco, e a forma é o que muda", () => {
    // Forma, e não cor: a cor da linha da dor já significa outra coisa, e
    // forma se distingue sem depender de enxergar bem.
    expect(grafico).toMatch(/payload\?\.retroativo \?/);
    expect(grafico).toMatch(/fill="#ffffff"/);
    // O cheio continua existindo: é o ponto do próprio dia.
    expect(grafico).toMatch(/r=\{2\} fill="#dc2626"/);
  });

  it("e existe legenda — mas só quando há um ponto assim", () => {
    // Explicar uma marca que não está na tela é ruído; não explicar a que
    // está é pior.
    expect(grafico).toMatch(/points\.some\(\(p\) => p\.retroativo\)/);
    expect(grafico).toMatch(/é memória, não medição do dia|memory, not that day's reading/);
  });
});
