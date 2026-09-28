/**
 * O token emprestado, num lugar que não importa nada (091 T-7).
 *
 * Quando o responsável está vendo como quem ele cuida, toda chamada usa um
 * token cujo `sub` é a outra pessoa. Quem precisa dele é o `apiFetch`; quem o
 * produz é o store `vendo-como`. Fazer o `apiFetch` importar o store e o store
 * importar o `API_URL` do cliente fecharia um ciclo — e ciclo em Metro não
 * falha na hora: falha depois, com um `undefined` que ninguém explica.
 *
 * Este módulo é a folha entre os dois. Ele não importa nada, e é de propósito.
 *
 * O token vive **só em memória**: a criança nunca tem sessão própria e
 * durável, e fechar o app devolve o responsável à conta dele.
 */

let token: string | null = null;
let renovador: (() => Promise<boolean>) | null = null;

export function tokenEmprestado(): string | null {
  return token;
}

export function definirTokenEmprestado(novo: string | null): void {
  token = novo;
}

/** O store registra como renovar; o `apiFetch` só chama. */
export function registrarRenovador(fn: (() => Promise<boolean>) | null): void {
  renovador = fn;
}

export async function renovarEmprestimo(): Promise<boolean> {
  if (!renovador) return false;
  return renovador();
}
