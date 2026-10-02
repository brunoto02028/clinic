jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import { lerEcg, exigeAtencao, TEXTO_DA_CONCLUSAO } from "@/lib/ecg-record";
import { resumirSerie } from "@/lib/patient-monitoring";
import { renderPatientReportHTML } from "@/lib/patient-report";

/**
 * O ECG que ninguém via, e o relatório que falava do plano (099 T-1/T-4).
 *
 * ## As duas coisas que estes testes protegem
 *
 * **Um dado clínico guardado e nunca mostrado.** O ECG entra no banco desde a
 * 074 e nenhuma tela o lia — o que é pior que não ter o dado, porque dá a
 * impressão de uma cobertura que não existe.
 *
 * **E a linha entre resumir e diagnosticar.** "FC de repouso 4 bpm menor" é
 * fato; "você está mais bem condicionado" é leitura clínica. Um texto
 * automático que interpreta erra sozinho, semana após semana, na caixa de
 * entrada de quem confia nele.
 */

const ecgNormal = {
  dataType: "ECG",
  dataDate: "2026-09-20",
  restingHr: 62,
  rawPayload: JSON.stringify({
    /* `0` é "sem sinais de fibrilhação" — o ritmo sinusal. Ver abaixo. */
    afibClassification: 0,
    signalId: 987,
    recordedAt: "2026-09-20T08:31:00.000Z",
  }),
};

/**
 * ## Este bloco **garantia o defeito** até 02/10/2026
 *
 * Os testes aqui estavam verdes a fixar a tabela errada: `1` como "ritmo
 * normal" e `2` como "fibrilhação". No campo `ecg.afib` da Withings, `0` é
 * *sem sinais de fibrilhação*, `1` é *fibrilhação*, e `2` é *não classificável*.
 *
 * Com a tabela antiga, um ECG com **fibrilhação detectada** aparecia na tela do
 * paciente como **"Ritmo normal"**.
 *
 * Soube-se pelos dados do próprio Bruno: dois ECG em 01/10/2026, os dois
 * "Normal" no relógio, e o nosso app a mostrar *"No usable signal"* — logo o
 * valor guardado era `0`, e `0` não é ausência de sinal.
 */
describe("o ECG, lido do que o aparelho concluiu", () => {
  it("**`0` é o ritmo sinusal** — sem sinais de fibrilhação", () => {
    const r = lerEcg(ecgNormal)!;
    expect(r.conclusao).toBe("normal");
    expect(r.heartRate).toBe(62);
    expect(r.signalId).toBe("987");
    expect(exigeAtencao(r)).toBe(false);
  });

  it("**`1` é fibrilhação — o caso que a clínica precisa ver**", () => {
    const r = lerEcg({ ...ecgNormal, rawPayload: JSON.stringify({ afibClassification: 1 }) })!;
    expect(r.conclusao).toBe("fibrilacao");
    expect(exigeAtencao(r)).toBe(true);
  });

  it("**`2` é não classificável** — e não é fibrilhação", () => {
    // A tabela antiga dizia "fibrilhação atrial detectada" para este valor:
    // um alarme por um registo que o relógio apenas não conseguiu classificar.
    const r = lerEcg({ ...ecgNormal, rawPayload: JSON.stringify({ afibClassification: 2 }) })!;
    expect(r.conclusao).toBe("inconclusivo");
    expect(exigeAtencao(r)).toBe(false);
  });

  it("**nenhum valor desconhecido vira 'normal'**", () => {
    /**
     * A certeza que temos é sobre `0` (provado pelos dados do Bruno) e sobre
     * `2` (documentado). O `1` vem por eliminação das três classes que a
     * Withings descreve. Então tudo o que não for `0` ou `1` cai em
     * inconclusivo: se a leitura do `1` estiver errada, o erro empurra para o
     * alarme e não para o sossego — e é essa a direcção certa para errar num
     * número que fala do coração de alguém.
     */
    for (const v of [2, 3, 7, "99", null, undefined, "abc"]) {
      const r = lerEcg({ ...ecgNormal, rawPayload: JSON.stringify({ afibClassification: v }) })!;
      expect(r.conclusao).toBe("inconclusivo");
      expect(r.conclusao).not.toBe("normal");
    }
  });

  it("payload quebrado não apaga o registro", () => {
    // O ECG **aconteceu**. Dizer que não houve nada seria a pior das saídas.
    const r = lerEcg({ ...ecgNormal, rawPayload: "{isto nao e json" })!;
    expect(r).not.toBeNull();
    expect(r.conclusao).toBe("inconclusivo");
    expect(r.recordedAt).toBe("2026-09-20");
  });

  it("e um ponto que não é ECG devolve nulo", () => {
    expect(lerEcg({ dataType: "SLEEP", dataDate: "2026-09-20" })).toBeNull();
  });

  it("as três conclusões têm frase nas duas línguas", () => {
    for (const k of ["normal", "fibrilacao", "inconclusivo"] as const) {
      expect(TEXTO_DA_CONCLUSAO[k].en).toBeTruthy();
      expect(TEXTO_DA_CONCLUSAO[k].pt).toBeTruthy();
    }
  });

  it("**a frase diz que a conclusão é do relógio**, não nossa", () => {
    // "Normal" sozinho soa a nota nossa sobre o coração da pessoa. Quem
    // concluiu foi o aparelho, e a frase tem de dizer isso — é a diferença
    // entre relatar e opinar, e é ela que nos mantém fora de dispositivo médico.
    for (const k of ["normal", "fibrilacao", "inconclusivo"] as const) {
      expect(TEXTO_DA_CONCLUSAO[k].en.toLowerCase()).toContain("watch");
      expect(TEXTO_DA_CONCLUSAO[k].pt.toLowerCase()).toContain("relógio");
    }
  });
});

describe("comparar a pessoa com ela mesma", () => {
  const serie = (...vs: Array<number | null>) =>
    vs.map((v, i) => ({ dia: `2026-09-${String(i + 1).padStart(2, "0")}`, valor: v }));

  it("sem dado, não inventa tendência", () => {
    expect(resumirSerie([])).toEqual({ atual: null, anterior: null, variacao: null, dias: 0 });
  });

  it("**com três pontos não há tendência — só o valor**", () => {
    // Uma seta para baixo em cima de dois pontos é pior que nenhuma seta.
    const r = resumirSerie(serie(70, 68, 66));
    expect(r.dias).toBe(3);
    expect(r.variacao).toBeNull();
    expect(r.atual).toBe(68);
  });

  it("com dado suficiente, parte o período ao meio", () => {
    const r = resumirSerie(serie(70, 70, 60, 60));
    expect(r.anterior).toBe(70);
    expect(r.atual).toBe(60);
    expect(r.variacao).toBe(-10);
  });

  it("**dia sem dado não conta como zero**", () => {
    // Uma noite sem o relógio no pulso não é uma noite sem sono, e contá-la
    // como zero inventaria uma queda.
    const r = resumirSerie(serie(400, null, null, 400, 400, 400));
    expect(r.dias).toBe(4);
    expect(r.atual).toBe(400);
    expect(r.variacao).toBe(0);
  });
});

/**
 * Um relatório com acompanhamento, na forma que o `getMonitoringData` devolve.
 *
 * Existe para que estes testes meçam o **documento**, e não a grafia de uma
 * chamada: três deles caíram quando `renderMonitoringHTML` ganhou um parâmetro,
 * sem que nada do que eles guardam tivesse mudado.
 */
const comAcompanhamento = (opts: { dias?: number } = {}) => {
  const dias = opts.dias ?? 30;
  const metrica = (atual: number) => ({ atual, variacao: 0, dias });
  return {
    patient: {
      id: "cmuq0001",
      firstName: "Teste",
      lastName: "QA",
      email: "qa@example.test",
      phone: null,
      dateOfBirth: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    screening: null,
    bodyAssessment: null,
    diagnosis: null,
    protocols: [],
    soapNotes: [],
    atlasChatCount: 0,
    monitoring: {
      periodo: { dias },
      temSinais: true,
      sinais: {
        sono: metrica(420),
        fcRepouso: metrica(55),
        hrv: metrica(40),
        spo2: metrica(98),
        passos: metrica(5000),
      },
      pressao: {
        leituras: 3,
        sistolica: metrica(120),
        diastolica: metrica(80),
        ultima: { systolic: 120, diastolic: 80, measuredAt: new Date("2026-10-01T09:00:00.000Z") },
      },
      ecg: [],
      exercicio: { registros: 0, diasComExercicio: 0 },
      comoSeSentiu: { registros: 0, dor: metrica(0), humor: metrica(0), ultimos: [] },
      consultas: [],
    },
  } as any;
};

describe("o relatório", () => {
  const relatorio = lerCodigo("lib", "patient-report.ts");
  const monitor = lerCodigo("lib", "patient-monitoring.ts");

  it("passou a reunir o acompanhamento do período", () => {
    expect(relatorio).toMatch(/getMonitoringData\(patientId, \{ days: opts\.days \?\? 30 \}\)/);
    /*
     * **O que sai, e não como a chamada está escrita.** Esta linha fixava
     * `renderMonitoringHTML(monitoring)` e caiu quando a função ganhou o
     * parâmetro do idioma — uma mudança que não tocou no comportamento que o
     * teste existe para guardar.
     */
    const saida = renderPatientReportHTML(comAcompanhamento());
    expect(saida).toMatch(/Blood pressure/);
    expect(saida).toMatch(/120\/80 mmHg/);
  });

  it("**seção sem dado não aparece**", () => {
    // Um relatório com seis "sem dados" é pior que um relatório curto.
    expect(relatorio).toMatch(/if \(mon\.pressao\.leituras > 0\)/);
    expect(relatorio).toMatch(/if \(mon\.ecg\.length > 0\)/);
    expect(relatorio).toMatch(/if \(mon\.exercicio\.registros > 0\)/);
    expect(relatorio).toMatch(/if \(mon\.temSinais\)/);
  });

  it("e falha na coleta não derruba o relatório inteiro", () => {
    // O relatório clínico continua saindo mesmo se o monitoramento falhar.
    expect(relatorio).toMatch(/getMonitoringData\([\s\S]{0,60}\.catch\(\(\) => null\)/);
  });

  it("**não há frase que conclua algo clínico**", () => {
    /**
     * A linha entre resumir e diagnosticar. O texto diz "lower"/"higher" e
     * quantos dias têm dado — nunca "melhorou", "risco" ou "normal".
     */
    const proibidas =
      /\b(improved|improving|worse|worsening|abnormal|risk of|likely|suggests|indicates|overtraining|diagnos)/i;
    const render = relatorio.slice(
      relatorio.indexOf("function renderMonitoringHTML"),
      relatorio.indexOf("export function renderPatientReportHTML")
    );
    expect(render).not.toMatch(proibidas);
  });

  it("e diz quantos dias têm dado, porque trinta noites e duas não são a mesma frase", () => {
    /* Medido na saída: o singular e o plural, que é o que a pessoa lê. */
    expect(renderPatientReportHTML(comAcompanhamento({ dias: 1 }))).toMatch(/1 day with data/);
    expect(renderPatientReportHTML(comAcompanhamento({ dias: 30 }))).toMatch(/30 days with data/);
  });

  it("**e em português também conta certo**", () => {
    const pt = (n: number) =>
      renderPatientReportHTML(comAcompanhamento({ dias: n }), { idioma: "pt" });
    expect(pt(1)).toMatch(/1 dia com dados/);
    expect(pt(30)).toMatch(/30 dias com dados/);
  });

  it("o ECG entra como fato, e a ausência do traçado é dita", () => {
    expect(relatorio).toMatch(/The trace is not stored and is not interpreted here/);
  });

  it("a coleta não interpreta nada", () => {
    expect(monitor).not.toMatch(/\b(normal|abnormal|risco|risk|alerta|alert)\b/i);
  });
});

describe("o app", () => {
  const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "wearable-data.tsx");
  const familia = lerCodigo("mobile", "app", "(app)", "(clinica)", "familia", "[nome].tsx");
  const lista = lerCodigo("mobile", "src", "components", "ListaDeEcg.tsx");
  const rota = lerCodigo("app", "api", "wearables", "data", "route.ts");

  /*
   * Estes testes liam a tela antiga. Em 02/10 o ECG mudou de casa — passou a
   * ter lista própria, uma linha por gravação (119 T-2) — e eles caíram, a
   * apontar para um ficheiro que já não é dono do assunto.
   *
   * Agora medem **o componente**, que é onde o comportamento vive, mais o facto
   * de as duas telas o usarem. Era esse o buraco: enquanto cada tela tinha a
   * sua cópia, elas podiam divergir e nenhuma delas estaria obviamente errada.
   */
  it("**as duas telas mostram a mesma lista de ECG**", () => {
    expect(tela).toMatch(/<ListaDeEcg/);
    expect(familia).toMatch(/<ListaDeEcg/);
  });

  it("**a lista tem um caminho próprio para a fibrilhação**", () => {
    /*
     * O ramo vive no `ecg-lista.ts`, não no componente: o componente só
     * pergunta `ehAchado(conclusao)` e escolhe a frase. É de propósito — o que
     * uma tela desenha não é verificável nesta base, e por isso a decisão sai
     * da tela.
     */
    expect(lista).toMatch(/ehAchado|FRASE_DA_CONCLUSAO/);
    expect(lerCodigo("mobile", "src", "lib", "ecg-lista.ts")).toMatch(/atrial fibrillation/i);
    expect(lerCodigo("mobile", "src", "lib", "ecg-lista.ts")).toMatch(/fibrilh?ação atrial/i);
  });

  it("**e nunca chama 'normal' ao que o relógio não assinalou**", () => {
    // Regra da tela do paciente desde o QA da T-8: nem "normal", nem
    // "alterado". Dizer o que o relógio não assinalou é relato.
    const semComentarios = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");
    for (const src of [tela, lista, lerCodigo("mobile", "src", "lib", "ecg-lista.ts")]) {
      expect(semComentarios(src)).not.toMatch(/en: "Normal rhythm"/);
      expect(semComentarios(src)).not.toMatch(/pt: "Ritmo normal"/);
    }
  });

  it("e a lista diz de quem é a conclusão", () => {
    expect(lista).toMatch(/we do not read the trace|não lemos o traçado/);
  });

  it("o payload cru não sai da rota", () => {
    // O que a tela precisa é a conclusão; mandar o JSON inteiro convidaria
    // cada tela a interpretar por conta própria.
    expect(rota).toMatch(/const \{ rawPayload, \.\.\.resto \} = p;/);
  });
});
