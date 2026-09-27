jest.mock("@/lib/db", () => ({ prisma: {} }));

import { ler, lerCodigo } from "../helpers/codigo";
import { labConsentFor } from "@/lib/lab-consent";
import { relacaoPorExtenso } from "@/lib/managed-patients";

/**
 * Em que qualidade você respondeu por esta criança (095 T-3, 27/09/2026).
 *
 * Palavras do Bruno: *"precisa ser obrigado a colocar a relação com a criança,
 * se é pai, irmão, mãe, vó, tio, tia etc, pois é uma segurança para nós, pois a
 * responsabilidade é do maior responsável pela criança. O terapeuta ou o exame
 * de sangue etc nunca pode ter contato sozinho com a criança."*
 *
 * São duas coisas, e a segunda é a que se esquece: registrar a relação **e**
 * mostrar, onde se lê na hora, que o menor é atendido acompanhado.
 */

const consentimento = lerCodigo("lib", "lab-consent.ts");
const rotaConsent = lerCodigo("app", "api", "patient", "lab-consent", "route.ts");
const agenda = lerCodigo("app", "admin", "appointments", "page.tsx");
const rotaAgenda = lerCodigo("app", "api", "admin", "appointments", "route.ts");
const tela = lerCodigo("mobile", "app", "(app)", "(lab)", "dependents.tsx");

describe("a relação aparece no consentimento", () => {
  it("quando é por outro e a relação é conhecida", () => {
    const t = labConsentFor("en-GB", "Ana", true, "Mother");
    expect(t.points.join(" ")).toMatch(/You are ordering as Ana's \*\*Mother\*\*/);
    expect(t.points.join(" ")).toMatch(/authority to consent/);
  });

  it("e em português também", () => {
    const t = labConsentFor("pt-BR", "Ana", true, "Mãe");
    expect(t.points.join(" ")).toMatch(/Você está pedindo como \*\*Mãe\*\* de Ana/);
  });

  it("mas não inventa frase para cadastro antigo, sem relação", () => {
    // O campo era livre e opcional até hoje: quem já está cadastrado fica sem,
    // e o texto não pode afirmar o que ninguém declarou.
    const t = labConsentFor("en-GB", "Ana", true, null);
    expect(t.points.join(" ")).not.toMatch(/You are ordering as/);
  });

  it("nem no consentimento de quem pede para si", () => {
    const t = labConsentFor("en-GB", null, false, "Mother");
    expect(t.points.join(" ")).not.toMatch(/ordering as/);
  });

  it("e o aceite guarda em que qualidade foi dado", () => {
    // É a pergunta que fica quando alguém volta a este registro meses depois.
    expect(rotaConsent).toMatch(/relationship: \(alvo as any\)\.relacao \?\? null/);
    expect(rotaConsent).toMatch(/relationshipOther:/);
  });
});

describe("como a relação se lê", () => {
  it("a chave vira o rótulo da língua", () => {
    expect(relacaoPorExtenso("MOTHER", null, "pt")).toBe("Mãe");
    expect(relacaoPorExtenso("LEGAL_GUARDIAN", null, "en")).toBe("Legal guardian");
  });

  it('"outro" mostra o que a pessoa escreveu', () => {
    expect(relacaoPorExtenso("OTHER", "Família acolhedora", "pt")).toBe("Família acolhedora");
  });

  it("e valor antigo, de quando o campo era livre, aparece como está", () => {
    // Esconder o que a pessoa escreveu seria perder o dado por não reconhecê-lo.
    expect(relacaoPorExtenso("mãe da Ana", null, "pt")).toBe("mãe da Ana");
  });
});

describe("o menor é atendido acompanhado, e a tela diz", () => {
  it("a agenda sabe quem é menor e quem responde por ele", () => {
    expect(rotaAgenda).toMatch(/dateOfBirth: true/);
    expect(rotaAgenda).toMatch(/guardian: \{ select: \{ firstName: true, lastName: true \} \}/);
  });

  it("e o card traz o selo com o nome de quem acompanha", () => {
    expect(agenda).toContain("const ehMenor = (nascimento");
    expect(agenda).toMatch(/ehMenor\(appointment\.patient\.dateOfBirth\)/);
    expect(agenda).toMatch(/Menor — com \$\{appointment\.patient\.guardian\.firstName\}/);
  });

  it("a idade é calculada, nunca guardada", () => {
    // Idade gravada envelhece em silêncio — e aqui ela decide uma frase sobre
    // a presença de um adulto numa sala com uma criança.
    expect(rotaAgenda).not.toMatch(/age: true/);
  });

  it("e o app avisa disso no próprio cadastro", () => {
    expect(tela).toMatch(/nobody from the clinic is ever alone with them/);
    expect(tela).toMatch(/ninguém da clínica fica sozinho com ele/);
  });
});

describe("a tela do app pede a relação como lista", () => {
  it("chips, não campo livre", () => {
    expect(tela).toMatch(/RELACOES\.map\(\(r\) =>/);
    expect(tela).not.toMatch(/Relationship \(optional\)/);
  });

  it("e não deixa salvar menor sem ela", () => {
    expect(tela).toMatch(/const faltaParentesco =/);
    expect(tela).toMatch(/!faltaParentesco/);
  });

  it('"outro" pede a descrição na mesma tela', () => {
    expect(tela).toMatch(/form\.relationship === "OTHER" && \(/);
  });

  it("e a lista do app é a mesma do servidor", () => {
    const noApp = ler("mobile", "src", "lib", "parentesco.ts");
    const noServidor = ler("lib", "managed-patients.ts");
    const pegar = (src: string) =>
      src.match(/export const RELACOES = \[([\s\S]*?)\] as const;/)![1].match(/"[A-Z_]+"/g)!;
    expect(pegar(noApp)).toEqual(pegar(noServidor));
  });
});
