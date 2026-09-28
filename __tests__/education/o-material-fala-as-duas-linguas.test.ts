import { lerCodigo } from "../helpers/codigo";
import { ehPortugues, naLingua, temTraducao } from "@/lib/education-language";

/**
 * O material educativo nas duas línguas (096 T-1, 28/09/2026).
 *
 * `Article` sempre teve inglês e português. `EducationContent` tinha **um**
 * título e **um** corpo — então importar um artigo jogaria fora metade do que
 * já foi escrito, com a Ana lendo em inglês e outro paciente em português.
 *
 * A regra da queda é o que estes testes mais guardam: **mostra o que existe**.
 * Um texto na língua errada é lido com esforço; um card sem título não é lido
 * de jeito nenhum.
 */

const rota = lerCodigo("app", "api", "education", "route.ts");

const material = {
  title: "Shoulder impingement",
  description: "What it is",
  body: "The long text.",
  titlePt: "Impacto no ombro",
  descriptionPt: "O que é",
  bodyPt: "O texto longo.",
};

describe("qual língua é português", () => {
  it("pt-BR, pt e PT são", () => {
    expect(ehPortugues("pt-BR")).toBe(true);
    expect(ehPortugues("pt")).toBe(true);
    expect(ehPortugues("PT")).toBe(true);
  });

  it("e o resto não é — inclusive vazio e nulo", () => {
    expect(ehPortugues("en-GB")).toBe(false);
    expect(ehPortugues("")).toBe(false);
    expect(ehPortugues(null)).toBe(false);
  });
});

describe("o material sai na língua de quem lê", () => {
  it("português para quem lê português", () => {
    const r = naLingua(material, "pt-BR");
    expect(r.title).toBe("Impacto no ombro");
    expect(r.body).toBe("O texto longo.");
  });

  it("inglês para quem lê inglês", () => {
    const r = naLingua(material, "en-GB");
    expect(r.title).toBe("Shoulder impingement");
    expect(r.body).toBe("The long text.");
  });

  it("**e quem lê português vê o inglês quando não há tradução**", () => {
    // A queda "correta" para nulo produziria um card sem título. Um texto na
    // língua errada é lido com esforço; um card vazio não é lido.
    const soIngles = { title: "Only English", body: "Body", description: null };
    const r = naLingua(soIngles, "pt-BR");
    expect(r.title).toBe("Only English");
    expect(r.body).toBe("Body");
  });

  it("e o inverso também: só português não some para quem lê inglês", () => {
    const soPt = { title: "", titlePt: "Só português", body: "", bodyPt: "Corpo" };
    const r = naLingua(soPt as any, "en-GB");
    expect(r.title).toBe("Só português");
    expect(r.body).toBe("Corpo");
  });

  it("texto só de espaços conta como ausente", () => {
    const r = naLingua({ ...material, titlePt: "   " }, "pt-BR");
    expect(r.title).toBe("Shoulder impingement");
  });

  it("e os campos em português **não** saem na resposta", () => {
    // A tela não os usa, e mandá-los dobraria a resposta com texto que ninguém
    // vai mostrar.
    const r = naLingua(material, "pt-BR") as any;
    expect(r.titlePt).toBeUndefined();
    expect(r.bodyPt).toBeUndefined();
    expect(r.descriptionPt).toBeUndefined();
  });
});

describe("o que falta traduzir", () => {
  it("é dito para o painel, não para o paciente", () => {
    expect(temTraducao(material, "pt-BR")).toBe(true);
    expect(temTraducao({ title: "Only English" }, "pt-BR")).toBe(false);
  });
});

describe("a rota do paciente", () => {
  it("escolhe a língua no servidor, como os termos fazem", () => {
    // Se cada tela decidir por conta, um dia uma decide diferente.
    expect(rota).toMatch(/naLingua\(c, locale\)/);
    expect(rota).toMatch(/naLingua\(a\.content, locale\)/);
  });

  it("e a língua vem do paciente, não do aparelho", () => {
    // É a mesma que decide o e-mail e o push dele.
    expect(rota).toMatch(/preferredLocale: true/);
  });

  it("**o corpo passa a vir** — sem ele a tela de detalhe fica vazia", () => {
    /**
     * A tela de detalhe do app lê `item.body` da lista que já está em memória,
     * e a lista nunca mandava corpo nenhum: mesmo depois de importar um
     * artigo, o paciente veria título e resumo e nada do texto.
     */
    const vezes = (rota.match(/body: true/g) || []).length;
    expect(vezes).toBe(2); // o atribuído e o publicado
  });
});
