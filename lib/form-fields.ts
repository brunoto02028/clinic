/**
 * Os campos de um formulário multipart, com o tipo que o runtime realmente dá.
 *
 * ## Por que isto existe
 *
 * `req.formData()` devolve, **para o TypeScript**, um `FormData` sem
 * `get`/`has`/`set`/`delete` — só `append` e os iteradores. Em runtime o objeto
 * é o `FormData` completo, e as 33 rotas que fazem upload dependem disso em
 * produção há meses. É a tipagem que está errada, não o código.
 *
 * A causa está num conflito de declarações globais entre o `lib.dom` do
 * TypeScript, o `@types/node` e os tipos que o Next carrega: a interface global
 * `FormData` **tem** `get` (dá para provar com `declare const fd: FormData`),
 * mas o símbolo que `Request.formData()` promete é outro, mais pobre. Tentei
 * achar quem vence — inclusive deduplicando um `@types/node` que o `pptxgenjs`
 * aninhava — e **não era isso**: a contagem de erros não mudou em nada. Deixo
 * registrado para ninguém repetir a caçada.
 *
 * Então o conserto é a ponte, **num lugar só**: um `as unknown as FormData` que
 * afirma o que o runtime já garante. Espalhado pelas 33 rotas seriam 33
 * afirmações para alguém conferir uma por uma; aqui é uma, com o porquê ao lado.
 *
 * Se um dia a tipagem se resolver, este arquivo vira um `return req.formData()`
 * e nada mais muda.
 */
export async function camposDoFormulario(req: Request): Promise<FormData> {
  return (await req.formData()) as unknown as FormData;
}
