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

describe("o push mora onde uma pessoa apertou um botão", () => {
  /**
   * **Eu tinha posto o push dentro de `notifyPatient`, ligado por padrão.**
   *
   * A revisão pegou antes de ir ao ar. Aquele arquivo é chamado pelos quatro
   * crons de lembrete — os que o Bruno mandou desligar em 17/09, "nunca
   * enviar a paciente automaticamente". Bastaria alguém religar um cron para
   * o robô começar a vibrar o celular de paciente, e ninguém teria decidido
   * isso. O próprio `push-notify.ts` diz isso em comentário, e eu escrevi por
   * cima.
   */
  it("`notifyPatient` **não** manda push", () => {
    expect(notificar).not.toMatch(/sendPushToUser/);
    expect(notificar).not.toMatch(/push = true/);
  });

  it("e o arquivo explica por que não", () => {
    // Para o próximo que for tentar — inclusive eu.
    expect(notificar).toMatch(/chamado pelos quatro crons de lembrete/);
  });

  it("o lembrete manual manda, porque alguém apertou o botão", () => {
    for (const rota of ["send-reminder", "send-yesterday-followup"]) {
      const r = ler("app", "api", "admin", "adherence", rota, "route.ts");
      expect(r).toMatch(/pushLembreteDeAtividades\(patientId\)/);
    }
  });

  it("e os crons continuam sem push", () => {
    for (const cron of [
      "appointment-reminders",
      "bp-reminders",
      "exercise-reminders",
      "onboarding-reminder",
    ]) {
      const r = ler("app", "api", "cron", cron, "route.ts");
      expect(r).not.toMatch(/sendPushToUser|pushLembrete/);
    }
  });
});

describe("o push não carrega conteúdo clínico", () => {
  const notify = ler("lib", "push-notify.ts");

  it("o texto do lembrete não diz quais atividades", () => {
    // A lista apareceria na tela bloqueada. "Advanced Core 009, Advanced
    // Core 001…" à vista de quem estiver por perto é o tratamento de alguém.
    const i = notify.indexOf("export function pushLembreteDeAtividades");
    const bloco = notify.slice(i, i + 700);
    expect(bloco).toMatch(/A reminder about today's plan is waiting for you/);
    expect(bloco).not.toMatch(/\$\{/);
  });

  it("e nenhum texto de push interpola dado do paciente", () => {
    // Todos os corpos são literais. Um `${}` aqui seria o caminho de volta
    // para o conteúdo clínico na tela bloqueada.
    const corpos = [...notify.matchAll(/body: "([^"]*)"/g)].map((m) => m[1]);
    expect(corpos.length).toBeGreaterThan(4);
    for (const c of corpos) expect(c).not.toContain("${");
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
