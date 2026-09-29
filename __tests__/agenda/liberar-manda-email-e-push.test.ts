/**
 * @jest-environment node
 *
 * Liberar manda e-mail **e** notificação no aplicativo (106 T-5).
 *
 * O Bruno: *"ao agendar uma consulta ou dias de tratamento de um determinado
 * paciente, só será enviado notificação depois que alguém da clinic liberar.
 * Aí vamos enviar por email e a notificação do app para o paciente ver a agenda
 * dele."*
 *
 * Duas metades. A primeira — nada sai sozinho — já estava de pé desde a T-1, e
 * o teste dela é `o-texto-nao-mente.test.ts`. A segunda faltava: liberar mandava
 * só o e-mail, e o telefone ficava mudo.
 */
import { lerCodigo } from "../helpers/codigo";
import { pediramEnviarAoPaciente } from "../../lib/notify-patient";

const rota = lerCodigo("app", "api", "admin", "appointments", "route.ts");
const tela = lerCodigo("app", "admin", "appointments", "page.tsx");
const notify = lerCodigo("lib", "notify-patient.ts");

describe("o que sai quando alguém libera", () => {
  it("**o push acontece, e acontece atrás do mesmo pedido explícito**", () => {
    // Dentro do bloco que só roda com `emailPatientNow`: o push não pode ter
    // uma porta própria, senão volta a existir envio que ninguém pediu.
    const bloco = rota.slice(rota.indexOf("if (emailPatientNow) try {"));
    const ateOProximoIf = bloco.slice(0, bloco.indexOf("if (emailPatientNow) try {", 1));
    expect(ateOProximoIf).toContain("pushConsulta(");
  });

  it("o push não fica dentro de `notifyPatient`", () => {
    /**
     * É a proteção que a revisão de 26/09/2026 instalou: `notifyPatient` é
     * chamado pelos crons de lembrete, e um push ligado ali começaria a vibrar
     * telefone de paciente assim que alguém religasse um cron — sem ninguém ter
     * decidido isso.
     */
    expect(notify).not.toContain("pushConsulta");
    expect(notify).not.toMatch(/from "@\/lib\/push-notify"/);
  });

  it("falha de push não derruba a criação da consulta", () => {
    // O aviso é acessório; a consulta é o que importa. Um telefone sem token
    // não pode impedir alguém de marcar.
    const bloco = rota.slice(rota.indexOf("pushConsulta("));
    expect(bloco.slice(0, 200)).toMatch(/\.catch\(/);
  });

  it("o silêncio continua sendo não", () => {
    expect(pediramEnviarAoPaciente(undefined)).toBe(false);
    expect(pediramEnviarAoPaciente(true)).toBe(true);
  });
});

describe("a caixa diz tudo o que sai", () => {
  it("**anuncia os três envios**, e não só a confirmação", () => {
    // Ela dizia "o e-mail de confirmação" e mandava dois e-mails: a confirmação
    // e o aviso de triagem médica, quando a ficha ainda não foi preenchida. O
    // QA encontrou o segundo; nenhum dos dois estava escrito na tela.
    const caixa = tela.slice(tela.indexOf("Notify the patient now"), tela.indexOf("Notify the patient now") + 1400);
    expect(caixa).toMatch(/confirmation email/i);
    expect(caixa).toMatch(/app notification/i);
    expect(caixa).toMatch(/screening/i);
  });

  it("e diz nas duas línguas", () => {
    const caixa = tela.slice(tela.indexOf("Avisar o paciente agora") - 200, tela.indexOf("Avisar o paciente agora") + 1400);
    expect(caixa).toMatch(/notificação no aplicativo/i);
    expect(caixa).toMatch(/triagem/i);
  });

  it("o padrão continua ser não enviar", () => {
    expect(tela).toMatch(/sendConfirmation: false/);
  });
});
