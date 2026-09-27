import { lerCodigo } from "../helpers/codigo";

/**
 * O calendário diz onde ainda cabe alguém (095 T-8, 27/09/2026).
 *
 * Pedido do Bruno: *"No calendário, quero que o paciente veja mais informações,
 * como dias disponíveis para consulta e dias e horários disponíveis para ele
 * reservar para o tratamento… Ver como fica isso do lado do paciente, no app e
 * da Clinic."*
 *
 * ## O que já existia
 *
 * A disponibilidade por intervalo veio na 087: `/api/availability?from=&to=`
 * devolve **quantos** horários cada dia tem, e o `CalendarioDeAgenda` do app já
 * pinta a semana e o mês com isso, respeitando bloqueio e separando consulta de
 * tratamento pelo `kind`.
 *
 * ## O que faltava, dos dois lados
 *
 * No **app**: o calendário dizia onde havia vaga e não dizia o que a pessoa já
 * tinha. Quem vai marcar pergunta as duas coisas ao mesmo tempo, e sem a
 * segunda marca duas na mesma tarde e descobre depois.
 *
 * No **painel**: a agenda mostrava só o que já foi marcado. A pergunta que se
 * faz ao telefone, com um paciente esperando, é a outra — *"onde ainda cabe?"*.
 *
 * E as duas telas passam a ler **a mesma rota**: se discordassem sobre um dia,
 * seria por estarem olhando fontes diferentes.
 */

const calendario = lerCodigo("mobile", "src", "components", "CalendarioDeAgenda.tsx");
const marcar = lerCodigo("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");
const rota = lerCodigo("app", "api", "availability", "route.ts");

describe("o app mostra o que a pessoa já tem", () => {
  it("o calendário aceita os dias dela", () => {
    expect(calendario).toMatch(/meusDias\?: \{ data: string; porVideo: boolean \}\[\]/);
    expect(calendario).toContain("const meu = (data: string)");
  });

  it("e a tela de marcar passa os dias, sem os cancelados", () => {
    // Cancelada não conta: o dia volta a estar livre, e uma marca nele faria a
    // pessoa achar que já tem compromisso onde não tem.
    expect(marcar).toMatch(/a\.status !== "CANCELLED" && a\.status !== "NO_SHOW"/);
    expect(marcar).toMatch(/meusDias=\{meusDias\}/);
  });

  it("a marca é uma barra, não outra bolinha", () => {
    // A bolinha já significa vaga. Duas bolinhas na mesma célula seriam duas
    // formas iguais dizendo coisas diferentes.
    expect(calendario).toMatch(/height: 2\.5/);
    expect(calendario).toMatch(/porVideo \? t\.colors\.work : t\.colors\.health/);
  });

  it("e a data é local, nunca UTC", () => {
    // `toISOString()` devolve UTC: uma consulta das 00h30 cairia no dia
    // anterior na grade.
    expect(marcar).not.toMatch(/dateTime\)\.toISOString\(\)/);
    expect(marcar).toMatch(/d\.getFullYear\(\)/);
  });
});

describe("o painel mostra onde ainda cabe", () => {
  it("busca a mesma rota que o app", () => {
    expect(agenda).toMatch(/\/api\/availability\?from=/);
    expect(rota).toMatch(/from && to/);
  });

  it("e mostra o número no cabeçalho do dia", () => {
    expect(agenda).toContain("const [vagasPorDia, setVagasPorDia]");
    expect(agenda).toMatch(/livres === 0 \? \(isPt \? "cheio" : "full"\)/);
  });

  it("zero aparece — 'cheio' é uma resposta", () => {
    // A ausência do número não é resposta nenhuma: quem olha não sabe se está
    // cheio ou se a tela não carregou.
    expect(agenda).toMatch(/if \(livres === undefined\) return null;/);
  });

  it("e dia bloqueado não vira 'livre'", () => {
    expect(agenda).toMatch(/dia\.fechado \? null : dia\.livres/);
    expect(agenda).toMatch(/livres === null\) return <p[^>]*>\{isPt \? "fechado" : "closed"\}/);
  });
});
