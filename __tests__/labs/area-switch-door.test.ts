/**
 * @jest-environment node
 *
 * A porta para as outras áreas da conta (26/09/2026).
 *
 * O laboratório foi ligado em /admin/labs, o servidor passou a devolvê-lo em
 * `/api/mobile/modules` — e no build 15 ele não aparecia em lugar nenhum. O
 * interruptor estava certo; o app é que não tinha porta:
 *
 *   1. `module-select` se desviava sozinho para a clínica (`CLINIC_ONLY`), e
 *   2. o botão que abre esse seletor estava escondido pela mesma bandeira.
 *
 * Concedido pelo servidor e inalcançável pelo app, ao mesmo tempo. Estes
 * testes reprovam a volta das duas metades.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

describe("quem pede para escolher, escolhe", () => {
  const src = ler("mobile", "app", "(app)", "module-select.tsx");

  it("o seletor lê `pick` da rota", () => {
    expect(src).toContain("useLocalSearchParams");
    expect(src).toMatch(/pick\?:\s*string/);
  });

  it("e com `pick` não há desvio nenhum", () => {
    // `pediuEscolher` precisa ser o **primeiro** ramo: depois de `length === 1`
    // ou de `CLINIC_ONLY` o desvio já teria acontecido.
    expect(src).toMatch(/const skipTo\s*=\s*pediuEscolher\s*\?\s*null/);
  });

  it("o botão manda `pick=1`, senão ele volta para a clínica no mesmo instante", () => {
    expect(ler("mobile", "src", "lib", "areas.ts")).toContain('"/module-select?pick=1"');
  });
});

describe("a porta existe, e não depende do build", () => {
  it("o menu de qualquer módulo mostra a troca de área", () => {
    const src = ler("mobile", "src", "components", "ModuleProfile.tsx");
    expect(src).toContain("useAreaSwitch");
    expect(src).toMatch(/\{canSwitch\s*&&/);
    expect(src).toContain('testID="switch-area"');
  });

  it("a conta também, e nenhuma das duas consulta CLINIC_ONLY", () => {
    const conta = ler("mobile", "app", "(app)", "account.tsx");
    expect(conta).toContain("useAreaSwitch");
    // A bandeira decide onde a pessoa **cai**, não onde ela pode ir. Ela é
    // citada no comentário que explica o conserto; o que não pode voltar é o
    // `import`, que é o que permitiria condicionar a porta a ela de novo.
    expect(conta).not.toMatch(/import .*CLINIC_ONLY.* from/);
    expect(ler("mobile", "src", "components", "ModuleProfile.tsx")).not.toMatch(/import .*CLINIC_ONLY.* from/);
  });

  it("com uma área só o botão some — abrir uma escolha de um item não faz nada", () => {
    expect(ler("mobile", "src", "lib", "areas.ts")).toMatch(/canSwitch:\s*\(modules\?\.length\s*\?\?\s*0\)\s*>\s*1/);
  });
});
