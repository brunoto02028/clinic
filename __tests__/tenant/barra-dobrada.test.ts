import { ler } from "../helpers/codigo";

/**
 * Barra dobrada no começo do caminho (28/09/2026).
 *
 * ## O que aconteceu
 *
 * O Bruno abriu `bpr.clinic//admin/biohacking` — um `/` a mais — e recebeu
 * **"Something went wrong"**, com um texto sobre `History` e `replaceState`.
 *
 * A causa não é óbvia: o caminho com barra dupla é servido normalmente, e
 * então o router do Next tenta reescrever a barra de endereços com
 * `//admin/biohacking`. O navegador lê isso como endereço **protocol-relative**
 * — um domínio chamado `admin` —, a origem muda, e `replaceState` lança.
 *
 * Nada disso é culpa de quem digitou, e a tela de erro não ajuda ninguém.
 */

describe("a barra dobrada", () => {
  /**
   * Lido **cru**, e não sem comentários.
   *
   * `semComentarios` apaga tudo depois de `//` — e o que este teste procura é
   * literalmente `startsWith('//')`. O limpador comeria metade da asserção e
   * ela falharia por um motivo que não tem nada a ver com o defeito. É a
   * armadilha que o próprio helper documenta.
   */
  const mw = ler("middleware.ts");

  it("**é colapsada antes de qualquer rota existir**", () => {
    expect(mw).toContain("pathname.startsWith('//')");
    // `/+` e não `//`: `///admin` é o mesmo defeito com um traço a mais.
    expect(mw).toContain("pathname.replace(/^\\/+/, '/')");
  });

  it("e o desvio é permanente, para o navegador não repetir o erro", () => {
    expect(mw).toContain("NextResponse.redirect(url, 308)");
  });

  it("**antes do gate de sessão** — senão o caminho torto chega às rotas", () => {
    const barra = mw.indexOf("pathname.startsWith('//')");
    const sessao = mw.indexOf("LINK_ASSINADO");
    expect(barra).toBeGreaterThan(-1);
    expect(sessao).toBeGreaterThan(-1);
    expect(barra).toBeLessThan(sessao);
  });
});
