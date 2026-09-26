/**
 * @jest-environment node
 *
 * O que prometemos sobre o exame (26/09/2026).
 *
 * O enquadramento é do Bruno, e é o que este teste guarda: *"nós facilitamos a
 * vida do paciente dando acesso a exames privados; o resultado vai para a
 * pessoa; depois ela pode enviar para o médico de sua preferência."*
 *
 * A versão 1.0 do consentimento dizia o contrário — que o terapeuta revisava
 * antes — e ficou falsa quando a 083 tornou o exame independente. Um texto que
 * promete uma revisão que não acontece é pior que nenhum texto.
 */

import fs from "fs";
import path from "path";
import {
  LAB_TESTS_CONSENT,
  LAB_TESTS_CONSENT_VERSION,
  labConsentFor,
} from "../../lib/lab-consent";

const termos = fs.readFileSync(path.join(__dirname, "..", "..", "app", "terms", "page.tsx"), "utf8");

describe("o consentimento não promete revisão nenhuma", () => {
  it.each(["en-GB", "pt-BR"] as const)("%s não diz que alguém revisa antes", (loc) => {
    const texto = LAB_TESTS_CONSENT[loc].points.join(" ").toLowerCase();
    // As frases que a 1.0 tinha e que deixaram de ser verdade.
    expect(texto).not.toMatch(/reviews it and writes a note/);
    expect(texto).not.toMatch(/revisa e escreve uma nota/);
    expect(texto).not.toMatch(/before it appears/);
    expect(texto).not.toMatch(/antes de ele aparecer/);
  });

  it.each(["en-GB", "pt-BR"] as const)("%s diz que o resultado é da pessoa", (loc) => {
    const texto = LAB_TESTS_CONSENT[loc].points.join(" ");
    expect(texto).toMatch(loc === "pt-BR" ? /O resultado é seu/ : /The result is yours/);
    expect(texto).toMatch(loc === "pt-BR" ? /Ninguém da clínica lê antes/ : /Nobody at the clinic reads it first/);
  });

  it.each(["en-GB", "pt-BR"] as const)("%s diz que compartilhar é escolha dela", (loc) => {
    const texto = LAB_TESTS_CONSENT[loc].points.join(" ");
    expect(texto).toMatch(loc === "pt-BR" ? /o médico que preferir/ : /whichever doctor you prefer/);
    expect(texto).toMatch(loc === "pt-BR" ? /Não enviamos a ninguém/ : /We do not send it to anyone/);
  });

  it.each(["en-GB", "pt-BR"] as const)("%s separa quem vende de quem analisa", (loc) => {
    const texto = LAB_TESTS_CONSENT[loc].points.join(" ");
    expect(texto).toMatch(/London Medical Laboratory/);
    expect(texto).toMatch(loc === "pt-BR" ? /Não somos um laboratório/ : /We are not a laboratory/);
  });

  it("as duas línguas têm o mesmo número de pontos — nenhuma versão fica curta", () => {
    expect(LAB_TESTS_CONSENT["pt-BR"].points.length).toBe(LAB_TESTS_CONSENT["en-GB"].points.length);
  });

  it("a versão subiu, senão quem aceitou a 1.0 nunca veria o texto novo", () => {
    expect(LAB_TESTS_CONSENT_VERSION).not.toBe("1.0");
  });

  it("o inglês é o padrão para qualquer locale que não seja pt-BR", () => {
    expect(labConsentFor(null)).toBe(LAB_TESTS_CONSENT["en-GB"]);
    expect(labConsentFor("es-ES")).toBe(LAB_TESTS_CONSENT["en-GB"]);
    expect(labConsentFor("pt-BR")).toBe(LAB_TESTS_CONSENT["pt-BR"]);
  });
});

describe("os termos de uso cobrem o laboratório", () => {
  it("existe uma seção própria", () => {
    // 295 linhas e zero menção ao laboratório era o estado anterior.
    expect(termos).toMatch(/Laboratory Tests/);
    expect(termos).toMatch(/Exames de Laboratório/);
  });

  it("diz que a análise é responsabilidade do laboratório, não nossa", () => {
    expect(termos).toMatch(/are its responsibility, not ours/);
    expect(termos).toMatch(/são responsabilidade dela, não nossa/);
  });

  it("diz que pedir um exame não cria relação clínica", () => {
    expect(termos).toMatch(/does not create a clinical relationship/);
    expect(termos).toMatch(/não cria relação clínica/);
  });

  it("tem a regra de reembolso que o Bruno definiu: até o kit chegar", () => {
    expect(termos).toMatch(/Until the kit reaches you, we refund in full/);
    expect(termos).toMatch(/Até o kit chegar a você, reembolsamos integralmente/);
  });

  it("e a numeração continua sequencial depois da inserção", () => {
    const ns = [...termos.matchAll(/flex-shrink-0">(\d+)<\/Badge>/g)].map((m) => Number(m[1]));
    expect(ns).toEqual(Array.from({ length: ns.length }, (_, i) => i + 1));
  });
});

describe("a contradição pendente está registrada, não escondida", () => {
  it("o arquivo do consentimento avisa que a fila de liberação contradiz o texto", () => {
    // Enquanto `LabReviewMode.THERAPIST` segurar resultado, o item 3 é falso
    // para aquele caminho. A compra está fechada, mas isso não some por si.
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "lab-consent.ts"), "utf8");
    expect(src).toMatch(/Contradição pendente no código/);
    expect(src).toMatch(/LAB_ORDERING_ENABLED/);
  });
});

describe("o aceite dos termos passa a ter versão", () => {
  const raizT = path.join(__dirname, "..", "..");
  const lerT = (...p: string[]) => fs.readFileSync(path.join(raizT, ...p), "utf8");

  it("existe uma fonte única da versão", () => {
    const lib = lerT("lib", "terms-version.ts");
    expect(lib).toMatch(/export const TERMS_VERSION = "1\.1"/);
  });

  it("a versão subiu junto com a seção de laboratório nos termos", () => {
    // Quem aceitou antes não leu que a análise é do laboratório, que o resultado
    // é da pessoa, nem a regra de reembolso.
    expect(lerT("lib", "terms-version.ts")).not.toMatch(/TERMS_VERSION = "1\.0"/);
  });

  it("aceitar grava uma linha no ConsentLog, não só um carimbo no usuário", () => {
    const rota = lerT("app", "api", "patient", "consent", "route.ts");
    expect(rota).toMatch(/registrarAceiteDosTermos\(\{ patientId: userId, req, onde: 'portal' \}\)/);
    // E o e-mail deixa de cravar a versão à mão.
    expect(rota).not.toMatch(/termsVersion: 'v1\.0'/);
    expect(rota).toMatch(/termsVersion: TERMS_VERSION/);
  });

  it("a triagem também grava, nos dois pontos em que carimba", () => {
    const tri = lerT("app", "api", "medical-screening", "route.ts");
    expect(tri.match(/registrarAceiteDosTermos/g)?.length).toBe(3); // 1 import + 2 usos
    // Só quando o carimbo foi gravado agora — o `updateMany` com filtro nulo não
    // sobrescreve um aceite anterior, e logar um aceite que não houve é pior.
    expect(tri).toMatch(/if \(r\.count === 1\)/);
  });

  it("o registro guarda IP e aparelho — é o que faz dele auditoria", () => {
    const lib = lerT("lib", "terms-version.ts");
    expect(lib).toMatch(/ipAddress:/);
    expect(lib).toMatch(/userAgent:/);
  });

  it("e falhar o log nunca derruba o aceite", () => {
    // O carimbo já foi gravado por quem chamou: perder a linha é ruim, perder o
    // aceite é pior.
    expect(lerT("lib", "terms-version.ts")).toMatch(/catch \(e: any\) \{[\s\S]{0,200}console\.error/);
  });

  it("a idade está confirmada, não suposta", () => {
    expect(lerT("lib", "lab-consent.ts")).toMatch(/16, decisão do Bruno/);
  });
});

describe("as telas do laboratório não prometem revisão (achado do Bruno no aparelho)", () => {
  const raizL = path.join(__dirname, "..", "..", "mobile");
  const lerL = (...p: string[]) => fs.readFileSync(path.join(raizL, ...p), "utf8");

  it("o catálogo não diz que o terapeuta revisa antes", () => {
    // Sobreviveu à remoção da fila de liberação e foi o Bruno quem viu, no
    // aparelho: a tela prometia exatamente o que os termos negam.
    const cat = lerL("app", "(app)", "(lab)", "(tabs)", "index.tsx");
    expect(cat).not.toMatch(/therapist reviews the result/i);
    expect(cat).not.toMatch(/terapeuta revisa o resultado/i);
    expect(cat).toMatch(/The result comes straight to you/);
    expect(cat).toMatch(/O resultado vem direto para você/);
  });

  it("a tela do exame também não", () => {
    const det = lerL("app", "(app)", "(lab)", "[id].tsx");
    expect(det).not.toMatch(/Your therapist reviews the result/i);
    expect(det).toMatch(/It is yours to share with whichever doctor you prefer/);
  });

  it("e nenhuma tela do laboratório promete revisão, em nenhuma língua", () => {
    const dir = path.join(raizL, "app", "(app)", "(lab)");
    const arquivos: string[] = [];
    const varrer = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) varrer(full);
        else if (e.name.endsWith(".tsx")) arquivos.push(full);
      }
    };
    varrer(dir);
    expect(arquivos.length).toBeGreaterThan(3);
    for (const f of arquivos) {
      const src = fs.readFileSync(f, "utf8");
      expect(src).not.toMatch(/therapist reviews/i);
      expect(src).not.toMatch(/terapeuta revisa/i);
    }
  });
});

describe("o app da clínica tem duas áreas, não três", () => {
  const raizM = path.join(__dirname, "..", "..");
  it("a BA sai do seletor, a não ser que alguém a conceda de propósito", () => {
    // Aparecia pelo atalho de "admin vê tudo"; paciente nunca teve.
    const rota = fs.readFileSync(path.join(raizM, "app", "api", "mobile", "modules", "route.ts"), "utf8");
    expect(rota).toMatch(/const semBa =/);
    expect(rota).toMatch(/baLiberado \? mods : mods\.filter\(\(m\) => m\.key !== "ba"\)/);
    // Nos dois caminhos: o da equipe e o do paciente.
    // Dois lugares chamam: o caminho da equipe e o do paciente.
    expect(rota.match(/semBa\(sem/g)?.length).toBe(2);
  });
});
