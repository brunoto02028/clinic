/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { ler, lerCodigo, raiz } from "../helpers/codigo";
import {
  ITENS_PARTILHAVEIS,
  definicaoDoItem,
  exigePassoExtra,
  itemValido,
} from "@/lib/care-share";

/**
 * A equipe partilha item a item (102 T-9).
 *
 * O Bruno, duas vezes: *"eu da clínica quero determinar o que o médico ou os
 * outros profissionais vão ver do meu paciente"* e *"não pode ser
 * automaticamente liberado para todo mundo, só com permissões."*
 *
 * ## O que estes testes existem para pegar
 *
 * O defeito que esta tarefa nasceu para consertar **já estava em produção**: a
 * T-3 criou o vínculo de cuidado e `staffPatientAccess` tratava o "sim, pode
 * agir sobre este paciente" como acesso ao registro inteiro. Não é um risco
 * futuro — era o comportamento.
 *
 * Então o teste mais importante daqui não é sobre partilhar. É a varredura que
 * confronta **todas** as rotas sob `/api/admin/patients/[id]/` e exige que
 * atravessar a parede seja pedido, nunca herdado — incluindo pela rota que
 * alguém escrever no mês que vem.
 */

const guarda = lerCodigo("lib", "staff-patient-access.ts");
const share = lerCodigo("lib", "care-share.ts");
const rotaShares = lerCodigo("app", "api", "admin", "patients", "[id]", "shares", "route.ts");
const rotaRevogar = lerCodigo(
  "app", "api", "admin", "patients", "[id]", "shares", "[shareId]", "route.ts"
);
const rotaOferecer = lerCodigo("app", "api", "admin", "patients", "[id]", "shareable", "route.ts");
const perfil = lerCodigo("app", "api", "admin", "patients", "[id]", "route.ts");
const doPaciente = lerCodigo("app", "api", "patient", "care-shares", "route.ts");
const cortarDoPaciente = lerCodigo("app", "api", "patient", "care-shares", "[id]", "route.ts");
const tela = lerCodigo("components", "admin", "partilhar-com-a-equipe.tsx");
const schema = lerCodigo("prisma", "schema.prisma");
const noApp = lerCodigo("mobile", "app", "(app)", "(clinica)", "quem-tem-acesso.tsx");

describe("atravessar a parede é pedido, nunca herdado", () => {
  it("**a guarda recusa quem chega só pelo vínculo**", () => {
    /**
     * Esta é a linha que fecha as 43 rotas de uma vez. Sem ela, um médico com
     * vínculo lia `rehab-plan`, `report`, `wellbeing`, `questions` e o perfil
     * completo do paciente — 22 dessas rotas não filtram por inquilino nenhum.
     */
    expect(guarda).toMatch(
      /if \(alcance\.porVinculo && !opcoes\?\.porVinculo\) return notFoundAs\(notFound\);/
    );
  });

  it("e as duas guardas de paciente têm a mesma regra", () => {
    // `patientRecordAccess` serve rotas que o paciente e a equipe usam. Deixar
    // só uma fechada seria deixar a outra como caminho alternativo.
    const quantas = guarda.match(
      /if \(alcance\.porVinculo && !opcoes\?\.porVinculo\) return notFoundAs\(notFound\);/g
    );
    expect(quantas?.length).toBe(2);
  });

  it("**e devolve 404, não 403**", () => {
    // Dizer "existe, mas você não pode" conta a um estranho que o paciente
    // existe. É a regra da casa em toda a 102.
    expect(guarda).toMatch(/notFoundAs\(notFound\)/);
  });

  it("**a marca chega à rota, para ela filtrar**", () => {
    expect(guarda).toMatch(/return \{ actor, porVinculo: !!alcance\.porVinculo \};/);
  });
});

/**
 * A varredura que protege a 44ª rota.
 *
 * Toda rota sob `/api/admin/patients/[id]/` que pede `porVinculo: true` está
 * dizendo "eu sei servir um profissional de outro inquilino". Isso é uma
 * decisão, e a lista de quem a tomou tem de ser curta e explícita — senão o
 * `porVinculo: true` vira um `// TODO` que alguém copia de uma rota vizinha.
 */
describe("a varredura: quem pede a travessia, e mais ninguém", () => {
  const PERMITIDAS = new Set([
    // T-8: é o médico de outro inquilino escrevendo para o paciente dele.
    "professional-documents/route.ts",
    "professional-documents/[docId]/send/route.ts",
    // T-9: são o assunto.
    "shares/route.ts",
    "shares/[shareId]/route.ts",
    "shareable/route.ts",
    // O nome de quem vai ser atendido — e, aqui, **só** o que foi partilhado.
    "route.ts",
  ]);

  const base = path.join(raiz, "app", "api", "admin", "patients", "[id]");
  const rotas: string[] = [];
  const andar = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (nome === "route.ts") rotas.push(path.relative(base, p).split(path.sep).join("/"));
    }
  };
  andar(base);

  it("há rotas para varrer", () => {
    // Se a varredura parar de achar arquivos, ela passa vazia e não protege
    // nada — foi assim que uma varredura da 100 T-4 mentiu por um mês.
    expect(rotas.length).toBeGreaterThan(30);
  });

  it("**nenhuma rota fora da lista aceita quem chega por vínculo**", () => {
    const intrusas = rotas.filter((r) => {
      const src = ler("app", "api", "admin", "patients", "[id]", ...r.split("/"));
      return /porVinculo:\s*true/.test(src) && !PERMITIDAS.has(r);
    });
    expect(intrusas).toEqual([]);
  });

  it("**e as da lista realmente pedem** — senão a lista é ficção", () => {
    const mudas = [...PERMITIDAS].filter((r) => {
      const src = ler("app", "api", "admin", "patients", "[id]", ...r.split("/"));
      return !/porVinculo:\s*true/.test(src);
    });
    expect(mudas).toEqual([]);
  });
});

describe("o perfil de quem chega por vínculo é reduzido", () => {
  it("**a rota do perfil completo desvia antes de montar o perfil completo**", () => {
    /**
     * `GET /api/admin/patients/[id]` se anuncia *"Full patient profile with all
     * related data"*. O desvio vem **antes** do `Promise.all`, senão o banco é
     * consultado de qualquer forma e basta um `return` esquecido para o
     * prontuário inteiro sair.
     */
    const i = perfil.indexOf("perfilPorPartilha(params.id");
    const j = perfil.indexOf("prisma.medicalScreening.findUnique");
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
  });

  it("**e ele só lê o que foi partilhado**", () => {
    // Cada consulta é por `id: { in: ids… }`. Um `findMany({ where: { patientId } })`
    // aqui devolveria tudo outra vez.
    expect(share).toMatch(/const ids = await idsPartilhadosCom\(quem\.userId, patientId\);/);
    for (const chave of [
      "ids.ANAMNESIS",
      "ids.SESSION_NOTE",
      "ids.EXAM",
      "ids.DIAGNOSIS",
      "ids.MONITORING_REPORT",
      "ids.PROFESSIONAL_DOCUMENT",
    ]) {
      expect(share).toContain(chave);
    }
  });

  it("**e o que ninguém partilha sai vazio, e não omitido**", () => {
    // Protocolo, pressão arterial, escaneamentos: a tela precisa das chaves
    // para não quebrar, e elas são listas vazias porque nada disto se partilha.
    expect(share).toMatch(/protocols: \[\],/);
    expect(share).toMatch(/bpReadings: \[\],/);
    expect(share).toMatch(/footScans: \[\],/);
  });

  it("**o endereço e o contato de emergência não vão**", () => {
    /**
     * O perfil completo manda `address`, `emergencyContactName`,
     * `emergencyContactPhone`, `intakeToken` e o hash da senha. Nada disso foi
     * partilhado com ninguém.
     */
    const bloco = share.slice(
      share.indexOf("export async function perfilPorPartilha"),
      share.indexOf("const quantos =")
    );
    for (const campo of [
      "address",
      "emergencyContact",
      "intakeToken",
      "password: true",
      "consentAcceptedAt",
    ]) {
      expect(bloco).not.toContain(campo);
    }
  });
});

describe("um item, uma pessoa — e nada em plural", () => {
  it("**o esquema não tem onde escrever a liberação automática**", () => {
    /**
     * Não há `toClinicType`, não há `toEveryone`, não há `toRole`. Se o campo
     * existisse, alguém o usaria: é mais fácil marcar "médicos veem exames" do
     * que clicar três vezes — e é exatamente isso que o Bruno proibiu.
     */
    const bloco = schema.slice(
      schema.indexOf("model CareShare {"),
      schema.indexOf("@@unique([patientId, item, itemId, toUserId])")
    );
    for (const proibido of ["toEveryone", "toClinicType", "toRole", "toUserIds", "toTeam"]) {
      expect(bloco).not.toContain(proibido);
    }
    expect(bloco).toMatch(/toUserId String/);
  });

  it("**partilhar duas vezes é a mesma linha**", () => {
    // Sem a chave única, revogar uma deixaria a outra viva e o acesso de pé.
    expect(schema).toMatch(/@@unique\(\[patientId, item, itemId, toUserId\]\)/);
    expect(share).toMatch(/careShare\.upsert\(\{/);
  });

  it("**a rota recusa plural em vez de ignorar**", () => {
    /**
     * Uma tela futura que mandasse `toUserIds` receberia 400 em vez de
     * partilhar com o primeiro da lista e parecer que funcionou. O erro é a
     * documentação de que a porta não existe.
     */
    expect(rotaShares).toMatch(/Array\.isArray\(toUserId\)/);
    expect(rotaShares).toMatch(/code: "one_at_a_time"/);
    expect(rotaShares).toMatch(/"toUserIds" in \(body \?\? \{\}\)/);
    expect(rotaShares).toMatch(/code: "no_group_share"/);
  });

  it("**e a função de partilhar é singular na assinatura**", () => {
    const bloco = share.slice(
      share.indexOf("export async function partilhar"),
      share.indexOf("export async function revogar")
    );
    expect(bloco).toMatch(/item: ItemPartilhavel;/);
    expect(bloco).toMatch(/toUserId: string;/);
    expect(bloco).not.toMatch(/toUserId: string\[\]/);
    expect(bloco).not.toMatch(/items:/);
  });

  it("**e a tela oferece um colega, não uma lista de marcar**", () => {
    // Um `<Checkbox>` por colega seria "partilhar com a equipe" com outro nome.
    expect(tela).toMatch(/placeholder="Pick one colleague"/);
    expect(tela).toMatch(/Share this one item/);
    expect(tela).not.toMatch(/type="checkbox"[^>]*colega/);
  });
});

describe("você partilha o que é seu", () => {
  it("**o item tem de ser deste paciente e do seu inquilino**", () => {
    /**
     * Os dois juntos. Só o paciente deixaria alguém partilhar o exame que outro
     * profissional anexou; só o inquilino deixaria partilhar o exame de outra
     * pessoa da mesma clínica.
     */
    // Os três, sem fixar a grafia do resto do `where` — ele também carrega o
    // critério de estado do item, e congelar a linha inteira faria este teste
    // quebrar a cada mudança vizinha.
    expect(share).toMatch(/where: \{ id: itemId, \[def\.campoDoPaciente\]: patientId,/);
    expect(share).toMatch(/if \(row\.clinicId\) return row\.clinicId === clinicId;/);
  });

  it("**e o destinatário tem de já cuidar desta pessoa**", () => {
    // Sem isto, a partilha seria uma porta para dar acesso a qualquer conta da
    // plataforma.
    expect(share).toMatch(/vinculoVivo\(p\.patientId, destino\.clinicId\)/);
    expect(share).toMatch(/code: "no_care_link"|"no_care_link"/);
  });

  it("**paciente não é destinatário de partilha**", () => {
    // O que o paciente vê tem caminho próprio; mandar-lhe uma nota de sessão
    // por aqui passaria por fora de toda a regra de envio ao paciente.
    expect(share).toMatch(/destino\.role === "PATIENT"/);
  });

  it("**e o colega do próprio inquilino também não**", () => {
    // Ele já vê pelo `clinicId`. Uma linha de partilha ali faria parecer que o
    // acesso dele depende dela.
    expect(share).toMatch(/destino\.clinicId === p\.fromClinicId/);
  });
});

describe("o profissional novo não herda nada", () => {
  it("**a caixa de entrada é por pessoa, não por inquilino**", () => {
    /**
     * `toUserId` no filtro, e não `toClinicId`. Se a caixa fosse do inquilino,
     * quem entrasse na equipe amanhã abriria o telefone e encontraria tudo o
     * que foi partilhado antes de ele existir.
     */
    expect(share).toMatch(/where: \{ toUserId, revokedAt: null/);
    expect(share).toMatch(/where: \{ toUserId, patientId, revokedAt: null \}/);
  });

  it("**e ler um item partilhado é uma pergunta por linha**", () => {
    expect(share).toMatch(/export async function podeVerItem\(/);
    expect(share).toMatch(/where: \{ toUserId, item, itemId, revokedAt: null \}/);
  });
});

describe("a nota de sessão tem um passo a mais", () => {
  it("**e é a única**", () => {
    expect(exigePassoExtra("SESSION_NOTE")).toBe(true);
    for (const i of ITENS_PARTILHAVEIS.filter((x) => x.value !== "SESSION_NOTE")) {
      expect(exigePassoExtra(i.value)).toBe(false);
    }
  });

  it("**o servidor recusa sem a confirmação — não é só a tela**", () => {
    // Uma confirmação que vive só no navegador é uma confirmação que o próximo
    // cliente da API não dá.
    expect(share).toMatch(/if \(exigePassoExtra\(p\.item\) && !p\.cienteDoPassoExtra\)/);
    expect(share).toMatch(/code: "extra_step_required"|"extra_step_required"/);
  });

  it("e a tela pede a confirmação com o nome do que está sendo passado", () => {
    expect(tela).toMatch(/This is a session note/);
    expect(tela).toMatch(/precisaCiente/);
  });
});

describe("nada sai sem alguém apertar, e com prévia", () => {
  it("**a prévia mostra a linha exata que o colega recebe**", () => {
    // A mesma regra do material educativo (101 T-2), onde o Bruno descobriu o
    // que tinha mandado abrindo o telefone.
    expect(tela).toMatch(/What \{destino \? destino\.firstName : "they"\} will see/);
    expect(tela).toMatch(/\{item\.titulo\}/);
  });

  it("**e o botão só liga com item e colega escolhidos**", () => {
    expect(tela).toMatch(/const pronto = !!item && !!destino && \(!precisaCiente \|\| ciente\);/);
    expect(tela).toMatch(/disabled=\{!pronto \|\| ocupado\}/);
  });

  it("**e não há nenhuma partilha automática em lugar nenhum**", () => {
    /**
     * Nem cron, nem "ao criar o vínculo, partilhar os exames". A T-3 cria o
     * vínculo no pagamento; se ela também criasse partilhas, seria liberação
     * automática — e o `criarVinculoPorPagamento` é justamente o lugar onde
     * seria tentador pôr isso.
     */
    const vinculo = lerCodigo("lib", "care-link.ts");
    expect(vinculo).not.toMatch(/careShare/);
    const webhook = lerCodigo("app", "api", "webhooks", "stripe", "route.ts");
    expect(webhook).not.toMatch(/careShare|partilhar\(/);
  });
});

describe("revogar corta o futuro e guarda o passado", () => {
  it("**nenhuma rota apaga a linha**", () => {
    for (const r of [rotaShares, rotaRevogar, doPaciente, cortarDoPaciente]) {
      expect(r).not.toMatch(/careShare\.delete/);
    }
    expect(share).not.toMatch(/careShare\.delete/);
  });

  it("**revogar é uma data, e a linha fica**", () => {
    expect(share).toMatch(/revokedAt: new Date\(\),/);
    expect(share).toMatch(/careShare\.updateMany\(\{/);
  });

  it("**e o revogado não conta mais como acesso**", () => {
    // `revokedAt: null` em todo filtro de leitura. Sem isso, revogar seria um
    // rótulo na tela e o acesso continuaria.
    const leituras = share.match(/revokedAt: null/g);
    expect(leituras?.length).toBeGreaterThanOrEqual(4);
  });
});

describe("o paciente vê, e pode cortar", () => {
  it("**a rota dele não tem `module`**", () => {
    /**
     * Igual à tela de quem tem acesso (T-3): saber quem vê o seu prontuário não
     * é uma funcionalidade que uma clínica possa desligar.
     */
    expect(doPaciente).toMatch(/patientGate\(\)/);
    expect(doPaciente).not.toMatch(/patientGate\(\{ module/);
  });

  it("**e ele vê quem passou, para quem, e quando**", () => {
    expect(doPaciente).toMatch(/from: \[s\.fromUser\?\.firstName/);
    expect(doPaciente).toMatch(/to: \[s\.toUser\?\.firstName/);
    expect(doPaciente).toMatch(/sharedAt: s\.sharedAt,/);
  });

  it("**incluindo o que foi cortado**", () => {
    // Saber que algo foi partilhado e depois cortado faz parte do que ele tem
    // direito de ver.
    expect(share).toMatch(/export async function partilhasDoPaciente/);
    // A fatia termina na função seguinte: aberta até o fim do arquivo, ela
    // apanharia o `revokedAt: null` de outra função e falharia por nada.
    const i = share.indexOf("export async function partilhasDoPaciente");
    const j = share.indexOf("export async function", i + 10);
    const bloco = share.slice(i, j > i ? j : undefined);
    expect(bloco).toMatch(/where: \{ patientId \},/);
    expect(bloco).not.toMatch(/revokedAt: null/);
  });

  it("**e cortar é dele, sem pedir motivo**", () => {
    // Ele não deve justificativa a ninguém sobre o próprio prontuário.
    expect(cortarDoPaciente).toMatch(/patientId: userId,/);
    expect(cortarDoPaciente).not.toMatch(/reason_required/);
  });

  it("**a tela do app mostra as duas metades na mesma pergunta**", () => {
    // Quem pode agir (o vínculo) e o que cada um recebeu (a partilha). Em duas
    // telas, a segunda seria uma que ninguém acha.
    expect(noApp).toMatch(/en: "What was shared", pt: "O que foi partilhado"/);
    expect(noApp).toMatch(/testID=\{`cortar-\$\{p\.id\}`\}/);
  });
});

describe("os dois sentidos", () => {
  it("**as rotas de partilha aceitam quem chega por vínculo**", () => {
    // Senão só a clínica partilharia, e o médico não teria como devolver nada.
    for (const r of [rotaShares, rotaRevogar, rotaOferecer]) {
      expect(r).toMatch(/porVinculo: true,/);
    }
  });

  it("**e quem oferece itens filtra pelo inquilino de quem pergunta**", () => {
    expect(rotaOferecer).toMatch(/itensQuePossoPartilhar\(params\.id, actor\.clinicId!\)/);
    expect(rotaShares).toMatch(/oQuePartilhei\(actor\.clinicId!, params\.id\)/);
  });

  it("**e a lista de colegas nunca é a plataforma inteira**", () => {
    // Ela sai dos vínculos vivos mais o inquilino que detém o paciente.
    // A consulta vive em `care-link.ts`: toda leitura de vínculo mora lá, e uma
    // segunda espalhada por aqui seria uma segunda porta.
    expect(share).toMatch(/await inquilinosQueCuidam\(patientId\)/);
    expect(share).not.toMatch(/careLink\./);
    expect(share).toMatch(/inquilinos\.delete\(meuClinicId\);/);
  });
});

describe("toda travessia fica registrada", () => {
  it("**partilhar, revogar e ler entram em auditoria**", () => {
    for (const acao of ["CARE_SHARE_CREATED", "CARE_SHARE_REVOKED", "CARE_SHARE_READ"]) {
      expect(share).toContain(acao);
    }
  });

  it("**e a auditoria não pode derrubar o atendimento**", () => {
    // `void`, sem `await`: se o registro falhar, quem perde é a auditoria.
    expect(share).toMatch(/void logAudit\(\{/);
  });
});

describe("o catálogo de itens", () => {
  it("são seis, e cada um aponta para uma tabela", () => {
    expect(ITENS_PARTILHAVEIS).toHaveLength(6);
    for (const i of ITENS_PARTILHAVEIS) {
      expect(i.model).toBeTruthy();
      expect(["patientId", "userId"]).toContain(i.campoDoPaciente);
    }
  });

  it("**e o plano alimentar do personal não está entre eles**", () => {
    /**
     * O único plano que existe é `MealPlan`, que aponta para `studentId`. Área
     * do aluno não é área do paciente, e ligar as duas aqui traria o produto do
     * personal para dentro da clínica.
     */
    expect(ITENS_PARTILHAVEIS.map((i) => i.model)).not.toContain("mealPlan");
    expect(itemValido("MEAL_PLAN")).toBe(false);
  });

  it("lixo não vira item", () => {
    expect(itemValido("EXAMES")).toBe(false);
    expect(itemValido(null)).toBe(false);
    expect(itemValido({ not: null })).toBe(false);
  });
});

describe("os achados do QA de 29/09/2026", () => {
  const ficha = lerCodigo("app", "admin", "patients", "[id]", "page.tsx");

  it("**a aba abre por URL** — senão o link colado cai no resumo", () => {
    /**
     * `ABAS_VALIDAS` filtra o `?tab=`, e a aba nova não estava nela: clicar
     * escrevia `?tab=equipe` na URL e recarregar voltava para "Summary". É
     * exatamente o defeito que o comentário três linhas acima da lista descreve.
     */
    expect(ficha).toMatch(/"docs", "equipe",/);
  });

  it("**toda aba com conteúdo é uma aba que abre por URL**", () => {
    /**
     * A invariante, e não o caso: qualquer `TabsContent` cujo valor não esteja
     * em `ABAS_VALIDAS` é um link que leva ao lugar errado em silêncio.
     *
     * `monitoramento` está de fora desde a 099 — é anterior a esta tarefa, foi
     * avisado ao Bruno e está aqui nomeado para não passar por descuido.
     */
    const ANTERIORES = new Set(["monitoramento"]);
    const lista = ficha.slice(ficha.indexOf("const ABAS_VALIDAS"), ficha.indexOf("];"));
    const conteudos = [...ficha.matchAll(/<TabsContent value="([a-z]+)"/g)].map((m) => m[1]);
    expect(conteudos.length).toBeGreaterThan(15);
    const orfas = conteudos.filter((v) => !lista.includes(`"${v}"`) && !ANTERIORES.has(v));
    expect(orfas).toEqual([]);
  });

  it("**o registro do inquilino não carrega a nota escrita para o colega**", () => {
    /**
     * O vínculo é do inquilino, então quem entrou ontem lê este registro. Item,
     * destinatário e data são o ato administrativo; a nota é uma frase clínica
     * escrita para uma pessoa.
     */
    const bloco = share.slice(
      share.indexOf("export async function oQuePartilhei"),
      share.indexOf("export async function partilhasDoPaciente")
    );
    expect(bloco).not.toMatch(/note: true/);
    // Na caixa de quem recebeu, a nota vai — foi escrita para ele.
    const entrada = share.slice(
      share.indexOf("export async function caixaDeEntrada"),
      share.indexOf("export async function oQuePartilhei")
    );
    expect(entrada).toMatch(/note: true/);
  });

  it("**rascunho e receita encerrada não se partilham**", () => {
    // Um rascunho partilhado mostraria ao colega o que o paciente ainda não viu;
    // um encerrado mostraria como válido o que foi suspenso.
    expect(definicaoDoItem("PROFESSIONAL_DOCUMENT").partilhavelSe).toEqual({
      sentAt: { not: null },
      revokedAt: null,
    });
  });

  it("**e a porta aplica o mesmo critério do seletor, da mesma fonte**", () => {
    /**
     * O seletor ganhou o filtro e a rota não: mandando o id no corpo, o médico
     * passou a ler por inteiro uma receita encerrada e um rascunho que o
     * paciente nunca recebeu. Duas cópias da regra é como elas discordam —
     * então há **uma**, na definição do item, e as duas a leem.
     *
     * Achado 3 da remedição do QA de 29/09/2026: esconder botão não é fechar
     * porta.
     */
    expect(share).toMatch(/\.\.\.\(def\.partilhavelSe \?\? \{\}\)/);
    expect(share).toMatch(
      /\.\.\.\(definicaoDoItem\("PROFESSIONAL_DOCUMENT"\)\.partilhavelSe \?\? \{\}\)/
    );
    // E o literal não volta: se alguém reescrever a condição à mão num dos dois
    // lados, elas voltam a poder divergir.
    expect(share).not.toMatch(/where: \{ patientId, clinicId, sentAt:/);
  });

  it("**e o perfil reduzido não afirma nada sobre a senha**", () => {
    // Ia sempre `false`, e o paciente tem senha. Um profissional intermediado
    // não gerencia a conta de ninguém.
    const bloco = share.slice(share.indexOf("export async function perfilPorPartilha"));
    expect(bloco).not.toMatch(/hasPassword/);
  });
});
