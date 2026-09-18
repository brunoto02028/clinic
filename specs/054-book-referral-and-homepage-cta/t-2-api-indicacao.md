# T-2: API de indicação + atribuição de conversão

**Status:** concluído (QA aprovado; review encontrou 2 bugs de segurança — referrerContactId não verificado permitia burlar rate-limit/auto-indicação, e atribuição de conversão não checava o e-mail do amigo, permitindo sequestro de indicação alheia — ambos corrigidos e revalidados ao vivo)
**Depende de:** T-1

## Objetivo
Criar o endpoint que registra uma indicação e manda o convite pontual pro amigo; e ensinar o fluxo de captura existente a marcar quando uma indicação convertida.

## Contexto
Fluxo de captura já existe em `app/api/beyond-pain/capture/route.ts` (upsert de `EmailContact`, `source="book"`). O e-mail de convite segue o mesmo padrão hand-rolled de `lib/book.ts` (HTML direto + `wrapInLayout` + `sendEmail`), não o sistema de `EmailTemplate` do banco — mantém consistência com os outros e-mails do livro.

## Passos
1. Novo `POST /api/beyond-pain/refer` (`app/api/beyond-pain/refer/route.ts`):
   - Body: `{ friendEmail, friendName?, referrerContactId?, referrerName?, locale, website }` (`website` = campo honeypot, deve vir vazio).
   - Validação: e-mail válido; se `website` preenchido, responde 200 silenciosamente sem fazer nada (não denuncia o bot); rejeita se `friendEmail` igual ao e-mail do próprio `referrerContactId` (auto-indicação).
   - Limite anti-abuso: contar `BookReferral` das últimas 24h com o mesmo `referrerContactId` (ou mesmo `ipHash`, calculado com `crypto.createHash('sha256')` sobre o IP da request, se não houver `referrerContactId`) — acima de 10, retorna 429.
   - Cria a `BookReferral` (`sentAt: now()`).
   - Monta e envia o e-mail de convite (nova função `sendBookReferralEmail` em `lib/book.ts`, mesmo padrão das outras funções de e-mail do livro): assunto tipo "{referrerName} indicou um livro pra você" (ou genérico se `referrerName` vazio), corpo curto, botão CTA pro link `${BASE_URL}/beyond-pain?ref={referral.id}`, uma linha de transparência explicando que é um envio avulso (sem inscrição automática, sem novo envio a menos que a pessoa se cadastre).
   - Retorna `{ success: true }` ou erro.
2. Atualizar `app/api/beyond-pain/capture/route.ts`: aceitar campo opcional `ref` no body. Se presente, buscar `BookReferral` por `id: ref` com `convertedAt: null`; se achar, após criar/achar o `EmailContact` do amigo, atualizar essa `BookReferral` com `convertedAt: now()`, `friendContactId: contact.id`.

## Arquivos afetados
- `app/api/beyond-pain/refer/route.ts` (novo)
- `lib/book.ts` (nova função `sendBookReferralEmail`)
- `app/api/beyond-pain/capture/route.ts`

## Critérios de aceite
- [ ] `POST /api/beyond-pain/refer` com e-mail válido cria uma `BookReferral` e envia o e-mail (testável via log/mensagem de sucesso mesmo se o envio real falhar em dev).
- [ ] Honeypot preenchido não cria nada e não envia e-mail, mas responde 200.
- [ ] Mais de 10 indicações em 24h do mesmo `referrerContactId` retorna 429.
- [ ] Capturar o e-mail com `?ref={id}` de uma indicação existente marca `convertedAt` e `friendContactId` corretamente.
- [ ] Capturar sem `ref`, ou com `ref` inválido/já convertido, funciona normalmente sem erro (não quebra o fluxo de captura padrão).
