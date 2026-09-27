/**
 * @jest-environment node
 *
 * Nada é enviado para uma conta gerida (091 T-7).
 *
 * Desde que a criança passou a ser um `User` com `role: PATIENT`, **toda
 * rotina que varre pacientes pode alcançá-la** — lembrete, confirmação de
 * consulta, campanha. Esse é o efeito colateral real da decisão de dar
 * prontuário de verdade a ela, e é o que este arquivo guarda.
 *
 * O endereço é sintético, em domínio `.invalid` reservado pela RFC 2606, então
 * a entrega falharia sozinha. O que a guarda evita é a **tentativa**: bounce
 * contínuo estraga a reputação do domínio de envio, e um erro por criança em
 * cada rodada esconde os erros de verdade.
 */

import { destinosEntregaveis } from "@/lib/email";
import { emailSintetico, ehEmailSintetico } from "@/lib/managed-patients";

describe("o endereço de quem não recebe", () => {
  it("é sempre em domínio que ninguém entrega", () => {
    expect(emailSintetico()).toMatch(/@no-mail\.invalid$/);
  });

  it("e é reconhecível", () => {
    expect(ehEmailSintetico(emailSintetico())).toBe(true);
    expect(ehEmailSintetico("mae@gmail.com")).toBe(false);
    expect(ehEmailSintetico(null)).toBe(false);
  });

  it("dois deles nunca colidem", () => {
    const muitos = new Set(Array.from({ length: 500 }, () => emailSintetico()));
    expect(muitos.size).toBe(500);
  });
});

describe("quem sobra na lista de entrega", () => {
  it("**a conta gerida sai**", () => {
    expect(destinosEntregaveis(emailSintetico())).toEqual([]);
  });

  it("não se importa com maiúsculas", () => {
    expect(destinosEntregaveis("MANAGED-ABC@NO-MAIL.INVALID")).toEqual([]);
  });

  it("quem tem endereço de verdade fica", () => {
    expect(destinosEntregaveis("mae@gmail.com")).toEqual(["mae@gmail.com"]);
  });

  it("e numa lista mista **sai só a criança**", () => {
    // Descartar a lista inteira por causa de um endereço sintético seria pior
    // que o problema: a mãe deixaria de receber o aviso dela.
    const lista = ["mae@gmail.com", emailSintetico(), "pai@gmail.com"];
    expect(destinosEntregaveis(lista)).toEqual(["mae@gmail.com", "pai@gmail.com"]);
  });

  it("um endereço que apenas contém o domínio no meio continua valendo", () => {
    // A checagem é de sufixo, não de "contém": um endereço legítimo que por
    // acaso cite a palavra não pode ser descartado.
    expect(destinosEntregaveis("no-mail.invalid@gmail.com")).toEqual(["no-mail.invalid@gmail.com"]);
  });
});

describe("e o envio respeita isso", () => {
  it("sendEmail usa o mesmo filtro, e avisa quando não enviou", () => {
    const fonte = require("fs").readFileSync(
      require("path").join(__dirname, "..", "..", "lib", "email.ts"),
      "utf8"
    );
    expect(fonte).toMatch(/const destinos = destinosEntregaveis\(to\);/);
    // `success: true`, e a palavra importa: não falhou, não havia para quem
    // enviar. Devolvendo só `{ skipped }`, quem chamava lia `!sent.success`
    // como falha de entrega — e uma rota chegava a **desfazer a troca de senha
    // do dono da clínica** por causa disso. Achado do review de 27/09/2026.
    expect(fonte).toMatch(/return \{ success: true, skipped: "managed_account" as const \};/);
    // E a guarda vem **antes** de qualquer tentativa de falar com o provedor.
    expect(fonte.indexOf("destinosEntregaveis(to)")).toBeLessThan(fonte.indexOf("await getResend()"));
  });
});
