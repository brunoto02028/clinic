jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import { artigoMudouDepois, materialDoArtigo } from "@/lib/education-from-article";

/**
 * O artigo vira material do paciente (096 T-2, 28/09/2026).
 *
 * ## O detalhe que o mapeamento esconde
 *
 * `Article` guarda a língua principal nos campos **sem sufixo** (`title`,
 * `content`) e diz qual é em `publishLanguage`. Então "o inglês do artigo" nem
 * sempre está em `titleEn`: num artigo publicado em português, o inglês está em
 * `titleEn` e o **português** está em `title`.
 *
 * Ler isso errado produz material com as duas línguas trocadas, e o sintoma
 * aparece só na tela de um paciente.
 */

const lib = lerCodigo("lib", "education-from-article.ts");
const rota = lerCodigo("app", "api", "admin", "education", "from-articles", "route.ts");

const base = {
  id: "a1",
  title: "Shoulder impingement",
  excerpt: "What it is",
  content: "The English body.",
  titleEn: null,
  excerptEn: null,
  contentEn: null,
  titlePt: "Impacto no ombro",
  excerptPt: "O que é",
  contentPt: "O corpo em português.",
  publishLanguage: "en",
  imageUrl: "/img/a1.png",
  tags: ["shoulder"],
  updatedAt: new Date("2026-09-01T10:00:00Z"),
};

describe("o mapeamento das duas línguas", () => {
  it("artigo publicado em inglês: o sem-sufixo é o inglês", () => {
    const m = materialDoArtigo(base);
    expect(m.title).toBe("Shoulder impingement");
    expect(m.body).toBe("The English body.");
    expect(m.titlePt).toBe("Impacto no ombro");
    expect(m.bodyPt).toBe("O corpo em português.");
  });

  it("**artigo publicado em português: o sem-sufixo é o português**", () => {
    // É aqui que um mapeamento ingênuo troca as línguas, e o erro só aparece
    // na tela de um paciente.
    const pt = {
      ...base,
      publishLanguage: "pt",
      title: "Impacto no ombro",
      content: "O corpo em português.",
      titleEn: "Shoulder impingement",
      contentEn: "The English body.",
      titlePt: null,
      contentPt: null,
    };
    const m = materialDoArtigo(pt);
    expect(m.title).toBe("Shoulder impingement");
    expect(m.body).toBe("The English body.");
    expect(m.titlePt).toBe("Impacto no ombro");
    expect(m.bodyPt).toBe("O corpo em português.");
  });

  it("artigo só em português ainda produz um título", () => {
    // `title` é obrigatório no banco: sem esta queda a importação falharia por
    // uma tradução que ninguém escreveu.
    const soPt = {
      ...base,
      publishLanguage: "pt",
      title: "Só português",
      content: "Corpo",
      titleEn: null,
      contentEn: null,
      titlePt: null,
      contentPt: null,
    };
    const m = materialDoArtigo(soPt);
    expect(m.title).toBe("Só português");
    expect(m.titlePt).toBe("Só português");
  });

  it("espaço em branco não conta como tradução", () => {
    const m = materialDoArtigo({ ...base, titlePt: "   ", contentPt: "  " });
    expect(m.titlePt).toBeNull();
    expect(m.bodyPt).toBeNull();
  });

  it("a imagem é a mesma URL, sem copiar bytes", () => {
    expect(materialDoArtigo(base).thumbnailUrl).toBe("/img/a1.png");
  });

  it("e o material lembra de onde veio, e de quando", () => {
    const m = materialDoArtigo(base);
    expect(m.sourceArticleId).toBe("a1");
    expect(m.sourceArticleUpdatedAt).toEqual(base.updatedAt);
  });
});

describe("o artigo mudou depois?", () => {
  it("sim, quando a origem é mais nova", () => {
    expect(
      artigoMudouDepois({
        sourceArticleUpdatedAt: new Date("2026-09-01T10:00:00Z"),
        sourceArticle: { updatedAt: new Date("2026-09-20T10:00:00Z") },
      })
    ).toBe(true);
  });

  it("não, quando é a mesma data", () => {
    const d = new Date("2026-09-01T10:00:00Z");
    expect(artigoMudouDepois({ sourceArticleUpdatedAt: d, sourceArticle: { updatedAt: d } })).toBe(false);
  });

  it("e material escrito à mão nunca está desatualizado", () => {
    expect(artigoMudouDepois({ sourceArticleUpdatedAt: null })).toBe(false);
  });
});

describe("importar", () => {
  it("atualiza em vez de duplicar", () => {
    // Duas cópias do mesmo texto partiriam o progresso de leitura do paciente
    // entre elas, e a lista da clínica encheria de pares.
    expect(lib).toMatch(/findFirst\(\{\s*where: \{ clinicId: opts\.clinicId, sourceArticleId: opts\.artigo\.id \}/);
    expect(lib).toMatch(/if \(existente\) \{/);
  });

  it("e não desfaz o que a clínica organizou", () => {
    // `categoryId`, `isPublished` e `isFeatured` só entram na criação:
    // reimportar traz o texto de novo, não as decisões de alguém.
    const atualizar = lib.slice(lib.indexOf("if (existente)"), lib.indexOf("const criado ="));
    expect(atualizar).not.toMatch(/isPublished|categoryId|isFeatured/);
  });

  it("nasce **não publicado**", () => {
    // Material que nasce publicado apareceria para a clínica inteira no
    // instante da importação — o contrário do que foi pedido.
    expect(lib).toMatch(/isPublished: false/);
  });

  it("o artigo nunca é alterado", () => {
    expect(lib).not.toMatch(/article\.update|article\.delete/);
  });
});

describe("a rota", () => {
  it("só oferece artigo publicado", () => {
    expect(rota).toMatch(/where: \{ published: true \}/);
    expect(rota).toMatch(/id: \{ in: ids \}, published: true/);
  });

  it("importar não atribui a ninguém", () => {
    // Trazer para a clínica e mandar para um paciente são duas decisões.
    expect(rota).not.toMatch(/educationAssignment/);
  });

  it("e diz quantos nasceram e quantos foram atualizados, separados", () => {
    // "7 importados" quando cinco já existiam faria quem clicou achar que tem
    // doze materiais novos.
    expect(rota).toMatch(/created: criados\.length/);
    expect(rota).toMatch(/updated: atualizados\.length/);
  });
});

describe("liberado para quem você escolher (T-3)", () => {
  const progresso = lerCodigo("app", "api", "education", "progress", "route.ts");
  const painel = lerCodigo("app", "admin", "education", "page.tsx");

  it("**o progresso exige que a pessoa possa ver o material**", () => {
    /**
     * Antes, qualquer pessoa autenticada gravava progresso em **qualquer**
     * `contentId` — de outra clínica, ou de um material restrito atribuído a
     * outro paciente — e a rota ainda incrementava o `viewCount`, que confirma
     * a existência a quem não deveria nem saber dela.
     */
    expect(progresso).toMatch(/assignments: \{ some: \{ patientId: user\.id \} \}/);
    expect(progresso).toMatch(/isPublished: true, clinicId: quem\?\.clinicId/);
    expect(progresso).toMatch(/error: 'Not found' \}, \{ status: 404 \}/);
  });

  it("e o app consegue marcar como lido", () => {
    // `getServerSession` devolve nulo para bearer: o botão existia na tela do
    // paciente e respondia 401, em silêncio, desde sempre.
    expect(progresso).toMatch(/const effective = await getEffectiveUser\(\)/);
    expect(progresso).not.toMatch(/const session = await getServerSession/);
  });

  it("o painel para de chamar de rascunho o que chega ao paciente", () => {
    // Material não publicado **chega** — por atribuição. "Draft" faria alguém
    // achar que ninguém o está lendo.
    expect(painel).not.toMatch(/>Draft</);
    expect(painel).toMatch(/Só atribuído/);
    expect(painel).toMatch(/Na biblioteca/);
  });

  it("**e o material restrito aparece na tela de atribuir**", () => {
    /**
     * A tela de atribuir pedia `?published=true`, então **justamente o que
     * nasce restrito** — todo artigo importado — não aparecia na lista. E
     * atribuir é a única forma de ele chegar a alguém: a 096 inteira parava
     * a um clique do fim.
     */
    const atribuir = lerCodigo("app", "admin", "education", "assignments", "page.tsx");
    expect(atribuir).not.toMatch(/education\/content\?published=true/);
    expect(atribuir).toMatch(/fetch\("\/api\/admin\/education\/content"\)/);
    // E a lista diz qual é qual, senão os dois estados viram um só.
    expect(atribuir).toMatch(/na biblioteca/);
    expect(atribuir).toMatch(/só atribuído/);
  });

  it("e dá para trocar entre os dois de um clique", () => {
    expect(painel).toContain("const trocarAcesso = async");
    expect(painel).toMatch(/isPublished: !item\.isPublished/);
  });
});

describe("a tela de escolher, e a do app (T-4 e T-5)", () => {
  const dialogo = lerCodigo("components", "admin", "import-articles-dialog.tsx");
  const painel = lerCodigo("app", "admin", "education", "page.tsx");
  const appTela = lerCodigo("mobile", "app", "(app)", "(clinica)", "education.tsx");
  const appApi = lerCodigo("mobile", "src", "api", "education.ts");

  it("o diálogo deixa escolher, em vez de importar os 35", () => {
    // Importar tudo repetiria o erro da pasta de exercícios: a lista do
    // paciente encheria de textos que ninguém escolheu para ele.
    expect(dialogo).toMatch(/escolhidos/);
    expect(dialogo).toMatch(/articleIds: \[\.\.\.escolhidos\]/);
  });

  it("e avisa o que vai acontecer antes de acontecer", () => {
    expect(dialogo).toMatch(/nasce <strong>restrito<\/strong>|só chega a/);
    expect(dialogo).toMatch(/só em inglês/);
    expect(dialogo).toMatch(/o artigo mudou depois/);
  });

  it("criados e atualizados são contados separados", () => {
    // "7 importados" com cinco já existentes faria procurar doze novos numa
    // lista que ganhou dois.
    expect(dialogo).toMatch(/d\.created/);
    expect(dialogo).toMatch(/d\.updated/);
  });

  it("e o botão de trazer artigos vem antes do de criar do zero", () => {
    expect(painel.indexOf("Trazer artigos")).toBeLessThan(painel.indexOf("Create Content"));
  });

  it("o app separa o que é seu do que é da clínica", () => {
    expect(appTela).toMatch(/For you|Para você/);
    expect(appTela).toMatch(/From the clinic|Da clínica/);
    expect(appTela).toMatch(/<SectionList/);
  });

  it("e mostra a observação, o prazo e o obrigatório", () => {
    // A rota sempre mandou os quatro; o app declarava só `id` e `content`.
    expect(appApi).toMatch(/isRequired\?: boolean/);
    expect(appTela).toMatch(/atribuicao\?\.note/);
    expect(appTela).toMatch(/atribuicao\?\.dueDate/);
    expect(appTela).toMatch(/Required|Obrigatório/);
  });

  it("e o cabeçalho de seção só aparece quando há duas", () => {
    // Com uma seção sozinha, ele é enfeite sobre uma lista que já é óbvia.
    expect(appTela).toMatch(/secoes\.length > 1/);
  });
});
