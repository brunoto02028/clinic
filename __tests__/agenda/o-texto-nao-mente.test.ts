/**
 * @jest-environment node
 *
 * O texto que mentia sobre o próprio sistema (106 T-1).
 *
 * O diálogo de nova consulta abria com *"o paciente receberá um e-mail de
 * confirmação automaticamente"*. A caixa logo abaixo, **desmarcada**, dizia o
 * contrário — e era ela que mandava.
 *
 * O Bruno leu a frase, acreditou, e pediu uma funcionalidade que já existia.
 * Texto de interface é código: um defeito alguém mede, uma frase todo mundo
 * acredita.
 *
 * Ao ir consertar a frase, apareceu o defeito de verdade, atrás dela: o
 * servidor decidia com `!== false`, então o campo **ausente** mandava e-mail.
 * A tela sempre mandava o campo — mas a promessa da casa não é "a tela toma
 * cuidado", é "nada sai sem alguém pedir".
 */
import { pediramEnviarAoPaciente } from "../../lib/notify-patient";

describe("nada sai para o paciente sem alguém pedir", () => {
  it("o silêncio é não: campo ausente não envia", () => {
    expect(pediramEnviarAoPaciente(undefined)).toBe(false);
  });

  it.each([null, false, "", 0, "false", "no"])("%p não envia", (valor) => {
    expect(pediramEnviarAoPaciente(valor)).toBe(false);
  });

  it("um sim explícito envia", () => {
    expect(pediramEnviarAoPaciente(true)).toBe(true);
  });

  it('o "true" que vem de formulário também é um sim', () => {
    expect(pediramEnviarAoPaciente("true")).toBe(true);
  });

  it("um objeto qualquer não é um sim disfarçado", () => {
    // `if (objeto)` seria verdadeiro. Aqui não é: só o sim conta.
    expect(pediramEnviarAoPaciente({})).toBe(false);
    expect(pediramEnviarAoPaciente([])).toBe(false);
    expect(pediramEnviarAoPaciente(1)).toBe(false);
  });
});
