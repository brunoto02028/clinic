/**
 * @jest-environment node
 */
import { ler, lerCodigo } from "../helpers/codigo";

/**
 * O paciente escolhe com quem marcar (102 T-5).
 *
 * O Bruno: *"o paciente pode querer agendar uma consulta com a reabilitação mas
 * ele pode escolher todos os profissionais disponíveis ali"*, e — sobre quem
 * aparece — *"a gente que dá essas permissões"*.
 */

const catalogo = lerCodigo("app", "api", "patient", "professionals", "route.ts");
const marcar = lerCodigo("app", "api", "appointments", "route.ts");
const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "escolher-profissional.tsx");
const lista = lerCodigo("mobile", "app", "(app)", "(clinica)", "(tabs)", "appointments.tsx");
const reserva = lerCodigo("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
const calendario = lerCodigo("mobile", "src", "components", "CalendarioDeAgenda.tsx");

describe("quem entra no catálogo", () => {
  it("**só quem pode aparecer no app**", () => {
    // Profissional intermediado, ligado por alguém, e com registro — a regra
    // mora em `podeAparecerNoApp` e não numa cláusula de `where` pela metade.
    expect(catalogo).toMatch(/visiveis = clinicas\.filter\(\(c\) => podeAparecerNoApp\(c\)\)/);
  });

  it("**e a clínica de reabilitação nunca entra**", () => {
    // Ela é a casa. Aparecer no catálogo seria a BPR se intermediando a si
    // mesma — `podeAparecerNoApp` já recusa, e é o mesmo teste da T-1.
    const { podeAparecerNoApp } = require("@/lib/tenant-type");
    expect(podeAparecerNoApp({ type: "CLINIC", visibleInApp: true })).toBe(false);
  });

  it("**prática sem quem atender não aparece**", () => {
    /**
     * Um cartão que abre uma agenda que nunca vai ter horário é "existe e não
     * leva a lugar nenhum" com outro nome.
     */
    expect(catalogo).toMatch(/professionals: profissionais\.filter\(\(p\) => p\.professionalUserId\)/);
  });

  it("o cartão traz o que se compara antes de tocar na agenda", () => {
    for (const campo of ["price", "languages", "registry", "videoOnly", "currency"]) {
      expect([campo, catalogo.includes(campo)]).toEqual([campo, true]);
    }
  });

  it("**e o preço vem do servidor, nunca da tela**", () => {
    expect(catalogo).toMatch(/price: await patientBookingPrice\(c\.id\)/);
  });

  it("**o idioma filtra de verdade**", () => {
    // *"Brasileiros que vivem no exterior e querem profissionais brasileiros"*
    // — é a razão de a pessoa escolher, não um detalhe no rodapé.
    expect(catalogo).toMatch(/searchParams\.get\("language"\)/);
    expect(catalogo).toMatch(/l\.toLowerCase\(\)\.startsWith\(idioma\.toLowerCase\(\)\)/);
  });
});

describe("marcar com quem foi escolhido", () => {
  it("**a rota aceita o profissional, e a regra de sempre vem primeiro**", () => {
    expect(marcar).toMatch(/const pedido = professionalId \|\| therapistId \|\| \(isPatient \? null : actor\.userId\)/);
    expect(marcar).toMatch(/resolverProfissional\(actor, pedido, isPatient\)/);
  });

  it("**a consulta nasce no inquilino de quem atende**", () => {
    /**
     * Era sempre `actor.clinicId` — o do paciente. Com um profissional de
     * fora, a consulta cairia na clínica errada: some da agenda de quem vai
     * atender, e aparece na de quem não vai.
     */
    expect(marcar).toMatch(/const clinicaDaConsulta = alvo\.clinicId/);
    expect(marcar).toMatch(/clinicId: clinicaDaConsulta,/);
  });

  it("e um profissional que não pode ser marcado responde 404", () => {
    expect(marcar).toMatch(/status: pedido \? 404 : 400/);
  });
});

describe("a agenda muda junto com o profissional", () => {
  it("**a tela de marcar carrega quem foi escolhido**", () => {
    expect(reserva).toMatch(/useLocalSearchParams<\{ professionalId\?: string \}>\(\)/);
    expect(reserva).toMatch(/fetchAvailability\(selectedDate!, janela, comProfissional\)/);
  });

  it("**e o calendário também** — senão os dois discordariam do mesmo dia", () => {
    expect(reserva).toMatch(/professionalId=\{comProfissional\}/);
    expect(calendario).toMatch(/fetchAgendaDoIntervalo\(comoTexto\(inicio\), comoTexto\(fim\), kind, professionalId\)/);
  });

  it("**e trocar de profissional refaz a busca**", () => {
    // Sem o id na chave, o React Query devolveria a agenda do anterior.
    expect(reserva).toMatch(/queryKey: \["availability", selectedDate, janela, comProfissional\]/);
    expect(calendario).toMatch(/professionalId \?\? null\]/);
  });

  it("o id vai junto ao marcar", () => {
    expect(reserva).toMatch(/\.\.\.\(comProfissional \? \{ professionalId: comProfissional \} : \{\}\)/);
  });
});

describe("a tela existe e alguém chega nela", () => {
  it("**tem botão na lista de consultas**", () => {
    // Sem isto o catálogo existiria e ninguém chegaria — a falha que a
    // varredura da 100 T-4 nasceu para pegar, agora no app.
    const cru = ler("mobile", "app", "(app)", "(clinica)", "(tabs)", "appointments.tsx");
    expect(cru).toMatch(/\/\(app\)\/\(clinica\)\/escolher-profissional/);
    expect(lista).toMatch(/testID="escolher-profissional"/);
  });

  it("**e marcar com a reabilitação continua a um toque**", () => {
    /**
     * Quem já sabe onde vai não pode ganhar uma escolha a mais no caminho.
     * Escolher profissional é um botão **ao lado**, não um passo antes.
     */
    expect(lista).toMatch(/router\.push\("\/book-appointment"\)/);
  });

  it("a escolha leva o id para a tela de marcar", () => {
    expect(tela).toMatch(/book-appointment\?professionalId=\$\{p\.professionalUserId\}/);
  });

  it("**e a tela não decide quem aparece**", () => {
    // Ela desenha o que veio. Nenhum filtro de visibilidade do lado do app.
    expect(tela).not.toMatch(/visibleInApp|podeAparecerNoApp/);
  });

  it("sem resultado, a tela diz o que fazer em vez de ficar vazia", () => {
    expect(tela).toMatch(/Turn the filter off to see everyone/);
    expect(tela).toMatch(/No professionals are available right now/);
  });
});

describe("o que o code review pegou", () => {
  /**
   * Trocar a clínica da consulta não bastava: o **preço** e a **conferência de
   * vaga** continuavam saindo de `actor.clinicId`, a clínica de quem marca.
   *
   * Com um profissional do catálogo isso cobraria o preço da BPR por uma
   * consulta de médico, e conferiria a vaga na agenda errada — duas coisas que
   * só apareceriam quando alguém marcasse de verdade.
   *
   * No caminho de sempre os dois valores são o mesmo, então nada muda para a
   * reabilitação.
   */
  it("**o preço é o de quem atende**", () => {
    expect(marcar).toMatch(/patientBookingPrice\(clinicaDaConsulta, patientId\)/);
    expect(marcar).not.toMatch(/patientBookingPrice\(actor\.clinicId, patientId\)/);
  });

  it("**e a vaga é conferida na agenda dele**", () => {
    expect(marcar).toMatch(/exceptionForDate\(clinicaDaConsulta, selectedTherapistId/);
    expect(marcar).toMatch(/hasConfiguredSchedule\(clinicaDaConsulta, selectedTherapistId/);
    expect(marcar).toMatch(/slotsForDate\(clinicaDaConsulta, selectedTherapistId/);
  });

  it("**nenhuma decisão sobre a consulta usa mais a clínica de quem marca**", () => {
    /**
     * A asserção que teria pego sozinha: entre resolver quem atende e criar a
     * linha, `actor.clinicId` não pode aparecer.
     */
    const inicio = marcar.indexOf("const clinicaDaConsulta = alvo.clinicId");
    const trecho = marcar.slice(
      // Depois da própria linha que o define — ela cita `alvo.clinicId`, não
      // `actor.clinicId`, mas a busca cruaria a fronteira sem isto.
      inicio + "const clinicaDaConsulta = alvo.clinicId;".length,
      marcar.indexOf("const appointment = await prisma.appointment.create")
    );
    /**
     * `markAsClinicPatient` é a única exceção legítima: ela é sobre o paciente
     * virar paciente **da BPR**, e não sobre a consulta. Fica nomeada aqui em
     * vez de silenciada, para a próxima exceção precisar de uma linha e de um
     * motivo.
     */
    const semAExcecao = trecho.replace(/await markAsClinicPatient\([^)]*\);/g, "");
    expect(semAExcecao).not.toMatch(/actor\.clinicId/);
  });
});
