/**
 * @jest-environment node
 *
 * As cinco famílias da aba Saúde (118 T-3).
 *
 * *"uma página para cada informação, como o withings faz"* — com a correção que
 * eu defendi e o Bruno aceitou: **uma página por família, não por métrica**.
 *
 * São ~12 medições hoje e mais quando entrarem os outros aparelhos da gama.
 * Doze páginas é muita superfície para construir, testar e manter honesta — e
 * ninguém pensa *"os meus minutos de REM"*, pensa *"o meu sono"*.
 *
 * A configuração é **dado**, e por isso testa-se. A tela só desenha.
 */

import {
  FAMILIAS,
  familiaPorChave,
  valorMostrado,
} from "../../mobile/src/lib/familias-de-saude";

describe("as cinco famílias", () => {
  it("são exatamente cinco, e nestas chaves", () => {
    expect(FAMILIAS.map((f) => f.chave)).toEqual([
      "coracao",
      "sono",
      "atividade",
      "pressao",
      "corpo",
    ]);
  });

  it("**cada uma tem nome nas duas línguas**", () => {
    for (const f of FAMILIAS) {
      expect(f.en.length).toBeGreaterThan(2);
      expect(f.pt.length).toBeGreaterThan(2);
      expect(f.en).not.toBe(f.chave);
    }
  });

  it("toda métrica tem nome nas duas línguas e um campo", () => {
    for (const f of FAMILIAS) {
      for (const m of f.metricas) {
        expect(m.campo).toBeTruthy();
        expect(m.en.length).toBeGreaterThan(2);
        expect(m.pt.length).toBeGreaterThan(2);
      }
    }
  });

  it("**nenhuma métrica aparece em duas famílias**", () => {
    // Um valor em dois sítios diverge: num deles fica desatualizado, e a pessoa
    // vê dois números diferentes para a mesma coisa.
    const campos = FAMILIAS.flatMap((f) => f.metricas.map((m) => m.campo));
    expect(campos).toHaveLength(new Set(campos).size);
  });

  it("`familiaPorChave` devolve `null` para o que não existe, em vez de rebentar", () => {
    expect(familiaPorChave("coracao")?.pt).toBe("Coração");
    expect(familiaPorChave("banana")).toBeNull();
    expect(familiaPorChave("")).toBeNull();
  });
});

describe("os desenhos próprios ficam onde fazem sentido", () => {
  it("**o dia hora a hora é do coração**, não do sono", () => {
    // É a série de frequência cardíaca; pô-la no sono seria desenhar a noite
    // duas vezes e deixar o coração sem o seu gráfico mais útil.
    expect(familiaPorChave("coracao")!.temODia).toBe(true);
    expect(familiaPorChave("sono")!.temODia).toBeUndefined();
  });

  it("**o hipnograma é do sono**", () => {
    expect(familiaPorChave("sono")!.temANoite).toBe(true);
    expect(familiaPorChave("coracao")!.temANoite).toBeUndefined();
  });

  it("o ECG é do coração", () => {
    expect(familiaPorChave("coracao")!.temEcg).toBe(true);
  });
});

describe("a pressão não é refeita aqui", () => {
  it("**tem tela própria, e a família manda para lá**", () => {
    // Refazê-la aqui criaria uma segunda versão a divergir da primeira — e a
    // que existe tem a atribuição da braçadeira partilhada, que é a parte
    // difícil e perigosa de errar.
    const p = familiaPorChave("pressao")!;
    expect(p.telaPropria).toBe("/(app)/(clinica)/blood-pressure");
    expect(p.metricas).toEqual([]);
  });

  it("e é a única com tela própria", () => {
    const comTela = FAMILIAS.filter((f) => f.telaPropria).map((f) => f.chave);
    expect(comTela).toEqual(["pressao"]);
  });
});

describe("a conversão de unidade vive com a configuração", () => {
  it("**o sono é guardado em minutos e mostrado em horas**", () => {
    const sono = familiaPorChave("sono")!;
    const duracao = sono.metricas.find((m) => m.campo === "sleepDuration")!;
    expect(duracao.unidade).toBe("h");
    expect(duracao.divisor).toBe(60);
    expect(valorMostrado(408, duracao)).toBe(6.8);
  });

  it("**a variação tem de usar a mesma conversão que o valor**", () => {
    // É o erro fácil: dividir na tela e esquecer na variação produz uma frase
    // a falar de "0.4 min" por baixo de um número em horas. Por isso a
    // conversão vive aqui, e não em cada sítio que desenha.
    const sono = familiaPorChave("sono")!;
    const duracao = sono.metricas.find((m) => m.campo === "sleepDuration")!;
    const antes = valorMostrado(360, duracao); // 6h
    const depois = valorMostrado(408, duracao); // 6.8h
    expect(depois - antes).toBeCloseTo(0.8, 5);
  });

  it("uma métrica sem divisor passa intacta", () => {
    const fc = familiaPorChave("coracao")!.metricas.find((m) => m.campo === "restingHr")!;
    expect(fc.divisor).toBeUndefined();
    expect(valorMostrado(58, fc)).toBe(58);
  });

  it("os minutos de sono profundo e REM ficam em minutos", () => {
    // Converter tudo para horas daria "1.2h" de profundo, que é pior de ler
    // que "72 min" — a unidade certa é a que a pessoa usa para falar daquilo.
    const sono = familiaPorChave("sono")!;
    for (const campo of ["deepMinutes", "remMinutes"]) {
      const m = sono.metricas.find((x) => x.campo === campo)!;
      expect(m.unidade).toBe("min");
      expect(m.divisor).toBeUndefined();
    }
  });
});

describe("o eixo do zero", () => {
  it("**passos e calorias começam no zero; frequência não**", () => {
    // Um eixo de frequência que comece no zero achata a variação até ela
    // desaparecer; um eixo de passos que não comece no zero exagera-a.
    const atividade = familiaPorChave("atividade")!;
    for (const m of atividade.metricas) expect(m.deZero).toBe(true);

    const coracao = familiaPorChave("coracao")!;
    for (const m of coracao.metricas) expect(m.deZero).toBeUndefined();
  });
});
