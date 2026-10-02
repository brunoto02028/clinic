jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import {
  DIAS_MINIMOS_DE_BASE,
  REGRAS,
  desviosDosPontos,
  detectarDesvio,
  type PontoDaSerie,
} from "@/lib/monitoring-deviation";

/**
 * O desvio que a clínica precisa ver (099 T-6, 28/09/2026).
 *
 * ## O que estes testes protegem
 *
 * **Que a fibrilação atrial apareça.** O relógio conclui, nós guardamos — e
 * ninguém era avisado. É o achado que existe para ser visto, e ele não pode
 * depender de dez dias de histórico para aparecer.
 *
 * **E que o resto não vire ruído.** Um alarme que dispara sempre é um alarme
 * que ninguém lê, e aí o dia em que ele tinha razão passa junto com os outros.
 */

function serie(...vs: Array<number | null>): PontoDaSerie[] {
  return vs.map((v, i) => ({
    dia: `2026-09-${String(i + 1).padStart(2, "0")}`,
    valor: v,
  }));
}

/** Uma base estável, mais o último dia. */
function baseCom(ultimo: number, base = 60, n = DIAS_MINIMOS_DE_BASE): PontoDaSerie[] {
  // Um pouco de variação natural, senão o desvio-padrão é zero e nada dispara.
  const vs = Array.from({ length: n }, (_, i) => base + (i % 2 === 0 ? 1 : -1));
  return serie(...vs, ultimo);
}

describe("a régua é a pessoa, não a população", () => {
  it("**48 bpm em quem vivia em 70 é desvio**", () => {
    const d = detectarDesvio("restingHr", baseCom(48, 70));
    expect(d).not.toBeNull();
    expect(d!.sentido).toBe("queda");
    expect(d!.base).toBeCloseTo(70, 0);
  });

  it("**48 bpm em quem vive em 50 não é**", () => {
    // Mesmo número, outra pessoa. É a frase inteira desta tarefa.
    expect(detectarDesvio("restingHr", baseCom(48, 50))).toBeNull();
  });

  it("base curta não gera desvio nenhum", () => {
    // Com poucos dias não há linha de base — só uma média instável, e uma
    // seta desenhada sobre ela seria ruído com cara de achado.
    const curta = serie(70, 70, 71, 69, 48);
    expect(detectarDesvio("restingHr", curta)).toBeNull();
  });

  it("**variação pequena não é desvio, por mais significativa que pareça**", () => {
    /**
     * Uma pessoa muito regular tem desvio-padrão minúsculo, e aí dois
     * batimentos viram "três sigmas". O mínimo absoluto é o que impede a fila
     * de encher de nada.
     */
    const regular = baseCom(63, 60);
    const d = detectarDesvio("restingHr", regular);
    expect(REGRAS.restingHr.minimoAbsoluto).toBe(5);
    expect(d).toBeNull();
  });

  it("e a linha de base não inclui o próprio dia medido", () => {
    // Incluí-lo diluiria justamente o que se quer detectar.
    const d = detectarDesvio("restingHr", baseCom(48, 70))!;
    expect(d.base).toBeGreaterThan(65);
  });
});

describe("o lado que importa", () => {
  it("**SpO2 que sobe não é achado**", () => {
    expect(detectarDesvio("spo2", baseCom(99, 92))).toBeNull();
  });

  it("SpO2 que cai é", () => {
    expect(detectarDesvio("spo2", baseCom(86, 97))).not.toBeNull();
  });

  it("HRV só conta na queda", () => {
    expect(detectarDesvio("hrv", baseCom(120, 60))).toBeNull();
    expect(detectarDesvio("hrv", baseCom(30, 60))).not.toBeNull();
  });

  it("frequência de repouso conta dos dois lados", () => {
    expect(REGRAS.restingHr.direcao).toBe("ambas");
    expect(detectarDesvio("restingHr", baseCom(90, 60))).not.toBeNull();
  });
});

/**
 * Os códigos aqui estavam trocados até 02/10/2026.
 *
 * Estes testes usavam `2` para fibrilhação e `1` para ritmo normal. No campo
 * `ecg.afib` da Withings, **`1` é fibrilhação**, `0` é sem sinais dela e `2` é
 * *não classificável*. Ou seja: o achado que a clínica vê disparava num
 * registo que o relógio apenas não conseguiu classificar, e **ficava calado
 * numa fibrilhação de verdade**.
 *
 * O defeito era o mesmo de `lib/ecg-record.ts`, num segundo sítio — e os
 * testes dos dois lados estavam verdes a garanti-lo.
 */
describe("a fibrilação atrial", () => {
  const ecg = (classificacao: number, dia = "2026-09-20") => ({
    dataType: "ECG",
    dataDate: dia,
    restingHr: 96,
    rawPayload: JSON.stringify({ afibClassification: classificacao, recordedAt: `${dia}T08:00:00Z` }),
  });

  it("**aparece sem depender de linha de base**", () => {
    // Exigir dez dias de histórico para mostrá-la seria esconder exatamente o
    // achado que existe para ser visto.
    const achados = desviosDosPontos([ecg(1)]);
    expect(achados).toHaveLength(1);
    expect(achados[0].tipo).toBe("ecg");
    /*
     * A chave carrega o **instante**, não o dia — mudou em 02/10/2026 para que
     * duas fibrilhações no mesmo dia sejam dois achados.
     *
     * **A consequência, dita e aceite:** um achado de fibrilhação que alguém já
     * tinha marcado como visto volta à fila de pendentes uma vez, porque o
     * `MonitoringAlertAck` guarda a chave antiga. É ruído, e é o lado certo
     * para errar: um alerta que reaparece é melhor do que um que some.
     */
    expect(achados[0].chave).toBe("ecg_afib:2026-09-20T08:00:00Z");
  });

  it("ritmo sinusal não vira achado", () => {
    expect(desviosDosPontos([ecg(0)])).toHaveLength(0);
  });

  it("**um registo não classificável também não vira achado**", () => {
    // `2` é "o relógio não conseguiu classificar". Pôr isso na fila da clínica
    // como fibrilhação é um alarme por uma coisa que ninguém afirmou.
    expect(desviosDosPontos([ecg(2)])).toHaveLength(0);
  });

  it("**e um código desconhecido não vira fibrilhação nem silêncio enganoso**", () => {
    // Cai em inconclusivo, que não é achado — mas também não é "normal".
    expect(desviosDosPontos([ecg(7)])).toHaveLength(0);
  });

  it("e vem sempre no topo da lista", () => {
    const pontos: any[] = [
      ...baseCom(48, 70).map((p) => ({ dataType: "BODY", dataDate: p.dia, restingHr: p.valor })),
      ecg(1, "2026-09-01"),
    ];
    const achados = desviosDosPontos(pontos);
    expect(achados.length).toBeGreaterThan(1);
    expect(achados[0].tipo).toBe("ecg");
  });

  it("a chave carrega a data, então um episódio novo volta para a fila", () => {
    const a = desviosDosPontos([ecg(1, "2026-09-20")])[0];
    const b = desviosDosPontos([ecg(1, "2026-09-21")])[0];
    expect(a.chave).not.toBe(b.chave);
  });
});

describe("a fila, e o que ela não faz", () => {
  const rota = lerCodigo("app", "api", "admin", "monitoring", "deviations", "route.ts");
  const painel = lerCodigo("app", "admin", "biohacking", "page.tsx");

  it("**nada chega ao paciente por este caminho**", () => {
    expect(rota).not.toMatch(/notifyPatient|pushConsulta|sendTemplatedEmail|sendEmail/);
    expect(painel).toMatch(/Nothing here was sent to them/);
  });

  it("o desvio não é guardado — só o reconhecimento", () => {
    // Copiar o número criaria duas verdades sobre a mesma medição, e a cópia
    // envelheceria sozinha.
    expect(rota).toMatch(/desviosDosPontos\(/);
    expect(rota).toMatch(/monitoringAlertAck\.upsert/);
  });

  it("e quem viu primeiro fica", () => {
    expect(rota).toMatch(/update: \{\},/);
  });

  it("paciente de outro tenant não é marcado como visto", () => {
    expect(rota).toMatch(/where: \{ id: patientId, clinicId: actor\.clinicId, role: "PATIENT" \}/);
  });

  it("e paciente nenhum abre a fila", () => {
    expect(rota).toMatch(/actor\.role === "PATIENT"\) throw new AccessError\(404/);
  });

  it("a caixa só aparece quando há o que olhar", () => {
    // Uma caixa vazia dizendo "nenhum alerta" ocupa a tela todo dia por nada.
    expect(painel).toMatch(/desvios\.filter\(\(d\) => !d\.seenAt\)\.length > 0 &&/);
  });
});

describe("a aba de monitoramento (T-3)", () => {
  const aba = lerCodigo("components", "admin", "patient-monitoring-tab.tsx");
  const rota = lerCodigo("app", "api", "admin", "patients", "[id]", "monitoring", "route.ts");

  it("as séries dividem a mesma janela de tempo", () => {
    expect(aba).toMatch(/const \[days, setDays\] = useState\(30\)/);
    expect(aba).toMatch(/monitoring\?days=\$\{days\}/);
  });

  it("**dia sem dado é buraco, não zero**", () => {
    expect(aba).toMatch(/connectNulls=\{false\}/);
  });

  it("e não há faixa de normalidade", () => {
    // Um semáforo aqui seria leitura clínica feita por um gráfico.
    expect(aba).toMatch(/never a population range/);
    expect(aba).not.toMatch(/ReferenceArea|normalRange/);
  });

  it("paciente de outro tenant recebe 404", () => {
    expect(rota).toMatch(/where: \{ id: params\.id, clinicId: actor\.clinicId, role: "PATIENT" \}/);
    expect(rota).toMatch(/throw new AccessError\(404, "Not found"\)/);
  });

  it("e o botão de relatório leva o período escolhido", () => {
    expect(aba).toMatch(/report\?days=\$\{days\}/);
    const relatorio = lerCodigo("app", "api", "admin", "patients", "[id]", "report", "route.ts");
    expect(relatorio).toMatch(/getPatientReportData\(params\.id, \{ days \}\)/);
  });
});

/**
 * ## O defeito que estes testes **deixaram passar** (02/10/2026)
 *
 * Em 02/10 o ECG mudou de casa: a ingestão passou a escrever no `EcgRecording`
 * e deixou de escrever `WearableDataPoint{dataType:"ECG"}`. Esta função
 * continuou a ler só os pontos diários.
 *
 * Resultado: uma fibrilhação nova aparecia a vermelho no app do paciente e a
 * fila *"Worth a look"* da clínica ficava **vazia**. O estado anterior à
 * 099 T-6 — *"o ScanWatch conclui fibrilação atrial, nós guardamos, e ninguém
 * era avisado"* — reposto por outra porta, no mesmo dia em que se fechou outra.
 *
 * **E os 3.383 testes ficaram verdes**, porque os daqui fabricavam um
 * `WearableDataPoint` com `rawPayload` — um estado que o banco já não produz.
 * Um mock que descreve o passado testa o passado.
 */
describe("a fibrilhação vem das gravações, não dos pontos diários", () => {
  const gravacao = (
    recordedAt: string,
    conclusao: string,
    heartRate: number | null = 96
  ) => ({ id: `e-${recordedAt}`, recordedAt, heartRate, conclusao });

  it("**uma fibrilhação gravada hoje chega à clínica**", () => {
    const achados = desviosDosPontos([], [gravacao("2026-10-01T22:54:15.000Z", "fibrilacao")]);
    expect(achados).toHaveLength(1);
    expect(achados[0].tipo).toBe("ecg");
    expect(achados[0].conclusao).toBe("fibrilacao");
    expect(achados[0].dia).toBe("2026-10-01");
    expect(achados[0].valor).toBe(96);
  });

  it("e o ritmo sinusal continua a não ser achado", () => {
    expect(desviosDosPontos([], [gravacao("2026-10-01T22:54:15.000Z", "normal")])).toHaveLength(0);
  });

  it("nem o que o relógio não conseguiu classificar", () => {
    expect(
      desviosDosPontos([], [gravacao("2026-10-01T22:54:15.000Z", "inconclusivo")])
    ).toHaveLength(0);
  });

  it("**duas fibrilhações no mesmo dia são dois achados**", () => {
    /*
     * A chave era `ecg_afib:<dia>` e colapsava-as numa. Era o mesmo erro que a
     * 119 T-2 tirou do banco, repetido na fila da clínica: a segunda gravação
     * desaparecia sem deixar buraco.
     */
    const achados = desviosDosPontos([], [
      gravacao("2026-10-01T21:44:56.000Z", "fibrilacao", 78),
      gravacao("2026-10-01T22:54:15.000Z", "fibrilacao", 63),
    ]);
    expect(achados).toHaveLength(2);
    expect(new Set(achados.map((a) => a.chave)).size).toBe(2);
  });

  it("aceita um `Date`, que é o que o Prisma devolve", () => {
    const achados = desviosDosPontos([], [
      { id: "x", recordedAt: new Date("2026-10-01T22:54:15.000Z"), heartRate: 63, conclusao: "fibrilacao" },
    ]);
    expect(achados).toHaveLength(1);
    expect(achados[0].dia).toBe("2026-10-01");
  });

  it("**a mesma gravação nas duas fontes conta uma vez**", () => {
    // Durante a transição, um registo pode estar no ponto diário **e** na
    // tabela nova. Dois achados para a mesma gravação fariam a clínica pensar
    // que houve dois episódios.
    const instante = "2026-10-01T22:54:15.000Z";
    const achados = desviosDosPontos(
      [
        {
          dataType: "ECG",
          dataDate: "2026-10-01",
          restingHr: 63,
          rawPayload: JSON.stringify({ afibClassification: 1, recordedAt: instante }),
        },
      ],
      [gravacao(instante, "fibrilacao", 63)]
    );
    expect(achados).toHaveLength(1);
  });

  it("um ponto antigo sozinho ainda vale — o histórico não se apaga", () => {
    const achados = desviosDosPontos(
      [
        {
          dataType: "ECG",
          dataDate: "2026-09-20",
          restingHr: 96,
          rawPayload: JSON.stringify({ afibClassification: 1, recordedAt: "2026-09-20T08:00:00Z" }),
        },
      ],
      []
    );
    expect(achados).toHaveLength(1);
  });

  it("sem gravações nenhumas, não estoura", () => {
    expect(desviosDosPontos([])).toEqual([]);
    expect(desviosDosPontos([], [])).toEqual([]);
  });
});
