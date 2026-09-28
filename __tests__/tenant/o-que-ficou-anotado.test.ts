/**
 * @jest-environment node
 */
import { ler, lerCodigo } from "../helpers/codigo";

/**
 * O que eu tinha anotado e não consertado (28/09/2026).
 *
 * Cinco coisas foram para o fim do relatório da 101 como "anotado, não
 * consertado". O Bruno mandou consertar, e ao medir **duas delas não eram o
 * que eu tinha escrito**: uma era defeito da minha própria varredura, e a
 * outra não existia.
 */

const varredura = lerCodigo("__tests__", "tenant", "toda-tela-tem-caminho.test.ts");
const scans = lerCodigo("app", "admin", "scans", "page.tsx");
const abas = lerCodigo("components", "admin", "section-tabs.tsx");
const criar = lerCodigo("app", "admin", "education", "create", "page.tsx");
const enviar = lerCodigo("app", "api", "admin", "education", "send", "route.ts");
const videoLib = lerCodigo("lib", "video-call.ts");
const rotaArtigo = lerCodigo("app", "api", "articles", "[id]", "route.ts");
const schema = ler("prisma", "schema.prisma");

describe("a varredura inventava órfãs", () => {
  /**
   * Três das quatro "telas sem caminho" **tinham botão na ficha do paciente o
   * tempo todo** — `documents` tem três links. A busca por link usava um
   * `indexOf` sozinho, então examinava só a **primeira** ocorrência de
   * `/admin/patients/${…}` em cada arquivo; na ficha a primeira é uma chamada
   * de API, 300 linhas acima dos `<Link>`.
   *
   * Uma varredura que inventa órfã manda consertar o que não está quebrado.
   */
  it("**agora ela olha todas as ocorrências**", () => {
    expect(varredura).toMatch(/idx = c\.indexOf\(`\$\{prefixo\}\\\$\{`, idx \+ 1\)/);
    expect(varredura).toMatch(/while \(idx !== -1\)/);
  });

  it("**e uma URL de API não conta como link de tela**", () => {
    // `/api/admin/patients/${id}/documents` é chamada de dados, não caminho.
    expect(varredura).toMatch(/!== "\/api"/);
  });

  it("**a lista de exceções ficou vazia**", () => {
    const bloco = varredura.slice(
      varredura.indexOf("const SEM_CAMINHO_CONHECIDAS"),
      varredura.indexOf("describe(")
    );
    expect(bloco).not.toMatch(/"\/admin\//);
  });

  it("e a prévia do scan ganhou o link que faltava", () => {
    // Era a única órfã de verdade. A caixa do relatório agora abre a folha
    // cheia, que é o que se imprime.
    expect(scans).toMatch(/\/admin\/scans\/report-preview\?id=\$\{selectedScan\.id\}/);
    expect(scans).toMatch(/Open the full page/);
  });
});

describe("a aba que se distingue pela query", () => {
  /**
   * "Calendário" é `/admin/appointments?view=calendar` — o mesmo caminho de
   * "Semana". `getActiveAdminNav` só recebe o `pathname`, então clicar nela
   * levava à tela certa e o menu continuava apontando para a vizinha.
   */
  it("**as abas leem a query**", () => {
    expect(abas).toMatch(/useSearchParams/);
    expect(abas).toMatch(/const activeKey = porQuery \?\? porRota/);
  });

  it("e uma aba sem query não rouba a decisão", () => {
    // `if (!query || …) return false` — sem query no `href`, nada muda.
    expect(abas).toMatch(/if \(!query \|\| !routeMatches\(clean, caminho\)\) return false/);
  });

  it("a query da aba tem de bater **inteira**", () => {
    expect(abas).toMatch(/\.every\(\s*\(\[k, v\]\) => searchParams\?\.get\(k\) === v/);
  });
});

describe('o envio "para pacientes escolhidos" era caminho morto', () => {
  /**
   * `sendTo: "specific"` estava no tipo e no servidor, e **nenhuma tela o
   * oferecia nem mandava `patientIds`** — escolher daria sempre "nenhum
   * paciente encontrado". Era uma porta que escrevia na caixa de entrada de
   * quem chamasse a rota à mão, e que até esta manhã nem filtrava por clínica.
   *
   * Quem escolhe paciente por paciente usa `/admin/education/assignments`,
   * que mostra a prévia do que vai mandar.
   */
  it("**saiu do cliente**", () => {
    expect(criar).toMatch(/useState<"all" \| "condition" \| null>\(null\)/);
    expect(criar).not.toMatch(/"specific"/);
  });

  it("**e do servidor, junto com o `patientIds`**", () => {
    expect(enviar).not.toMatch(/sendTo === "specific"/);
    expect(enviar).not.toMatch(/in: patientIds/);
    expect(enviar).toMatch(/const \{ contentId, sendTo, conditionTags \} = body/);
  });

  it("os dois modos que sobraram continuam filtrando por clínica", () => {
    const ramos = enviar.match(/where: \{[\s\S]{0,120}?role: "PATIENT"/g) || [];
    expect(ramos.length).toBeGreaterThanOrEqual(2);
    for (const r of ramos) expect(r).toMatch(/clinicId/);
  });
});

describe("recusa esperada da Daily não é erro no log", () => {
  /**
   * Entrar duas vezes na mesma consulta é o caminho normal, e na segunda a
   * Daily responde `400 already exists` — o código busca a sala existente logo
   * depois. O log registrava isso como erro a cada entrada, e `console.error`
   * no caminho feliz ensina a ignorar log.
   */
  it("**só a mensagem esperada desce para `debug`**", () => {
    expect(videoLib).toMatch(/console\.debug\(linha\)/);
    expect(videoLib).toMatch(/else console\.error\(linha\)/);
    expect(videoLib).toMatch(/\/already exists\/i/);
  });

  it("e qualquer outro 400 continua sendo erro", () => {
    // O padrão é do chamador, e `recusaEsperada` devolve `false` sem ele.
    expect(videoLib).toMatch(/return !!esperado && esperado\.test\(corpo\)/);
  });
});

describe("o material sobrevive ao artigo que o gerou", () => {
  /**
   * Eu tinha anotado que *"apagar a imagem do site apaga a do material"*.
   * **Medido, não é verdade**, e eu tinha escrito isso sem medir.
   *
   * O material guarda o próprio corpo, o próprio título e o próprio
   * `thumbnailUrl`; a rota do paciente não consulta o artigo para nada. E
   * apagar o artigo não apaga arquivo nenhum do R2.
   *
   * O que este teste protege é o dia em que alguém acrescentar a limpeza de
   * imagem ao apagar do artigo — aí os materiais quebrariam em silêncio.
   */
  it("**apagar o artigo não apaga arquivo**", () => {
    const bloco = rotaArtigo.slice(rotaArtigo.indexOf("prisma.article.delete"));
    expect(bloco.slice(0, 400)).not.toMatch(/deleteFromR2|deleteR2Url|DeleteObjectCommand/);
  });

  it("**e o vínculo com o artigo só é anulado, nunca cascateado**", () => {
    expect(schema).toMatch(
      /sourceArticle\s+Article\?\s+@relation\("ArticleAsEducation"[^)]*onDelete: SetNull\)/
    );
  });

  it("a rota do paciente não consulta o artigo para montar o material", () => {
    const rota = lerCodigo("app", "api", "education", "route.ts");
    expect(rota).not.toMatch(/sourceArticle/);
  });
});
