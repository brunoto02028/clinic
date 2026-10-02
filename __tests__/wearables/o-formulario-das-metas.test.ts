/**
 * @jest-environment node
 *
 * O formulário das metas (118 T-7).
 *
 * A tela é React Native e o app não tem harness de componente, por isso a
 * conta vive fora dela — e é a conta que importa, porque **a pessoa escreve o
 * sono em horas e o banco guarda minutos**, como a medição.
 *
 * Guardar 8 onde devia ir 480 daria um progresso de 7,5: a barra a dizer que
 * ela dormiu sete vezes a meta. É o defeito mais caro desta tarefa e o mais
 * fácil de não ver, porque 8 é um número perfeitamente plausível.
 */

import {
  CAMPOS_DE_META,
  textoInicial,
  lerFormulario,
  limitesEscritos,
  mensagemDaRecusa,
} from "../../mobile/src/lib/metas-formulario";

const sono = CAMPOS_DE_META.find((c) => c.chave === "sleepMinutes")!;
const passos = CAMPOS_DE_META.find((c) => c.chave === "steps")!;

describe("o que a tela mostra ao abrir", () => {
  it("**nada vem preenchido** quando nada está guardado", () => {
    expect(textoInicial(null)).toEqual({
      steps: "", activeMinutes: "", activeCalories: "", sleepMinutes: "",
    });
  });

  it("`null` vira caixa vazia, **não zero**", () => {
    // Zero é um alvo. Vazio é a ausência de alvo, que é o estado inicial certo.
    expect(textoInicial({ steps: null }).steps).toBe("");
  });

  it("**o sono guardado em minutos aparece em horas**", () => {
    expect(textoInicial({ sleepMinutes: 480 }).sleepMinutes).toBe("8");
    expect(textoInicial({ sleepMinutes: 450 }).sleepMinutes).toBe("7.5");
  });

  it("os outros aparecem como estão", () => {
    expect(textoInicial({ steps: 8000 }).steps).toBe("8000");
  });
});

describe("o que a tela envia", () => {
  const vazio = { steps: "", activeMinutes: "", activeCalories: "", sleepMinutes: "" };

  it("**o sono escrito em horas sai em minutos**", () => {
    const r = lerFormulario({ ...vazio, sleepMinutes: "8" });
    expect(r.ok && r.corpo.sleepMinutes).toBe(480);
  });

  it("sete horas e meia são 450 minutos, não 7,5", () => {
    const r = lerFormulario({ ...vazio, sleepMinutes: "7.5" });
    expect(r.ok && r.corpo.sleepMinutes).toBe(450);
  });

  it("aceita a vírgula decimal — é como se escreve em português", () => {
    const r = lerFormulario({ ...vazio, sleepMinutes: "7,5" });
    expect(r.ok && r.corpo.sleepMinutes).toBe(450);
  });

  it("**campo vazio envia `null`** — é apagar a meta", () => {
    // Omitir o campo deixaria a meta antiga de pé, e então apagar seria
    // impossível pela tela.
    const r = lerFormulario(vazio);
    expect(r.ok && r.corpo).toEqual({
      steps: null, activeMinutes: null, activeCalories: null, sleepMinutes: null,
    });
  });

  it("espaço em branco conta como vazio", () => {
    const r = lerFormulario({ ...vazio, steps: "   " });
    expect(r.ok && r.corpo.steps).toBeNull();
  });

  it("arredonda em vez de enviar fração de passo", () => {
    const r = lerFormulario({ ...vazio, steps: "8000.7" });
    expect(r.ok && r.corpo.steps).toBe(8001);
  });

  it("recusa o que não é número, nomeando a caixa", () => {
    const r = lerFormulario({ ...vazio, steps: "oito mil" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.campo.chave).toBe("steps");
    expect(!r.ok && r.motivo).toBe("nao-numero");
  });

  it("recusa fora do intervalo", () => {
    expect(lerFormulario({ ...vazio, steps: "400" }).ok).toBe(false);
    expect(lerFormulario({ ...vazio, steps: "1000000" }).ok).toBe(false);
  });

  it("**o intervalo do sono é verificado em minutos**, depois da conversão", () => {
    // Uma hora são 60 minutos, abaixo do mínimo de 120. Verificar antes de
    // converter aceitaria "1" como se fosse um minuto acima de nada.
    expect(lerFormulario({ ...vazio, sleepMinutes: "1" }).ok).toBe(false);
    expect(lerFormulario({ ...vazio, sleepMinutes: "2" }).ok).toBe(true);
    expect(lerFormulario({ ...vazio, sleepMinutes: "17" }).ok).toBe(false);
  });

  it("uma recusa **não envia nada** — nem os campos bons", () => {
    const r = lerFormulario({ ...vazio, steps: "8000", sleepMinutes: "99" });
    expect(r.ok).toBe(false);
  });
});

describe("a mensagem da recusa", () => {
  it("**fala na unidade em que a pessoa escreveu** — horas, não minutos", () => {
    // "escolha entre 120 e 960" a quem digitou horas é mandá-la dividir de
    // cabeça para descobrir o que a tela queria.
    expect(limitesEscritos(sono)).toEqual({ min: 2, max: 16 });
    const r = lerFormulario({ steps: "", activeMinutes: "", activeCalories: "", sleepMinutes: "20" });
    expect(r.ok).toBe(false);
    const m = !r.ok ? mensagemDaRecusa(r) : null;
    expect(m!.en).toBe("Sleep: choose between 2 and 16");
    expect(m!.pt).toBe("Sono: escolha entre 2 e 16");
  });

  it("os outros campos falam na própria unidade", () => {
    expect(limitesEscritos(passos)).toEqual({ min: 500, max: 100000 });
    const r = lerFormulario({ steps: "1", activeMinutes: "", activeCalories: "", sleepMinutes: "" });
    const m = !r.ok ? mensagemDaRecusa(r) : null;
    expect(m!.en).toBe("Steps: choose between 500 and 100000");
  });

  it("tem as duas línguas, sempre", () => {
    const r = lerFormulario({ steps: "x", activeMinutes: "", activeCalories: "", sleepMinutes: "" });
    const m = !r.ok ? mensagemDaRecusa(r) : null;
    expect(m!.en).toBeTruthy();
    expect(m!.pt).toBeTruthy();
    expect(m!.en).not.toBe(m!.pt);
  });
});

describe("os campos e os limites do servidor combinam", () => {
  it("**os quatro campos são os mesmos que a rota aceita**", () => {
    // Um campo a mais na tela seria uma caixa que o servidor recusa sempre; um
    // a menos seria uma meta que ninguém consegue definir.
    expect(CAMPOS_DE_META.map((c) => c.chave).sort()).toEqual(
      ["activeCalories", "activeMinutes", "sleepMinutes", "steps"]
    );
  });

  /*
   * A comparação com os limites **reais** da rota vive em
   * `a-rota-das-metas.test.ts`, que importa os dois lados. Aqui havia uma
   * terceira cópia dos oito números, escrita à mão: coincidia com a rota, e
   * por isso parecia uma guarda — mas como nada a ligava ao servidor,
   * **nenhuma alteração lá podia fazer este teste cair**. Era uma guarda que
   * só guardava a si mesma.
   */
});
