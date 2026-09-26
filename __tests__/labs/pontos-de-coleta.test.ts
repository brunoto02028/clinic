/**
 * @jest-environment node
 *
 * Pontos de coleta pelo código postal (081, 26/09/2026).
 *
 * O Bruno: *"hoje o laboratório tem as farmácias, os pontos, que os usuários
 * podem ir até lá para retirar o sangue. Não é um, nem todos os exames serão
 * com o kit."* E: *"se o paciente já tem o cadastro dele no profile com o
 * endereço completo, isso precisa aparecer."*
 *
 * O que estes testes guardam é o **meio-caminho**: a busca da LML é por
 * coordenada, o cadastro tem código postal, e entre os dois há um serviço
 * externo que pode estar fora do ar. Cada elo que falha em silêncio devolve
 * uma tela vazia sem dizer por quê — e é isso que os quatro estados impedem.
 */

import fs from "fs";
import path from "path";
import {
  normalizarPostcode,
  ehPostcodeValido,
  postcodeDoCadastro,
  coordenadaDoPostcode,
  limparCacheDePostcode,
} from "@/lib/postcode";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

describe("o código postal é guardado numa forma só", () => {
  it.each([
    ["sw1a1aa", "SW1A 1AA"],
    ["SW1A 1AA", "SW1A 1AA"],
    ["  w1g   9qd ", "W1G 9QD"],
    ["m11ae", "M1 1AE"],
    ["ec1a 1bb", "EC1A 1BB"],
  ])("%s vira %s", (bruto, esperado) => {
    expect(normalizarPostcode(bruto)).toBe(esperado);
  });

  it.each([null, undefined, "", "12345", "não é um código", "SW1A"])("%s não é código postal", (bruto) => {
    expect(normalizarPostcode(bruto as string)).toBeNull();
    expect(ehPostcodeValido(bruto as string)).toBe(false);
  });
});

describe("quem se cadastrou antes de o campo existir", () => {
  it("o campo próprio ganha quando existe", () => {
    expect(postcodeDoCadastro({ postcode: "sw1a1aa", address: "12 Harley St, W1G 9QD" })).toBe("SW1A 1AA");
  });

  it("e sem ele, lemos o fim do endereço antigo", () => {
    // Até 26/09/2026 o app colava os dois numa string só. Migrar dado num banco
    // compartilhado custa mais do que ler os dois lugares.
    expect(postcodeDoCadastro({ postcode: null, address: "12 Harley Street, London, W1G 9QD" })).toBe("W1G 9QD");
  });

  it("o número da casa não é confundido com código postal", () => {
    expect(postcodeDoCadastro({ postcode: null, address: "221B Baker Street" })).toBeNull();
  });

  it("sem nenhum dos dois, é `null` — e não uma string vazia", () => {
    // String vazia iria para a busca e voltaria 404; `null` é o estado
    // "complete seu cadastro", que é outra tela.
    expect(postcodeDoCadastro({ postcode: null, address: null })).toBeNull();
  });
});

describe("a busca de coordenada não derruba a tela", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    limparCacheDePostcode();
  });

  it("devolve a coordenada quando o serviço responde", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { latitude: 51.5, longitude: -0.14, admin_district: "Westminster" } }),
    }) as unknown as typeof fetch;

    await expect(coordenadaDoPostcode("sw1a 1aa")).resolves.toEqual({
      lat: 51.5,
      long: -0.14,
      local: "Westminster",
    });
  });

  it("rede fora devolve `null` em vez de lançar", async () => {
    // Lançar aqui derrubaria a tela inteira por causa de um serviço de terceiro
    // — e o resto da tela (os passos, os três caminhos) não depende dele.
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    await expect(coordenadaDoPostcode("SW1A 1AA")).resolves.toBeNull();
  });

  it("um 404 também é `null`, e fica guardado", async () => {
    const f = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    global.fetch = f as unknown as typeof fetch;

    await expect(coordenadaDoPostcode("SW1A 1AA")).resolves.toBeNull();
    await expect(coordenadaDoPostcode("SW1A 1AA")).resolves.toBeNull();
    // Código postal inexistente continua inexistente: perguntar duas vezes é
    // gastar rede para ouvir o mesmo.
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("mas a falha de rede **não** fica guardada", async () => {
    // O problema era do momento, não do código postal. Guardar o `null` aqui
    // deixaria a busca morta até o processo reiniciar.
    const f = jest
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { latitude: 1, longitude: 2 } }) });
    global.fetch = f as unknown as typeof fetch;

    await expect(coordenadaDoPostcode("M1 1AE")).resolves.toBeNull();
    await expect(coordenadaDoPostcode("M1 1AE")).resolves.toEqual({ lat: 1, long: 2, local: null });
  });

  it("forma inválida nem chega a virar chamada de rede", async () => {
    const f = jest.fn();
    global.fetch = f as unknown as typeof fetch;
    await expect(coordenadaDoPostcode("12345")).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("a chamada tem prazo", () => {
    expect(ler("lib", "postcode.ts")).toMatch(/AbortController/);
    expect(ler("lib", "postcode.ts")).toMatch(/PRAZO_MS = 2000/);
  });
});

describe("a rota diz **por que** a lista está vazia", () => {
  const rota = ler("app", "api", "mobile", "labs", "collection-points", "route.ts");

  it.each([
    "sem_postcode",
    "postcode_desconhecido",
    "laboratorio_desconectado",
    "ok",
  ])("o estado `%s` existe", (estado) => {
    expect(rota).toContain(`estado: "${estado}"`);
  });

  it("e é a mesma união no cliente do app", () => {
    const cliente = ler("mobile", "src", "api", "labs.ts");
    for (const estado of ["sem_postcode", "postcode_desconhecido", "laboratorio_desconectado", "ok"]) {
      expect(cliente).toContain(`"${estado}"`);
    }
  });

  it("sem token, o código postal conferido continua aparecendo", () => {
    // É a diferença entre "não temos nada seu" e "temos, e a conexão abre
    // depois". A segunda reconhece o que a pessoa acabou de cadastrar.
    const i = rota.indexOf('estado: "laboratorio_desconectado"');
    expect(rota.slice(i, i + 120)).toMatch(/postcode, local: coord\.local/);
  });

  it("exige o bearer do app", () => {
    expect(rota).toMatch(/getMobileUser\(request\)/);
    expect(rota).toMatch(/if \(!payload\) return corsJson\(\{ error: "Unauthorised" \}/);
  });
});

describe("o laboratório nunca lança para dentro da tela", () => {
  it("`nearestTestLocations` devolve `null` sem token", () => {
    const lml = ler("lib", "lml.ts");
    expect(lml).toMatch(/if \(!LML_KEY\) return null;/);
    // A URL vem do mapa da API deles: a busca é por coordenada.
    expect(lml).toMatch(/\/api\/test_location\/nearest\//);
  });

  it("e também quando a chamada falha", () => {
    const lml = ler("lib", "lml.ts");
    const i = lml.indexOf("export async function nearestTestLocations");
    expect(lml.slice(i)).toMatch(/catch \{\s*return null;\s*\}/);
  });
});

describe("o código postal tem campo próprio, e dá para corrigir", () => {
  const perfil = ler("app", "api", "patient", "profile", "route.ts");

  it("o servidor aceita gravar `postcode` e `city`", () => {
    expect(perfil).toMatch(/'address', 'city', 'postcode'/);
  });

  it("e devolve os dois na leitura", () => {
    // Gravar sem devolver deixaria o campo do perfil sempre vazio ao reabrir —
    // a pessoa digitaria de novo toda vez.
    expect(perfil).toMatch(/city: true, postcode: true,/);
  });

  it("forma errada é recusada na gravação, não descoberta na busca", () => {
    expect(perfil).toMatch(/That does not look like a UK postcode/);
    expect(perfil).toMatch(/normalizarPostcode\(limpo\)/);
  });

  it("o app manda o código postal separado, e não colado no endereço", () => {
    const setup = semComentarios(ler("mobile", "app", "(app)", "profile-setup.tsx"));
    expect(setup).not.toMatch(/\[address\.trim\(\), postcode\.trim\(\)\]/);
    expect(setup).toMatch(/postcode: postcode\.trim\(\)/);
  });

  it("e o perfil deixa editar endereço, cidade e código postal", () => {
    // Sem campo para corrigir, quem digitasse errado ficava preso — e o Bruno
    // não quer depender de alguém rodando script para arrumar.
    const edit = ler("mobile", "app", "(app)", "profile-edit.tsx");
    expect(edit).toMatch(/testID="profile-postcode"/);
    expect(edit).toMatch(/address: address\.trim\(\) \|\| null/);
    expect(edit).toMatch(/postcode: postcode\.trim\(\) \|\| null/);
  });
});

describe("a tela de como funciona promete o que o contrato diz", () => {
  const tela = ler("mobile", "app", "(app)", "(lab)", "how-it-works.tsx");

  it("os três caminhos estão lá, não só o kit", () => {
    expect(tela).toMatch(/A kit at home/);
    expect(tela).toMatch(/A collection point near you/);
    expect(tela).toMatch(/phlebotomist can visit your home/);
  });

  it("o catálogo parou de prometer kit para todos os exames", () => {
    // Para todo produto com `appointment_only: true` isso era falso: a pessoa
    // compraria esperando um envelope.
    const catalogo = ler("mobile", "app", "(app)", "(lab)", "(tabs)", "index.tsx");
    expect(catalogo).not.toMatch(/A finger-prick kit at home\. The result comes straight to you\./);
    expect(catalogo).toMatch(/A kit at home or a collection point near you/);
  });

  it("o resultado é da pessoa, e ninguém lê antes dela", () => {
    expect(tela).toMatch(/send it to whichever doctor you prefer/);
    expect(tela).toMatch(/Nobody here reads it before you do/);
    expect(tela).toMatch(/A result is not a diagnosis/);
  });

  it("e o exame não depende de ser paciente de ninguém", () => {
    expect(tela).toMatch(/You do not need a referral/);
    expect(tela).toMatch(/ordering a test is not linked to any treatment/);
  });

  it("tudo nas duas línguas", () => {
    // Inglês é a língua primária; o português vem junto, nunca depois.
    const en = (tela.match(/\ben: "/g) ?? []).length;
    const pt = (tela.match(/\bpt: "/g) ?? []).length;
    expect(en).toBeGreaterThan(20);
    expect(pt).toBe(en);
  });

  it("dá para chegar nela pelo catálogo e pelo menu", () => {
    const catalogo = ler("mobile", "app", "(app)", "(lab)", "(tabs)", "index.tsx");
    const menu = ler("mobile", "app", "(app)", "(lab)", "(tabs)", "profile.tsx");
    expect(catalogo).toMatch(/how-it-works/);
    expect(menu).toMatch(/how-it-works/);
  });

  it("e de quem não tem código postal, ela pede — com o caminho até o campo", () => {
    expect(tela).toMatch(/Add my postcode/);
    expect(tela).toMatch(/router\.push\("\/\(app\)\/profile-edit"\)/);
  });
});

describe("o ponto de coleta abre o mapa", () => {
  const tela = ler("mobile", "app", "(app)", "(lab)", "how-it-works.tsx");

  it("tocar no cartão leva ao mapa do aparelho", () => {
    // O Bruno: "tem como a pessoa clicar e ir direto para o mapa?" O mapa é a
    // parte que **não** depende do laboratório — basta o endereço.
    expect(tela).toMatch(/onPress=\{\(\) => void abrirNoMapa\(ponto\.nome, ponto\.endereco\)\}/);
  });

  it("app nativo primeiro, navegador como queda", () => {
    expect(tela).toMatch(/Platform\.OS === "ios" \? `maps:0,0\?q=/);
    expect(tela).toMatch(/geo:0,0\?q=/);
    expect(tela).toMatch(/google\.com\/maps\/search/);
  });

  it("e um mapa que não abre não derruba a tela", () => {
    expect(tela).toMatch(/\} catch \{/);
    expect(tela).toMatch(/\.catch\(\(\) => \{\}\)/);
  });

  it("o cartão diz que abre o mapa", () => {
    // Um cartão que abre o mapa sem dizer que abre é um cartão que ninguém toca.
    expect(tela).toMatch(/en: "Open in maps", pt: "Abrir no mapa"/);
  });

  it("e tem rótulo de acessibilidade com o nome do lugar", () => {
    expect(tela).toMatch(/en: `Open \$\{ponto\.nome\} in maps`/);
  });
});
