/**
 * @jest-environment node
 *
 * O intervalo entre um paciente e o próximo (109 T-1).
 *
 * O Bruno: *"eu preciso de um gap entre um horário e outro. Se eu tenho uma
 * consulta, normalmente é de uma hora, uma hora e meia, e aí mais um intervalo
 * de um ou outro paciente aparecer… **para nunca marcar e deixar a paciente
 * esperando**."*
 *
 * A ocupação usava exatamente a duração: uma de 60 minutos às 10:00 liberava as
 * 11:00 em ponto, sem um minuto para o paciente sair, a sala ser arrumada, a
 * anotação ser feita, ou cinco minutos de atraso serem absorvidos.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    scheduleWindow: { findMany: jest.fn() },
    scheduleException: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
    clinic: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { slotsForDate } from "@/lib/schedule";
import { zonedTimeToUtc } from "@/lib/clinic-timezone";

const db = prisma as any;
const DIA = "2026-10-05"; // uma segunda-feira

/** Uma janela de consulta das 09:00 às 13:00, de hora em hora. */
const janela = (over: any = {}) => ({
  startTime: "09:00",
  endTime: "13:00",
  kind: "CONSULTATION",
  capacity: 1,
  slotMinutes: 60,
  ...over,
});

const consultaAs = (hora: string, duracao = 60, viagem: number | null = null) => ({
  dateTime: zonedTimeToUtc(DIA, hora),
  duration: duracao,
  travelMinutes: viagem,
});

const horarios = async (opts: any = {}) =>
  (await slotsForDate("c1", "t1", DIA, opts)).map((s) => s.time);

beforeEach(() => {
  jest.resetAllMocks();
  db.scheduleWindow.findMany.mockResolvedValue([janela()]);
  db.scheduleException.findMany.mockResolvedValue([]);
  db.appointment.findMany.mockResolvedValue([]);
  db.clinic.findUnique.mockResolvedValue({ bufferMinutes: 0 });
});

describe("sem intervalo, nada muda", () => {
  it("o dia vazio oferece todas as horas da janela", async () => {
    expect(await horarios()).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("**uma consulta de 60 às 10:00 tira só as 10:00**", async () => {
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00")]);
    expect(await horarios()).toEqual(["09:00", "11:00", "12:00"]);
  });

  it("uma de 90 às 10:00 já tirava as 11:00 — a sobreposição sempre foi real", async () => {
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00", 90)]);
    expect(await horarios()).toEqual(["09:00", "12:00"]);
  });
});

describe("com intervalo de 15 minutos", () => {
  beforeEach(() => db.clinic.findUnique.mockResolvedValue({ bufferMinutes: 15 }));

  it("**a consulta das 10:00 tira os dois vizinhos**", async () => {
    /**
     * 10:00–11:00 mais quinze minutos de cada lado ocupa 09:45–11:15.
     *
     * Numa grade de 60 minutos isso apaga as 09:00 **e** as 11:00, porque não
     * existe uma casa de 10:15 ou 11:15 para oferecer no lugar. É duro, e é a
     * verdade da grade: quem quiser recuperar meia hora escolhe
     * `slotMinutes: 30`, não um intervalo menor.
     */
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00")]);
    expect(await horarios()).toEqual(["12:00"]);
  });

  it("**o intervalo vale dos dois lados**", async () => {
    // Marcar 09:00–10:00 encostaria em 10:00 sem folga nenhuma. É o mesmo
    // paciente esperando, só que do outro lado do relógio.
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00")]);
    expect(await horarios()).not.toContain("09:00");
  });

  it("numa grade de 30 minutos a folga aparece no lugar certo", async () => {
    // Com casas de meia hora, 09:00–09:30 acaba 15 minutos antes das 09:45 e
    // continua sendo oferecido — que é o ponto do intervalo.
    db.scheduleWindow.findMany.mockResolvedValue([janela({ slotMinutes: 30 })]);
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00")]);
    const livres = await horarios();
    expect(livres).toContain("09:00");
    expect(livres).not.toContain("09:30");
    expect(livres).toContain("11:30");
    expect(livres).not.toContain("11:00");
  });

  it("**o último horário do dia não some**", async () => {
    // O intervalo separa consultas; ele não encurta o expediente. Se tivesse de
    // caber dentro da janela, as 12:00 desapareceriam por causa de um intervalo
    // que cai depois do fim do dia.
    expect(await horarios()).toContain("12:00");
  });
});

describe("o intervalo grande fecha o dia em volta", () => {
  it("com 60 minutos, a consulta das 10:00 deixa só as 12:00", async () => {
    db.clinic.findUnique.mockResolvedValue({ bufferMinutes: 60 });
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00")]);
    expect(await horarios()).toEqual(["12:00"]);
  });
});

describe("a duração pedida entra na conta", () => {
  it("**marcar 90 minutos numa grade de 60 precisa dos 90 livres**", async () => {
    // Sem isto, o candidato era medido pela casa da grade: 11:00 parecia livre
    // para uma consulta de 90 minutos que iria até 12:30, em cima da das 12:00.
    db.appointment.findMany.mockResolvedValue([consultaAs("12:00")]);
    expect(await horarios({ duracaoMin: 90 })).not.toContain("11:00");
  });

  it("e a de 60 continua cabendo no mesmo lugar", async () => {
    db.appointment.findMany.mockResolvedValue([consultaAs("12:00")]);
    expect(await horarios({ duracaoMin: 60 })).toContain("11:00");
  });
});

describe("a consulta tem de caber na janela, não só começar nela", () => {
  it("**uma avaliação de duas horas não é oferecida às 12:00**", async () => {
    // A janela fecha às 13:00. Começar dentro do expediente não é o mesmo que
    // caber nele — e quem descobre a diferença é quem fica esperando.
    expect(await horarios({ duracaoMin: 120 })).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("numa grade de 15 minutos, a de duas horas para às 11:00", async () => {
    db.scheduleWindow.findMany.mockResolvedValue([janela({ slotMinutes: 15 })]);
    const livres = await horarios({ duracaoMin: 120 });
    expect(livres[livres.length - 1]).toBe("11:00");
    expect(livres).not.toContain("12:45");
  });

  it("e a de 30 minutos continua chegando até as 12:30", async () => {
    db.scheduleWindow.findMany.mockResolvedValue([janela({ slotMinutes: 15 })]);
    const livres = await horarios({ duracaoMin: 30 });
    expect(livres[livres.length - 1]).toBe("12:30");
  });
});

describe("a grade que o Bruno vai usar", () => {
  /**
   * Casas de 15 minutos, intervalo de 10, avaliação de 120 e retorno de 30.
   *
   * O Bruno: *"eu não consigo fazer uma avaliação boa com menos de uma hora,
   * uma hora e meia. Normalmente vou deixar sempre uma boa avaliação duas horas
   * de slot. O retorno pode ser 30 minutos. O intervalo entre os pacientes, aí
   * a gente pode seguir esse padrão normal."*
   *
   * A grade de 15 existe por causa do intervalo: com casas de 30, um retorno
   * das 10:00 acabaria às 10:30 e a próxima vaga real seria 10:40 — que não
   * existiria para ser oferecida.
   */
  beforeEach(() => {
    db.scheduleWindow.findMany.mockResolvedValue([janela({ slotMinutes: 15 })]);
    db.clinic.findUnique.mockResolvedValue({ bufferMinutes: 10 });
  });

  it("**o retorno das 10:00 libera as 10:45, e não as 10:30**", async () => {
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00", 30)]);
    const livres = await horarios({ duracaoMin: 30 });
    expect(livres).not.toContain("10:30");
    expect(livres).toContain("10:45");
    // E do outro lado: 09:30–10:00 encostaria sem folga.
    expect(livres).not.toContain("09:30");
    expect(livres).toContain("09:15");
  });

  it("a avaliação de duas horas das 09:00 libera as 11:15", async () => {
    db.appointment.findMany.mockResolvedValue([consultaAs("09:00", 120)]);
    const livres = await horarios({ duracaoMin: 30 });
    expect(livres).not.toContain("11:00");
    expect(livres).toContain("11:15");
  });
});

describe("o domicílio ocupa a ida e a volta", () => {
  /**
   * O Bruno: *"como ela é longe que vou no home visit, levo 2h pra ir e 2h pra
   * voltar… pelo menos os slots não podem estar disponíveis naquele dia por
   * conta da ida e da volta."*
   *
   * Sem contar a viagem, a agenda oferecia horário com o terapeuta na estrada.
   */
  it("**duas horas de cada lado fecham o dia em volta da visita**", async () => {
    db.scheduleWindow.findMany.mockResolvedValue([
      janela({ startTime: "08:00", endTime: "20:00" }),
    ]);
    // Visita de uma hora às 13:00, com 120 minutos de viagem: ocupa 11:00–16:00.
    db.appointment.findMany.mockResolvedValue([consultaAs("13:00", 60, 120)]);
    const livres = await horarios();
    expect(livres).toContain("10:00");
    expect(livres).not.toContain("11:00");
    expect(livres).not.toContain("15:00");
    expect(livres).toContain("16:00");
  });

  it("sem viagem, a mesma consulta ocupa só a própria hora", async () => {
    db.scheduleWindow.findMany.mockResolvedValue([
      janela({ startTime: "08:00", endTime: "20:00" }),
    ]);
    db.appointment.findMany.mockResolvedValue([consultaAs("13:00", 60, null)]);
    const livres = await horarios();
    expect(livres).toContain("12:00");
    expect(livres).not.toContain("13:00");
    expect(livres).toContain("14:00");
  });

  it("a viagem **soma** ao intervalo, em vez de substituí-lo", async () => {
    // Chegar em casa e atender o próximo no mesmo minuto é o mesmo problema de
    // sempre, só que depois de quatro horas de estrada.
    db.clinic.findUnique.mockResolvedValue({ bufferMinutes: 30 });
    db.scheduleWindow.findMany.mockResolvedValue([
      janela({ startTime: "08:00", endTime: "20:00" }),
    ]);
    db.appointment.findMany.mockResolvedValue([consultaAs("13:00", 60, 120)]);
    const livres = await horarios();
    // 11:00 menos 30 de intervalo: as 10:00 (10:00–11:00) encostam em 10:30.
    expect(livres).not.toContain("10:00");
    expect(livres).toContain("09:00");
  });

  it("viagem negativa é tratada como zero", async () => {
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00", 60, -60)]);
    expect(await horarios()).toEqual(["09:00", "11:00", "12:00"]);
  });
});

describe("quando a leitura da clínica falha, ninguém fica sem agenda", () => {
  it("sem o valor, o dia é o de sempre", async () => {
    // Um intervalo que não se sabe qual é não pode derrubar a agenda inteira.
    db.clinic.findUnique.mockResolvedValue(null);
    expect(await horarios()).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("valor negativo é tratado como zero", async () => {
    db.clinic.findUnique.mockResolvedValue({ bufferMinutes: -30 });
    db.appointment.findMany.mockResolvedValue([consultaAs("10:00")]);
    expect(await horarios()).toEqual(["09:00", "11:00", "12:00"]);
  });
});
