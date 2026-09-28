jest.mock("@/lib/db", () => ({ prisma: {} }));

import { ler, lerCodigo } from "../helpers/codigo";
import { STATUS_VISIVEIS, faltaPagar, podeSerPaga } from "@/lib/patient-invoices";

/**
 * A fatura do lado de quem a recebe (27/09/2026).
 *
 * A clínica emitia, numerava, gerava o PDF com o logo da BPR e mandava por
 * e-mail depois que alguém aprovava — e o paciente **não tinha onde ver**: nem
 * no app, nem na web (`/dashboard/billing` é a cobrança do aluno do personal,
 * outra frente). Quem apagasse o e-mail perdia a fatura, e o app é o único
 * lugar do paciente depois do lançamento.
 */

const lista = lerCodigo("app", "api", "patient", "invoices", "route.ts");
const pdf = lerCodigo("app", "api", "patient", "invoices", "[id]", "pdf", "route.ts");
const cobranca = lerCodigo("app", "api", "patient", "invoices", "[id]", "payment-intent", "route.ts");
const webhook = lerCodigo("app", "api", "webhooks", "stripe", "route.ts");
const regras = lerCodigo("lib", "patient-invoices.ts");
const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "invoices.tsx");
const middleware = lerCodigo("middleware.ts");

describe("o que o paciente pode ver", () => {
  it("rascunho nunca — ninguém aprovou ainda", () => {
    // É a regra que mais importa: DRAFT está na fila de aprovação, e mostrá-lo
    // seria a fatura chegando ao paciente sem o passo que existe para que nada
    // financeiro saia sozinho.
    expect(STATUS_VISIVEIS).not.toContain("DRAFT");
    expect(STATUS_VISIVEIS).not.toContain("VOID");
    expect([...STATUS_VISIVEIS].sort()).toEqual(["OVERDUE", "PAID", "PARTIALLY_PAID", "SENT"]);
  });

  it("e a rota do PDF recusa rascunho mesmo com link válido", () => {
    expect(pdf).toMatch(/status !== "DRAFT" && .*status !== "VOID"/);
  });
});

describe("as contas", () => {
  it("o que falta é o total menos o que entrou, em centavos inteiros", () => {
    // `172.8 - 100.3` em ponto flutuante dá 72.49999999999999, e isso viraria
    // 7249 pence na cobrança.
    expect(faltaPagar({ total: 172.8, paidAmount: 100.3 })).toBe(72.5);
    expect(faltaPagar({ total: 50, paidAmount: null })).toBe(50);
  });

  it("paga é paga: não sobra botão", () => {
    expect(podeSerPaga({ status: "PAID", total: 50, paidAmount: 50 })).toBe(false);
    expect(podeSerPaga({ status: "DRAFT", total: 50, paidAmount: null })).toBe(false);
    expect(podeSerPaga({ status: "VOID", total: 50, paidAmount: null })).toBe(false);
  });

  it("e o troco de vinte pence não vira um botão que quebra", () => {
    // A Stripe recusa abaixo de 30 pence com uma mensagem em inglês que o
    // paciente não deveria ler. O certo é a clínica perdoar o resto.
    expect(podeSerPaga({ status: "PARTIALLY_PAID", total: 50, paidAmount: 49.8 })).toBe(false);
    expect(podeSerPaga({ status: "PARTIALLY_PAID", total: 50, paidAmount: 49.7 })).toBe(true);
    expect(podeSerPaga({ status: "OVERDUE", total: 50, paidAmount: null })).toBe(true);
  });
});

describe("de quem é a fatura", () => {
  it("as minhas e as de quem eu cuido", () => {
    // A fatura da criança sai no nome dela — é dela o atendimento — e quem
    // paga é quem responde por ela. Sem isto ela não apareceria para ninguém:
    // a criança não faz login.
    expect(regras).toMatch(/managedById: userId, deletedAt: null/);
    expect(lista).toMatch(/patientId: \{ in: donos \}/);
  });

  it("e a lista diz de quem é quando não é minha", () => {
    expect(lista).toMatch(/de: f\.patientId === userId \? null :/);
  });

  it("quem não é dono recebe 404, não 403", () => {
    // "Existe, mas não é sua" conta a um estranho que a fatura existe — e com
    // ela o número, que é sequencial por clínica.
    expect(regras).toMatch(/inv\.patientId !== userId && inv\.patient\.managedById !== userId/);
    expect(pdf).toContain('{ error: "Not found" }, { status: 404 }');
  });
});

describe("comprar em nome de outro continua recusado", () => {
  it("a sessão emprestada vê, e não paga", () => {
    // Ali quem age é a criança. O responsável paga da conta dele, onde a
    // fatura do filho também aparece — que é por que isto não precisa entrar
    // na lista de escritas permitidas de `lib/sessao-emprestada.ts`.
    expect(cobranca).toMatch(/porContaDeNoBearer\(req\.headers\.get\("authorization"\)\) !== null/);
    expect(cobranca).toMatch(/on_behalf_read_only/);
    expect(lista).toMatch(/payable: pagamentoLigado && !emprestada/);
  });

  it("e a lista não inclui esta rota nas escritas permitidas", () => {
    const emprestada = lerCodigo("lib", "sessao-emprestada.ts");
    expect(emprestada).not.toMatch(/invoices/);
  });
});

describe("o link do PDF", () => {
  it("é assinado, curto, e preso a esta fatura", () => {
    // Quem abre não é o app: é o visualizador do telefone, que não carrega
    // sessão. O prefixo impede que um token de documento abra uma fatura.
    expect(lista).toMatch(/signFileToken\(`invoice:\$\{f\.id\}`, userId\)/);
    expect(pdf).toMatch(/verifyFileToken\(req\.nextUrl\.searchParams\.get\("t"\), `invoice:\$\{params\.id\}`\)/);
  });

  it("e o PDF não viaja junto com a lista", () => {
    // São centenas de KB por fatura, em base64: a lista abriria carregando
    // todas de uma vez.
    expect(lista).toMatch(/pdfBase64: false/);
  });
});

describe("a cobrança", () => {
  it("dois toques não viram duas cobranças", () => {
    // A chave é a fatura **mais o valor**: se a clínica receber um parcial no
    // meio, o que falta muda, a chave muda, e nasce um intent novo — que é o
    // certo, porque o anterior cobraria a mais.
    expect(cobranca).toMatch(/idempotencyKey: `invoice-\$\{fatura\.id\}-\$\{pence\}`/);
  });

  it("o valor é recalculado aqui, nunca o que a tela mandou", () => {
    expect(cobranca).toMatch(/Math\.round\(faltaPagar\(fatura\) \* 100\)/);
    // Nada lido do corpo da requisição entra no valor.
    expect(cobranca).not.toMatch(/req\.json\(\)/);
  });

  it("e o webhook sabe a que fatura o dinheiro pertence", () => {
    expect(cobranca).toMatch(/patientInvoiceId: fatura\.id/);
    expect(webhook).toMatch(/pi\.metadata\?\.patientInvoiceId/);
    expect(webhook).toMatch(/case "payment_intent\.succeeded"/);
  });

  it("sem chave, nenhum botão — em vez de um botão que morre em 503", () => {
    expect(lista).toMatch(/const pagamentoLigado = !!process\.env\.STRIPE_SECRET_KEY/);
    expect(cobranca).toMatch(/payments_unavailable/);
  });
});

describe("marcar como paga", () => {
  it("é o webhook que decide, não o botão", () => {
    // Marcar ao abrir a folha seria dar por paga a fatura de quem fechou o app
    // no meio. É a mesma regra da consulta.
    expect(tela).toMatch(/invalidateQueries\(\{ queryKey: \["invoices"\] \}\)/);
    expect(tela).not.toMatch(/status: "PAID"/);
    expect(regras).toMatch(/export async function pagarFaturaComStripe/);
  });

  it("e o reenvio da Stripe não conta duas vezes", () => {
    expect(regras).toMatch(/FOR UPDATE/);
    expect(regras).toMatch(/e\?\.code === "P2002"/);
  });

  it("**o que se repete é o pagamento, não a fatura**", () => {
    /**
     * A guarda era `if (f.financialEntryId) return "ja_tratado"`, e ela jogava
     * fora dinheiro de verdade: depois de um parcial, o app oferece "pagar o
     * resto", a Stripe cobra o cartão, e a função respondia "já tratei" sem
     * registrar nada — a fatura ficava em £20 de £50 para sempre. Achado pelo
     * QA da 093, cenário 5.4b, que é um estado que o app produz sozinho.
     */
    expect(regras).not.toMatch(/if \(f\.financialEntryId\) return/);
    expect(regras).toMatch(/stripePaymentIntentId: args\.stripePaymentIntentId/);
    expect(regras).toMatch(/if \(mesmoPagamento\) return "ja_tratado"/);
  });

  it("um parcial soma ao que já havia, e lança só o que entrou", () => {
    expect(regras).toMatch(/const total = Math\.round\(\(jaPago \+ args\.amount\) \* 100\) \/ 100/);
    expect(regras).toMatch(/amount: args\.amount/);
  });

  it("e usa a convenção que o resto do sistema já usa", () => {
    // `"stripe"` minúsculo na fatura, `"STRIPE"` no financeiro — o painel lê
    // `paidMethod === "stripe"` para recusar o "marcar como paga" à mão.
    expect(regras).toMatch(/paidMethod: "stripe"/);
    expect(regras).toMatch(/paymentMethod: "STRIPE"/);
  });
});

describe("a tela", () => {
  it("paga com a folha nativa, não com uma página web dentro do app", () => {
    expect(tela).toMatch(/initPaymentSheet|presentPaymentSheet/);
    expect(tela).toMatch(/applePay/);
    expect(tela).toMatch(/googlePay/);
  });

  it("fechar a folha não é erro", () => {
    expect(tela).toMatch(/r\.error\.code !== "Canceled"/);
  });

  it("e o PDF abre dentro do app", () => {
    const cru = ler("mobile", "app", "(app)", "(clinica)", "invoices.tsx");
    expect(cru).toMatch(/openFileInApp\(f\.openUrl\)/);
  });

  it("e o link assinado atravessa o middleware", () => {
    /**
     * A rota sabia conferir o `?t=` e nunca era alcançada: o middleware só
     * abria exceção para `/api/files/`, e quem tocava em "Abrir PDF" via o
     * JSON `session_expired`. Mesmo defeito que o QA de 25/09 achou nos
     * documentos, repetido num caminho novo (QA da 093, falha 3.1).
     */
    // A lista cresce (os relatorios entraram na 099). O que este teste protege
    // e a fatura estar nela, nao a lista estar congelada.
    expect(middleware).toMatch(/LINK_ASSINADO = \[[^\]]*'\/api\/patient\/invoices\/'/);
    expect(middleware).toMatch(/LINK_ASSINADO\.some\(\(p\) => pathname\.startsWith\(p\)\)/);
  });

  it("e a volta do 3DS2 tem para onde ir", () => {
    // O banco britânico manda quase toda cobrança para a autenticação do
    // cartão. Sem `returnURL` a página não sabe devolver a pessoa ao app.
    //
    // Leitura crua: `semComentarios` apaga tudo depois de `//`, e o `//` do
    // esquema `bprclinic://` cai nessa regra — a asserção procuraria uma linha
    // que o próprio helper acabou de cortar ao meio.
    const cruDaTela = ler("mobile", "app", "(app)", "(clinica)", "invoices.tsx");
    expect(cruDaTela).toMatch(/returnURL: "bprclinic:\/\/invoices"/);
  });
});

describe("o plugin nativo", () => {
  it("tem props, senão o Expo não avalia a config", () => {
    // Como string simples, o plugin desestrutura `undefined` e derruba
    // `expo config` — e com ele o build **e** o update (QA da 093).
    const app = JSON.parse(ler("mobile", "app.json"));
    const stripe = app.expo.plugins.find(
      (p: any) => Array.isArray(p) && p[0] === "@stripe/stripe-react-native"
    );
    expect(stripe).toBeDefined();
    expect(stripe[1]).toHaveProperty("merchantIdentifier");
    expect(stripe[1]).toHaveProperty("enableGooglePay");
  });

  it("Google Pay ligado, Apple Pay esperando o merchant id", () => {
    const app = JSON.parse(ler("mobile", "app.json"));
    const stripe = app.expo.plugins.find(
      (p: any) => Array.isArray(p) && p[0] === "@stripe/stripe-react-native"
    );
    // `enableGooglePay: false` faria o plugin **remover** o metadado do
    // AndroidManifest: o botão não existiria nem depois do build.
    expect(stripe[1].enableGooglePay).toBe(true);
    // Vazio de propósito: com identificador o plugin escreve o entitlement da
    // Apple, e o build passa a exigir um Merchant ID que ainda não existe.
    expect(stripe[1].merchantIdentifier).toBe("");
  });

  it("tem porta no menu do perfil", () => {
    const perfil = lerCodigo("mobile", "app", "(app)", "(clinica)", "(tabs)", "profile.tsx");
    expect(perfil).toMatch(/\/\(app\)\/\(clinica\)\/invoices/);
  });
});
