/**
 * @jest-environment node
 *
 * O tempo de viagem do atendimento em domicílio (109 T-3).
 *
 * O Bruno: *"como ela é longe que vou no home visit, levo 2h pra ir e 2h pra
 * voltar… pelo menos os slots não podem estar disponíveis naquele dia por conta
 * da ida e da volta. Podemos calcular por postcode?"*
 *
 * Um postcode não dá tempo de viagem — dá um ponto no mapa. O que este módulo
 * devolve é uma **sugestão**, e ela existe para uma decisão grossa: bloquear
 * uma hora, duas ou quatro de cada lado.
 */
import {
  coordenadasDoPostcode,
  distanciaKm,
  distritoDoPostcode,
  minutosDeViagem,
  postcodeDoTexto,
  sugerirMinutosDeViagem,
} from "@/lib/tempo-de-viagem";

/** Os dois pontos reais do caso que originou isto. */
const IPSWICH = { latitude: 52.0676, longitude: 1.1394 };
const TADWORTH = { latitude: 51.3016, longitude: -0.2411 };

describe("a distância", () => {
  it("IP1 até KT20 dá cerca de 128 km em linha reta", () => {
    expect(distanciaKm(IPSWICH, TADWORTH)).toBeCloseTo(127.7, 0);
  });

  it("o mesmo ponto dá zero", () => {
    expect(distanciaKm(IPSWICH, IPSWICH)).toBe(0);
  });

  it("a ordem não muda a distância", () => {
    expect(distanciaKm(IPSWICH, TADWORTH)).toBeCloseTo(distanciaKm(TADWORTH, IPSWICH), 6);
  });
});

describe("a sugestão de minutos", () => {
  it("**a viagem real do Bruno dá os 120 minutos que ele mede**", () => {
    // É o único ponto de calibração que existe, e os parâmetros vieram dele —
    // não de números redondos. A segunda viagem longa vale mais que a constante.
    expect(minutosDeViagem(distanciaKm(IPSWICH, TADWORTH))).toBe(120);
  });

  it("arredonda **para cima**, em blocos de quinze", () => {
    // Errar para menos põe o terapeuta na estrada com a agenda dizendo que ele
    // está livre. Errar para mais custa um horário.
    // 60 km dão 56,25 minutos crus — sobem para 60. 65 km dão 60,9 e sobem
    // para 75: um minuto a mais custa o bloco inteiro, de propósito.
    expect(minutosDeViagem(60)).toBe(60);
    expect(minutosDeViagem(65)).toBe(75);
  });

  it("uma visita ao lado não vira bloqueio nenhum", () => {
    // Abaixo de quinze minutos a viagem não muda a agenda, e sugerir um número
    // seria ruído.
    // 2 km dão menos de dois minutos crus. Arredondar antes de cortar levava
    // isso a 15 minutos de bloqueio — o corte nunca disparava.
    expect(minutosDeViagem(2)).toBe(0);
    expect(minutosDeViagem(0)).toBe(0);
    // E o limite: 16 km dão 15 minutos crus, que já contam.
    expect(minutosDeViagem(16)).toBe(15);
  });

  it("uma visita na cidade ao lado dá meia hora", () => {
    expect(minutosDeViagem(25)).toBe(30);
  });
});

describe("achar o postcode onde ele estiver", () => {
  it("**lê o postcode de dentro do endereço em texto livre**", () => {
    // O caso real: o campo `postcode` da paciente está vazio e o dado está no
    // meio da linha do endereço. Ler o texto é melhor que desistir.
    expect(postcodeDoTexto("8 South Tadworth Farm Close, KT20 5BF")).toBe("KT20 5BF");
  });

  it("aceita minúsculas e sem espaço", () => {
    expect(postcodeDoTexto("kt205bf")).toBe("KT20 5BF");
  });

  it("junta os pedaços do endereço", () => {
    expect(postcodeDoTexto("8 South Tadworth Farm Close", "Tadworth", "KT20 5BF")).toBe("KT20 5BF");
  });

  it("sem postcode nenhum devolve nulo, e não um palpite", () => {
    expect(postcodeDoTexto("Rua das Flores, 100")).toBeNull();
    expect(postcodeDoTexto(null, undefined, "")).toBeNull();
  });

  it("o distrito sozinho serve quando o resto não veio", () => {
    expect(distritoDoPostcode("KT20 5BF")).toBe("KT20");
    expect(distritoDoPostcode("ip1")).toBe("IP1");
    expect(distritoDoPostcode(null)).toBeNull();
  });
});

describe("quando o serviço não responde, ninguém fica sem marcar", () => {
  const falso = (corpo: any, ok = true) =>
    (async () => ({ ok, json: async () => corpo })) as unknown as typeof fetch;

  it("resolve um postcode completo", async () => {
    const p = await coordenadasDoPostcode("KT20 5BF", falso({ result: { latitude: 51.3, longitude: -0.24 } }));
    expect(p).toEqual({ latitude: 51.3, longitude: -0.24 });
  });

  it("**o distrito sozinho usa a outra porta do serviço**", async () => {
    // A clínica tem "IP1", e não o código completo. Pedir na porta errada
    // devolveria 404 e a estimativa sumiria sem motivo aparente.
    let pedido = "";
    const espiao = (async (url: string) => {
      pedido = url;
      return { ok: true, json: async () => ({ result: { latitude: 52, longitude: 1 } }) };
    }) as unknown as typeof fetch;
    await coordenadasDoPostcode("IP1", espiao);
    expect(pedido).toContain("/outcodes/");
    expect(pedido).not.toContain("/postcodes/");
  });

  it("serviço fora do ar devolve nulo, não exceção", async () => {
    const quebrado = (async () => {
      throw new Error("rede");
    }) as unknown as typeof fetch;
    expect(await coordenadasDoPostcode("KT20 5BF", quebrado)).toBeNull();
  });

  it("postcode que não existe devolve nulo", async () => {
    expect(await coordenadasDoPostcode("ZZ99 9ZZ", falso({}, false))).toBeNull();
  });

  it("resposta estranha devolve nulo", async () => {
    expect(await coordenadasDoPostcode("KT20 5BF", falso({ result: { latitude: "muito" } }))).toBeNull();
  });

  it("**sem os dois lados, a sugestão é nula — e isso é uma resposta**", async () => {
    // A tela pede o número à pessoa em vez de inventar um.
    const so_um = (async (url: string) =>
      url.includes("KT20")
        ? { ok: true, json: async () => ({ result: { latitude: 51.3, longitude: -0.24 } }) }
        : { ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    expect(await sugerirMinutosDeViagem("IP1", "KT20 5BF", so_um)).toBeNull();
  });
});
