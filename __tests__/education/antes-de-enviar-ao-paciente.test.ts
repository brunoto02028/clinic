jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import { emBlocos } from "@/lib/rich-text-blocks";

/**
 * O que a clínica vê antes de mandar, e para quem ela manda (101 T-2).
 *
 * O Bruno atribuiu um artigo e **só descobriu o que tinha mandado abrindo o
 * telefone**: *"está muito ruim a parte visual, não vê imagem, não vê
 * absolutamente nada"*. A tela de atribuir mostrava um título num seletor.
 *
 * A regra da casa é que nada sai sem alguém ver a prévia. Faltava a prévia — e,
 * na outra ponta, havia um botão que mandava para a clínica inteira com
 * "todos" já marcado.
 */

const previa = lerCodigo("components", "admin", "previa-do-material.tsx");
const atribuir = lerCodigo("app", "admin", "education", "assignments", "page.tsx");
const criar = lerCodigo("app", "admin", "education", "create", "page.tsx");
const rotaEnviar = lerCodigo("app", "api", "admin", "education", "send", "route.ts");
const rotaAtribuir = lerCodigo("app", "api", "admin", "education", "assignments", "route.ts");

describe("a prévia mostra o que o telefone vai desenhar", () => {
  it("**usa os mesmos blocos da rota do paciente, e não o HTML**", () => {
    /**
     * Uma prévia que renderizasse o HTML no navegador mostraria uma página
     * bonita e mentiria: o telefone desenha **blocos**, e o que some é
     * justamente o que não virou bloco.
     */
    expect(previa).toMatch(/emBlocos/);
    expect(previa).toMatch(/from "@\/lib\/rich-text-blocks"/);
    expect(previa).not.toMatch(/dangerouslySetInnerHTML/);
  });

  it("os seis tipos de bloco têm desenho, como no aplicativo", () => {
    for (const t of ["titulo", "paragrafo", "lista", "citacao", "imagem", "separador"]) {
      expect(previa).toContain(`case "${t}"`);
    }
  });

  it("**tem o logo da BPR**", () => {
    // Nada sai sem ele.
    expect(previa).toMatch(/src="\/logo\.png"/);
  });

  it("mostra a capa e a observação que a clínica escreveu", () => {
    expect(previa).toMatch(/material\.thumbnailUrl/);
    expect(previa).toMatch(/note\?\.trim\(\)/);
  });

  it("**avisa quando a língua que estou vendo não existe**", () => {
    /**
     * A língua do material é a do **paciente**, decidida no servidor. Sem este
     * aviso, quem atribui vê o inglês, acha que está tudo certo, e a paciente
     * que lê em português recebe um texto noutra língua.
     */
    expect(previa).toMatch(/temEstaLingua/);
    expect(previa).toMatch(/No Portuguese version/);
    expect(previa).toMatch(/No English version/);
  });

  it("e diz quando o corpo está vazio, em vez de mostrar nada", () => {
    // Título sozinho é o pior caso, porque é silencioso.
    expect(previa).toMatch(/no body text/);
  });
});

describe("a tela de atribuir passou a mostrar antes de enviar", () => {
  it("**a prévia está na caixa de atribuir**", () => {
    expect(atribuir).toMatch(/<PreviaDoMaterial/);
    expect(atribuir).toMatch(/material=\{contentList\.find\(\(c\) => c\.id === contentId\) \?\? null\}/);
  });

  it("a lista guarda o material inteiro, e não só o título", () => {
    // A rota sempre mandou corpo, capa e as duas línguas; a tela descartava.
    expect(atribuir).toMatch(/interface ContentItem extends MaterialParaPrevia/);
    expect(atribuir).not.toMatch(/map\(\(c: any\) => \(\{ id: c\.id, title: c\.title/);
  });

  it("e o botão de enviar não existe sem material e sem paciente", () => {
    expect(atribuir).toMatch(/disabled=\{creating \|\| !contentId \|\| !patientId\}/);
  });
});

describe("mandar para a clínica inteira deixou de ser um clique", () => {
  /**
   * O padrão era `"all"`, e a caixa abria **sozinha** ao publicar. Publicar e
   * "Send Now" escreviam uma atribuição e um aviso para todo paciente ativo da
   * clínica, sem ninguém saber quantos eram.
   */
  it("**nada vem pré-selecionado**", () => {
    // `"specific"` saiu da união depois: era caminho morto nas duas pontas —
    // a tela nunca o oferecia nem mandava `patientIds`.
    expect(criar).toMatch(/useState<"all" \| "condition" \| null>\(null\)/);
  });

  it("**publicar não abre mais a caixa de envio**", () => {
    expect(criar).not.toMatch(/publish && contentId[\s\S]{0,120}setShowSendDialog\(true\)/);
  });

  it("**primeiro se confere quem recebe, e só depois há botão de enviar**", () => {
    expect(criar).toMatch(/Check who receives it/);
    expect(criar).toMatch(/Send to \{conferido\.wouldSend\}/);
    expect(criar).toMatch(/!sendResult\?\.success && !conferido/);
  });

  it("trocar o critério invalida a conferência", () => {
    // Senão o número na tela passaria a ser de outro grupo de pessoas.
    expect(criar).toMatch(/setSendMode\(opt\.mode\); setConferido\(null\)/);
  });

  it("a conferência do servidor **não escreve nada**", () => {
    expect(rotaEnviar).toMatch(/if \(body\?\.dryRun\)/);
    // O marcador tem de ser **código**: `lerCodigo` tira os comentários, e um
    // `indexOf` que não acha devolve -1 — a fatia viraria o arquivo inteiro e
    // a asserção passaria a falar de outro trecho.
    const trecho = rotaEnviar.slice(rotaEnviar.indexOf("if (body?.dryRun)"));
    const fim = trecho.indexOf("let assignedCount = 0");
    expect(fim).toBeGreaterThan(0);
    const ateOFim = trecho.slice(0, fim);
    expect(ateOFim).not.toMatch(/\.create\(/);
    expect(ateOFim).not.toMatch(/\.update\(/);
  });

  it("e a prévia está na caixa de envio também", () => {
    expect(criar).toMatch(/<PreviaDoMaterial/);
  });
});

describe("o material e o paciente são desta clínica", () => {
  /**
   * A mesma forma do vazamento do envio em massa de 11/09/2026: o id vem do
   * corpo, o tenant vem da sessão, e ninguém verifica que os dois combinam.
   */
  it("**atribuir confere o paciente e o material**", () => {
    expect(rotaAtribuir).toMatch(/assertPatientAccess\(actorParaChecar, patientId\)/);
    expect(rotaAtribuir).toMatch(/findFirst\(\{\s*where: \{ id: contentId, clinicId \}/);
  });

  it("**enviar em massa confere o material**", () => {
    expect(rotaEnviar).toMatch(/findFirst\(\{\s*where: \{ id: contentId, clinicId \}/);
    expect(rotaEnviar).not.toMatch(/findUnique\(\{\s*where: \{ id: contentId \}/);
  });

  it("**e todo ramo de destinatário filtra por `clinicId`**", () => {
    /**
     * O recorte vai da palavra `where` até `role: "PATIENT"`.
     *
     * Eram três ramos; o de "pacientes escolhidos" saiu por ser caminho morto,
     * então sobraram **dois**. A asserção é sobre "todos os que existem", e não
     * sobre um número — congelar a contagem faria o teste reprovar quem apaga
     * código morto.
     */
    const ramos = rotaEnviar.match(/where: \{[\s\S]{0,120}?role: "PATIENT"/g) || [];
    expect(ramos.length).toBeGreaterThanOrEqual(2);
    for (const r of ramos) expect(r).toMatch(/clinicId/);
  });

  it("a língua do aviso sai do paciente, em todo ramo que resta", () => {
    const selects = rotaEnviar.match(/select: \{ id: true, firstName: true[^}]*\}/g) || [];
    expect(selects.length).toBeGreaterThanOrEqual(2);
    for (const s of selects) expect(s).toMatch(/preferredLocale/);
  });
});

describe("o artigo do site atravessa inteiro", () => {
  // O pedido do Bruno: *"quando eu puxo um artigo, venha com as imagens
  // juntas. Quando eu envio para o aplicativo, também vá com as imagens"*.
  it("a mesma tradução da rota do paciente vale na prévia", () => {
    const html =
      '<h2>Título</h2><p>Um&nbsp;parágrafo.</p><img src="/uploads/a.png" alt="Foto"><ul><li>um</li></ul>';
    const b = emBlocos(html);
    expect(b.map((x) => x.tipo)).toEqual(["titulo", "paragrafo", "imagem", "lista"]);
    expect((b[2] as any).url).toMatch(/\/uploads\/a\.png$/);
    expect((b[2] as any).legenda).toBe("Foto");
  });
});

describe("a prévia não pode ter a própria regra de língua", () => {
  /**
   * Eu reescrevi a queda de língua dentro do componente e ela errou no
   * primeiro caso medido: material só em inglês, visto em PT, mostrava o
   * **título** em inglês (com queda) e o **corpo vazio** (sem queda). A prévia
   * dizia "o paciente recebe o texto em inglês" e logo abaixo mostrava um
   * material sem corpo.
   *
   * Duas cópias da regra divergem, e a divergência aparece na tela de um
   * paciente.
   */
  it("**usa `naLingua`, a mesma do servidor**", () => {
    expect(previa).toMatch(/import \{ naLingua, temTraducao \} from "@\/lib\/education-language"/);
    expect(previa).toMatch(/naLingua\(material, locale\)/);
    expect(previa).toMatch(/temTraducao\(material, locale\)/);
  });

  it("e a queda vale para o corpo, não só para o título", () => {
    const { naLingua } = require("@/lib/education-language");
    const soIngles = { title: "English only", body: "<p>Only English.</p>" };
    const emPt = naLingua(soIngles, "pt-BR");
    expect(emPt.title).toBe("English only");
    // Era isto que o componente perdia.
    expect(emPt.body).toBe("<p>Only English.</p>");
  });
});

describe("a tela de atribuir fala as duas línguas", () => {
  /**
   * Era uma mistura: título "Assignments", subtítulo em português, botões em
   * inglês, um botão em português, e o estado vazio inteiro em português. O
   * painel tem chave EN/PT e esta tela a ignorava — e o inglês é a língua
   * primária da casa.
   */
  it("**usa o idioma do painel**", () => {
    expect(atribuir).toMatch(/useLocale\(\)/);
    expect(atribuir).toMatch(/const isPt = locale\?\.startsWith\("pt"\)/);
  });

  it("**nenhuma frase de tela ficou só em português**", () => {
    // Os comentários saem com `lerCodigo`; o que sobrar é texto de tela.
    const soTela = atribuir
      // `T("en", "pt")` e o ramo `isPt ? (…) : (…)` são bilíngues por
      // construção — o que se procura é o que ficou de fora deles.
      .replace(/T\(\s*(["'`])[\s\S]*?\1\s*,\s*(["'`])[\s\S]*?\2\s*\)/g, "")
      .replace(/isPt \? \([\s\S]*?\) : \(/g, "");
    expect(soTela).not.toMatch(/Dois passos/);
    expect(soTela).not.toMatch(/Nenhum material na clínica/);
    expect(soTela).not.toMatch(/Nenhuma atribuição ainda/);
    expect(soTela).not.toMatch(/só atribuído/);
  });

  it("e os avisos de erro também", () => {
    expect(atribuir).not.toMatch(/setError\("Failed to/);
    expect(atribuir).toMatch(/setSuccess\(T\(/);
  });
});
