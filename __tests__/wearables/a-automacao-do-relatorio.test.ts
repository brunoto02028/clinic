jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo, ler } from "../helpers/codigo";
import {
  diasDoPeriodo,
  fimDoPeriodo,
  inicioDoPeriodo,
} from "@/lib/patient-report-schedule";

/**
 * A automação do relatório (099 T-5, 28/09/2026).
 *
 * ## As três coisas que costumam virar uma só
 *
 * **Gerar** é cálculo sobre o que já está no prontuário. **Disponibilizar** no
 * app é o produto: a pessoa abre e está lá — ela buscando, não nós enviando.
 * **Avisar** é a única das três que toca alguém sem ela pedir.
 *
 * O Bruno pediu a automação completa. O que a separa de um disparo em massa no
 * primeiro dia é `Clinic.autoReportsEnabled`, que nasce desligada: ele vê
 * funcionando como paciente de teste e então liga para a clínica inteira.
 */

describe("o período, ancorado", () => {
  it("o diário é ontem", () => {
    const i = inicioDoPeriodo("DAILY", new Date("2026-09-28T09:00:00Z"))!;
    expect(i.toISOString().slice(0, 10)).toBe("2026-09-27");
    expect(diasDoPeriodo("DAILY")).toBe(1);
  });

  it("**o semanal é a segunda-feira da semana passada**", () => {
    /**
     * Âncora fixa, e não "sete dias atrás".
     *
     * 28/09/2026 é segunda e 04/10 é o domingo seguinte — a mesma semana. As
     * duas datas têm de produzir o **mesmo** período, senão o relatório de uma
     * semana mudaria conforme o dia em que a rodada acordasse.
     */
    const segunda = inicioDoPeriodo("WEEKLY", new Date("2026-09-28T09:00:00Z"))!;
    const domingo = inicioDoPeriodo("WEEKLY", new Date("2026-10-04T23:00:00Z"))!;
    expect(segunda.toISOString().slice(0, 10)).toBe("2026-09-21");
    expect(domingo.toISOString().slice(0, 10)).toBe("2026-09-21");
  });

  it("e a semana seguinte é outro período", () => {
    const proxima = inicioDoPeriodo("WEEKLY", new Date("2026-10-05T09:00:00Z"))!;
    expect(proxima.toISOString().slice(0, 10)).toBe("2026-09-28");
  });

  it("e a mesma semana dá sempre o mesmo início, a qualquer hora do dia", () => {
    const manha = inicioDoPeriodo("WEEKLY", new Date("2026-09-28T00:05:00Z"))!;
    const noite = inicioDoPeriodo("WEEKLY", new Date("2026-09-28T23:55:00Z"))!;
    expect(manha.getTime()).toBe(noite.getTime());
  });

  it("NONE não tem período", () => {
    expect(inicioDoPeriodo("NONE")).toBeNull();
  });

  it("o fim é o início mais a janela", () => {
    const i = inicioDoPeriodo("WEEKLY", new Date("2026-09-28T09:00:00Z"))!;
    const f = fimDoPeriodo("WEEKLY", i);
    expect((f.getTime() - i.getTime()) / 86400000).toBe(7);
  });
});

describe("a rodada", () => {
  const agenda = lerCodigo("lib", "patient-report-schedule.ts");
  const schema = ler("prisma", "schema.prisma");

  it("**não faz nada com a chave da clínica desligada**", () => {
    expect(agenda).toMatch(/where: \{ autoReportsEnabled: true/);
    expect(schema).toMatch(/autoReportsEnabled\s+Boolean\s+@default\(false\)/);
  });

  it("**rodar duas vezes não duplica**", () => {
    // O agendador roda de hora em hora e um contêiner reiniciado repete a
    // janela. Sem a chave única, a pessoa acordaria com quatro relatórios da
    // mesma semana.
    expect(schema).toMatch(/@@unique\(\[patientId, cadence, periodStart\]\)/);
    expect(agenda).toMatch(/patientId_cadence_periodStart/);
  });

  it("nulo na pessoa quer dizer 'o que a clínica decidiu'", () => {
    // Ligar para todo mundo é uma chave só, e quem precisa de exceção tem.
    expect(agenda).toMatch(/p\.reportCadence \?\? clinica\.defaultReportCadence/);
  });

  it("quem nunca virou paciente de verdade não recebe", () => {
    expect(agenda).toMatch(/isClinicPatient: true/);
  });

  it("e um paciente que falha não leva os outros junto", () => {
    expect(agenda).toMatch(/r\.falhas\+\+/);
  });

  it("**a rodada não envia nada**", () => {
    expect(agenda).not.toMatch(/notifyPatient|sendEmail|pushConsulta|sendTemplatedEmail/);
  });
});

describe("o relatório guardado é um retrato", () => {
  const schema = ler("prisma", "schema.prisma");
  const rota = lerCodigo("app", "api", "patient", "reports", "[id]", "route.ts");

  it("o HTML é guardado, não recalculado a cada leitura", () => {
    /**
     * Se fosse gerado de novo, o relatório de janeiro mudaria quando um dado
     * de janeiro fosse corrigido em março — e quem leu o primeiro nunca
     * saberia que leu outra coisa.
     */
    expect(schema).toMatch(/html\s+String\s+@db\.Text/);
    expect(rota).toMatch(/select: \{ html: true/);
    expect(rota).not.toMatch(/renderPatientReportHTML/);
  });

  it("**o relatório de outra pessoa não abre**", () => {
    // O `patientId` entra no `where`, e não numa checagem depois: um id de
    // outra pessoa não devolve linha nenhuma, e o 404 sai sozinho.
    expect(rota).toMatch(/where: \{ id: params\.id, patientId: userId \}/);
  });

  it("e o link assinado é a porta do navegador do telefone", () => {
    // O navegador não carrega o bearer — foi o que fez o documento clínico
    // aparecer na lista e não abrir, em silêncio.
    expect(rota).toMatch(/verifyFileToken\(req\.nextUrl\.searchParams\.get\("t"\), params\.id\)/);
    const mw = lerCodigo("middleware.ts");
    expect(mw).toMatch(/'\/api\/patient\/reports\/'/);
  });
});

describe("a tela da clínica, e a do paciente", () => {
  const painel = lerCodigo("app", "admin", "biohacking", "page.tsx");
  const rota = lerCodigo("app", "api", "admin", "monitoring", "reports", "route.ts");
  const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "reports.tsx");

  it("**ligar diz quantas pessoas isso alcança, antes de perguntar**", () => {
    // Ligar sem saber o número seria ligar no escuro.
    expect(rota).toMatch(/patientsAffected: pacientesAtivos/);
    expect(painel).toMatch(/Turn automatic reports on for \$\{auto\.patientsAffected\}/);
  });

  it("e a tela diz que estar disponível não é ser enviado", () => {
    expect(painel).toMatch(/Nothing is pushed to them unless they/);
  });

  it("ligar gera a primeira rodada na hora", () => {
    // Quem acabou de ligar quer ver acontecer, não esperar a hora cheia.
    expect(rota).toMatch(/gerarRelatoriosVencidos\(\{ clinicId: actor\.clinicId! \}\)/);
  });

  it("a tela do paciente **não promete diagnóstico**", () => {
    expect(tela).toMatch(/They are not a diagnosis/);
    expect(tela).toMatch(/Não são um diagnóstico/);
  });

  it("e a lista vazia explica, em vez de ficar vazia", () => {
    expect(tela).toMatch(/The first one arrives at the end of the period/);
  });

  it("o trabalho roda sozinho, sem depender de cron externo", () => {
    const jobs = lerCodigo("lib", "background-jobs.ts");
    expect(jobs).toMatch(/generateDuePatientReports/);
    expect(jobs).toMatch(/PATIENT_REPORTS_INTERVAL_MS/);
  });
});
