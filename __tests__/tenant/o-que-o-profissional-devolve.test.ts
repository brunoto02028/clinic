/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";
import {
  TIPOS_DE_DOCUMENTO,
  assinatura,
  estadoDoDocumento,
  podeEmitir,
  rotuloDoTipo,
  tipoValidoDeDocumento,
} from "@/lib/professional-document";

/**
 * O que o médico devolve (102 T-8).
 *
 * O Bruno: *"eles só recebem os dados dos pacientes, exames, agendam datas de
 * consultas e **retornam com receita** para os pacientes se medicarem"*.
 */

const escrever = lerCodigo(
  "app", "api", "admin", "patients", "[id]", "professional-documents", "route.ts"
);
const enviar = lerCodigo(
  "app", "api", "admin", "patients", "[id]", "professional-documents", "[docId]", "send", "route.ts"
);
const doPaciente = lerCodigo("app", "api", "patient", "professional-documents", "route.ts");
const tela = lerCodigo("components", "admin", "escrever-documento.tsx");
const noApp = lerCodigo("mobile", "src", "components", "DocumentosDoProfissional.tsx");
const telaDocs = lerCodigo("app", "admin", "patients", "[id]", "documents", "page.tsx");
const schema = lerCodigo("prisma", "schema.prisma");

describe("os tipos e quem pode emitir", () => {
  it("são quatro, e três exigem registro", () => {
    expect(TIPOS_DE_DOCUMENTO).toHaveLength(4);
    expect(TIPOS_DE_DOCUMENTO.filter((t) => t.exigeRegistro)).toHaveLength(3);
  });

  it("**receita sem registro não pode ser emitida**", () => {
    // Uma receita sem o registro de quem prescreveu não vale nada — e pior,
    // parece valer.
    expect(podeEmitir("PRESCRIPTION", null)).toBe(false);
    expect(podeEmitir("PRESCRIPTION", "   ")).toBe(false);
    expect(podeEmitir("PRESCRIPTION", "CRM 1")).toBe(true);
  });

  it("orientação é texto de acompanhamento, e qualquer um escreve", () => {
    expect(podeEmitir("GUIDANCE", null)).toBe(true);
  });

  it("lixo não vira tipo", () => {
    expect(tipoValidoDeDocumento("RECEITA")).toBe(false);
    expect(tipoValidoDeDocumento(null)).toBe(false);
    expect(rotuloDoTipo("RECEITA").value).toBe("GUIDANCE");
  });
});

describe("o estado do documento", () => {
  it("sem envio é rascunho", () => {
    expect(estadoDoDocumento({})).toBe("rascunho");
  });

  it("com envio é enviado", () => {
    expect(estadoDoDocumento({ sentAt: new Date() })).toBe("enviado");
  });

  it("**encerrado vence enviado**", () => {
    /**
     * Uma receita encerrada que continuasse aparecendo como "enviada" seria
     * lida como válida — e é exatamente a leitura que não pode acontecer.
     */
    expect(estadoDoDocumento({ sentAt: new Date(), revokedAt: new Date() })).toBe("encerrado");
  });
});

describe("a assinatura é uma fotografia", () => {
  it("**é copiada ao emitir, e não lida por relação**", () => {
    /**
     * O registro de um profissional pode mudar; o que ele assinou, não. Uma
     * receita que "atualiza" o registro sozinha deixa de ser prova do que foi
     * prescrito.
     */
    expect(schema).toMatch(/signerName\s+String/);
    expect(schema).toMatch(/registryKind\s+String\?/);
    expect(schema).toMatch(/registryNumber\s+String\?/);
    expect(escrever).toMatch(/signerName: \[quem\?\.firstName, quem\?\.lastName\]/);
  });

  it("e ela aparece pronta, de um lugar só", () => {
    expect(assinatura({ signerName: "Ana", registryKind: "CRM", registryNumber: "1" }))
      .toBe("Ana · CRM 1");
    // Sem registro, só o nome — e não um separador solto.
    expect(assinatura({ signerName: "Ana" })).toBe("Ana");
  });

  it("**quem assina não digita o próprio registro**", () => {
    // Um campo de texto na tela deixaria alguém assinar com o registro de
    // outra pessoa.
    expect(tela).not.toMatch(/registryNumber.*onChange|setRegistry/);
    expect(escrever).toMatch(/quem\?\.clinic\?\.professionalRegistry/);
  });
});

describe("nada sai sozinho", () => {
  it("**criar deixa em rascunho**", () => {
    // `sentAt` nasce nulo: a rota de escrever não o toca.
    const bloco = escrever.slice(escrever.indexOf("professionalDocument.create"));
    expect(bloco).not.toMatch(/sentAt/);
  });

  it("**enviar é uma rota separada**", () => {
    expect(enviar).toMatch(/data: \{ sentAt: new Date\(\) \}/);
  });

  it("**e um segundo toque não reenvia o aviso**", () => {
    /**
     * `sentAt: null` no `where` é o que torna o envio idempotente. O telefone
     * tocando duas vezes pela mesma receita faz a pessoa procurar a segunda.
     */
    expect(enviar).toMatch(/sentAt: null,\s*revokedAt: null,/);
    expect(enviar).toMatch(/if \(r\.count !== 1\)/);
  });

  it("o aviso vem **depois** de gravar o envio", () => {
    // Avisar antes e falhar ao gravar seria telefone tocando para algo que não
    // chegou.
    const i = enviar.indexOf("data: { sentAt: new Date() }");
    // A **chamada**, e não o `import` — que está na linha 4 e faria a
    // asserção passar por acidente ao contrário.
    const j = enviar.indexOf("await pushDocumento(");
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
  });

  it("**e a tela tem dois botões, nunca um**", () => {
    expect(tela).toMatch(/Save draft/);
    expect(tela).toMatch(/Send to \{patientName/);
    expect(tela).toMatch(/Nothing has reached them yet/);
  });

  it("a prévia mostra o que o telefone vai desenhar, com o logo", () => {
    expect(tela).toMatch(/src="\/logo\.png"/);
    expect(tela).toMatch(/What the patient sees/);
  });
});

describe("a consulta que vem do body é conferida", () => {
  it("**id de consulta de outro inquilino não fica gravado**", () => {
    /**
     * `appointmentId` é `String?` sem chave estrangeira: qualquer id entrava e
     * ficava lá, inclusive o de uma consulta de outra clínica — o que ligaria a
     * receita à agenda de um estranho. Achado do review de 29/09/2026.
     */
    expect(escrever).toMatch(
      /prisma\.appointment\.findFirst\(\{\s*where: \{ id: appointmentId, patientId: params\.id, clinicId: actor\.clinicId! \}/
    );
    expect(escrever).toMatch(/appointmentId: daConsulta,/);
  });
});

describe("receita não se apaga", () => {
  it("**encerra-se, e o motivo é obrigatório**", () => {
    /**
     * Encerrar sem motivo deixa o paciente vendo "encerrada" e sem saber por
     * quê — e é exatamente quando ele precisa saber.
     */
    expect(enviar).toMatch(/code: "reason_required"/);
    expect(enviar).toMatch(/data: \{ revokedAt: new Date\(\), revokedReason: motivo \}/);
  });

  it("**e nenhuma rota apaga a linha**", () => {
    for (const rota of [escrever, enviar]) {
      expect(rota).not.toMatch(/professionalDocument\.delete/);
      expect(rota).not.toMatch(/professionalDocument\.deleteMany/);
    }
  });

  it("**o encerrado continua chegando ao paciente**", () => {
    // Com a data e o motivo: é quando a receita é suspensa que a pessoa mais
    // precisa ver.
    expect(doPaciente).toMatch(/revokedAt: true/);
    expect(doPaciente).toMatch(/revokedReason: true/);
    expect(noApp).toMatch(/Closed/);
    expect(noApp).toMatch(/d\.revokedReason/);
  });
});

describe("e encerrar tem botão — não só rota", () => {
  /**
   * As rotas de listar e de encerrar existiam e **nada as chamava**: quem
   * prescreveu não via o que prescreveu e não tinha por onde suspender.
   * Uma receita que não se pode suspender é a pessoa continuando a tomar o
   * que foi cancelado. Achado do review de 29/09/2026.
   */
  it("a tela lista o que já foi emitido", () => {
    expect(tela).toMatch(/const carregar = useCallback\(async \(\) => \{/);
    expect(tela).toMatch(/Issued to \{patientName/);
  });

  it("**e chama o DELETE, com motivo**", () => {
    expect(tela).toMatch(/method: "DELETE"/);
    expect(tela).toMatch(/JSON\.stringify\(\{ reason: razao \}\)/);
    expect(tela).toMatch(/Close this/);
  });

  it("**o rascunho da lista pode ser enviado — e não só o que está em memória**", () => {
    /**
     * O botão de cima lia o estado local, que morre ao sair da página: quem
     * salvava e voltava amanhã via "Draft" na lista e **nenhum botão**. Não
     * dava para enviar nem encerrar, só reescrever, deixando a linha morta.
     * Achado 1 do QA de 29/09/2026.
     */
    expect(tela).toMatch(/const enviar = async \(id\?: string\) => \{/);
    expect(tela).toMatch(/const alvo = id \?\? rascunho\?\.id;/);
    expect(tela).toMatch(/onClick=\{\(\) => enviar\(d\.id\)\}/);
    expect(tela).toMatch(/Send this/);
  });

  it("e o botão de cima não passa o evento do clique como id", () => {
    // `onClick={enviar}` mandaria o MouseEvent no lugar do id.
    expect(tela).toMatch(/onClick=\{\(\) => enviar\(\)\}/);
  });

  it("**o encerrado não tem botão nenhum**", () => {
    // Encerrar duas vezes, ou enviar o que foi encerrado, não existe.
    expect(tela).toMatch(/estado !== "encerrado" && encerrando !== d\.id/);
  });

  it("criar e enviar recarregam a lista", () => {
    // Um rascunho que só aparece depois do reload parece não ter sido salvo.
    expect(tela.match(/await carregar\(\)/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("quem vê o quê", () => {
  it("**o paciente só recebe o que foi enviado**", () => {
    // Rascunho é do profissional; aparecer antes tornaria o botão enfeite.
    expect(doPaciente).toMatch(/sentAt: \{ not: null \}/);
  });

  it("**um profissional não lê o que outro escreveu**", () => {
    // A menos que alguém partilhe — que é a T-9.
    expect(escrever).toMatch(/clinicId: g\.actor!\.clinicId!/);
    expect(enviar).toMatch(/clinicId: actor\.clinicId!/);
  });

  it("**e a porta é `staffPatientAccess`, com a travessia pedida**", () => {
    /**
     * A guarda passou a **recusar** quem chega só pelo vínculo (T-9): o "sim,
     * pode agir sobre este paciente" estava valendo como acesso ao registro
     * inteiro. Estas rotas são a exceção legítima — é o médico de outro
     * inquilino escrevendo para o paciente que lhe foi encaminhado — e por isso
     * pedem `porVinculo: true` em vez de herdar.
     */
    for (const rota of [escrever, enviar]) {
      expect(rota).toMatch(/staffPatientAccess\(req, params\.id, "Patient not found", \{/);
      expect(rota).toMatch(/porVinculo: true,/);
    }
  });
});

describe("existe onde escrever e onde ler", () => {
  it("**a tela de escrever está na ficha do paciente**", () => {
    expect(telaDocs).toMatch(/<EscreverDocumento patientId=\{patientId\} patientName=\{patientName\} \/>/);
  });

  it("**e o paciente lê na tela de documentos que já existe**", () => {
    const docsApp = lerCodigo("mobile", "app", "(app)", "(clinica)", "documents.tsx");
    expect(docsApp).toMatch(/<DocumentosDoProfissional documentos=/);
  });
});
