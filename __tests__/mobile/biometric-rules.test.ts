/**
 * @jest-environment node
 *
 * A tranca biométrica tem duas maneiras de dar errado, e as duas são piores
 * que não existir:
 *
 *  1. escrever "Face ID" num aparelho que não tem Face ID — manda o paciente
 *     procurar um botão que o telefone dele não tem;
 *  2. trancar alguém que perdeu o sensor — deixa a pessoa do lado de fora da
 *     própria conta, sem nada a apertar.
 *
 * O encanamento com o `expo-local-authentication` o TypeScript garante. O que
 * pode regredir em silêncio é a decisão, e é ela que fica presa aqui.
 */

import {
  AUTH_TYPE,
  RELOCK_AFTER_MS,
  canOfferLock,
  kindFor,
  labelFor,
  shouldLock,
  shouldRelock,
} from "../../mobile/src/lib/biometric-rules";

describe("kindFor", () => {
  it("reconhece o que o aparelho respondeu", () => {
    expect(kindFor([AUTH_TYPE.FACIAL_RECOGNITION])).toBe("face");
    expect(kindFor([AUTH_TYPE.FINGERPRINT])).toBe("fingerprint");
    expect(kindFor([AUTH_TYPE.IRIS])).toBe("iris");
  });

  it("com rosto e digital juntos, anuncia o rosto", () => {
    // O telefone tenta o rosto sozinho ao acender a tela; é o que a pessoa
    // encosta primeiro, e o nome na tela tem que combinar com isso.
    expect(kindFor([AUTH_TYPE.FINGERPRINT, AUTH_TYPE.FACIAL_RECOGNITION])).toBe("face");
  });

  it("sem sensor nenhum, e sem resposta, é 'none'", () => {
    expect(kindFor([])).toBe("none");
    expect(kindFor(null)).toBe("none");
    expect(kindFor(undefined)).toBe("none");
  });
});

describe("labelFor", () => {
  it("usa os nomes da Apple no iPhone", () => {
    expect(labelFor("ios", "face").en).toBe("Face ID");
    expect(labelFor("ios", "fingerprint").en).toBe("Touch ID");
    // Marca registrada não se traduz: o iPhone em português também diz
    // "Face ID".
    expect(labelFor("ios", "face").pt).toBe("Face ID");
  });

  it("no Android fala a língua do aparelho, não a da Apple", () => {
    expect(labelFor("android", "face").en).not.toMatch(/Face ID/);
    expect(labelFor("android", "fingerprint").pt).toBe("digital");
    expect(labelFor("android", "face").pt).toBe("desbloqueio facial");
  });

  it("sempre devolve os dois idiomas preenchidos", () => {
    for (const platform of ["ios", "android", "web"]) {
      for (const kind of ["face", "fingerprint", "iris", "none"] as const) {
        const l = labelFor(platform, kind);
        expect(l.en.length).toBeGreaterThan(0);
        expect(l.pt.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("canOfferLock", () => {
  it("exige sensor E cadastro", () => {
    expect(canOfferLock({ hasHardware: true, isEnrolled: true })).toBe(true);
    // Sensor sem cadastro abre o prompt do sistema e falha: a opção no perfil
    // viraria uma promessa quebrada.
    expect(canOfferLock({ hasHardware: true, isEnrolled: false })).toBe(false);
    expect(canOfferLock({ hasHardware: false, isEnrolled: true })).toBe(false);
  });
});

describe("shouldLock", () => {
  const ready = { hasHardware: true, isEnrolled: true, preferenceOn: true, hasSession: true };

  it("tranca quando tudo está no lugar", () => {
    expect(shouldLock(ready)).toBe(true);
  });

  it("não tranca quem não ligou a opção", () => {
    expect(shouldLock({ ...ready, preferenceOn: false })).toBe(false);
  });

  it("não tranca sem sessão guardada — não haveria o que destrancar", () => {
    expect(shouldLock({ ...ready, hasSession: false })).toBe(false);
  });

  it("NÃO tranca quem ligou a opção e depois apagou o rosto do aparelho", () => {
    // O caso que importa. Trocou de telefone, resetou a biometria: a tranca
    // cai sozinha e o app abre. A senha continua sendo a chave de verdade, e
    // ninguém perde acesso à conta por causa de um sensor.
    expect(shouldLock({ ...ready, isEnrolled: false })).toBe(false);
    expect(shouldLock({ ...ready, hasHardware: false })).toBe(false);
  });
});

describe("shouldRelock", () => {
  it("não re-tranca na ida e volta rápida a outro app", () => {
    // Fotografar um documento e voltar não deveria exigir o rosto de novo.
    expect(shouldRelock(5_000, true)).toBe(false);
    expect(shouldRelock(RELOCK_AFTER_MS - 1, true)).toBe(false);
  });

  it("re-tranca o telefone esquecido na mesa", () => {
    expect(shouldRelock(RELOCK_AFTER_MS, true)).toBe(true);
    expect(shouldRelock(60 * 60 * 1000, true)).toBe(true);
  });

  it("com a opção desligada, nunca", () => {
    expect(shouldRelock(24 * 60 * 60 * 1000, false)).toBe(false);
  });
});
