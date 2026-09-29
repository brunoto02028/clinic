/**
 * @jest-environment node
 *
 * O app não diz "Confirmada" para o que já passou (103 T-3).
 *
 * Ninguém fecha o que vence, então `CONFIRMED` sobrevive à consulta e o app
 * repetia fielmente — *"Confirmada"*, sobre uma consulta de três dias atrás.
 *
 * O app **não** decide que faltou: ninguém decidiu, e chamar de falta o que
 * pode ter sido remarcado por telefone seria pior que o erro anterior. O estado
 * honesto é um terceiro, *aguardando a clínica*.
 */
import type { CoresDoStatus } from "../../mobile/src/lib/appointment-status";
import {
  FOLGA_DEPOIS_MIN as FOLGA_DO_APP,
  STATUS_ABERTOS,
  statusStyle,
  venceuSemDesfecho,
} from "../../mobile/src/lib/appointment-status";
import { FOLGA_DEPOIS_MIN as FOLGA_DO_SERVIDOR } from "../../lib/video-call";
import { lerCodigo } from "../helpers/codigo";

// O cliente HTTP do aplicativo carrega armazenamento seguro e outras coisas
// de aparelho. Nada aqui faz rede: o que se mede são regras puras.
jest.mock("../../mobile/src/api/client", () => ({ apiFetch: jest.fn() }));

const MIN = 60_000;
const AGORA = new Date("2026-09-29T15:00:00Z").getTime();
/** Uma consulta de 60 minutos que começou às `h` horas antes de agora. */
const comecouHa = (horas: number) => new Date(AGORA - horas * 60 * MIN).toISOString();

/** Tema falso: o que importa aqui é qual cor foi escolhida, não qual é.
 *  Sem `as any`: se o helper voltar a exigir o tema inteiro, isto quebra. */
const tema: CoresDoStatus = {
  colors: {
    warnSoft: "warnSoft", warn: "warn",
    okSoft: "okSoft", ok: "ok",
    surfaceMuted: "surfaceMuted", textMuted: "textMuted",
    badSoft: "badSoft", bad: "bad",
  },
};

describe("a consulta que venceu, no aplicativo", () => {
  it("a folga do app é a mesma do servidor", () => {
    // Um número diferente aqui faria o app chamar de vencida uma consulta que
    // o painel ainda considera em curso.
    expect(FOLGA_DO_APP).toBe(FOLGA_DO_SERVIDOR);
  });

  it("**uma consulta confirmada de ontem não diz mais 'Confirmada'**", () => {
    const s = statusStyle(tema, "CONFIRMED", "en", {
      dateTime: comecouHa(24),
      duration: 60,
      agora: AGORA,
    });
    expect(s.label).not.toMatch(/confirmed/i);
    expect(s.label).toBe("Awaiting the clinic");
  });

  it("e em português diz o mesmo", () => {
    const s = statusStyle(tema, "CONFIRMED", "pt", {
      dateTime: comecouHa(24),
      duration: 60,
      agora: AGORA,
    });
    expect(s.label).toBe("Aguardando a clínica");
  });

  it("o tom é neutro: nem o verde de confirmado, nem o vermelho de falta", () => {
    const vencida = statusStyle(tema, "CONFIRMED", "en", {
      dateTime: comecouHa(24), duration: 60, agora: AGORA,
    });
    const confirmada = statusStyle(tema, "CONFIRMED", "en");
    const faltou = statusStyle(tema, "NO_SHOW", "en");
    expect(vencida.text).not.toBe(confirmada.text);
    expect(vencida.text).not.toBe(faltou.text);
    expect(vencida.bg).toBe(tema.colors.surfaceMuted);
  });

  it("o app não afirma que a pessoa faltou — ninguém decidiu isso", () => {
    const s = statusStyle(tema, "CONFIRMED", "pt", {
      dateTime: comecouHa(72), duration: 60, agora: AGORA,
    });
    expect(s.label).not.toMatch(/faltou|não compareceu/i);
  });

  it("a consulta de hoje mais cedo ainda pode estar acontecendo, e não vence", () => {
    // 60 minutos de consulta + 30 de folga: em 1h10 ainda está dentro.
    expect(
      venceuSemDesfecho("CONFIRMED", new Date(AGORA - 70 * MIN).toISOString(), 60, AGORA)
    ).toBe(false);
  });

  it("vence no fim da janela, não no horário", () => {
    const inicio = new Date(AGORA - 95 * MIN).toISOString();
    expect(venceuSemDesfecho("CONFIRMED", inicio, 60, AGORA)).toBe(true);
  });

  it("a duração importa: a longa ainda está em curso quando a curta já venceu", () => {
    const inicio = new Date(AGORA - 100 * MIN).toISOString();
    expect(venceuSemDesfecho("CONFIRMED", inicio, 30, AGORA)).toBe(true);
    expect(venceuSemDesfecho("CONFIRMED", inicio, 120, AGORA)).toBe(false);
  });

  it("a consulta de amanhã continua confirmada", () => {
    const s = statusStyle(tema, "CONFIRMED", "en", {
      dateTime: new Date(AGORA + 24 * 60 * MIN).toISOString(),
      duration: 60,
      agora: AGORA,
    });
    expect(s.label).toBe("Confirmed");
  });

  it.each(["COMPLETED", "CANCELLED", "NO_SHOW"])(
    "%s já tem desfecho e continua como está, mesmo antigo",
    (status) => {
      const comData = statusStyle(tema, status, "en", {
        dateTime: comecouHa(72), duration: 60, agora: AGORA,
      });
      expect(comData).toEqual(statusStyle(tema, status, "en"));
    }
  );

  it("os status abertos do app são os mesmos que a fila do painel busca", () => {
    const fila = lerCodigo("app", "api", "admin", "appointments", "pending-outcome", "route.ts");
    for (const s of STATUS_ABERTOS) expect(fila).toContain(`"${s}"`);
  });

  it("sem data não inventa nada", () => {
    expect(venceuSemDesfecho("CONFIRMED", null, 60, AGORA)).toBe(false);
    expect(venceuSemDesfecho("CONFIRMED", "não é data", 60, AGORA)).toBe(false);
  });

  it("sem duração assume uma hora em vez de vencer na hora marcada", () => {
    const inicio = new Date(AGORA - 45 * MIN).toISOString();
    expect(venceuSemDesfecho("CONFIRMED", inicio, null, AGORA)).toBe(false);
  });
});

describe("um helper só decide, nas duas telas", () => {
  const lista = lerCodigo("mobile", "app", "(app)", "(clinica)", "(tabs)", "appointments.tsx");
  const detalhe = lerCodigo("mobile", "app", "(app)", "(clinica)", "appointment", "[id].tsx");

  it.each([
    ["a lista", lista],
    ["o detalhe", detalhe],
  ])("%s informa a data e a duração ao helper, e não só o status", (_nome, tela) => {
    // Sem isto o rótulo não tem como saber que a consulta venceu. Medido pelos
    // dados que a tela entrega, não pela formatação da chamada.
    const chamada = tela.slice(tela.indexOf("statusStyle("));
    expect(chamada).toMatch(/dateTime/);
    expect(chamada).toMatch(/duration/);
  });

  it.each([
    ["a lista", lista],
    ["o detalhe", detalhe],
  ])("%s chama o helper em vez de traduzir o status por conta própria", (_nome, tela) => {
    // As duas já divergiram uma vez — a história está no topo do helper.
    expect(tela).toContain("statusStyle(");
    expect(tela).not.toMatch(/CONFIRMED:\s*\{/);
  });
});

describe("a home não anuncia o que já passou", () => {
  it("a próxima sessão é uma que ainda não aconteceu", () => {
    const { nextUpcoming } = require("../../mobile/src/api/appointments");
    const passada = { id: "ontem", dateTime: comecouHa(24), status: "CONFIRMED" };
    const futura = { id: "amanha", dateTime: new Date(AGORA + 24 * 60 * MIN).toISOString(), status: "CONFIRMED" };
    expect(nextUpcoming([passada, futura])?.id).toBe("amanha");
    expect(nextUpcoming([passada])).toBeNull();
  });
});
