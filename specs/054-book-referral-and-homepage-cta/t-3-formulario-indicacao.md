# T-3: Formulário de indicação nas páginas do livro

**Status:** concluído (QA aprovado; review corrigiu duplicação da busca de refFrom, extraída para lib/book.ts, e passou a só repassar o contactId depois de verificado no servidor)
**Depende de:** T-2

## Objetivo
Deixar visível, em `/beyond-pain` e `/beyond-pain/chapter-one`, um jeito do leitor indicar o livro pra um amigo — e reconhecer automaticamente quando o visitante chegou ali a partir de um link de e-mail (`?refFrom=`), pulando a etapa de digitar o próprio nome.

## Contexto
`?refFrom={contactId}` chega pelos links dos e-mails de marketing (T-4). A página (Server Component) resolve o nome do contato a partir do `contactId` e passa como prop pro formulário — sem precisar de uma página separada.

## Passos
1. Novo componente `components/book-refer-form.tsx`:
   - Props: `referrerContactId？: string`, `referrerName？: string`, `locale`.
   - Se `referrerName` vier preenchido (chegou via `?refFrom=`), mostra "Indicando como {nome}" fixo; senão, campo opcional "Seu nome" digitável.
   - Campo obrigatório "E-mail do seu amigo" + campo honeypot escondido (`website`, `tabIndex={-1}`, `aria-hidden`, posicionado fora da tela via CSS — não `display:none`, pra continuar enganando bots que ignoram CSS).
   - Ao enviar: `POST /api/beyond-pain/refer`. Mostra sucesso ("Convite enviado!") ou erro (inclusive mensagem amigável pro caso de 429).
2. Em `app/beyond-pain/page.tsx`: ler `searchParams.refFrom`; se presente, buscar `EmailContact.firstName` por esse id (best-effort — se não achar, trata como anônimo); renderizar `<BookReferForm>` numa seção visível (perto do bloco `#join` ou do FAQ, decisão de layout na implementação).
3. Em `app/beyond-pain/chapter-one/page.tsx`: mesma leitura de `searchParams.refFrom`; adicionar `<BookReferForm>` no bloco de fechamento já identificado (`app/beyond-pain/chapter-one/page.tsx:85-99`, ao lado dos botões "Download PDF / All chapters / Book an assessment").
4. Garantir que `?ref={referralId}` (o parâmetro do lado do amigo, não do indicador) continua fluindo do link da página pro `BookCaptureForm` já existente — adicionar prop `referralId` opcional em `components/book-capture-form.tsx`, incluída no body do POST pra `/api/beyond-pain/capture` como `ref`.

## Arquivos afetados
- `components/book-refer-form.tsx` (novo)
- `components/book-capture-form.tsx`
- `app/beyond-pain/page.tsx`
- `app/beyond-pain/chapter-one/page.tsx`

## Critérios de aceite
- [ ] Visitar `/beyond-pain` sem parâmetros mostra o formulário com campo de nome opcional.
- [ ] Visitar `/beyond-pain?refFrom={contactId válido}` mostra "Indicando como {nome}" sem pedir nome.
- [ ] Enviar um e-mail de amigo válido mostra mensagem de sucesso.
- [ ] Visitar `/beyond-pain?ref={referralId}` e completar a captura normal marca a indicação como convertida (validado via T-2).
- [ ] Mesmo comportamento replicado em `/beyond-pain/chapter-one`.
