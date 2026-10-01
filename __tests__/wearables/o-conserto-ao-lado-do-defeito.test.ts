/**
 * @jest-environment node
 *
 * Um aparelho partido tem caminho de reparo na tela (114 / 099 T-7).
 *
 * ## O que produção mostrou
 *
 * Depois de o `601` sair do caminho, apareceu o erro verdadeiro:
 *
 *     connection cmufr3e58001b…: Withings status 503: Invalid Params: invalid refresh_token
 *
 * A ligação da braçadeira está morta. E a caixa de medições **já mostrava** esse
 * erro — mas o botão de conectar só existia quando `device === null`, ou seja,
 * quando **não havia aparelho nenhum**.
 *
 * Um aparelho que existe e está partido ficava sem conserto: a tela dizia o que
 * estava errado e não oferecia nada. A pessoa tenta o botão de sincronizar, que
 * falha sempre, e conclui que o produto está estragado — o que, do ponto de
 * vista dela, está.
 *
 * ## E porque a frase importa tanto quanto o botão
 *
 * Um `refresh_token` inválido **não se resolve do nosso lado**: não há como
 * refrescar o que eles invalidaram. Só a autorização de novo, e só pelo dono da
 * conta. Sem essa frase, o botão parece mais uma tentativa entre várias.
 */

import * as fs from "fs";
import * as path from "path";

const PAGINA = path.join(
  __dirname, "..", "..", "app", "admin", "measurements", "inbox", "page.tsx"
);

function codigo(): string {
  return fs
    .readFileSync(PAGINA, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith("//") && !s.startsWith("*");
    })
    .join("\n");
}

describe("o aparelho partido tem conserto na tela", () => {
  it("a varredura lê a página de verdade — senão aprova o vazio", () => {
    expect(codigo().length).toBeGreaterThan(3000);
  });

  it("**o reconectar aparece com o erro, não só quando não há aparelho**", () => {
    const src = codigo();
    // O botão antigo, para quando não há aparelho nenhum, continua.
    expect(src).toContain("device === null");
    // E agora há um segundo caminho, preso ao erro.
    expect(src).toContain("device-token-dead");
    const i = src.indexOf("device-token-dead");
    const bloco = src.slice(i, i + 700);
    expect(bloco).toContain("/api/wearables/connect/withings?clinic=1");
  });

  it("**só aparece para erro de autorização**, não para qualquer falha", () => {
    // Uma falha de rede não se conserta reconectando, e oferecer isso mandaria
    // a pessoa refazer uma autorização que está boa.
    const src = codigo();
    expect(src).toMatch(/refresh_token\|invalid_grant\|unauthor/);
  });

  it("**diz que só o dono da conta resolve**, nas duas línguas", () => {
    const src = codigo();
    expect(src).toMatch(/only the account owner can do it/i);
    expect(src).toMatch(/só o dono da conta o pode fazer/i);
  });

  it("o rótulo do botão existe nas duas línguas", () => {
    const src = codigo();
    expect(src).toMatch(/reconnect: "Reconnect"/);
    expect(src).toMatch(/reconnect: "Reconectar"/);
  });
});
