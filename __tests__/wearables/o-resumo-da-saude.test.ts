/**
 * @jest-environment node
 *
 * O resumo da aba Saúde (118 T-2).
 *
 * A primeira tela responde **uma** pergunta — *o que mudou desde ontem* — e o
 * que ela escolhe mostrar é a parte que tem como errar.
 *
 * ## As duas decisões que estes testes fixam
 *
 * **O que está em falta vem antes dos números.** Hoje um relógio fora do pulso
 * é indistinguível de um dia parado: zero passos porque a pessoa não andou e
 * zero passos porque o aparelho não sincronizou desenham o mesmo gráfico, e
 * levam a conclusões opostas sobre a própria saúde.
 *
 * **A ordem dos destaques é a do corpo, não a da variação.** Ordenar por "o que
 * mais mudou" põe no topo o que oscila mais — que costuma ser ruído — e faz a
 * tela mudar de assunto todos os dias, o que impede alguém de criar o hábito de
 * olhar para o mesmo sítio.
 */

import {
  destaques,
  variacao,
  pendencias,
  PontoDiario,
} from "../../mobile/src/lib/resumo-de-saude";

const vazio: Omit<PontoDiario, "dataDate" | "dataType"> = {
  sleepDuration: null, sleepEfficiency: null, deepMinutes: null, remMinutes: null,
  hrv: null, restingHr: null, spo2: null, steps: null,
  activeCalories: null, activeMinutes: null,
};

/** `n` dias, do mais antigo ao mais novo, com um campo preenchido. */
/**
 * O balde onde cada campo **mesmo** vive, espelhando o mapa.
 *
 * A versão anterior punha tudo em `VITALS`, incluindo `sleepDuration` e `hrv` —
 * um estado que o banco nunca produz, porque a ingestão escreve o sono em
 * `SLEEP`. Os testes passavam porque os leitores também não olhavam ao balde; a
 * partir do momento em que passaram a olhar, a fixture deixou de descrever
 * realidade nenhuma.
 */
const BALDE: Record<string, string> = {
  sleepDuration: "SLEEP",
  deepMinutes: "SLEEP",
  remMinutes: "SLEEP",
  hrv: "SLEEP",
  restingHr: "SLEEP",
  spo2: "VITALS",
  bodyTemperature: "VITALS",
  steps: "ACTIVITY",
  activeCalories: "ACTIVITY",
  activeMinutes: "ACTIVITY",
};

function dias(campo: keyof PontoDiario, valores: Array<number | null>): PontoDiario[] {
  return valores.map((v, i) => ({
    ...vazio,
    dataDate: `2026-09-${String(i + 1).padStart(2, "0")}`,
    dataType: BALDE[campo as string] ?? "VITALS",
    [campo]: v,
  })) as PontoDiario[];
}

/**
 * Um dia inteiro, **repartido pelos baldes que a ingestão usa**.
 *
 * Um dia real não é uma linha: são três, uma por `dataType`.
 */
function diaCompleto(
  dia: string,
  campos: Partial<Record<keyof PontoDiario, number>>
): PontoDiario[] {
  const porBalde = new Map<string, Record<string, number>>();
  for (const [campo, valor] of Object.entries(campos)) {
    const balde = BALDE[campo] ?? "VITALS";
    porBalde.set(balde, { ...(porBalde.get(balde) ?? {}), [campo]: valor as number });
  }
  return [...porBalde.entries()].map(
    ([dataType, c]) => ({ ...vazio, dataDate: dia, dataType, ...c }) as PontoDiario
  );
}

describe("a variação do resumo", () => {
  it("**compara médias, não duas leituras soltas**", () => {
    const v = variacao(dias("restingHr", [62, 62, 62, 60, 60, 60, 58, 58, 58]), "restingHr");
    expect(v).not.toBeNull();
    expect(v!.diasComparados).toBe(3);
    expect(v!.delta).toBe(-4);
  });

  it("**os dias sem leitura não entram na conta**", () => {
    // Se o `null` virasse zero, a média despencava e o resumo anunciava uma
    // queda que ninguém teve.
    const v = variacao(dias("restingHr", [62, null, 62, null, 60, 60, null, 58, 58, 58]), "restingHr");
    expect(v).not.toBeNull();
    expect(v!.delta).toBeGreaterThan(-10);
    expect(v!.delta).toBeLessThan(0);
  });

  it("devolve `null` com poucos dias, em vez de um palpite", () => {
    expect(variacao(dias("restingHr", [60, 58, 59]), "restingHr")).toBeNull();
    expect(variacao([], "restingHr")).toBeNull();
  });

  it("lê a série em ordem de data, mesmo que venha baralhada", () => {
    // O servidor devolve por data desc; a conta precisa de antigo → recente,
    // senão o sinal da variação inverte-se e a frase mente ao contrário.
    const baralhado = [...dias("restingHr", [62, 62, 62, 58, 58, 58])].reverse();
    const v = variacao(baralhado, "restingHr");
    expect(v!.delta).toBeLessThan(0);
  });
});

describe("os destaques", () => {
  /* Seis dias, cada um repartido pelos três baldes — como o banco os guarda. */
  const completo: PontoDiario[] = [62, 61, 60, 59, 58, 58].flatMap((fc, i) =>
    diaCompleto(`2026-09-${String(i + 1).padStart(2, "0")}`, {
      restingHr: fc,
      sleepDuration: 380 + i,
      hrv: 44 + i,
      spo2: 96,
      steps: 6000 + i * 100,
    })
  );

  it("**a ordem é fixa: sono, FC, HRV, SpO2, passos**", () => {
    // Não é por "o que mais mudou": isso põe o ruído no topo e muda de assunto
    // todos os dias.
    expect(destaques(completo).map((d) => d.chave)).toEqual(["sono", "fcRepouso", "hrv", "spo2"]);
  });

  it("**no máximo quatro** — o resumo não é um painel", () => {
    expect(destaques(completo)).toHaveLength(4);
  });

  it("uma métrica sem nenhuma leitura não aparece", () => {
    const semHrv = completo.map((p) => ({ ...p, hrv: null }));
    const chaves = destaques(semHrv).map((d) => d.chave);
    expect(chaves).not.toContain("hrv");
    expect(chaves).toContain("passos"); // entra no lugar
  });

  it("o valor é **o mais recente**, não a média", () => {
    const d = destaques(completo).find((x) => x.chave === "fcRepouso")!;
    expect(d.valor).toBe(58);
  });

  it("cada destaque sabe para que família leva", () => {
    const porChave = Object.fromEntries(destaques(completo).map((d) => [d.chave, d.familia]));
    expect(porChave.sono).toBe("sono");
    expect(porChave.fcRepouso).toBe("coracao");
    expect(porChave.hrv).toBe("coracao");
  });

  it("sem dados nenhuns, devolve vazio — e não quatro cartões em branco", () => {
    expect(destaques([])).toEqual([]);
  });

  it("com poucos dias mostra o valor e `delta` nulo, não um zero", () => {
    // Zero é "não mudou", e isso é uma afirmação. A ausência de comparação é
    // outra coisa, e a tela diz "ainda sem dias para comparar".
    const poucos = dias("restingHr", [60, 59]);
    const d = destaques(poucos)[0];
    expect(d.valor).toBe(59);
    expect(d.delta).toBeNull();
  });
});

describe("o que está em falta", () => {
  it("**sem aparelho nenhum é a primeira coisa a dizer**", () => {
    expect(pendencias([])).toEqual([{ tipo: "sem_aparelho" }]);
  });

  it("**autorização expirada é reconhecida pela mensagem**", () => {
    const p = pendencias([{ lastSyncError: "Withings status 503: Invalid Params: invalid refresh_token" }]);
    expect(p).toEqual([{ tipo: "autorizacao_expirada" }]);
  });

  it("outra falha qualquer não vira 'reconecte'", () => {
    // Mandar reconectar por uma falha de rede faz a pessoa refazer uma
    // autorização que está boa, e quando ela falhar outra vez conclui que o
    // produto está estragado.
    const p = pendencias([{ lastSyncError: "network timeout" }]);
    expect(p[0].tipo).toBe("falha_na_sincronizacao");
  });

  it("**um aparelho calado há dois dias é aviso**", () => {
    expect(pendencias([{ daysSilent: 3 }])).toEqual([{ tipo: "calado", dias: 3 }]);
  });

  it("um dia de silêncio não é pendência — é a vida normal", () => {
    expect(pendencias([{ daysSilent: 1 }])).toEqual([]);
  });

  it("uma ligação sã não produz pendência nenhuma", () => {
    expect(pendencias([{ status: "CONNECTED", daysSilent: 0 }])).toEqual([]);
  });

  it("**três ligações com o mesmo problema são um problema, não três linhas**", () => {
    const p = pendencias([
      { lastSyncError: "invalid refresh_token" },
      { lastSyncError: "invalid refresh_token" },
      { lastSyncError: "invalid refresh_token" },
    ]);
    expect(p).toHaveLength(1);
  });

  it("problemas diferentes aparecem os dois", () => {
    const p = pendencias([{ lastSyncError: "invalid refresh_token" }, { daysSilent: 4 }]);
    expect(p.map((x) => x.tipo).sort()).toEqual(["autorizacao_expirada", "calado"]);
  });
});
