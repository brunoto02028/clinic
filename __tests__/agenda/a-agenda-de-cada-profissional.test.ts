/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";

/**
 * A agenda de cada profissional (102 T-4).
 *
 * ## A dívida que esta tarefa paga
 *
 * `/api/availability` respondia pela **clínica**, e isso foi deliberado: passar
 * o id de quem estava logado fazia o painel e o app discordarem sobre o mesmo
 * dia, e um segundo terapeuta sem janela própria via a semana inteira fechada.
 * A saída foi tirar o id, e a dívida ficou escrita na agenda em 28/09:
 * *"modelar agenda por pessoa é outra atividade"*.
 *
 * ## O que já estava pronto, e eu fui conferir antes
 *
 * `ScheduleWindow` e `ScheduleException` já têm `therapistId`, e
 * `disponibilidadeDoDia` já filtra por ele. Quem não configurou janela já cai
 * no modelo antigo e, sem ele também, responde `not_working` — então
 * profissional sem agenda **já** não era oferecido.
 *
 * O que faltava era um caso só: o paciente alcançar a agenda de **outro
 * inquilino**.
 */

const acesso = lerCodigo("lib", "appointment-access.ts");
const rota = lerCodigo("app", "api", "availability", "route.ts");
const dia = lerCodigo("lib", "availability-day.ts");
const slots = lerCodigo("lib", "schedule.ts");

describe("o paciente alcança a agenda de outro inquilino", () => {
  it("**e só por estar no catálogo**", () => {
    // Nem por estar na plataforma, nem por ser profissional: por alguém da BPR
    // ter ligado, com registro, como manda `podeAparecerNoApp`.
    expect(acesso).toMatch(/if \(!podeAparecerNoApp\(pessoa\.clinic\)\) return null/);
  });

  it("**quem pede tem de ser paciente**", () => {
    // Equipe da BPR não marca com profissional de fora por aqui: quem escolhe
    // é a pessoa.
    expect(acesso).toMatch(/if \(!professionalUserId \|\| actor\.role !== "PATIENT"\) return null/);
  });

  it("dentro de casa, nada muda", () => {
    // `findTherapist` continua sendo a primeira pergunta, e a de sempre.
    expect(acesso).toMatch(/const daCasa = await findTherapist\(actor\.clinicId, professionalUserId, bookableOnly\)/);
    expect(acesso).toMatch(/if \(daCasa\) return \{ therapistId: daCasa\.id, clinicId: actor\.clinicId \}/);
  });

  it("**e a `clinicId` que vale é a do profissional, não a de quem pediu**", () => {
    /**
     * A agenda, o feriado e o expediente são dele. Usar a clínica de quem
     * pergunta responderia com os horários da BPR sob o nome de um médico.
     */
    expect(rota).toMatch(/const clinicId = alvo\.clinicId/);
    expect(rota).not.toMatch(/const clinicId = actor!\.clinicId!/);
  });

  it("inativo, não-atendente ou sem registro não resolve", () => {
    expect(acesso).toMatch(/isActive: true/);
    expect(acesso).toMatch(/role: \{ in: \[\.\.\.STAFF_ROLES\] \}/);
  });
});

describe("o fuso é o de quem atende", () => {
  /**
   * O Bruno: *"brasileiros que vivem no exterior e querem profissionais
   * brasileiros"* — que é exatamente o caso em que os dois fusos diferem. Um
   * médico no Brasil escrevendo "09:00" quer dizer nove da manhã **dele**, e
   * ler isso como nove de Londres põe a consulta quatro horas fora do lugar.
   */
  it("**o resolvedor devolve o fuso do profissional**", () => {
    expect(acesso).toMatch(/timezone: true/);
    expect(acesso).toMatch(/timeZone: pessoa\.clinic\.timezone/);
  });

  it("**e a rota o passa nas duas formas de pedir**", () => {
    const ocorrencias = (rota.match(/timeZone: alvo\.timeZone/g) || []).length;
    // Um dia e um intervalo. Passar só numa faria o calendário e a tela de
    // horários discordarem sobre o mesmo dia.
    expect(ocorrencias).toBe(2);
  });

  it("**o padrão continua sendo o de sempre**", () => {
    /**
     * `timeZone` é opcional em toda a cadeia, e os helpers já caem em
     * `CLINIC_TIMEZONE`. Sem ele, o comportamento da BPR é byte a byte o de
     * antes — que é a única forma de mexer em código de marcação que está no ar.
     */
    expect(dia).toMatch(/timeZone\?: string;/);
    expect(slots).toMatch(/timeZone\?: string \} = \{\}/);
  });

  it("e ele chega a todos os lugares que convertem hora", () => {
    // Um ponto esquecido converte metade do dia no fuso errado, que é pior que
    // converter o dia inteiro errado: ninguém percebe.
    expect(dia).toMatch(/zonedTimeToUtc\(dateStr, "00:00", opts\.timeZone\)/);
    expect(dia).toMatch(/getZonedDateString\(new Date\(\), opts\.timeZone\)/);
    expect(dia).toMatch(/getZonedMinutesOfDay\(a\.dateTime, opts\.timeZone\)/);
    expect(slots).toMatch(/zonedTimeToUtc\(dateStr, "00:00", opts\.timeZone\)/);
    expect(slots).toMatch(/zonedTimeToUtc\(dateStr, "23:59", opts\.timeZone\)/);
    expect(slots).toMatch(/getZonedMinutesOfDay\(a\.dateTime, opts\.timeZone\)/);
  });
});

describe("quem não configurou agenda não é oferecido", () => {
  /**
   * Isto já era verdade e eu fui conferir antes de escrever código: sem janela
   * configurada cai no modelo antigo, e sem ele também responde `not_working`.
   * O teste existe para que continue verdade.
   */
  it("**sem janela e sem o modelo antigo, o dia não está disponível**", () => {
    expect(dia).toMatch(/if \(!availability \|\| !availability\.isAvailable\) \{[\s\S]{0,120}reason: "not_working"/);
  });

  it("e dia bloqueado vence a agenda semanal", () => {
    expect(dia).toMatch(/reason: "blocked"/);
  });
});
