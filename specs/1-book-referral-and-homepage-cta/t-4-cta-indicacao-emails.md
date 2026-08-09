# T-4: CTA de indicação nos e-mails

**Status:** concluído — QA achou o bloco ausente no corpo real de lib/email-i18n.ts (corrigido e reverificado ao vivo); review encontrou que campanhas genéricas (não-artigo) recebiam o bloco à força, sem opt-out e sem relação com o conteúdo — removido, mantido só para newsletter de artigo e e-mails do próprio livro
**Depende de:** T-2

## Objetivo
Incluir um convite discreto "conhece alguém que ia gostar deste livro?" nos e-mails de marketing, linkando pra `/beyond-pain?refFrom={contactId}`.

## Contexto
Conforme o audit desta conversa: não existe bloco de CTA compartilhado entre templates — cada e-mail monta seu próprio HTML (`lib/email-templates.ts`, `lib/book.ts`). Vamos adicionar um pequeno helper reutilizável e chamá-lo manualmente em cada template relevante, em vez de embutir em `wrapInLayout` (que é usado por e-mails que não fazem sentido ter isso, tipo redefinição de senha).

## Passos
1. Novo helper `buildReferBlock(contactId: string, locale: 'en'|'pt', baseUrl: string): string` em `lib/book.ts` (ou `lib/email-templates.ts`, o que fizer mais sentido dado onde já mora `wrapInLayout`) — retorna um bloco HTML pequeno e discreto (não um botão gigante) tipo "📖 Know someone who'd love a free chapter of Beyond Pain? [Refer a friend →]" linkando pra `${baseUrl}/beyond-pain?refFrom=${contactId}`.
2. Inserir esse bloco:
   - No template `ARTICLE_NEWSLETTER` (`lib/email-templates.ts:604-621`) — variável nova `referUrl`/`referBlock` passada via `buildVariables` em `lib/article-newsletter.ts:57-74` (já tem `contact.id` disponível ali).
   - Nos e-mails do livro que fazem sentido (entrega do capítulo, nurture 3/7 dias — não na confirmação, que é só transacional) em `lib/book.ts`.
   - Nos e-mails de campanha genéricos disparados por `lib/email-campaign-dispatch.ts` — mesmo padrão, `contact.id` já disponível ali.

## Arquivos afetados
- `lib/book.ts`
- `lib/email-templates.ts`
- `lib/article-newsletter.ts`
- `lib/email-campaign-dispatch.ts`

## Critérios de aceite
- [ ] Newsletter de artigo (preview em `/admin/email-marketing` → Campaigns → Article Newsletter) mostra o bloco de indicação com link correto pro contato certo.
- [ ] E-mail de entrega do capítulo 1 e os de nutrição do livro mostram o bloco.
- [ ] Link gerado aponta pra `/beyond-pain?refFrom={contactId real do destinatário}`.
- [ ] E-mail de confirmação (transacional) do livro NÃO tem o bloco.
