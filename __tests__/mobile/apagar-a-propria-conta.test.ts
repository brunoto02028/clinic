/**
 * @jest-environment node
 *
 * Apagar a própria conta (090, 26/09/2026).
 *
 * A Apple exige isto de todo app que deixa criar conta — Guideline 5.1.1(v) —
 * e é das rejeições mais comuns que existem. Mas a tela não nasce só por causa
 * da Apple: os nossos termos publicados já prometem o direito de exclusão, e
 * até hoje ele dependia de alguém escrever para a clínica.
 *
 * **O que estes testes guardam, acima de tudo, é o que a tela promete.** A
 * conta some; o prontuário fica, porque a lei manda guardar e os nossos termos
 * dizem por quanto tempo. Dizer "apagamos tudo" e guardar o registro seria
 * mentir exatamente no momento em que a pessoa decidiu confiar menos.
 */

import { ler, lerCodigo, semComentarios } from "../helpers/codigo";

/**
 * Sem comentário — **sétima vez** que isto morde neste repositório.
 *
 * A 091 T-7 acrescentou aqui uma linha que desliga quem o titular cuidava, e o
 * comentário dela explica a escolha citando `user.delete` pelo nome: *"a mesma
 * razão que impede `user.delete` aqui em cima vale para ela"*. O teste abaixo
 * acusou a explicação como se fosse o defeito.
 *
 * É exatamente a lista que `__tests__/helpers/codigo.ts` documenta.
 */
const rota = lerCodigo("app", "api", "patient", "account", "route.ts");
const tela = ler("mobile", "app", "(app)", "delete-account.tsx");
const conta = ler("mobile", "app", "(app)", "account.tsx");
const schema = ler("prisma", "schema.prisma");

describe("a conta some, o prontuário fica", () => {
  it("**não** existe `user.delete` — seria cascata sobre o prontuário", () => {
    // `User.clinicId` e as relações clínicas cascateiam. Apagar o `User` a
    // pedido de quem quer sair do app destruiria consultas, notas e exames que
    // a clínica é obrigada a guardar.
    expect(rota).not.toMatch(/user\.delete\b/);
    expect(rota).toMatch(/user\.update\(/);
  });

  it("o que acaba é o acesso", () => {
    expect(rota).toMatch(/deletedAt: agora/);
    expect(rota).toMatch(/isActive: false/);
    expect(rota).toMatch(/pushEnabled: false/);
  });

  it("a senha vira um valor que ninguém conhece", () => {
    // Deixar a anterior faria "conta apagada" significar "conta esperando".
    expect(rota).toMatch(/bcrypt\.hash\(randomBytes\(32\)/);
  });

  it("e os aparelhos param de receber aviso", () => {
    // Sem isto, uma conta apagada continuaria fazendo o telefone tocar.
    expect(rota).toMatch(/pushDeviceToken/);
    expect(rota).toMatch(/deleteMany\(\{ where: \{ userId \} \}\)/);
  });

  it("tudo numa transação", () => {
    // Metade apagada é o pior dos dois estados: sem acesso e ainda recebendo.
    expect(rota).toMatch(/prisma\.\$transaction/);
  });

  it("**e quem ele cuidava sai junto** — senão fica ativo e inalcançável", () => {
    // Apagar a conta da mãe deixava a filha apontando para uma conta morta,
    // sem sessão possível, e ainda contando como paciente ativa da clínica.
    // Achado do QA de 27/09/2026.
    expect(rota).toMatch(/user\.updateMany\(/);
    expect(rota).toMatch(/managedById: userId, deletedAt: null/);
  });

  it("e fica registrado quem pediu", () => {
    expect(rota).toMatch(/PATIENT_ACCOUNT_DELETED/);
  });

  it("o campo existe no banco", () => {
    const i = schema.indexOf("model User ");
    expect(schema.slice(i, schema.indexOf("\n}", i))).toMatch(/deletedAt\s+DateTime\?/);
  });
});

describe("quem pode apagar o quê", () => {
  it("só paciente", () => {
    // Um terapeuta que some leva junto o acesso da clínica ao trabalho dele,
    // e isso é decisão de quem administra.
    expect(rota).toMatch(/user\.role !== "PATIENT"/);
  });

  it("nunca durante impersonação", () => {
    // Seria a ação mais destrutiva do sistema disponível no modo de leitura.
    expect(rota).toMatch(/if \(effectiveUser\.isImpersonating\)/);
    expect(rota).toMatch(/\{ status: 403 \}/);
  });

  it("sem sessão, nada", () => {
    expect(rota).toMatch(/if \(!effectiveUser\) return NextResponse\.json\(\{ error: "Unauthorised" \}/);
  });

  it("pedir de novo devolve sucesso, não erro", () => {
    // O estado que a pessoa pediu é o estado em que a conta está.
    expect(rota).toMatch(/if \(user\.deletedAt\)/);
    expect(rota).toMatch(/success: true, deletedAt: user\.deletedAt/);
  });
});

describe("a tela diz a verdade antes de perguntar", () => {
  it("lista o que acontece, e a retenção está na lista", () => {
    expect(tela).toMatch(/Your clinical record is kept for the period in the terms/);
    expect(tela).toMatch(/seu registro clínico é mantido|Seu registro clínico é mantido/);
  });

  it("não promete apagar tudo", () => {
    // Sem tirar os comentários, isto acusa o docstring desta própria suíte,
    // que cita a frase para dizer que ela não pode existir. Sexta vez que um
    // teste daqui lê a explicação como se fosse o código — por isso o
    // `semComentarios` virou um lugar só, em `__tests__/helpers/codigo.ts`.
    expect(semComentarios(tela)).not.toMatch(/delete everything|apagamos tudo|erase all your data/i);
  });

  it("diz que não tem volta", () => {
    expect(tela).toMatch(/This cannot be undone|Isto não tem volta/);
  });

  it("e aponta para onde tratar do registro em si", () => {
    // "Some tudo" seria mentira; "não dá para nada" seria beco. A saída é
    // dizer qual é o outro pedido.
    expect(tela).toMatch(/write to the clinic|escreva à clínica/);
  });

  it("o botão só acorda com a palavra escrita", () => {
    // Numa ação sem volta, o atrito é o ponto.
    expect(tela).toMatch(/confirmacao\.trim\(\)\.toUpperCase\(\) !== palavra/);
    expect(tela).toMatch(/lang === "pt" \? "APAGAR" : "DELETE"/);
  });

  it("e sai do app depois", () => {
    // Ficar numa sessão de conta apagada é a tela mentindo.
    expect(tela).toMatch(/await logout\(\)/);
    expect(tela).toMatch(/router\.replace\("\/login"\)/);
  });
});

describe("dá para chegar nela — que é o que a Apple confere", () => {
  it("a tela da conta leva até lá", () => {
    expect(conta).toMatch(/router\.push\("\/delete-account"\)/);
    expect(conta).toMatch(/en: "Delete my account", pt: "Apagar minha conta"/);
  });

  it("depois de sair, e discreta", () => {
    // Exigir que exista e seja alcançável não é exigir que divida espaço com
    // as coisas do dia a dia.
    const iSair = conta.indexOf('testID="sign-out"');
    const iApagar = conta.indexOf('testID="ir-apagar-conta"');
    expect(iSair).toBeGreaterThan(-1);
    expect(iApagar).toBeGreaterThan(iSair);
  });
});
