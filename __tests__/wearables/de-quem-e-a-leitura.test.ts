/**
 * @jest-environment node
 *
 * De quem é a leitura do medidor (092 T-1 e T-4).
 *
 * ## O sorteio
 *
 * O Bruno tem **um** medidor e quer os dois usos: medir pacientes na clínica e
 * medir a si mesmo. Uma conta Withings, portanto duas conexões nossas com o
 * **mesmo** `providerUserId`.
 *
 * E o webhook escolhia com `findFirst` **sem ordenação**. Com duas linhas
 * casando, o banco devolve uma arbitrária — e qual vence é sorte, podendo mudar
 * de uma medição para a outra. Pegou a da clínica, a leitura ia para
 * atribuição; pegou a pessoal, ia para o prontuário dele.
 *
 * **Sorteio num dado clínico.** É isso que estes testes tiram do caminho.
 */

import { ignoraPressao } from "@/lib/withings-routing";
import { ler, lerCodigo } from "../helpers/codigo";

describe("num aparelho compartilhado, só a clínica processa pressão", () => {
  it("**e a regra é chamada de verdade**, não reimplementada ao lado", () => {
    // O QA pegou: `ignoraPressao` existia só para o teste, e o ingest
    // reescrevia a mesma condição inline. Duas cópias da mesma regra é
    // exatamente a armadilha que a função pura deveria evitar — mudar uma
    // deixaria o teste verde medindo a outra.
    const ingest = ler("lib", "withings-ingest.ts");
    expect(ingest).toMatch(/import \{ ignoraPressao \} from "@\/lib\/withings-routing"/);
    expect(ingest).toMatch(/ignoraPressao\(\{/);
    expect(ingest).toMatch(/ehDaClinica: forClinic,/);
  });

  it("a conexão da clínica nunca ignora — é ela que atribui", () => {
    expect(ignoraPressao({ ehDaClinica: true, contaTambemEhDaClinica: true })).toBe(false);
  });

  it("**a pessoal da mesma conta ignora**", () => {
    // Era ela que engolia as medições dos pacientes no cron diário, e
    // disparava os alertas delas como se fossem do dono.
    expect(ignoraPressao({ ehDaClinica: false, contaTambemEhDaClinica: true })).toBe(true);
  });

  it("e uma pessoal comum segue gravando", () => {
    // Aparelho que é só do paciente não tem nada a ver com esta regra.
    expect(ignoraPressao({ ehDaClinica: false, contaTambemEhDaClinica: false })).toBe(false);
  });
});

describe("o atalho que foi derrubado", () => {
  const dev = ler("lib", "clinic-device.ts");

  it("**sem sessão vai para a caixa, nunca para o dono**", () => {
    // Eu tinha escrito o contrário. O review de 27/09/2026 derrubou e o Bruno
    // concordou: "sem sessão" não quer dizer "foi o dono", quer dizer
    // "ninguém disse quem foi" — e o terapeuta que esquece de abrir a janela
    // produz exatamente o mesmo estado.
    expect(dev).not.toMatch(/kind: "personal"/);
    expect(dev).not.toMatch(/donoPessoalDoAparelho/);
    expect(dev).toMatch(/if \(sessions\.length !== 1 \|\| !reading\.measureId\) \{/);
  });

  it("e o arquivo registra por que o atalho caiu", () => {
    // Decisão revertida em silêncio é decisão que volta.
    expect(dev).toMatch(/ninguém disse quem foi/);
  });
});

describe("o webhook parou de sortear", () => {
  const webhook = ler("app", "api", "wearables", "withings", "webhook", "route.ts");

  it("**escolhe a da clínica de propósito**, e não por acaso", () => {
    expect(webhook).toMatch(/orderBy: \{ isClinicDevice: "desc" \}/);
  });

  it("e leva o id da conta adiante", () => {
    // É por ele que `ignoraPressao` sabe que a conexão pessoal divide a conta
    // com a da clínica. (Escrevi aqui, antes, que servia para "achar o dono
    // pessoal quando não há sessão" — aquele atalho caiu no review.)
    const i = webhook.indexOf("orderBy: { isClinicDevice");
    expect(webhook.slice(i, i + 400)).toMatch(/providerUserId: true/);
  });

  it("a varredura diária leva também", () => {
    expect(ler("lib", "wearables-sync-run.ts")).toMatch(/providerUserId: true/);
  });

  it("e o botão 'já medi' também, senão os três discordariam", () => {
    const rota = ler("app", "api", "admin", "measurement-sessions", "[id]", "fetch", "route.ts");
    expect(rota).toMatch(/providerUserId: true/);
  });

  it("**mas a atribuição não conhece a conta**", () => {
    // O campo entrou em `clinic-device.ts` só para sustentar o atalho
    // derrubado. Ficar lá sem uso faria a próxima pessoa reconstruí-lo.
    const dev = lerCodigo("lib", "clinic-device.ts");
    expect(dev).not.toMatch(/providerUserId/);
    expect(lerCodigo("lib", "withings-ingest.ts")).not.toMatch(/providerUserId: \(connection as any\)/);
  });
});

describe("o índice que eu disse que protegia, e não protegia", () => {
  // `lerCodigo`: o schema **cita** o índice num comentário, para explicar por
  // que ele não está lá. Nona vez que um teste daqui lê a explicação como se
  // fosse o código — a lista está em `__tests__/helpers/codigo.ts`.
  const schema = lerCodigo("prisma", "schema.prisma");
  const schemaComTexto = ler("prisma", "schema.prisma");
  const bloco = schema.slice(
    schema.indexOf("model WearableConnection "),
    schema.indexOf("\n}", schema.indexOf("model WearableConnection "))
  );

  it("**não existe `(provider, providerUserId, userId)`**", () => {
    // Eu o acrescentei anunciando "a trava voltou". Não voltou: qualquer chave
    // que **contenha** `userId` e `provider` é implicada por
    // `@@unique([userId, provider])`, que já existia. Era um índice que não
    // restringia nada — e eu ainda avisei o Bruno de um risco de falha no
    // deploy que, por isso mesmo, não existia. Achado do review de 27/09/2026.
    expect(bloco).not.toMatch(/@@unique\(\[provider, providerUserId, userId\]\)/);
  });

  it("nem o de dois campos, que proibia o uso que ele quer", () => {
    expect(bloco).not.toMatch(/@@unique\(\[provider, providerUserId\]\)/);
  });

  it("e o arquivo explica por que a trava certa não está lá", () => {
    // `db push` engole falha: um índice que não nasce por causa de duplicata
    // em produção deixaria todo mundo achando que a trava existe.
    expect(schemaComTexto).toMatch(/isClinicDevice\)`/);
    expect(schemaComTexto).toMatch(/db push` engole falha/);
  });

  it("**e o roteamento não depende de unicidade nenhuma**", () => {
    // É o que torna a ausência do índice segura: N conexões pessoais da mesma
    // conta ignoram pressão, quantas forem.
    expect(ler("lib", "withings-ingest.ts")).toMatch(/const pulaPressaoDaClinica = ignoraPressao/);
  });
});
