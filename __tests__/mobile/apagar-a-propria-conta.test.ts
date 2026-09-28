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
 *
 * ## Reescrito em 27/09/2026: a lógica mudou de casa, e três defeitos saíram
 *
 * Existiam **duas** implementações de fechar conta, e elas discordavam. A que o
 * app chamava desligava quem a pessoa cuidava mas não revogava token nem
 * registrava o pedido; a outra — `POST /api/patient/delete-account`, que
 * **ninguém** chamava — pseudonimizava o prontuário, não marcava `deletedAt`, e
 * deixava a criança ativa e inalcançável. Duas definições contraditórias da
 * operação mais destrutiva do sistema, uma delas morta, é como a errada é ligada
 * depois por quem achar ela primeiro.
 *
 * Agora há uma: `lib/account-closure.ts`. A rota faz sessão e impersonação e
 * delega o resto — e é por isso que metade das asserções aqui passou a ler o
 * helper. **Nove testes deste arquivo reprovaram na consolidação**, todos pelo
 * mesmo motivo: estavam fixados no *arquivo*, não no comportamento. Nenhum
 * comportamento se perdeu, e os que faltavam entraram.
 *
 * E a implementação que rodava **não escrevia auditoria nenhuma**: passava
 * `entityType` (campo que não existe em `AuditLogInput`) e omitia
 * `userEmail`/`userRole` (obrigatórios no schema), o Prisma lançava, e um
 * `.catch(() => {})` engolia. O único registro que prova que a pessoa pediu para
 * sair nunca nasceu, em nenhum fechamento de conta. O `tsc` apontava desde
 * sempre; o `npm run build` não, porque o Next ignora erro de tipo.
 */

import fs from "fs";
import path from "path";
import { ler, lerCodigo, raiz, semComentarios } from "../helpers/codigo";

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
const closure = lerCodigo("lib", "account-closure.ts");
const tela = ler("mobile", "app", "(app)", "delete-account.tsx");
const conta = ler("mobile", "app", "(app)", "account.tsx");
const schema = ler("prisma", "schema.prisma");

describe("a conta some, o prontuário fica", () => {
  it("**não** existe `user.delete` — seria cascata sobre o prontuário", () => {
    // `User.clinicId` e as relações clínicas cascateiam. Apagar o `User` a
    // pedido de quem quer sair do app destruiria consultas, notas e exames que
    // a clínica é obrigada a guardar.
    expect(closure).not.toMatch(/user\.delete\b/);
    expect(closure).toMatch(/user\.update\(/);
  });

  it("o que acaba é o acesso", () => {
    expect(closure).toMatch(/deletedAt: closedAt/);
    expect(closure).toMatch(/isActive: false/);
    expect(closure).toMatch(/pushEnabled: false/);
    expect(closure).toMatch(/bpReminderEnabled: false/);
  });

  it("a senha vira um valor que ninguém conhece", () => {
    // Deixar a anterior faria "conta apagada" significar "conta esperando".
    expect(closure).toMatch(/bcrypt\.hash\(randomBytes\(32\)/);
    expect(closure).toMatch(/password: senhaQueNinguemSabe/);
  });

  it("**e o hash é feito fora da transação**", () => {
    // `bcrypt.hash` é lento de propósito: segurar uma transação aberta por
    // causa dele prende linhas sem motivo.
    expect(closure.indexOf("senhaQueNinguemSabe = await bcrypt.hash")).toBeLessThan(
      closure.indexOf("prisma.$transaction")
    );
  });

  it("e os aparelhos param de receber aviso", () => {
    // Sem isto, uma conta apagada continuaria fazendo o telefone tocar.
    expect(closure).toMatch(/pushDeviceToken/);
    expect(closure).toMatch(/deleteMany\(\{$/m);
  });

  it("**e o token do app é revogado**", () => {
    // `lib/mobile-actor.ts` já recusa token de conta com `isActive: false`, mas
    // depender de *todo* consumidor conferir isso é depender de uma disciplina.
    // Revogar é um fato.
    expect(closure).toMatch(/await revokeAllForUser\(user\.id\)/);
    // Fora da transação: um store de token momentaneamente fora do ar não pode
    // desfazer um fechamento que a pessoa pediu. (O padrão tem de ser a
    // chamada: `indexOf("revokeAllForUser")` pegaria o import, na linha 3.)
    expect(closure.indexOf("await revokeAllForUser")).toBeGreaterThan(
      closure.indexOf("prisma.$transaction")
    );
  });

  it("tudo numa transação", () => {
    // Metade apagada é o pior dos dois estados: sem acesso e ainda recebendo.
    expect(closure).toMatch(/prisma\.\$transaction/);
  });

  it("**e quem ele cuidava sai junto** — senão fica ativo e inalcançável", () => {
    // Apagar a conta da mãe deixava a filha apontando para uma conta morta,
    // sem sessão possível, e ainda contando como paciente ativa da clínica.
    // Achado 5 do QA de 27/09/2026.
    expect(closure).toMatch(/user\.updateMany\(/);
    expect(closure).toMatch(/where: \{ managedById: user\.id, deletedAt: null \}/);
  });

  it("desligando, e não apagando — ela também tem prontuário", () => {
    // O recorte vai só até o fim **desta** chamada. Duas vezes eu errei o
    // recorte: primeiro o padrão (`/delete/` casa com `deletedAt`), depois o
    // tamanho (alcançava o `pushDeviceToken.deleteMany` seguinte, que é
    // legítimo). Um teste que lê o vizinho não mede nada.
    const i = closure.indexOf("managedById: user.id");
    const bloco = closure.slice(i, closure.indexOf("});", i));
    expect(bloco).toMatch(/deletedAt: closedAt/);
    expect(bloco).toMatch(/isActive: false/);
    expect(bloco).toMatch(/pushEnabled: false/);
    expect(bloco).not.toMatch(/\.delete\(|deleteMany\(/);
  });

  it("**e a resposta diz quantas foram**", () => {
    // Um número que ninguém vê é um número que ninguém confere.
    expect(closure).toMatch(/geridasDesligadas/);
    expect(rota).toMatch(/managedPatientsClosed: geridasDesligadas/);
  });

  it("o campo existe no banco", () => {
    const i = schema.indexOf("model User ");
    expect(schema.slice(i, schema.indexOf("\n}", i))).toMatch(/deletedAt\s+DateTime\?/);
  });
});

describe("a auditoria que nunca era escrita", () => {
  it("e fica registrado quem pediu", () => {
    expect(closure).toMatch(/PATIENT_ACCOUNT_DELETED/);
  });

  it("**com os dois campos obrigatórios**", () => {
    // `userEmail` e `userRole` são `String` não-nulo no schema. Sem eles o
    // Prisma lança — e era o catch vazio que transformava isso em silêncio.
    const i = closure.indexOf("logAudit({");
    const bloco = closure.slice(i, i + 1100);
    expect(bloco).toMatch(/userEmail: user\.email/);
    expect(bloco).toMatch(/userRole: "PATIENT"/);
  });

  it("e o campo se chama `entity`, não `entityType`", () => {
    expect(closure).toMatch(/entity: "User"/);
    expect(closure).not.toMatch(/entityType/);
  });

  it("**e a chamada não está engolida por um catch vazio**", () => {
    expect(closure.slice(closure.indexOf("logAudit({"))).not.toMatch(/\}\)\.catch\(\(\) => \{\}\)/);
  });
});

describe("o pedido fica registrado, e na ordem certa", () => {
  it("um `ConsentLog` de pedido de exclusão", () => {
    expect(closure).toMatch(/action: "DATA_DELETION_REQUEST"/);
    expect(closure).toMatch(/ipAddress: input\.ipAddress \?\? null/);
  });

  it("**escrito antes da mudança, e dentro da transação**", () => {
    // Se o fechamento falhar não pode sobrar registro dizendo que aconteceu; se
    // der certo tem de sobrar registro de que foi pedido.
    const tx = closure.indexOf("prisma.$transaction");
    const log = closure.indexOf("DATA_DELETION_REQUEST");
    const upd = closure.indexOf("deletedAt: closedAt");
    expect(log).toBeGreaterThan(tx);
    expect(log).toBeLessThan(upd);
  });

  it("e não leva o endereço para dentro do metadata dele", () => {
    const i = closure.indexOf("DATA_DELETION_REQUEST");
    expect(closure.slice(i, i + 400)).not.toMatch(/user\.email/);
  });
});

describe("o prontuário fica identificado — foi a tela que decidiu", () => {
  it("**nada de pseudonimização**", () => {
    // A implementação morta apagava o nome. A tela promete o contrário, com
    // estas palavras: "it is not ours to delete on request". Apagar o nome é
    // apagar parte do prontuário — e um registro que não identifica ninguém não
    // cumpre o dever de guardá-lo.
    expect(closure).not.toMatch(/Removed account|CLOSED_FIRST_NAME|CLOSED_LAST_NAME/);
    expect(closure).not.toMatch(/firstName:/);
    expect(closure).not.toMatch(/lastName:/);
    expect(closure).not.toMatch(/removed\.invalid/);
  });
});

describe("**e existe uma implementação só**", () => {
  it("a rota morta não existe mais", () => {
    expect(fs.existsSync(path.join(raiz, "app", "api", "patient", "delete-account", "route.ts"))).toBe(false);
  });

  it("e a rota viva delega, em vez de reimplementar", () => {
    expect(rota).toMatch(/import \{ AccountClosureError, closePatientAccount \} from "@\/lib\/account-closure"/);
    expect(rota).toMatch(/await closePatientAccount\(\{/);
    // Nada de transação nem bcrypt na rota: era ali que as duas divergiam.
    expect(rota).not.toMatch(/\$transaction/);
    expect(rota).not.toMatch(/bcrypt/);
  });

  it("a idempotência mora no helper, não nos dois", () => {
    expect(closure).toMatch(/if \(user\.deletedAt\) \{/);
    expect(closure).toMatch(/jaEstavaFechada: true/);
    expect(rota).not.toMatch(/if \(user\.deletedAt\)/);
  });

  it("e a regra de 'só paciente' também", () => {
    expect(closure).toMatch(/user\.role !== "PATIENT"/);
    expect(rota).not.toMatch(/role !== "PATIENT"/);
  });
});

describe("quem pode apagar o quê", () => {
  it("**quem finge ser outra pessoa não fecha a conta dela**", () => {
    // A guarda fica na **rota**, de propósito: impersonação é estado de sessão
    // web, e o helper também serve caminhos que não têm sessão nenhuma.
    expect(rota.indexOf("isImpersonating")).toBeLessThan(rota.indexOf("closePatientAccount({"));
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
    // O estado que a pessoa pediu é o estado em que a conta está. Migrou para o
    // helper na consolidação — ver a suíte "existe uma implementação só".
    expect(closure).toMatch(/if \(user\.deletedAt\) \{/);
    expect(closure).toMatch(/closedAt: user\.deletedAt, geridasDesligadas: 0, jaEstavaFechada: true/);
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
