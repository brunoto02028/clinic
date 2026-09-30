/**
 * @jest-environment node
 *
 * O alerta, o e-mail e a tela chamam a mesma leitura pelo mesmo nome.
 *
 * Havia um **terceiro** classificador. `lib/automation/bp-bands.ts` alimenta o
 * alerta da clínica e o e-mail ao paciente, e tinha limiares próprios: o "stage
 * 2" dele era o ponto médio entre o alerta e a crise **daquela clínica**. Com os
 * padrões, isso dá 155/100 — e 115/95 saía:
 *
 * | leitura | tela e prontuário | alerta e e-mail |
 * |---|---|---|
 * | 145/85 | Well above UK guidance | **Above UK guidance** |
 * | 135/95 | Well above UK guidance | **Above UK guidance** |
 * | 115/95 | Well above UK guidance | **Above UK guidance** |
 *
 * A correção de vocabulário da manhã tinha trocado as **palavras** dele e
 * deixado a **aritmética** — e com isso piorado a visibilidade do defeito: os
 * dois passaram a usar o mesmo vocabulário, então *pareciam* concordar.
 *
 * O teste que existia comparava a web com o mobile e nunca chegava aqui. Este
 * compara as duas perguntas que a função responde, que são diferentes:
 *
 * - **devo alertar?** — dos limiares da clínica, e é legítimo que variem;
 * - **como isto se chama?** — da régua pública, e não varia nunca.
 */

import { classify, classificationFor, BP_DEFAULTS, type BpThresholds } from "@/lib/automation/bp-bands";
import { classifyBP, BP_LABELS } from "@/lib/blood-pressure";

/** As três do Bruno, as de fronteira, e a hipotensão. */
const LEITURAS: Array<[number, number]> = [
  [145, 85], [135, 95], [115, 95],
  [125, 83], [138, 87], [171, 90], [186, 122],
  [119, 79], [120, 79], [129, 79], [130, 80], [139, 89], [140, 90],
  [179, 119], [180, 120], [89, 59], [90, 60], [85, 55],
];

/** Uma clínica que baixou o alerta, e outra que o subiu. */
const BAIXA: BpThresholds = { alertSystolic: 110, alertDiastolic: 70, crisisSystolic: 170, crisisDiastolic: 110 };
const ALTA: BpThresholds = { alertSystolic: 160, alertDiastolic: 100, crisisSystolic: 200, crisisDiastolic: 130 };

describe("o nome é da régua, e não da configuração", () => {
  it("**o alerta chama a leitura como a tela a chama**, nas dezoito", () => {
    for (const [s, d] of LEITURAS) {
      expect(classify(s, d, BP_DEFAULTS).classification).toBe(BP_LABELS[classifyBP(s, d)].en);
    }
  });

  it("**as três leituras do Bruno** — onde os dois discordavam", () => {
    for (const [s, d] of [[145, 85], [135, 95], [115, 95]] as Array<[number, number]>) {
      expect(classify(s, d, BP_DEFAULTS).classification).toBe(BP_LABELS.STAGE2.en);
    }
  });

  it("**mudar o limiar da clínica não muda o nome da leitura**", () => {
    // É o cerne: a clínica decide quando quer ser chamada, e não como a
    // pressão de alguém se chama.
    for (const [s, d] of LEITURAS) {
      const nome = classify(s, d, BP_DEFAULTS).classification;
      expect(classify(s, d, BAIXA).classification).toBe(nome);
      expect(classify(s, d, ALTA).classification).toBe(nome);
    }
  });

  it("**a hipotensão deixou de sair como Normal**", () => {
    // 85/55 ficava abaixo do limiar de alerta da clínica e caía no ramo do
    // "Normal". A régua chama isso de baixa, e é o que o alerta dizia errado.
    expect(classify(85, 55, BP_DEFAULTS).classification).toBe(BP_LABELS.LOW.en);
  });

  it("nenhum nome de categoria diagnóstica sai daqui", () => {
    const proibidas = /stage [12]|hypertension|hipertens|estágio|crise hipertensiva/i;
    for (const [s, d] of LEITURAS) {
      expect(classify(s, d, BP_DEFAULTS).classification).not.toMatch(proibidas);
      expect(classificationFor(classify(s, d, BP_DEFAULTS).faixa, true)).not.toMatch(proibidas);
    }
  });
});

describe("o alerta continua a ser da clínica", () => {
  it("**o limiar baixo alerta onde o padrão não alerta**", () => {
    // Se o nome deixasse de variar *e* o alerta também, a correção teria
    // tirado da clínica uma decisão que é dela.
    expect(classify(115, 75, BP_DEFAULTS).isAlert).toBe(false);
    expect(classify(115, 75, BAIXA).isAlert).toBe(true);
  });

  it("o limiar alto não alerta onde o padrão alerta", () => {
    expect(classify(145, 85, BP_DEFAULTS).isAlert).toBe(true);
    expect(classify(145, 85, ALTA).isAlert).toBe(false);
  });

  it("a crise segue os números da clínica", () => {
    expect(classify(175, 115, BP_DEFAULTS).isCrisis).toBe(false);
    expect(classify(175, 115, BAIXA).isCrisis).toBe(true);
  });

  it("**e a leitura não alertada continua com o nome certo**", () => {
    // 145/85 numa clínica com alerta em 160/100 não gera e-mail nenhum — mas se
    // aparecer em qualquer lugar, aparece com o nome da régua, e não com um
    // "abaixo do limiar desta clínica".
    expect(classify(145, 85, ALTA).classification).toBe(BP_LABELS.STAGE2.en);
  });
});

describe("a língua de quem lê", () => {
  it("**o e-mail em português diz o nome em português**", () => {
    // Dizia `Classificação: Very high — get help now`: a frase traduzida e o
    // valor em inglês, que é o meio par que só se vê na caixa de entrada.
    const { faixa } = classify(186, 122, BP_DEFAULTS);
    expect(classificationFor(faixa, true)).toBe(BP_LABELS.CRISIS.pt);
    expect(classificationFor(faixa, false)).toBe(BP_LABELS.CRISIS.en);
  });

  it("as duas línguas são mesmo diferentes — senão o teste acima é vazio", () => {
    for (const [s, d] of LEITURAS) {
      const { faixa } = classify(s, d, BP_DEFAULTS);
      if (BP_LABELS[faixa].en === BP_LABELS[faixa].pt) continue; // "Normal" nas duas
      expect(classificationFor(faixa, true)).not.toBe(classificationFor(faixa, false));
    }
  });
});
