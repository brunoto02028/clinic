/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";

/**
 * Avisar que há material novo (29/09/2026).
 *
 * O Bruno: *"quero poder dar aviso em massa e individual"*. E, desde
 * 17/09/2026: **nada sai para paciente automaticamente**.
 *
 * ## O que estes testes protegem
 *
 * Um aviso em massa é a coisa mais fácil de disparar por engano e a mais cara
 * quando sai errado — o incidente de 11/09 foi um envio em massa que
 * atravessou a parede entre clínicas. Aqui, três coisas não podem mudar sem
 * alguém decidir: atribuir não toca telefone, a prévia vem antes do disparo, e
 * o texto não diz qual é o material.
 */

const notify = lerCodigo("app", "api", "admin", "education", "notify", "route.ts");
const send = lerCodigo("app", "api", "admin", "education", "send", "route.ts");
const assignments = lerCodigo("app", "api", "admin", "education", "assignments", "route.ts");
const push = lerCodigo("lib", "push-notify.ts");
const tela = lerCodigo("components", "admin", "avisar-material.tsx");
const telaApp = lerCodigo("mobile", "app", "(app)", "notifications.tsx");
const perfil = lerCodigo("mobile", "app", "(app)", "(clinica)", "(tabs)", "profile.tsx");
const schema = lerCodigo("prisma", "schema.prisma");

describe("atribuir não toca o telefone", () => {
  it("**nem a rota de enviar, nem a de atribuir, avisam sozinhas**", () => {
    /**
     * A regra da casa desde 17/09/2026. Avisar é um segundo ato, por um botão.
     *
     * O `\\b` importa: um `push(` solto casaria com `array.push(`, e a asserção
     * passaria a falhar por nada no dia em que alguém empurrar um item numa
     * lista.
     */
    for (const rota of [send, assignments]) {
      expect(rota).not.toMatch(/\bpush[A-Z]\w*\(/);
      expect(rota).not.toMatch(/from "@\/lib\/push-notify"/);
    }
  });

  it("**e o aviso morto que fingia avisar saiu**", () => {
    /**
     * A rota de envio chamava `prisma.notification.create` com tipo
     * `EDUCATION_ASSIGNED` — e esse model **não existe**: o schema só tem
     * `JourneyNotification`. A chamada lançava toda vez, o `catch` virava um
     * `console.warn`, e nenhuma tela lia aquilo. Código que diz ter avisado e
     * não avisou é pior que código que não avisa.
     */
    expect(send).not.toMatch(/notification\.create\(/);
    expect(schema).not.toMatch(/^model Notification \{/m);
  });
});

describe("uma porta só, para individual e para massa", () => {
  it("**quem recebe é quem foi atribuído e não foi avisado**", () => {
    // A diferença entre individual e massa acontece na atribuição. Duas rotas
    // dariam duas contagens de quem recebe, e é aí que um envio em massa
    // atravessa a parede.
    expect(notify).toMatch(/notifiedAt: null,/);
    expect(notify).toMatch(/educationAssignment\.findMany\(\{/);
  });

  it("**o material tem de ser do inquilino de quem pede**", () => {
    // O id vem do corpo e a clínica vem da sessão: conferir que combinam é a
    // forma dos três vazamentos de setembro.
    expect(notify).toMatch(/where: \{ id: contentId, clinicId: actor\.clinicId \}/);
  });

  it("**e o paciente também — não basta a atribuição carregar a clínica**", () => {
    // Alguém que mudou de clínica depois de ser atribuído continuaria na lista,
    // e receberia aviso de uma casa que não é mais a dele.
    expect(notify).toMatch(/patient: \{ clinicId: actor\.clinicId, role: "PATIENT", isActive: true \}/);
  });
});

describe("a prévia vem antes do disparo", () => {
  it("**`dryRun` devolve a conta sem tocar em telefone nenhum**", () => {
    const bloco = notify.slice(notify.indexOf("if (dryRun)"), notify.indexOf("if (pessoas.length === 0)"));
    expect(bloco).toMatch(/count: pessoas\.length/);
    expect(bloco).toMatch(/patients: pessoas/);
    expect(bloco).not.toMatch(/pushMaterialNovo/);
  });

  it("**e a tela só oferece o botão depois da prévia**", () => {
    // O botão que dispara não existe enquanto a conta não voltou do servidor.
    expect(tela).toMatch(/\{previa && quantos > 0 && \(/);
    expect(tela).toMatch(/dryRun: true/);
  });

  it("**a prévia mostra os nomes, e não só o número**", () => {
    // É o que deixa ver que a lista é a esperada antes de o telefone tocar.
    expect(tela).toMatch(/previa\.patients\.map/);
  });

  it("e um envio grande avisa que é grande", () => {
    expect(tela).toMatch(/const emMassa = quantos > 5;/);
    expect(tela).toMatch(/This is a mass notification/);
  });
});

describe("um segundo clique não toca de novo", () => {
  it("**`notifiedAt` é gravado, e antes do disparo**", () => {
    /**
     * Antes de tocar: se gravar falhasse depois de avisar, o próximo clique
     * avisaria outra vez. O pior caso aqui é alguém ficar sem o aviso — melhor
     * que o telefone tocar duas vezes pelo mesmo material.
     */
    const i = notify.indexOf("data: { notifiedAt: new Date() }");
    const j = notify.indexOf("await pushMaterialNovo(");
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
  });

  it("**e quando não há ninguém, a rota diz isso em vez de fingir**", () => {
    expect(notify).toMatch(/code: "nobody_to_notify"/);
  });

  it("o campo existe no esquema, e nasce nulo", () => {
    // Nulo = atribuído e não avisado.
    expect(schema).toMatch(/notifiedAt DateTime\?/);
  });
});

describe("o texto não diz qual é o material", () => {
  it("**nem o título, nem o assunto**", () => {
    /**
     * "Material novo sobre incontinência urinária" na tela bloqueada é o
     * tratamento de alguém à vista de quem estiver por perto. É a mesma regra
     * do lembrete de atividades, que não lista os exercícios.
     */
    const bloco = push.slice(push.indexOf("export function pushMaterialNovo"));
    expect(bloco).toMatch(/There is new material for you to read/);
    // A função **não recebe** o título, e o texto não interpola nada: sem
    // `${`, não há como o nome do material entrar na tela bloqueada. Afirmar
    // isso pela assinatura é mais forte que procurar a palavra "title", que é
    // o campo do próprio aviso ("Sua clínica").
    expect(bloco).toMatch(/pushMaterialNovo\(patientId: string\)/);
    expect(bloco).not.toMatch(/\$\{/);
    // E a rota não passa o título para ela.
    expect(notify).toMatch(/pushMaterialNovo\(p\.id\)/);
  });

  it("e a prévia mostra ao profissional a frase exata da tela bloqueada", () => {
    expect(tela).toMatch(/On their lock screen/);
    expect(tela).toMatch(/There is new material for you to read/);
  });

  it("**e o aviso abre na educação, não na raiz**", () => {
    expect(push).toMatch(/"\/\(app\)\/\(clinica\)\/education"/);
  });
});

describe("o paciente decide, e a tela não mente", () => {
  it("**ligar pede a permissão ao sistema, e não só grava a preferência**", () => {
    /**
     * Com a permissão ainda não pedida, ligar a chave gravava
     * `pushEnabled: true` e pronto: nenhum pedido aparecia, nenhum aparelho
     * ficava registrado, e nada chegava nunca — bem no caso de quem acabou de
     * instalar, que é quem mais precisa do aviso da chamada.
     */
    expect(telaApp).toMatch(/const token = await registrarParaPush\(\);/);
    expect(telaApp).toMatch(/if \(!token \|\| agora !== "granted"\) \{/);
    expect(telaApp).toMatch(/setPush\(false\);/);
  });

  it("**e a tela diz o que chega, com a chamada de vídeo primeiro**", () => {
    // Uma chave sem dizer o que ela liga é uma decisão no escuro. E a consulta
    // por vídeo é a única em que perder o aviso é perder o atendimento.
    const i = telaApp.indexOf("Your video consultation has started");
    const j = telaApp.indexOf("New material for you to read");
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    for (const linha of [
      "A new document, prescription or result",
      "Your clinic wrote to you",
      "An appointment was booked, moved or cancelled",
    ]) {
      expect(telaApp).toContain(linha);
    }
  });

  it("**e promete que o aviso não expõe o tratamento**", () => {
    expect(telaApp).toMatch(/The alert never says what it is about/);
  });

  it("**e chega-se nela por um toque, sem módulo que desligue**", () => {
    /**
     * A tela existia e só se chegava nela por Perfil → Conta → Notificações.
     * Poder ser alcançado pelo próprio telefone não é funcionalidade que uma
     * clínica desligue — igual a "Quem tem acesso".
     */
    const linha = perfil
      .split("\n")
      .find((l) => l.includes('href: "/(app)/notifications"'));
    expect(linha).toBeTruthy();
    expect(linha).not.toMatch(/module:/);
  });
});
