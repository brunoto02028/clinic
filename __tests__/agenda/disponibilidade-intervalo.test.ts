/**
 * @jest-environment node
 *
 * Disponibilidade por intervalo (087, T-2).
 *
 * O Bruno quer um calendário que mostre onde tem vaga **antes** de tocar em
 * cada dia. Hoje a rota responde um dia por chamada: pintar duas semanas
 * custaria catorze idas, um mês trinta e uma.
 *
 * O risco desta tarefa não é o intervalo — é **a resposta de um dia mudar**.
 * Ela alimenta a tela de horários que já está no aparelho de alguém, e a regra
 * que a produz tem seis pedaços, cada um consertado depois de um defeito real.
 * Por isso a regra foi movida inteira, sem uma vírgula alterada, e é isso que
 * a primeira parte destes testes guarda.
 */

import fs from "fs";
import path from "path";
import { diasEntre, MAX_DIAS_NO_INTERVALO } from "@/lib/availability-day";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

const lib = ler("lib", "availability-day.ts");
const rota = ler("app", "api", "availability", "route.ts");

describe("a regra de um dia foi movida, não reescrita", () => {
  it.each([
    ["o dia bloqueado vence a agenda semanal", /reason: "blocked"/],
    ["a agenda configurada tem precedência", /hasConfiguredSchedule\(clinicId, therapistId, dateStr\)/],
    ["a data vai como texto, nunca como Date", /slotsForDate\(clinicId, therapistId, dateStr/],
    ["a exceção do dia vale nos dois modelos", /exceptionForDate\(clinicId, therapistId, dateStr\)/],
    ["fechado por exceção diz `closed`", /excecaoDoDia\?\.closed \? "closed" : "not_working"/],
    ["horário ocupado sai", /slotStart < range\.end && slotEnd > range\.start/],
    ["horário que já passou hoje sai", /if \(isToday && slotStart <= nowMinutes\) return false/],
    ["o modelo antigo continua como alternativa", /therapistAvailability\.findUnique/],
  ])("%s", (_nome, padrao) => {
    expect(lib).toMatch(padrao as RegExp);
  });

  it("os dois formatos de horário continuam saindo juntos", () => {
    // `slots` é o que a tela antiga lê; `detailedSlots` é o que a nova quer.
    // Tirar um dos dois quebraria um cliente que já está instalado.
    expect(lib).toMatch(/slots: slots\.map\(\(s: any\) => s\.time\)/);
    expect(lib).toMatch(/detailedSlots: slots/);
  });

  it("a rota devolve o dia **sem** embrulhar em nada", () => {
    // Um `{ dia: ... }` aqui seria uma forma nova para quem pede um dia — e é
    // exatamente o que esta tarefa não pode fazer.
    expect(rota).toMatch(/const dia = await disponibilidadeDoDia\(/);
    expect(rota).toMatch(/return NextResponse\.json\(dia\);/);
  });

  it("e a regra não ficou também na rota", () => {
    // Duas cópias divergem na primeira correção, e a segunda é a que ninguém
    // lembra de corrigir.
    const r = semComentarios(rota);
    expect(r).not.toMatch(/therapistAvailability/);
    expect(r).not.toMatch(/slotsForDate/);
    expect(r).not.toMatch(/SLOT_INTERVAL_MINUTES/);
  });
});

describe("os dias de um intervalo", () => {
  it("inclui as duas pontas", () => {
    expect(diasEntre("2026-10-05", "2026-10-11")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });

  it("um dia só é um intervalo de um dia", () => {
    expect(diasEntre("2026-10-05", "2026-10-05")).toEqual(["2026-10-05"]);
  });

  it("atravessa a virada do mês", () => {
    expect(diasEntre("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  it("atravessa o fim do horário de verão sem pular nem repetir dia", () => {
    // No Reino Unido o relógio volta na madrugada de 25/10/2026. Somar 24h a
    // partir da meia-noite daria 25/10 duas vezes; por isso a conta é ancorada
    // ao meio-dia UTC.
    const dias = diasEntre("2026-10-23", "2026-10-27")!;
    expect(dias).toEqual(["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
    expect(new Set(dias).size).toBe(dias.length);
  });

  it("atravessa a virada do ano", () => {
    expect(diasEntre("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("aceita exatamente o limite", () => {
    const dias = diasEntre("2026-10-01", "2026-11-11");
    expect(dias).not.toBeNull();
    expect(dias!.length).toBe(MAX_DIAS_NO_INTERVALO);
  });
});

describe("o que o intervalo recusa", () => {
  it("um dia a mais que o limite", () => {
    // Sem teto, alguém pede um ano e a rota calcula 365 dias de agenda para
    // pintar bolinhas que ninguém vai ver.
    expect(diasEntre("2026-10-01", "2026-11-12")).toBeNull();
  });

  it("intervalo invertido", () => {
    expect(diasEntre("2026-10-11", "2026-10-05")).toBeNull();
  });

  it.each(["banana", "2026-13-01", "05/10/2026", "2026-10-5", "", "2026-10-05T00:00:00Z"])(
    "a data torta %s",
    (ruim) => {
      expect(diasEntre(ruim, "2026-10-11")).toBeNull();
      expect(diasEntre("2026-10-05", ruim)).toBeNull();
    }
  );

  it("e a rota devolve 400, não 500", () => {
    // Um pedido malformado é resposta do servidor sobre o pedido, não um erro
    // dele. 500 manda a tela mostrar "algo deu errado" para quem digitou torto.
    expect(rota).toMatch(/if \(!dias\) \{/);
    expect(rota).toMatch(/\{ status: 400 \}/);
  });
});

describe("o intervalo devolve contagem, não os horários", () => {
  it("a forma de cada dia é data, livres, fechado, motivo", () => {
    expect(lib).toMatch(/data,\s*livres: dia\.slots\.length,\s*fechado: !dia\.available/);
  });

  it("o motivo só aparece quando existe", () => {
    // Um `motivo: undefined` em trinta e um dias é ruído em toda resposta.
    expect(lib).toMatch(/\.\.\.\(dia\.reason \? \{ motivo: dia\.reason \} : \{\}\)/);
  });

  it("os dias são calculados em paralelo", () => {
    // Em série, sete dias são sete idas ao banco uma atrás da outra, e a
    // pessoa olha a semana carregar.
    expect(lib).toMatch(/await Promise\.all\(/);
  });

  it("e a rota diz de quem é a agenda que respondeu", () => {
    expect(rota).toMatch(/\{ dias: resposta, therapistId: therapist\.id \}/);
  });
});

describe("o tenant e a sessão continuam mandando", () => {
  it("sem sessão, nada", () => {
    expect(rota).toMatch(/if \(!effectiveUser\) \{[\s\S]{0,120}status: 401/);
  });

  it("o terapeuta é procurado dentro da clínica de quem chama", () => {
    // Um terapeuta de outro tenant tem de responder como um que não existe.
    expect(rota).toMatch(/findTherapist\(actor\.clinicId, therapistId, actor\.role === "PATIENT"\)/);
  });

  it("e sem clínica não se procura ninguém", () => {
    expect(rota).toMatch(/actor\?\.clinicId\s*\?[\s\S]{0,120}: null;/);
  });

  it("pedir sem data nenhuma é recusado antes de qualquer consulta", () => {
    const i = rota.indexOf("if (!dateStr && !(from && to))");
    const j = rota.indexOf("getActor(request)");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(j);
  });
});
