/**
 * @jest-environment node
 *
 * O aviso também toca no telefone (26/09/2026).
 *
 * O Bruno mandou um lembrete e ele chegou **só por e-mail**:
 *
 * > "Não chegou no app do paciente Bruno, que é o que está funcionando."
 *
 * Não era falha de entrega. O lembrete nunca tentou mandar push — push existia
 * em dois lugares no sistema inteiro, e nenhum deles era este.
 *
 * E havia um segundo motivo, mais fundo: o `app.json` não declarava a
 * permissão de push do iOS, então `getExpoPushTokenAsync` falhava calado no
 * aparelho e **nenhum** telefone ficava registrado. O código pedia o token; o
 * build não deixava.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const notificar = ler("lib", "notify-patient.ts");
const envio = ler("lib", "push-send.ts");

describe("o push sai junto do canal, não no lugar dele", () => {
  it("`notifyPatient` manda push antes de escolher o canal", () => {
    // O e-mail é o que fica e o que a pessoa acha depois; o push é o que faz
    // olhar agora. Um não substitui o outro.
    expect(notificar).toMatch(/if \(push\) \{/);
    expect(notificar).toMatch(/void sendPushToUser\(patientId, \{/);
  });

  it("e vem ligado por padrão", () => {
    // Quem tem o app instalado e o aviso ligado está dizendo que quer ser
    // avisado.
    expect(notificar).toMatch(/push = true,/);
  });

  it("dá para calar num envio específico", () => {
    expect(notificar).toMatch(/push\?: boolean;/);
  });

  it("um push que falha **não** impede o e-mail", () => {
    // A mensagem que fica é a do e-mail. Deixar o push derrubar o envio
    // trocaria a certa pela opcional.
    expect(notificar).toMatch(/\}\)\.catch\(\(\) => \{\}\);/);
  });

  it("o corpo vai na língua do paciente", () => {
    expect(notificar).toMatch(/ptDoPush \? plainMessagePt \|\| plainMessage : plainMessage/);
  });

  it("e é cortado, porque push longo é truncado pelo sistema sem aviso", () => {
    expect(notificar).toMatch(/\.slice\(0, 160\)/);
  });

  it("o toque leva a uma tela do app", () => {
    expect(notificar).toMatch(/pushUrl \?\? "\/\(app\)\/\(clinica\)\/\(tabs\)\/exercises"/);
  });
});

describe("as duas travas que já existiam continuam valendo", () => {
  it("quem desligou o aviso não recebe", () => {
    // `pushEnabled` é a chave que o paciente tem para dizer "chega" sem
    // desinstalar o app.
    expect(envio).toMatch(/where: \{ id: \{ in: userIds \}, pushEnabled: true \}/);
  });

  it("e o portão de saída de QA segura push como segura e-mail", () => {
    // Push não tem desfazer.
    expect(envio).toMatch(/if \(!outboundAllowed\(userIds\)\)/);
    expect(envio).toMatch(/logSunk\("push"/);
  });
});

describe("o build deixa o telefone se registrar", () => {
  const appJson = JSON.parse(ler("mobile", "app.json"));

  /**
   * Declarado em 26/09/2026, com o build autorizado pelo Bruno.
   *
   * Isto muda o fingerprint do runtime — `5787c66f…` vira outro — e o build
   * anterior para de receber `eas update`. Foi medido e decidido junto: ele
   * publica amanhã, e o binário que vai para a App Store precisa ser o que
   * consegue notificar. Um app publicado sem push custa outra revisão da
   * Apple para consertar.
   */
  it("o plugin de notificações está declarado", () => {
    const p = appJson.expo.plugins.find(
      (x: unknown) => Array.isArray(x) && x[0] === "expo-notifications"
    );
    expect(p).toBeTruthy();
  });

  it("e a permissão de push do iOS também", () => {
    // Sem `aps-environment`, `getExpoPushTokenAsync` estoura no aparelho, o
    // `catch` do app engole, e nenhum telefone fica registrado — que era o
    // estado até aqui: zero aparelhos no banco.
    expect(appJson.expo.ios?.entitlements?.["aps-environment"]).toBe("production");
  });

  it("o `eas.json` continua intocado", () => {
    // Editá-lo mexe no fingerprint por outro caminho, e já cortou o canal de
    // update uma vez neste projeto.
    const eas = JSON.parse(ler("mobile", "eas.json"));
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(eas.build.production.channel).toBe("production");
  });

  it("o app continua pedindo o token", () => {
    const push = ler("mobile", "src", "lib", "push.ts");
    expect(push).toMatch(/getExpoPushTokenAsync/);
    expect(push).toMatch(/\/api\/push-token/);
  });

  it("e continua não estourando quando não dá", () => {
    // Push é o toque no ombro, não o produto.
    const push = ler("mobile", "src", "lib", "push.ts");
    expect(push).toMatch(/if \(!Device\.isDevice\) return null;/);
  });
});
