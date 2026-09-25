/**
 * @jest-environment node
 *
 * A língua em que se fala com cada paciente.
 *
 * Inglês é a língua primária: é o que se escreve primeiro e o que todo mundo
 * recebe quando não existe versão em português. O envio manual e o automático
 * têm que usar a **mesma** regra — duas implementações da mesma pergunta é
 * como a clínica acaba mandando inglês para quem só lê português, sem ninguém
 * perceber, porque quem escreveu lê os dois.
 */

import { langOf, pickForPatient, groupByLang } from "@/lib/patient-language";

const aviso = {
  title: "Clinic closed tomorrow",
  content: "We are closed on Friday.",
  titlePt: "Clínica fechada amanhã",
  contentPt: "Estaremos fechados na sexta.",
};

describe("langOf", () => {
  it("só pt-* é português; o resto é inglês", () => {
    expect(langOf("pt-BR")).toBe("pt");
    expect(langOf("pt")).toBe("pt");
    expect(langOf("en-GB")).toBe("en");
    expect(langOf(null)).toBe("en");
    expect(langOf("")).toBe("en");
  });
});

describe("pickForPatient", () => {
  it("dá a versão da língua do paciente", () => {
    expect(pickForPatient(aviso, "pt-BR")).toEqual({
      title: "Clínica fechada amanhã",
      content: "Estaremos fechados na sexta.",
    });
    expect(pickForPatient(aviso, "en-GB")).toEqual({
      title: "Clinic closed tomorrow",
      content: "We are closed on Friday.",
    });
  });

  it("sem versão em português, o falante de português recebe o inglês", () => {
    const so_ingles = { title: "Closed", content: "We are closed on Friday." };
    expect(pickForPatient(so_ingles, "pt-BR")).toEqual({
      title: "Closed",
      content: "We are closed on Friday.",
    });
  });

  it("português em branco não vira mensagem vazia", () => {
    const vazio = { ...aviso, contentPt: "   ", titlePt: "   " };
    expect(pickForPatient(vazio, "pt-BR").content).toBe("We are closed on Friday.");
  });

  it("paciente sem idioma definido recebe inglês", () => {
    expect(pickForPatient(aviso, null).content).toBe("We are closed on Friday.");
  });
});

describe("groupByLang", () => {
  it("separa para o envio, sem perder ninguém", () => {
    const { en, pt } = groupByLang([
      { id: "a", preferredLocale: "en-GB" },
      { id: "b", preferredLocale: "pt-BR" },
      { id: "c", preferredLocale: null },
      { id: "d", preferredLocale: "pt" },
    ]);

    expect(en.map((p) => p.id)).toEqual(["a", "c"]);
    expect(pt.map((p) => p.id)).toEqual(["b", "d"]);
  });
});
