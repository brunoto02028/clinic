import { ler, lerCodigo } from "../helpers/codigo";

/**
 * Onde o paciente lê o aviso (095 T-9, 27/09/2026).
 *
 * Pergunta do Bruno: *"quando eu enviar a um paciente ou todos os usuários,
 * eles recebem e leem onde?"*
 *
 * A resposta é **Mensagens, no app**: o envio cria uma `ClinicMessage` por
 * paciente com `kind: "broadcast"`, já na língua dele, e o push abre exatamente
 * essa tela. Chegava. O que estava errado era o entorno.
 */

const rota = lerCodigo("app", "api", "admin", "broadcasts", "route.ts");
const rotaCrua = ler("app", "api", "admin", "broadcasts", "route.ts");
const tela = lerCodigo("app", "admin", "notifications", "page.tsx");
const app = lerCodigo("mobile", "app", "(app)", "(clinica)", "messages.tsx");

describe("o link não morre depois do lançamento", () => {
  it("manda abrir o app, e o site é a alternativa", () => {
    /**
     * Dizia "Read in your portal" e dava o endereço da web. Depois do
     * lançamento o paciente **perde a web** — o app é o único lugar dele — e
     * quem seguisse aquele link bateria numa porta fechada.
     */
    expect(rota).toMatch(/Open Messages in the BPR app/);
    expect(rota).toMatch(/Abra Mensagens no app da BPR/);
  });

  it("e o endereço continua lá, para quem ainda usa o navegador", () => {
    // Leitura crua: `semComentarios` apaga tudo depois de `//`, e o `//` de
    // `https://` cai nessa regra.
    expect(rotaCrua).toMatch(/Still on the web\? \$\{appUrl\}\/dashboard\/questions/);
  });

  it("não é um link do esquema do app", () => {
    // `bprclinic://` num e-mail não abre nada para quem não instalou, e um
    // link morto é pior que uma frase dizendo onde está.
    expect(rota).not.toMatch(/bprclinic:/);
  });
});

describe("aviso não é conversa", () => {
  it("o app desenha o aviso como mural, não como balão", () => {
    expect(app).toMatch(/const aviso = m\.kind !== "message"/);
    expect(app).toMatch(/alignSelf: "stretch"/);
    expect(app).toMatch(/borderLeftWidth: 3/);
  });

  it("e a conversa continua com os dois lados como estavam", () => {
    expect(app).toMatch(/alignSelf: mine \? "flex-end" : "flex-start"/);
  });
});

describe("quem envia sabe onde aquilo vai cair", () => {
  it("a prévia diz a tela, não só o número de pessoas", () => {
    expect(tela).toMatch(/It lands in <strong>Messages<\/strong>, in the app/);
  });

  it("e o histórico já mostra quem leu", () => {
    // O dado existia: `readAt` por destinatário. Vale prender para não se
    // perder numa refatoração da tela.
    expect(rota).toMatch(/read: Boolean\(m\.readAt\)/);
    expect(tela).toMatch(/r\.read/);
  });
});
