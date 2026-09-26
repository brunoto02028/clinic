/**
 * @jest-environment node
 *
 * Cidade por IP (085, T-2).
 *
 * Decisão do Bruno: **cidade, não GPS**. GPS custaria prompt no aparelho, texto
 * de propósito, mudança na ficha de privacidade da App Store e um build novo —
 * a permissão vive no `app.json`, e mexer ali muda o fingerprint e corta a
 * entrega de updates.
 *
 * O que estes testes guardam: que isto **nunca atrapalha quem está usando o
 * app**, e que o IP cru não vira dado guardado.
 */

import { cidadeDoIp, ehPrivado, ipDaRequisicao, limparCacheDeIp } from "../../lib/geo-ip";

const req = (h: Record<string, string>) => ({ headers: { get: (n: string) => h[n] ?? null } });

const original = process.env.GEOIP_URL;
beforeEach(() => {
  limparCacheDeIp();
  jest.restoreAllMocks();
  process.env.GEOIP_URL = "https://exemplo.test/{ip}";
});
afterAll(() => {
  if (original === undefined) delete process.env.GEOIP_URL;
  else process.env.GEOIP_URL = original;
});

describe("o IP de quem chamou", () => {
  it("vem do primeiro endereço do `x-forwarded-for`", () => {
    expect(ipDaRequisicao(req({ "x-forwarded-for": "81.2.69.142, 10.0.0.1" }))).toBe("81.2.69.142");
  });

  it("cai no `x-real-ip` quando não há encaminhamento", () => {
    expect(ipDaRequisicao(req({ "x-real-ip": "81.2.69.142" }))).toBe("81.2.69.142");
  });

  it("e é `null` quando não há nenhum dos dois", () => {
    expect(ipDaRequisicao(req({}))).toBeNull();
  });
});

describe("desenvolvimento não é uma cidade", () => {
  it.each(["127.0.0.1", "::1", "10.0.0.5", "192.168.1.192", "172.16.0.1", "172.31.255.1", "fe80::1"])(
    "%s é privado",
    (ip) => expect(ehPrivado(ip)).toBe(true)
  );

  it.each(["81.2.69.142", "8.8.8.8", "172.32.0.1", "2001:4860:4860::8888"])(
    "%s é público",
    (ip) => expect(ehPrivado(ip)).toBe(false)
  );

  it("IP privado não vira consulta nenhuma", async () => {
    const f = jest.spyOn(global, "fetch" as any);
    expect(await cidadeDoIp("192.168.1.192")).toEqual({ city: null, country: null });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("sem provedor configurado, nada sai daqui", () => {
  it("sem `GEOIP_URL`, devolve vazio sem chamar nada", async () => {
    delete process.env.GEOIP_URL;
    const f = jest.spyOn(global, "fetch" as any);
    expect(await cidadeDoIp("81.2.69.142")).toEqual({ city: null, country: null });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("quando resolve", () => {
  const responder = (body: any) =>
    jest.spyOn(global, "fetch" as any).mockResolvedValue({ ok: true, json: async () => body } as any);

  it("devolve cidade e país", async () => {
    responder({ city: "London", country: "United Kingdom" });
    expect(await cidadeDoIp("81.2.69.142")).toEqual({ city: "London", country: "United Kingdom" });
  });

  it("aceita os nomes alternativos dos provedores gratuitos", async () => {
    responder({ city_name: "Lisboa", country_name: "Portugal" });
    expect(await cidadeDoIp("81.2.69.142")).toEqual({ city: "Lisboa", country: "Portugal" });
  });

  it("o mesmo IP não é consultado duas vezes no mesmo dia", async () => {
    const f = responder({ city: "London", country: "GB" });
    await cidadeDoIp("81.2.69.142");
    await cidadeDoIp("81.2.69.142");
    await cidadeDoIp("81.2.69.142");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("e é consultado de novo depois de um dia", async () => {
    const f = responder({ city: "London", country: "GB" });
    const t0 = Date.now();
    await cidadeDoIp("81.2.69.142", t0);
    await cidadeDoIp("81.2.69.142", t0 + 25 * 60 * 60 * 1000);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("o IP entra na URL do provedor, escapado", async () => {
    const f = responder({ city: "London" });
    await cidadeDoIp("81.2.69.142");
    expect(f.mock.calls[0][0]).toBe("https://exemplo.test/81.2.69.142");
  });
});

describe("nunca atrapalha quem está usando o app", () => {
  it("provedor fora do ar devolve vazio, não lança", async () => {
    jest.spyOn(global, "fetch" as any).mockRejectedValue(new Error("ECONNREFUSED"));
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(cidadeDoIp("81.2.69.142")).resolves.toEqual({ city: null, country: null });
    erro.mockRestore();
  });

  it("resposta não-ok devolve vazio", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({ ok: false } as any);
    expect(await cidadeDoIp("81.2.69.142")).toEqual({ city: null, country: null });
  });

  it("JSON quebrado devolve vazio", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("não é json");
      },
    } as any);
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await cidadeDoIp("81.2.69.142")).toEqual({ city: null, country: null });
    erro.mockRestore();
  });

  it("há tempo limite — isto acontece enquanto alguém abre o app", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "geo-ip.ts"), "utf8");
    expect(src).toMatch(/AbortController/);
    expect(src).toMatch(/setTimeout\(\(\) => controle\.abort\(\), 2000\)/);
  });
});

describe("o IP cru não vira dado guardado", () => {
  it("a sessão grava cidade e país, e nenhum campo de IP", () => {
    const fs = require("fs");
    const path = require("path");
    const schema = fs.readFileSync(path.join(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");
    const i = schema.indexOf("model AppSession {");
    const bloco = schema.slice(i, schema.indexOf("}", i));
    expect(bloco).toMatch(/city\s+String\?/);
    expect(bloco).toMatch(/country\s+String\?/);
    expect(bloco).not.toMatch(/\bip\b|ipAddress/i);
  });

  it("e a rota resolve a cidade só quando a sessão nasce", () => {
    const fs = require("fs");
    const path = require("path");
    const rota = fs.readFileSync(
      path.join(__dirname, "..", "..", "app", "api", "mobile", "session", "ping", "route.ts"),
      "utf8"
    );
    // Função, não valor: um sinal a cada três minutos não pode consultar o
    // provedor para descartar a resposta.
    expect(rota).toMatch(/resolverLocal: \(\) => cidadeDoIp\(ipDaRequisicao\(request\)\)/);
  });
});
