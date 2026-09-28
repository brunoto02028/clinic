jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import { lerEcg, exigeAtencao, TEXTO_DA_CONCLUSAO } from "@/lib/ecg-record";
import { resumirSerie } from "@/lib/patient-monitoring";

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
    afibClassification: 1,
    signalId: 987,
    recordedAt: "2026-09-20T08:31:00.000Z",
  }),
};

describe("o ECG, lido do que o aparelho concluiu", () => {
  it("ritmo normal", () => {
    const r = lerEcg(ecgNormal)!;
    expect(r.conclusao).toBe("normal");
    expect(r.heartRate).toBe(62);
    expect(r.signalId).toBe("987");
    expect(exigeAtencao(r)).toBe(false);
  });

  it("**fibrilação atrial é o caso que a clínica precisa ver**", () => {
    const r = lerEcg({ ...ecgNormal, rawPayload: JSON.stringify({ afibClassification: 2 }) })!;
    expect(r.conclusao).toBe("fibrilacao");
    expect(exigeAtencao(r)).toBe(true);
  });

  it("**classificação desconhecida vira inconclusivo, nunca normal**", () => {
    /**
     * Um código novo que a Withings passe a devolver não pode aparecer na tela
     * como se o aparelho tivesse dito que estava tudo bem. O erro cairia
     * exatamente do lado que não pode errar.
     */
    for (const v of [7, "99", null, undefined, "abc"]) {
      const r = lerEcg({ ...ecgNormal, rawPayload: JSON.stringify({ afibClassification: v }) })!;
      expect(r.conclusao).toBe("inconclusivo");
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

  it("as quatro conclusões têm frase nas duas línguas", () => {
    for (const k of ["normal", "fibrilacao", "inconclusivo", "sem_sinal"] as const) {
      expect(TEXTO_DA_CONCLUSAO[k].en).toBeTruthy();
      expect(TEXTO_DA_CONCLUSAO[k].pt).toBeTruthy();
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

describe("o relatório", () => {
  const relatorio = lerCodigo("lib", "patient-report.ts");
  const monitor = lerCodigo("lib", "patient-monitoring.ts");

  it("passou a reunir o acompanhamento do período", () => {
    expect(relatorio).toMatch(/getMonitoringData\(patientId, \{ days: opts\.days \?\? 30 \}\)/);
    expect(relatorio).toMatch(/renderMonitoringHTML\(monitoring\)/);
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
    expect(relatorio).toMatch(/day\$\{m\.dias === 1 \? "" : "s"\} with data/);
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
  const rota = lerCodigo("app", "api", "wearables", "data", "route.ts");

  it("**o ECG finalmente aparece para o paciente**", () => {
    expect(tela).toMatch(/d\.dataType === "ECG"/);
    expect(tela).toMatch(/Fibrilação atrial detectada/);
  });

  it("e a tela diz de quem é a conclusão", () => {
    expect(tela).toMatch(/we do not read the trace|não lemos o traçado/);
  });

  it("o payload cru não sai da rota", () => {
    // O que a tela precisa é a conclusão; mandar o JSON inteiro convidaria
    // cada tela a interpretar por conta própria.
    expect(rota).toMatch(/const \{ rawPayload, \.\.\.resto \} = p;/);
  });
});
