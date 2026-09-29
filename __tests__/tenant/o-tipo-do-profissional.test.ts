/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";
import {
  TIPOS_DE_INQUILINO,
  isPersonalTenant,
  isProfissionalExterno,
  podeAparecerNoApp,
  registroExigido,
  tipoDoInquilino,
  tipoValido,
} from "@/lib/tenant-type";

/**
 * O tipo do profissional, e a permissão de aparecer (102 T-1).
 *
 * O Bruno: *"uma vez que eu cadastrei os médicos, as modalidades de cada um vai
 * aparecer para o paciente… ou não. **A gente que dá essas permissões.**"*
 *
 * Cadastrar não é pôr à venda. Este arquivo prende as duas coisas: os tipos
 * existirem, e ninguém aparecer sozinho.
 */

const rotaCriar = lerCodigo("app", "api", "admin", "clinics", "route.ts");
const rotaEditar = lerCodigo("app", "api", "admin", "clinics", "[id]", "route.ts");
const tela = lerCodigo("app", "admin", "clinics", "page.tsx");
const schema = lerCodigo("prisma", "schema.prisma");

describe("os tipos existem e se descrevem", () => {
  it("são seis, e cada um tem as duas línguas", () => {
    expect(TIPOS_DE_INQUILINO).toHaveLength(6);
    for (const t of TIPOS_DE_INQUILINO) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.labelPt.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
      expect(t.hintPt.length).toBeGreaterThan(0);
    }
  });

  it("**médico, psicólogo e nutricionista são profissionais que a BPR intermedia**", () => {
    for (const t of ["DOCTOR", "PSYCHOLOGIST", "NUTRITIONIST", "OTHER_PROFESSIONAL"]) {
      expect(isProfissionalExterno(t)).toBe(true);
    }
  });

  it("e a clínica e o estúdio **não são** — eles são a casa", () => {
    for (const t of ["CLINIC", "PERSONAL_TRAINER"]) {
      expect(isProfissionalExterno(t)).toBe(false);
    }
  });

  it("cada profissão pede o conselho dela", () => {
    expect(registroExigido("DOCTOR")).toBe("CRM");
    expect(registroExigido("PSYCHOLOGIST")).toBe("CRP");
    expect(registroExigido("NUTRITIONIST")).toBe("CRN");
    expect(registroExigido("CLINIC")).toBeNull();
  });

  it("lixo não vira tipo, e não estoura", () => {
    expect(tipoValido("MEDICO")).toBe(false);
    expect(tipoValido(null)).toBe(false);
    // A queda é para clínica, que é o que o banco já tem por padrão.
    expect(tipoDoInquilino("MEDICO").value).toBe("CLINIC");
    expect(tipoDoInquilino(undefined).value).toBe("CLINIC");
  });

  it("o estúdio de personal continua sendo reconhecido como antes", () => {
    // Um produto inteiro depende desta função. Ela não podia mudar de resposta.
    expect(isPersonalTenant("PERSONAL_TRAINER")).toBe(true);
    expect(isPersonalTenant("CLINIC")).toBe(false);
    expect(isPersonalTenant("DOCTOR")).toBe(false);
  });
});

describe("cadastrar não é pôr à venda", () => {
  const medico = { type: "DOCTOR", visibleInApp: true, professionalRegistry: "CRM 123" };

  it("**nasce invisível no banco**", () => {
    expect(schema).toMatch(/visibleInApp Boolean @default\(false\)/);
  });

  it("e a rota de criar grava invisível, mesmo assim", () => {
    // O padrão do banco e a linha na rota dizem a mesma coisa de propósito: a
    // regra não pode depender de uma das duas existir.
    expect(rotaCriar).toMatch(/visibleInApp: false/);
  });

  it("**profissional ligado e com registro aparece**", () => {
    expect(podeAparecerNoApp(medico)).toBe(true);
  });

  it("**desligado não aparece, mesmo com tudo em ordem**", () => {
    expect(podeAparecerNoApp({ ...medico, visibleInApp: false })).toBe(false);
    expect(podeAparecerNoApp({ ...medico, visibleInApp: null })).toBe(false);
  });

  it("**sem registro não aparece, mesmo ligado**", () => {
    /**
     * O número é mostrado ao paciente e é exigido por lei em consulta à
     * distância. Um médico sem CRM aparecendo com o campo em branco é problema
     * da plataforma que o apresenta, não só dele — então some.
     */
    expect(podeAparecerNoApp({ ...medico, professionalRegistry: null })).toBe(false);
    expect(podeAparecerNoApp({ ...medico, professionalRegistry: "   " })).toBe(false);
  });

  it("**a clínica de reabilitação nunca entra no catálogo**", () => {
    // Ela é a casa. Entrar no catálogo de profissionais seria a BPR se
    // intermediando a si mesma.
    expect(podeAparecerNoApp({ type: "CLINIC", visibleInApp: true })).toBe(false);
    expect(podeAparecerNoApp({ type: "PERSONAL_TRAINER", visibleInApp: true })).toBe(false);
  });
});

describe("o registro é exigido na porta, e não só na leitura", () => {
  it("**criar médico sem CRM é recusado**", () => {
    expect(rotaCriar).toMatch(/const exige = registroExigido\(type\)/);
    expect(rotaCriar).toMatch(/is required for this kind of professional/);
  });

  it("**e ligar a visibilidade sem registro também**", () => {
    // Senão o interruptor liga e não acontece nada — a pior espécie de botão.
    expect(rotaEditar).toMatch(/clinicFields\.visibleInApp === true/);
    expect(rotaEditar).toMatch(/Add the \$\{exige\} number first/);
  });

  it("e só profissional intermediado pode ser ligado", () => {
    expect(rotaEditar).toMatch(/!isProfissionalExterno\(tipo\)/);
  });

  it("**o tipo é conferido contra o mapa, e não por ternário**", () => {
    /**
     * Era `body.type === "PERSONAL_TRAINER" ? … : "CLINIC"` — dois valores num
     * enum que agora tem seis. `DOCTOR` teria virado clínica em silêncio.
     */
    expect(rotaCriar).toMatch(/tipoValido\(body\.type\) \? body\.type : "CLINIC"/);
    expect(rotaCriar).not.toMatch(/body\.type === "PERSONAL_TRAINER" \?/);
  });
});

describe("a tela oferece os tipos e o interruptor", () => {
  it("**a lista de tipos vem do mapa**", () => {
    // Uma lista escrita na tela divergiria no dia do sétimo tipo.
    expect(tela).toMatch(/TIPOS_DE_INQUILINO\.map/);
    expect(tela).not.toMatch(/<SelectItem value="PERSONAL_TRAINER">Personal Studio/);
  });

  it("pede o registro quando o conselho exige", () => {
    expect(tela).toMatch(/registroExigido\(form\.type\)/);
  });

  it("**e diz que cadastrar não publica**", () => {
    expect(tela).toMatch(/Registering is not publishing/);
  });

  it("**existe onde ligar** — senão ele nasceria invisível e ficaria", () => {
    expect(tela).toMatch(/alternarVisibilidade/);
    expect(tela).toMatch(/Show in the patient app/);
    expect(tela).toMatch(/Hide from the patient app/);
  });
});
