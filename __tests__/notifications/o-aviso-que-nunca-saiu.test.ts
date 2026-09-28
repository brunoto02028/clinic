import { lerCodigo } from "../helpers/codigo";

/**
 * O aviso que nunca saiu (095 T-1, 27/09/2026).
 *
 * ## O que parecia, e o que era
 *
 * O Bruno não conseguia mandar notificação para o próprio telefone, com o app
 * instalado pelo TestFlight. A suspeita natural era entrega: token, permissão,
 * credencial de push do build.
 *
 * Medido contra produção, era o contrário disso:
 *
 * - o paciente dele tem **dois aparelhos iOS ativos**, token em formato válido,
 *   `pushEnabled: true`;
 * - um envio de teste pela Expo voltou `status: ok` nos dois tickets **e nos
 *   dois recibos** — a Apple entregou.
 *
 * A notificação nunca foi enviada. O botão "Review and send" fica desabilitado
 * sem **título em inglês**, e ele havia escrito só o corpo em português. Um
 * botão apagado que não diz o que falta é um beco sem saída: ninguém clica num
 * botão cinza para descobrir por que ele está cinza.
 *
 * Estes testes prendem as duas coisas que faltavam na tela: dizer o que falta, e
 * dizer quantos aparelhos vão tocar — antes de enviar, não depois.
 */

const tela = lerCodigo("app", "admin", "notifications", "page.tsx");
const rota = lerCodigo("app", "api", "admin", "broadcasts", "route.ts");

describe("o botão apagado explica o que falta", () => {
  it("existe uma função que responde isso", () => {
    expect(tela).toContain("const faltaPara = ()");
  });

  it("e cobre os quatro motivos de o botão desligar", () => {
    expect(tela).toMatch(/if \(!title\.trim\(\)\)/);
    expect(tela).toMatch(/if \(!content\.trim\(\)\)/);
    expect(tela).toMatch(/audience === "selected" && selectedIds\.size === 0/);
    expect(tela).toMatch(/schedule && !scheduledFor/);
  });

  it("a frase aparece junto do botão, não num toast ao clicar", () => {
    // Num botão desabilitado, o clique não acontece: um toast ali nunca
    // apareceria, e foi assim que uma tarde se perdeu.
    expect(tela).toMatch(/data-testid="broadcast-falta"/);
    expect(tela).toMatch(/disabled=\{sending \|\| loadingPreview \|\| !!faltaPara\(\)\}/);
  });

  it("e o inglês é pedido porque é o que todo paciente recebe", () => {
    expect(tela).toMatch(/Write the English title/);
  });
});

describe("quantos aparelhos vão tocar, antes de enviar", () => {
  it("a tela pergunta assim que o push é marcado", () => {
    // O número já existia — e só aparecia depois de "Review and send". Tarde:
    // é durante a escrita que se decide se vale marcar o push.
    expect(tela).toMatch(/const \[aparelhos, setAparelhos\]/);
    expect(tela).toMatch(/\[pushNotify, schedule, audience, selectedIds\]/);
  });

  it("zero aparece como aviso, não em silêncio", () => {
    expect(tela).toMatch(/No phone will ring/);
    expect(tela).toMatch(/aparelhos === 0 \? "text-destructive"/);
  });

  it("e a rota que responde o número é a mesma do painel", () => {
    expect(rota).toMatch(/const devices = await countPushDevices/);
    expect(rota).toMatch(/patients: patients\.length, devices/);
  });
});

describe("o resultado do envio", () => {
  it("separa 'não havia aparelho' de 'o envio falhou'", () => {
    // Uma frase diz que o telefone não recebeu; a outra, que não havia telefone.
    expect(tela).toMatch(/data\.push\.failed \? `, \$\{data\.push\.failed\} failed`/);
  });

  it("e fica no registro, não só no toast", () => {
    expect(rota).toMatch(/pushSent: push\.sent, pushFailed: push\.failed/);
  });
});
