/**
 * @jest-environment node
 *
 * A videochamada e o desfazer, **medidos pelo comportamento**.
 *
 * ## Por que este arquivo existe
 *
 * O code review de 27/09/2026 disse a coisa mais útil do dia sobre os meus
 * testes: dos 60 que eu tinha escrito para esta frente, **três** executavam
 * código. Todo o resto era `expect(fonte).toMatch(/.../)` contra o texto do
 * arquivo. Dois exemplos do custo, palavras dele:
 *
 * - `expect(rota).not.toMatch(/role === "ADMIN"|isAdmin|SUPERADMIN/)` era a prova
 *   inteira de que "um admin não entra". **Passaria igual se a rota não tivesse
 *   autorização nenhuma.**
 * - `expect(regra).toMatch(/await deleteR2Url\(doc\.fileUrl\)/)` "provava" que o
 *   arquivo era apagado do storage, enquanto aquela chamada era um no-op
 *   garantido.
 *
 * E o QA, no mesmo dia, viu um desses testes ficar vermelho porque uma
 * refatoração renomeou uma variável — grafia, não comportamento.
 *
 * Os três casos abaixo foram indicados pelo review, e **um deles reprovava na
 * versão de ontem**: `apagarRecadoDoPaciente` com o `deleteMany` devolvendo
 * zero destruía o áudio e dizia ao paciente que a clínica já tinha visto.
 */

import { VideoCallError, criarSalaDaConsulta, tokenParaEntrar } from "@/lib/video-call";

const ORIGINAL = { ...process.env };
const AS_15 = new Date("2026-10-01T15:00:00.000Z");

beforeEach(() => {
  process.env.DAILY_API_KEY = "chave-de-teste";
  process.env.VIDEO_CALLS_ENABLED = "true";
});
afterEach(() => {
  process.env = { ...ORIGINAL };
  jest.restoreAllMocks();
});

/** Uma resposta da Daily, sem subir rede. */
const resposta = (ok: boolean, corpo: unknown, status = ok ? 200 : 400) =>
  ({ ok, status, json: async () => corpo, text: async () => JSON.stringify(corpo) }) as any;

describe("o token só sai dentro da janela — e é isso que ele promete", () => {
  it("**onze minutos antes, não sai**", async () => {
    const fetchSpy = jest.spyOn(global, "fetch" as any);
    await expect(
      tokenParaEntrar({
        appointmentId: "c1",
        dateTime: AS_15,
        duracaoMin: 60,
        nome: "Ana",
        ehTerapeuta: false,
        agora: new Date("2026-10-01T14:49:00.000Z"),
      })
    ).rejects.toMatchObject({ code: "too_early", status: 409 });

    // E o mais importante: **nada saiu para a rede**. Uma recusa que já falou
    // com o provedor não é uma recusa, é um efeito colateral.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("**trinta e um minutos depois do fim, também não**", async () => {
    await expect(
      tokenParaEntrar({
        appointmentId: "c1",
        dateTime: AS_15,
        duracaoMin: 60,
        nome: "Ana",
        ehTerapeuta: false,
        agora: new Date("2026-10-01T16:31:00.000Z"),
      })
    ).rejects.toMatchObject({ code: "too_late" });
  });

  it("e dentro da janela o token carrega `nbf`, `exp` e o dono certo", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValue(resposta(true, { token: "tok-123" }));

    const tok = await tokenParaEntrar({
      appointmentId: "c1",
      dateTime: AS_15,
      duracaoMin: 60,
      nome: "Dra. Maria",
      ehTerapeuta: true,
      agora: AS_15,
    });

    expect(tok).toBe("tok-123");
    const corpo = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
    expect(corpo.properties.room_name).toBe("consulta-c1");
    // A janela, em segundos desde a época — dez antes, trinta depois do fim.
    expect(corpo.properties.nbf).toBe(Math.floor(AS_15.getTime() / 1000) - 600);
    expect(corpo.properties.exp).toBe(Math.floor(AS_15.getTime() / 1000) + 90 * 60);
    // Dono é quem atende: é quem admite e remove.
    expect(corpo.properties.is_owner).toBe(true);
  });

  it("**e o paciente nunca é dono da própria consulta**", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValue(resposta(true, { token: "t" }));

    await tokenParaEntrar({
      appointmentId: "c1",
      dateTime: AS_15,
      duracaoMin: 60,
      nome: "Ana",
      ehTerapeuta: false,
      agora: AS_15,
    });

    const corpo = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
    expect(corpo.properties.is_owner).toBe(false);
  });
});

describe("a sala reagendada deixa de ficar morta", () => {
  it("**sala existente com `exp` velho é atualizada**", async () => {
    /**
     * O defeito: o nome é derivado do id da consulta e o `exp` era gravado só na
     * criação. Reagendar não tocava na Daily, então a sala de terça reencontrava
     * a de segunda, expirada — e com `eject_at_room_exp`, quem entrasse era
     * expulso. Como o nome é determinístico, **toda** tentativa caía na mesma
     * sala morta.
     */
    const fetchSpy = jest
      .spyOn(global, "fetch" as any)
      // 1. POST /rooms → 400, já existe
      .mockResolvedValueOnce(resposta(false, { error: "already-exists" }))
      // 2. GET /rooms/<nome> → a sala velha
      .mockResolvedValueOnce(
        resposta(true, { name: "consulta-c1", url: "https://bpr.daily.co/consulta-c1", config: { exp: 111 } })
      )
      // 3. POST /rooms/<nome> → atualizada
      .mockResolvedValueOnce(
        resposta(true, { name: "consulta-c1", url: "https://bpr.daily.co/consulta-c1", config: { exp: 999 } })
      );

    const sala = await criarSalaDaConsulta({ appointmentId: "c1", dateTime: AS_15, duracaoMin: 60 });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const [url, init] = fetchSpy.mock.calls[2] as any;
    expect(String(url)).toContain("/rooms/consulta-c1");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).properties.exp).toBe(Math.floor(AS_15.getTime() / 1000) + 90 * 60);
    expect(sala.url).toContain("consulta-c1");
  });

  it("e sala existente com o `exp` certo não é tocada de novo", async () => {
    const certo = Math.floor(AS_15.getTime() / 1000) + 90 * 60;
    const fetchSpy = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValueOnce(resposta(false, { error: "already-exists" }))
      .mockResolvedValueOnce(
        resposta(true, { name: "consulta-c1", url: "u", config: { exp: certo } })
      );

    await criarSalaDaConsulta({ appointmentId: "c1", dateTime: AS_15, duracaoMin: 60 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("**a sala nasce privada, com sala de espera, e sem nada de gravação**", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValue(resposta(true, { name: "consulta-c1", url: "u" }));

    await criarSalaDaConsulta({ appointmentId: "c1", dateTime: AS_15, duracaoMin: 60 });

    const corpo = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
    expect(corpo.privacy).toBe("private");
    expect(corpo.properties.eject_at_room_exp).toBe(true);
    // Sala de espera: sem ela, tocar em "Entrar agora" já punha a pessoa no ar.
    expect(corpo.properties.enable_prejoin_ui).toBe(true);
    // Nenhuma propriedade de gravação, de propósito (092 T-5).
    expect(Object.keys(corpo.properties).filter((k) => /record/i.test(k))).toEqual([]);
  });

  it("e sem chave o erro diz isso, em vez de falar com a Daily", async () => {
    process.env.DAILY_API_KEY = "";
    const fetchSpy = jest.spyOn(global, "fetch" as any);
    await expect(
      criarSalaDaConsulta({ appointmentId: "c1", dateTime: AS_15, duracaoMin: 60 })
    ).rejects.toBeInstanceOf(VideoCallError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
