/**
 * @jest-environment node
 *
 * O relatório que o paciente leva ao médico **não afirma diagnóstico** (118 T-5).
 *
 * ## Porque este ficheiro existe
 *
 * O QA de 02/10/2026 gerou o papel pela rota nova, abriu-o, e contou:
 *
 * ```
 * diagnos               ×1   <h2>Clinical Diagnosis (AI-assisted, clinician reviewed)</h2>
 * not a diagnosis       ×0
 * não é um diagnóstico  ×0
 * ```
 *
 * Uma ocorrência, e era uma **afirmação** — com condição e gravidade por baixo:
 *
 * ```
 * Conditions
 *   • Patellofemoral pain (moderate): Anterior knee pain on loading
 * ```
 *
 * ## Porque isto não é uma questão de redação
 *
 * A regra deste produto é que **só geramos relatórios detalhados; quem
 * diagnostica é médico** — e é isso que o mantém fora de "dispositivo médico".
 * A tela do app já dizia a frase certa. O **papel** não levava nada: e é o papel
 * que sai da app, que se imprime, e que alguém põe à frente de um clínico.
 *
 * O ficheiro `lib/patient-report.ts` nasceu como documento **interno da
 * clínica**, onde a palavra fazia sentido. A T-5 mudou o destinatário sem rever
 * o texto — e a T-5 existe precisamente para pôr este papel na mão do paciente.
 *
 * ## O que se guarda, e o que não
 *
 * Guarda-se que **nenhuma ocorrência da palavra é uma afirmação**. Não se bane a
 * palavra: negá-la obriga a escrevê-la. A regra é não *reivindicar* um
 * diagnóstico, e foi assim que ela ficou escrita no ECG (099 T-9) — uma regra, um
 * sítio, duas rotas.
 */

import { renderPatientReportHTML } from "../../lib/patient-report";

/**
 * O estado que a base produz, e não um que convenha ao teste.
 *
 * `conditions` e `findings` são colunas de texto com JSON lá dentro — o
 * `parseJson` do renderizador existe por isso. Um array já desserializado
 * passaria no teste e nunca aconteceria.
 */
const dados = () =>
  ({
    patient: {
      id: "cmuqtvvw70000xzb8wclu2kf5",
      firstName: "Teste",
      lastName: "QA",
      email: "qa118.t5.dono@example.test",
      phone: null,
      dateOfBirth: new Date("1980-01-15T00:00:00.000Z"),
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    screening: null,
    bodyAssessment: null,
    diagnosis: {
      id: "cmuqdx0001",
      createdAt: new Date("2026-10-02T09:00:00.000Z"),
      status: "APPROVED",
      summary: "Pattern consistent with patellofemoral overload on the right.",
      conditions: JSON.stringify([
        { name: "Patellofemoral pain", severity: "moderate", description: "Anterior knee pain on loading" },
      ]),
      findings: JSON.stringify([{ area: "Right knee", finding: "Pain on squat" }]),
      therapistComments: null,
    },
    /*
     * **As secções cheias, e não vazias** (achado do code review).
     *
     * A fixture tinha `protocols: []`, `soapNotes: []` e `screening: null` — e
     * as três secções que saíam **inteiramente em inglês** no papel PT eram
     * exactamente essas. As asserções de tradução passavam contra um documento
     * que não tinha o conteúdo onde o erro estava.
     *
     * 23 cadeias inglesas sobreviveram assim, com 14 chaves de tradução escritas
     * no dicionário e nunca ligadas ao render.
     */
    protocols: [
      {
        title: "Joelho direito",
        status: "ACTIVE",
        createdAt: new Date("2026-09-10T00:00:00.000Z"),
        estimatedWeeks: 8,
        therapist: { firstName: "Ana", lastName: "L." },
        therapistComments: "Progredir carga conforme tolerância.",
        goals: JSON.stringify([{ timeline: "4 semanas", goal: "Subir escadas sem dor" }]),
        precautions: JSON.stringify([{ precaution: "Evitar impacto nas duas primeiras semanas" }]),
        items: [
          {
            phase: "SHORT_TERM",
            type: "HOME_EXERCISE",
            name: "Agachamento isométrico",
            description: "Parede, 45 graus",
            sets: 3,
            reps: 10,
            holdSeconds: 30,
            weeks: 4,
          },
        ],
      },
    ],
    soapNotes: [
      {
        createdAt: new Date("2026-09-28T00:00:00.000Z"),
        therapist: { firstName: "Ana", lastName: "L." },
        painLevel: 4,
        subjective: "Refere melhora ao subir escadas.",
        objective: "Agachamento até 60 graus sem dor.",
        assessment: "Evolução conforme esperado.",
        plan: "Manter protocolo.",
      },
    ],
    atlasChatCount: 0,
    monitoring: null,
  }) as any;

const html = (idioma?: "en" | "pt") =>
  renderPatientReportHTML(dados(), idioma ? { idioma } : undefined);

/** Cada sítio onde a palavra aparece, com o que vem antes dela. */
const ocorrencias = (texto: string) =>
  Array.from(texto.matchAll(/.{0,60}diagnos\w*/gi)).map((m) => m[0]);

describe("a palavra, e de que lado dela o papel está", () => {
  it("**o papel nega**, e é a única forma em que a palavra aparece", () => {
    const t = html();
    const achados = ocorrencias(t);
    expect(achados.length).toBeGreaterThan(0);
    for (const a of achados) {
      expect(a.toLowerCase()).toMatch(/(is )?not a diagnos|não é um diagnós/);
    }
  });

  it("**o cabeçalho da secção não reivindica um** — e o conteúdo fica", () => {
    /*
     * A correção não foi esconder a secção: o que lá está é o que a terapeuta
     * registou, e escondê-lo do paciente seria pior do que o nome errado.
     */
    const t = html();
    expect(t).not.toMatch(/<h2>[^<]*Clinical Diagnosis/i);
    expect(t).toContain("Pattern consistent with patellofemoral overload");
    expect(t).toContain("Patellofemoral pain");
    expect(t).toContain("Pain on squat");
  });

  it("**e o cabeçalho diz de quem é aquilo** — como o ECG diz que a conclusão é do relógio", () => {
    /*
     * Tirar a palavra e deixar um "Assessment" solto resolveria a varredura e
     * perderia o que torna a secção honesta: **quem** registou, e que passou por
     * um clínico. Sem isso, o leitor supõe que é nosso — que é a suposição que
     * a palavra antiga já criava.
     *
     * É a mesma regra do papel do ECG: a conclusão é sempre atribuída ao
     * aparelho, nunca a nós.
     */
    const t = html();
    const cabecalho = t.match(/<h2>([^<]*(assessment|avalia)[^<]*)<\/h2>/i)?.[1] ?? "";
    expect(cabecalho).toMatch(/therapist|terapeuta/i);
    expect(cabecalho).toMatch(/clinician reviewed|revis/i);
  });

  it("**e a negação está no rodapé**, que é o que sai impresso em todas as páginas", () => {
    const t = html();
    expect(t).toMatch(/class="footer"[\s\S]{0,400}not a diagnosis/i);
  });

  it("diz também que **não foi lido por um médico**", () => {
    // "Não é um diagnóstico" sozinho ainda deixa supor que alguém o leu.
    expect(html()).toMatch(/has not been read by a doctor/i);
  });
});

describe("a explicação não viaja dentro do documento", () => {
  it("**nenhum comentário HTML leva a frase antiga**", () => {
    /*
     * A primeira tentativa de corrigir isto pôs a explicação como `<!-- -->`
     * **dentro** da template string — ou seja, o documento entregue ao paciente
     * continuaria a conter *"Clinical Diagnosis"* por extenso, no código-fonte,
     * a um clique de distância de quem abrisse a página.
     */
    const t = html();
    expect(t).not.toMatch(/<!--[\s\S]*diagnos/i);
    expect(t).not.toContain("Clinical Diagnosis");
  });
});

describe("o papel continua a não inventar o resto", () => {
  it("**sem faixas de referência, sem 'normal', sem 'anormal'**", () => {
    // Saiu na 099 T-2 e não volta por um documento novo.
    const t = html();
    expect(t).not.toMatch(/reference range|faixa de referência/i);
    expect(t).not.toMatch(/\babnormal\b/i);
  });

  it("e não fala na segunda pessoa sobre o corpo de ninguém", () => {
    expect(html()).not.toMatch(/you have (a|an|the)? ?(condition|disease|disorder)/i);
  });
});

describe("o papel fala a língua do paciente", () => {
  /**
   * Medido pelo QA: com `reportLanguage = "pt"` o HTML saía **byte a byte igual**
   * ao inglês. O campo existe desde sempre, e o PDF do ECG e o da avaliação
   * corporal já o respeitavam — este não, e é o que o paciente leva a um médico.
   *
   * Meio papel traduzido é pior do que nenhum: convida a ignorar a parte que não
   * se lê.
   */
  it("**em português, é mesmo português**", () => {
    const pt = html("pt");
    expect(pt).toContain("Relatório clínico");
    expect(pt).toContain("Dados do paciente");
    expect(pt).toMatch(/Isto não é um diagnóstico/);
    expect(pt).not.toContain("Clinical Report");
    expect(pt).not.toContain("Patient Information");
  });

  it("**e a negação também é traduzida** — não fica uma frase inglesa no meio", () => {
    const pt = html("pt");
    expect(pt).not.toMatch(/This is not a diagnosis/i);
    for (const a of ocorrencias(pt)) {
      expect(a.toLowerCase()).toMatch(/não é um diagnós/);
    }
  });

  it("em inglês continua inglês, e os dois não são o mesmo documento", () => {
    const en = html("en");
    expect(en).toContain("Clinical Report");
    expect(en).not.toContain("Relatório clínico");
    expect(en).not.toBe(html("pt"));
  });

  it("**sem idioma dito, inglês** — que é a língua primária do produto", () => {
    expect(html()).toContain("Clinical Report");
  });

  it("e o cabeçalho da avaliação é atribuído nas duas línguas", () => {
    /*
     * Sem fixar a grafia: o que se guarda é **a atribuição**, e não a forma do
     * particípio. Este mesmo teste caiu quando o PT passou de europeu para
     * brasileiro — uma mudança que não tocou no que ele existe para guardar.
     */
    expect(html("pt")).toMatch(/registr\w* pelo seu terapeuta/i);
    expect(html("pt")).toMatch(/revis\w+ por um clínico/i);

    /*
     * **E não promove quem revê.** Na primeira passagem para PT-BR eu escrevi
     * "revisada por um **médico**" — quem revê é o clínico que acompanha, e
     * dizer médico seria elevar a afirmação no papel que a pessoa leva a um
     * médico de verdade.
     */
    expect(html("pt")).not.toMatch(/revis\w+ por um médico/i);
  });
});

describe("o papel em português não fica meio traduzido", () => {
  /**
   * Aconteceu duas vezes num dia.
   *
   * Primeiro o documento inteiro saía em inglês com `reportLanguage = "pt"`.
   * Corrigi os cabeçalhos — e ficaram por traduzir os rótulos das tabelas
   * (*"Name"*, *"Age"*, *"Occupation"*), as datas (`en-GB` fixo, dando *"Paciente
   * desde 24 Sept 2026"*), a barra de imprimir e os estados crus da base.
   *
   * **Meio papel traduzido é pior do que nenhum**: convida a ignorar a parte que
   * não se lê, e num documento clínico a parte que não se lê pode ser a que
   * importa.
   *
   * O que **não** se traduz, e é de propósito: o que a terapeuta escreveu, o que
   * o paciente respondeu na triagem, e o nome de uma condição. Traduzir o registo
   * clínico de alguém seria reescrevê-lo.
   */
  /**
   * A palavra inteira, e não um pedaço dela.
   *
   * A primeira versão usava `includes` e acusava "Dosage" num papel
   * correctamente traduzido, porque *"Dosagem"* contém *"Dosage"*. Um teste que
   * acusa à toa é um teste que a próxima pessoa desliga — e este existe
   * precisamente para não ser desligado.
   */
  const palavraInteira = (w: string, texto: string) =>
    new RegExp("\\b" + w + "\\b").test(texto);

  const NOSSAS_PALAVRAS_EM_INGLES = [
    "Name", "Age", "Email", "Phone", "Patient since",
    "Occupation", "Activity level", "Surgical history", "Other conditions",
    "Current medications", "Allergies", "Height / Weight",
    "Patient Information", "Medical Screening", "Clinical Report",
    "Print / Save as PDF", "Blood pressure", "Exercise", "How you felt",
    "Most recent", "Readings in period", "Appointments in the period",
    "with data", "average of the",
    /*
     * Estas só se tornaram alcançáveis quando a fixture deixou de ter os
     * protocolos e as notas vazios — eram as secções inteiramente inglesas.
     */
    "Treatment Protocol", "Therapist comments", "Treatment Goals", "Precautions",
    "Session Notes", "Red Flags Reported", "Home Exercise", "Short-Term",
    "Created", "Details", "Dosage", "Weeks",
  ];

  it("**nenhum rótulo nosso fica em inglês**", () => {
    /*
     * **Fronteira de palavra, e não `includes`.**
     *
     * A primeira versão acusava "Dosage" num papel correctamente traduzido,
     * porque *"Dosagem"* contém *"Dosage"*. Um teste que acusa à toa é um teste
     * que a próxima pessoa desliga — e este existe precisamente para não ser
     * desligado.
     */
    const pt = html("pt");
    const escaparam = NOSSAS_PALAVRAS_EM_INGLES.filter((w) => palavraInteira(w, pt));
    expect(escaparam).toEqual([]);
  });

  it("e a varredura **não acusa uma tradução correcta**", () => {
    // "Dosagem" contém "Dosage"; a fronteira de palavra é o que os separa.
    expect(palavraInteira("Dosage", "Dosagem")).toBe(false);
    expect(palavraInteira("Dosage", "<th>Dosage</th>")).toBe(true);
    expect(palavraInteira("Created", "Criado em")).toBe(false);
  });

  it("**e as datas seguem a língua**", () => {
    /*
     * `fmtDate` tinha `"en-GB"` fixo. Com o resto traduzido, saía *"Paciente
     * desde 24 Sept 2026"* — meia frase em cada língua, na linha que identifica
     * a pessoa.
     */
    const pt = html("pt");
    expect(pt).not.toMatch(/(Sept|Aug|Oct|Jan|Feb|Mar|Apr|Jun|Jul|Nov|Dec)/);
  });

  it("**e o estado não sai cru da base**", () => {
    // "Estado: APPROVED" é vocabulário nosso a vazar para o papel de alguém.
    expect(html("pt")).not.toContain("APPROVED");
    expect(html("pt")).toMatch(/aprovada/i);
  });

  it("mas **o que a pessoa escreveu fica como ela escreveu**", () => {
    // O resumo da terapeuta e o nome da condição não se traduzem.
    const pt = html("pt");
    expect(pt).toContain("Pattern consistent with patellofemoral overload");
    expect(pt).toContain("Patellofemoral pain");
  });

  it("e em inglês continua tudo em inglês", () => {
    const en = html("en");
    expect(en).toContain("Patient Information");
    expect(en).toContain("Clinical Report");
  });
});

describe("a marca do papel é a da clínica de quem o recebe", () => {
  /**
   * O cabeçalho e o rodapé escreviam *"Bruno Physical Rehabilitation · Ipswich,
   * Suffolk"* à mão, para **qualquer** inquilino. Um paciente de outro estúdio
   * recebia um documento clínico assinado por uma clínica que não é a dele — e
   * agora quem gera o papel é o próprio paciente, portanto haverá muitos mais.
   */
  const comClinica = (nome: string | null, cidade?: string) => {
    const d = dados();
    d.patient.clinic = nome ? { name: nome, city: cidade ?? null, country: "GB" } : null;
    return renderPatientReportHTML(d);
  };

  it("**o nome vem da clínica do paciente**", () => {
    const h = comClinica("Manu Training", "Lisboa");
    expect(h).toContain("Manu Training");
    expect(h).not.toContain("Bruno Physical Rehabilitation");
  });

  it("e aparece no cabeçalho **e** no rodapé", () => {
    const h = comClinica("Manu Training");
    expect(h.match(/Manu Training/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("**sem clínica, diz 'a sua clínica'** — vago, mas verdadeiro", () => {
    /*
     * Pôr um nome que pode ser de outra pessoa num documento clínico é pior do
     * que não pôr nenhum.
     */
    expect(comClinica(null)).toMatch(/your clinic/i);
    const d = dados();
    d.patient.clinic = null;
    expect(renderPatientReportHTML(d, { idioma: "pt" })).toMatch(/a sua clínica/i);
  });
});
