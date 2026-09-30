/**
 * @jest-environment node
 *
 * O aparelho serve os dois papéis (114 T-5).
 *
 * O Bruno, 30/09/2026: *"o medidor de pressão eu quero usar para a clínica e
 * também para mim, como paciente meu."*
 *
 * ## Isto reverte uma decisão de 27/09, e a reversão é consciente
 *
 * `clinic-device.ts` argumenta, com todas as letras, que *sem sessão* não quer
 * dizer *foi o dono* — quer dizer *ninguém disse quem foi*. O atalho caiu porque
 * a pressão de um paciente entrava no prontuário do dono em silêncio e
 * disparava alerta como dele.
 *
 * O argumento continua verdadeiro. O Bruno ouviu-o duas vezes e escolheu assim
 * mesmo. **O que torna a escolha defensável é a outra metade que ele pediu**:
 * poder mover a leitura. Um erro clínico irreversível não se compensa com
 * comodidade; um reversível, com um clique, compensa.
 *
 * Este teste guarda os dois lados: que o dono recebe, e que o estrago é
 * limitado.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

function semComentarios(...partes: string[]): string {
  return fs
    .readFileSync(path.join(RAIZ, ...partes), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("quem é o dono não é adivinhado", () => {
  const dono = () => semComentarios("lib", "dono-do-aparelho.ts");

  it("**sem a conta do provedor, não há dono**", () => {
    // Emparelhar por outra coisa — o nome, a clínica, o horário — seria
    // exatamente o palpite que esta família de arquivos existe para não dar.
    expect(dono()).toMatch(/if \(!aparelho\?\.providerUserId/);
  });

  it("**duas pessoas a reivindicar a mesma conta: sem dono**", () => {
    // Volta a ser ambíguo, e ambiguidade vai para a caixa.
    expect(dono()).toMatch(/pessoais\.length !== 1/);
  });

  it("**o dono tem de ser paciente desta clínica**", () => {
    // Sem isto, arquivar no prontuário de outro inquilino seria um vazamento —
    // e não uma atribuição errada.
    const c = dono();
    expect(c).toMatch(/role !== "PATIENT"/);
    expect(c).toMatch(/clinicId !== clinicId/);
  });

  it("só a ligação pessoal conta, e a desligada não", () => {
    const c = dono();
    expect(c).toMatch(/isClinicDevice: false/);
    expect(c).toMatch(/status: \{ not: "DISCONNECTED" \}/);
  });
});

describe("a leitura sem sessão", () => {
  const cd = () => semComentarios("lib", "clinic-device.ts");

  it("**vai para o dono, e fica marcada como automática**", () => {
    // A marca é o que permite encontrá-la depois. Sem ela, a regra seria
    // irreversível na prática: ninguém sabe quais foram decididas por regra.
    const c = cd();
    expect(c).toContain("donoDoAparelho(connection.id, clinicId)");
    expect(c).toContain("autoAttributed: true");
  });

  it("**tem um desfecho próprio, e não `assigned` com sessão vazia**", () => {
    // `assigned` quer dizer *alguém disse de quem era*. Isto quer dizer *a
    // regra decidiu, e pode estar errado*. Um `sessionId: ""` faria as duas
    // parecerem a mesma coisa no lugar onde a diferença importa.
    const c = cd();
    expect(c).toMatch(/kind: "owner"/);
    expect(c).not.toMatch(/sessionId: ""/);
  });

  it("**não diz que foi medida em casa**", () => {
    // Ninguém disse onde foi medida. `HOME` seria inventar um facto sobre uma
    // leitura que já está a ser atribuída por regra.
    const i = cd().indexOf("autoAttributed: true");
    const bloco = cd().slice(Math.max(0, i - 900), i);
    expect(bloco).toContain('context: "OTHER"');
    expect(bloco).not.toContain('context: "HOME"');
  });

  it("**a ambiguidade continua a ir para a caixa**", () => {
    // Mais de uma sessão aberta nunca vira palpite — nem com dono.
    expect(cd()).toMatch(/sessions\.length === 0 && reading\.measureId/);
    expect(cd()).toMatch(/unassignedMeasurement\.create/);
  });
});

describe("mover é o que torna a regra aceitável", () => {
  const mover = () => semComentarios("app", "api", "admin", "blood-pressure", "[id]", "move", "route.ts");

  it("**a rota existe**", () => {
    expect(mover().length).toBeGreaterThan(200);
  });

  it("**move, e não apaga**", () => {
    // Apagar e recriar perderia o rasto, e a deduplicação da próxima sincronia
    // traria a mesma medida de volta.
    const c = mover();
    expect(c).toContain("bloodPressureReading.update");
    expect(c).not.toContain("bloodPressureReading.delete");
  });

  it("**deixa de ser automática quando uma pessoa decide**", () => {
    expect(mover()).toContain("autoAttributed: false");
  });

  it("**guarda o destino e a origem**", () => {
    // A guarda é sobre o paciente de destino — a mesma da caixa —, e a leitura
    // tem de ser da clínica de quem move. Sem a segunda, um id adivinhado
    // deixaria mexer numa leitura alheia.
    const c = mover();
    expect(c).toContain("staffPatientAccess(req, patientId)");
    expect(c).toMatch(/leitura\.clinicId !== clinicId/);
  });

  it("**fica registado quem moveu**", () => {
    const c = mover();
    expect(c).toContain("logAudit");
    expect(c).toContain("BP_READING_MOVED");
  });

  it("a mesma medida não entra duas vezes no mesmo prontuário", () => {
    expect(mover()).toMatch(/already has this measurement/);
  });
});
