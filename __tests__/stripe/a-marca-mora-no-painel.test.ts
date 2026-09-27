import { ler, lerCodigo } from "../helpers/codigo";

/**
 * A marca da BPR no Stripe — e o botão que prometia o que o Stripe recusa.
 *
 * `/admin/stripe-branding` tinha um "Save to Stripe" que mandava cor, nome e
 * e-mail de suporte para `POST /v1/account`. O Stripe responde **403** a
 * qualquer mudança na conta da própria plataforma:
 *
 * > You cannot use this method on your own account: you may only use it on
 * > connected accounts.
 *
 * Conferido em 27/09/2026 contra `acct_1UKJBC…`: `/v1/account`,
 * `/v1/accounts/<id>` e o upload de File com `settings[branding][logo]` recusam
 * igual. O upload do arquivo funciona — o que não existe é como prendê-lo.
 *
 * Pior que não funcionar: a tela **dizia** que o logo já ia. A prévia mostrava o
 * logo do site ao lado, o que faz o conjunto parecer certo, enquanto a invoice
 * saía sem imagem nenhuma.
 */

const rota = lerCodigo("app", "api", "admin", "stripe-branding", "route.ts");
/**
 * Cru, para as asserções que contêm URL: `semComentarios` apaga tudo depois de
 * `//` na linha, e `https://…` casa com isso — a URL some junto com os
 * comentários. Aqui não há risco de confundir explicação com código, porque o
 * único lugar que cita o painel é o campo que o devolve.
 */
const rotaCrua = ler("app", "api", "admin", "stripe-branding", "route.ts");
const tela = lerCodigo("app", "admin", "stripe-branding", "page.tsx");

describe("a rota de branding só lê", () => {
  it("não existe mais POST", () => {
    expect(rota).toContain("export async function GET");
    expect(rota).not.toContain("export async function POST");
  });

  it("e nada aqui tenta escrever na conta", () => {
    expect(rota).not.toMatch(/api\.stripe\.com\/v1\/account/);
    expect(rota).not.toMatch(/accounts\.update/);
  });

  it("devolve para onde a marca se muda, e em qual conta", () => {
    // Quem tem sandbox e produção precisa saber em qual está mexendo: marca
    // arrumada no sandbox não aparece em invoice nenhuma.
    expect(rota).toMatch(/painel: \{/);
    expect(rotaCrua).toMatch(/dashboard\.stripe\.com\/settings\/branding/);
    expect(rota).toMatch(/startsWith\('sk_test_'\) \? 'test' : 'live'/);
  });
});

describe("e a tela não promete o que não faz", () => {
  it("o botão leva ao painel do Stripe, não a um salvamento", () => {
    expect(tela).not.toContain("Save to Stripe");
    expect(tela).not.toContain("handleSave");
    expect(tela).toContain("Edit in Stripe");
  });

  it("a frase sobre o logo sincronizar automaticamente saiu", () => {
    expect(tela).not.toMatch(/automatically synced/i);
  });

  it("e diz o que pôr lá: logo, o quadrado para ícone, e a cor da clínica", () => {
    expect(tela).toMatch(/favicon\.png/);
    expect(tela).toMatch(/#4F7361/);
    // Por que o quadrado: o Stripe corta imagem retangular no ícone.
    expect(tela).toMatch(/crops a rectangular image/);
  });

  it("e avisa quando a conta olhada é de teste", () => {
    expect(tela).toMatch(/painel\.modo === "test"/);
  });
});
