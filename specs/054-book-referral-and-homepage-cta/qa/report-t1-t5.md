# QA Report — Atividade 1: Indicação do livro "Beyond Pain" + chamada na home (T-1 a T-5)

**Data:** 2026-08-09
**Ambiente:** `npm run dev` local (`http://localhost:3000`), banco PostgreSQL local `bpr_clinic_local`
**Resultado geral:** ⚠️ **Aprovado com ressalvas** — T-1, T-2, T-3, T-5 aprovados integralmente; T-4 tem uma falha confirmada (bloco de indicação ausente na newsletter de artigo, tanto no preview quanto no envio real).

---

## Resumo por tarefa

| Tarefa | Cenários PASS | Cenários FAIL | Cenários SKIPPED |
|--------|---------------|----------------|-------------------|
| T-1 | 2 | 0 | 0 |
| T-2 | 7 | 0 | 0 |
| T-3 | 8 | 0 | 0 |
| T-4 | 2 (estático) | 1 | 2 (best-effort) |
| T-5 | 5 | 0 | 0 |

---

## T-1 — Modelo `BookReferral`

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `npx prisma db push` sincroniza sem erro | ✅ PASS |
| 2 | Modelo `BookReferral` acessível via Prisma Client com todos os campos do schema | ✅ PASS |

**Evidência:**
```
$ npx prisma db push --skip-generate
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "bpr_clinic_local", schema "public" at "localhost:5432"
The database is already in sync with the Prisma schema.

$ node qa-tmp-check.js model-check
BookReferral model accessible. Current count: 0
```
Schema conferido em `prisma/schema.prisma:3673-3688` — todos os campos (`id, referrerContactId, referrerName, friendEmail, friendName, locale, ipHash, sentAt, convertedAt, friendContactId`) presentes, com os três índices esperados.

---

## T-2 — API de indicação (`/api/beyond-pain/refer`) + atribuição de conversão

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Happy path: `POST /refer` com dados válidos → 200, `BookReferral` criada | ✅ PASS |
| 2 | Honeypot preenchido → 200, nenhuma `BookReferral` criada | ✅ PASS |
| 3 | E-mail inválido → 400 | ✅ PASS |
| 4 | Auto-indicação (`friendEmail` = e-mail do `referrerContactId`) → 400 | ✅ PASS |
| 5 | 11ª indicação em 24h do mesmo `referrerContactId` → 429 | ✅ PASS |
| 6 | Captura com `ref` válido marca `convertedAt` + `friendContactId` | ✅ PASS |
| 7 | Captura com `ref` inválido não quebra o fluxo (sem 500) | ✅ PASS |

### Detalhes

**1. Happy path**
```
$ curl -s -i -X POST http://localhost:3000/api/beyond-pain/refer -H "Content-Type: application/json" \
  -d '{"friendEmail":"amigo@teste.com","friendName":"Amigo","referrerName":"Bruno","locale":"en","website":""}'
HTTP/1.1 200 OK
{"success":true}
```
Confirmado no banco: `BookReferral` criada com `friendEmail: "amigo@teste.com"`, `friendName: "Amigo"`, `referrerName: "Bruno"`, `convertedAt: null`. Log do servidor: `[EMAIL] Sent via Resend to amigo@teste.com`.

**2. Honeypot**
```
$ curl -s -i -X POST .../refer -d '{"friendEmail":"amigo@teste.com",...,"website":"algumacoisa"}'
HTTP/1.1 200 OK
{"success":true}
```
Consulta pós-chamada mostrou apenas o registro do cenário 1 — nenhum novo `BookReferral` criado.

**3. E-mail inválido**
```
$ curl -s -i -X POST .../refer -d '{"friendEmail":"não-é-email",...}'
HTTP/1.1 400 Bad Request
{"error":"A valid friend email is required"}
```

**4. Auto-indicação**
Contato de teste criado (`auto-teste@teste.com`, id `cmslwg59s0000xzh4ikpyh6zv`).
```
$ curl -s -i -X POST .../refer -d '{"friendEmail":"auto-teste@teste.com","referrerContactId":"cmslwg59s0000xzh4ikpyh6zv",...}'
HTTP/1.1 400 Bad Request
{"error":"You can't refer yourself"}
```

**5. Rate limit**
Contato de teste `rate-teste@teste.com` (id `cmslwgb8r0000xz68fptxqdr3`). 11 chamadas em sequência (`friend1@teste.com` … `friend11@teste.com`):
- Chamadas 1–10 → `status=200`
- Chamada 11 → `status=429`
- Chamada extra (12ª) confirmando persistência do bloqueio:
```
HTTP/1.1 429 Too Many Requests
{"error":"Too many referrals sent recently. Please try again later."}
```
Consulta ao banco confirmou exatamente 10 `BookReferral` criadas para esse `referrerContactId` (nenhuma a mais além do limite).

**6. Atribuição de conversão**
```
$ curl -s -i -X POST .../refer -d '{"friendEmail":"convert-teste@teste.com","friendName":"ConvertTeste","referrerName":"Bruno",...}'
HTTP/1.1 200 OK   →  BookReferral id: cmslwgxxn000bxzf4wloi3igp

$ curl -s -i -X POST http://localhost:3000/api/beyond-pain/capture \
  -d '{"email":"convert-teste@teste.com","firstName":"ConvertTeste","language":"en","consent":true,"ref":"cmslwgxxn000bxzf4wloi3igp"}'
HTTP/1.1 200 OK
{"status":"pending_confirmation"}
```
Consulta pós-captura:
```json
{
  "id": "cmslwgxxn000bxzf4wloi3igp",
  "convertedAt": "2026-08-09T14:30:51.246Z",
  "friendContactId": "cmslwh3zf000cxzf46pczwybi"
}
```
`friendContactId` corresponde exatamente ao `EmailContact.id` criado na mesma chamada (`convert-teste@teste.com`).

**7. Ref inválido**
```
$ curl -s -i -X POST .../capture -d '{"email":"ref-invalido-teste@teste.com",...,"ref":"id-que-nao-existe"}'
HTTP/1.1 200 OK
{"status":"pending_confirmation"}
```
Contato criado normalmente (`ref-invalido-teste@teste.com`), sem erro 500.

**Observação (não é falha):** em dev, os e-mails de indicação/captura são de fato enviados via Resend real (`[EMAIL] Sent via Resend to ...`), inclusive para os endereços fictícios `@teste.com` usados neste QA. Não é um defeito da atividade, mas vale registrar caso a equipe queira usar um provedor mock em dev no futuro.

---

## T-3 — Formulário de indicação nas páginas do livro

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `/beyond-pain` sem parâmetros → formulário com nome opcional + e-mail do amigo | ✅ PASS |
| 2 | Envio com e-mail válido → mensagem de sucesso, `BookReferral` criada | ✅ PASS |
| 3 | E-mail vazio → botão de envio desabilitado (impede envio) | ✅ PASS |
| 4 | `?refFrom={contactId válido}` → "Referring as {nome}" sem campo de nome | ✅ PASS |
| 5 | `?refFrom={id inválido}` → comportamento anônimo, sem quebrar a página | ✅ PASS |
| 6 | `/beyond-pain/chapter-one` → mesmo comportamento básico (desbloqueado) | ✅ PASS |
| 7 | Fluxo do amigo: `?ref={referralId}` → captura funciona e marca conversão | ✅ PASS |
| 8 | Console sem erros novos introduzidos pela atividade | ✅ PASS (só erros pré-existentes) |

### Detalhes

**1-3. `/beyond-pain` — formulário padrão**
Screenshot: `screenshots/t3-beyond-pain-default.png` — mostra "Know someone who'd love this book?" com campo "Your name (optional)" e "Your friend's email".

Envio com `friend-ui-teste@teste.com`: mensagem "Invite sent! Your friend will get an email with the free Chapter One." — screenshot `screenshots/t3-refer-success.png`. Confirmado no banco: `BookReferral` criada (`id cmslwib3y000kxzf47fhj2zeq`, `friendEmail: "friend-ui-teste@teste.com"`).

Campo de e-mail vazio: botão "Refer a friend" fica `disabled` (via `disabled={!friendEmail || status === "loading"}` em `components/book-refer-form.tsx:122`) — impede envio nativamente. Screenshot: `screenshots/t3-refer-empty-email-disabled.png`.

**4-5. `?refFrom=`**
Contato de teste criado (`refFrom-teste@teste.com`, nome "Fulano Teste", id `cmslwix010000xzusonkk791y`). Visitando `/beyond-pain?refFrom=cmslwix010000xzusonkk791y` → texto "Referring as **Fulano Teste**" em vez do campo de nome. Screenshot: `screenshots/t3-refFrom-valid.png`.

Visitando `/beyond-pain?refFrom=id-invalido-que-nao-existe` → cai no comportamento anônimo (campo de nome normal), sem erro adicional no console além dos pré-existentes de `manifest.json`. Screenshot: `screenshots/t3-refFrom-invalid.png`.

**6. `/beyond-pain/chapter-one`**
Nota de implementação: nesta página o `BookReferForm` só é renderizado quando o leitor já desbloqueou o capítulo (cookie `book_access` válido) — antes disso a página mostra apenas o `BookCaptureForm` de captura, conforme `app/beyond-pain/chapter-one/page.tsx:37-54`. Isso é esperado pelo desenho da página (T-3 spec só define o formulário "ao lado dos botões Download PDF / All chapters / Book an assessment", que também só existem no estado desbloqueado).

Para testar, um contato de teste (`chapterone-teste@teste.com`) foi criado via `/api/beyond-pain/capture` e confirmado pelo magic link real (`/api/beyond-pain/confirm?token=...`), desbloqueando a página. Com o capítulo desbloqueado, o formulário "Know someone who'd love this book?" aparece corretamente no bloco de fechamento. Screenshot: `screenshots/t3-chapter-one-unlocked-refer.png`.

**7. Fluxo do amigo (`?ref=`)**
Indicação criada via `/refer` (`friend-convert-ui@teste.com`, referral id `cmslwl2qu000uxzf4lz0xna5r`). Cookies limpos para simular visitante anônimo. Visitado `/beyond-pain?ref=cmslwl2qu000uxzf4lz0xna5r`, preenchido `BookCaptureForm` com o mesmo e-mail e consentimento marcado → mensagem "Almost there — check your inbox..." (screenshot `screenshots/t3-friend-side-capture-success.png`). Consulta pós-captura confirmou:
```json
{
  "id": "cmslwl2qu000uxzf4lz0xna5r",
  "convertedAt": "2026-08-09T14:34:45.689Z",
  "friendContactId": "cmslwm4vq000zxzf4agmzbtty"
}
```

**8. Console**
Em todas as páginas do livro visitadas (`/beyond-pain` em 3 variações, `/beyond-pain/chapter-one` bloqueada e desbloqueada), os únicos erros de console observados foram:
```
Failed to load resource: 404 @ /manifest.json
Manifest fetch from /manifest.json failed, code 404
```
Esse erro é pré-existente e site-wide (falta um `manifest.json` na raiz do projeto) — não introduzido por esta atividade.

---

## T-4 — CTA de indicação nos e-mails

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Preview da newsletter de artigo (EN) mostra bloco de indicação com link `/beyond-pain?refFrom=` | ❌ **FAIL** |
| 2 | Preview da newsletter de artigo (PT) mostra o mesmo bloco | ❌ **FAIL** |
| 3 | E-mail de confirmação do livro (transacional) NÃO tem o bloco | ✅ PASS (verificação estática) |
| 4 | E-mail de entrega do capítulo 1 mostra o bloco | ✅ PASS (verificação estática) |
| 5 | E-mails de nutrição (3/7 dias) mostram o bloco | ⚠️ SKIPPED — sem rota de preview/envio de teste disponível; verificado apenas estaticamente (ver nota) |

### 1-2. FAIL — bloco de indicação ausente na newsletter de artigo

Login em `/staff-login` (admin@bpr.rehab) → `/admin/email-marketing` → Campaigns → New Campaign → fonte "Article Newsletter" → artigo "Trochanteric Bursitis" (publicado) → preview EN e PT-BR.

O HTML renderizado no iframe de preview **não contém** nenhum link `/beyond-pain?refFrom=` nem qualquer texto de indicação, em nenhum dos dois idiomas. Screenshots: `screenshots/t4-newsletter-preview-full.png` (EN) e `screenshots/t4-newsletter-preview-pt.png` (PT).

HTML completo capturado do iframe (EN), do topo do artigo até o rodapé — reproduzido aqui na íntegra para evidenciar que o bloco simplesmente não existe entre o botão "Read Full Article →" e a linha de unsubscribe:
```html
...<a href="http://localhost:3000/articles/trochanteric-bursitis" ...>Read Full Article →</a></div>
<hr .../>
<p ...>You are receiving this because you subscribed to BPR Health News.<br>
<a href="http://localhost:3000/unsubscribe?email=preview@example.com" ...>Unsubscribe</a></p>...
```
Verificação via `page.evaluate` confirmou `html.includes('refFrom=') === false` em ambos os idiomas.

**Causa raiz identificada (leitura de código, para orientar a correção — não corrigido nesta sessão):**
- `lib/email-templates.ts:614-625` define o template `ARTICLE_NEWSLETTER` com placeholder `{{referBlock}}` corretamente posicionado antes do rodapé de unsubscribe (linha 623).
- `lib/article-newsletter.ts:74` (`buildVariables`) preenche corretamente essa variável: `referBlock: contactId ? buildReferBlock(contactId, locale) : ''`.
- **Porém**, `renderTemplate()` em `lib/email-templates.ts:650-673` prioriza um corpo bilíngue alternativo vindo de `getEmailContent(slug, locale)` (`lib/email-i18n.ts`) sempre que `variables.locale` está definido (linha 658-662: `rawBody = i18n ? i18n.body : template.htmlBody`) — e `buildVariables` sempre define `locale`. O corpo hardcoded de `ARTICLE_NEWSLETTER` em `lib/email-i18n.ts:408-425` **nunca foi atualizado com o placeholder `{{referBlock}}`** — então a variável `referBlock` é calculada corretamente mas nunca é injetada em lugar nenhum do HTML final, pois o corpo realmente usado (`i18n.body`) não tem o placeholder.
- Esse não é um bug só do preview: `lib/email-campaign-dispatch.ts:110-122` usa a mesma função `renderArticleNewsletter()` para o envio real de campanhas do tipo "Article Newsletter" — ou seja, o e-mail de fato enviado aos assinantes também sairá sem o bloco de indicação.

**Onde olhar para corrigir:** adicionar `{{referBlock}}` ao corpo de `ARTICLE_NEWSLETTER` em `lib/email-i18n.ts` (linhas ~408-425, nas duas variantes PT e EN), no mesmo ponto em que já existe em `lib/email-templates.ts:623` (antes do `<hr>` de unsubscribe).

### 3-4. Verificação estática (lib/book.ts) — não é teste dinâmico

Não há rota de preview/teste para os e-mails hand-rolled do livro (confirmação, entrega, nutrição) — diferente da newsletter de artigo, que tem preview na UI admin. Fiz apenas leitura de código para confirmar a fiação, deixando claro que **não é um teste dinâmico real**:

- `sendBookConfirmationEmail` (`lib/book.ts:90-111`) — **não chama** `buildReferBlock` em nenhum ponto → confirmado estaticamente que a confirmação (transacional) não tem o bloco, como esperado.
- `sendBookChapterDeliveryEmail` (`lib/book.ts:117-196`) — chama `buildReferBlock(contactId, "pt")` (linha 166) e `buildReferBlock(contactId, "en")` (linha 191), condicionado a `contactId` estar presente. Os dois call sites reais (`app/api/beyond-pain/capture/route.ts:85` e `app/api/beyond-pain/confirm/route.ts:34-40`) sempre passam `contactId: contact.id` — logo, ao contrário da newsletter de artigo, este caminho **não** passa por `renderTemplate`/`lib/email-i18n.ts` (é HTML hand-rolled direto), então não está sujeito ao mesmo bug. Este e-mail foi de fato disparado durante os testes de T-2/T-3 (log do servidor: `[EMAIL] Sent via Resend to ...`), mas não inspecionei o corpo real recebido — a confirmação de que o bloco aparece é só estática.

### 5. SKIPPED — e-mails de nutrição (3/7 dias)

`sendBookNurture3DayEmail` e `sendBookNurture7DayEmail` (`lib/book.ts:267-303`) também chamam `buildReferBlock(contactId, "en")` diretamente (hand-rolled, mesmo padrão da entrega — não afetado pelo bug do i18n). São disparados por `app/api/cron/book-nurture/route.ts`, um cron job sem rota de preview/teste acessível via UI. Não encontrei forma de testar dinamicamente sem esperar o agendamento ou invocar o cron manualmente fora do escopo deste QA — marcado como SKIPPED, verificado apenas estaticamente (mesma ressalva do item anterior: o wiring do código parece correto, mas isso não substitui um teste dinâmico).

---

## T-5 — Seção de destaque do livro na home

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Seção visível entre a faixa escura de CTA e a seção de Artigos | ✅ PASS |
| 2 | Capa do livro (`Book3DCover`) renderiza sem erro visual | ✅ PASS |
| 3 | Botão CTA navega corretamente | ✅ PASS |
| 4 | Responsivo em mobile (390px), sem overflow horizontal | ✅ PASS |
| 5 | Console sem erros novos introduzidos pela atividade | ✅ PASS (só erros pré-existentes) |

### Detalhes

**1-2. Posicionamento e capa**
Screenshot desktop (1440px): `screenshots/t5-home-desktop.png` — mostra claramente a faixa escura de navegação/CTA acima, a seção "A NEW BOOK, WRITTEN BY BRUNO / Beyond Pain" com a capa 3D renderizada corretamente (imagem carregada com sucesso, `GET /_next/image?url=%2Fimages%2Fbook%2Fbeyond-pain-cover.webp... => 304`), e o início da seção "Articles" logo abaixo.

**3. Navegação do CTA**
Clique no botão "Read Chapter One Free" → navegou para `http://localhost:3000/beyond-pain/chapter-one` (confirmado via URL da página após o clique).

**4. Mobile (390×844)**
Screenshot: `screenshots/t5-home-mobile.png`. Verificação programática: `document.documentElement.scrollWidth (384) === clientWidth (384)` → sem overflow horizontal. Layout permanece legível, botão e texto não cortados.

**5. Console**
Erros observados na home: os mesmos `manifest.json` 404 pré-existentes, mais um erro adicional pré-existente e não relacionado a esta atividade:
```
Failed to load resource: 404 @ /api/image-serve/cmqe1q41y0005ob01ipcdpt7a
```
Esse erro ocorre em toda carga da home (inclusive antes de qualquer interação com a seção do livro) e aparenta ser uma imagem de artigo quebrada na seção "Latest Articles" — confirmado que a imagem da capa do livro em si carrega com sucesso (via `/_next/image`, ver acima), então este 404 não está relacionado à seção implementada nesta atividade.

---

## Erros de console (consolidado)

| Erro | Onde | Status |
|------|------|--------|
| `404 @ /manifest.json` | Todas as páginas públicas visitadas | Pré-existente, site-wide, não relacionado a esta atividade |
| `404 @ /api/image-serve/cmqe1q41y0005ob01ipcdpt7a` | Home (`/`) | Pré-existente, aparenta ser imagem de artigo quebrada, não relacionado à seção do livro |

Nenhum erro JS novo atribuível ao código desta atividade (formulários, seção da home, página de indicação) foi observado.

---

## Falhas e recomendações

### FAIL — T-4: bloco de indicação ausente na newsletter de artigo (preview e envio real)

- **O que aconteceu:** o preview de "Article Newsletter" em `/admin/email-marketing` não mostra o bloco "📖 Know someone who'd love a free chapter..." em nenhum idioma (EN/PT), e o mesmo código de renderização (`renderArticleNewsletter`) é reutilizado no envio real de campanhas (`lib/email-campaign-dispatch.ts:112`) — logo, o problema afeta o e-mail que os assinantes de fato recebem, não só o preview administrativo.
- **Hipótese de causa:** `renderTemplate()` (`lib/email-templates.ts:650-673`) usa o corpo bilíngue de `lib/email-i18n.ts` em vez do `htmlBody` de `lib/email-templates.ts` sempre que `variables.locale` está definido — e isso é sempre o caso para `ARTICLE_NEWSLETTER`. O placeholder `{{referBlock}}` foi adicionado apenas ao `htmlBody` de `lib/email-templates.ts:623` (o "template default"/documentação), mas não ao corpo real usado em runtime, em `lib/email-i18n.ts:408-425`.
- **Onde olhar:** `lib/email-i18n.ts`, função que retorna o objeto `ARTICLE_NEWSLETTER` (linhas ~408-425) — adicionar `{{referBlock}}` nas duas variantes (`pt` e `en`) do campo `body`, no mesmo ponto em que já existe em `lib/email-templates.ts:623` (antes do `<hr>` / rodapé de unsubscribe).

Nenhuma outra falha foi encontrada nos testes de API e UI executados.

---

## Cleanup

Todos os dados de teste criados durante esta sessão de QA (e-mails fictícios contendo `teste` no domínio/nome) foram removidos ao final:
```
$ node qa-tmp-check.js cleanup-all-qa
referrals to delete: 4 [...]
contacts to delete: 5 [...]
DELETED referrals: 4 DELETED contacts: 5

$ node qa-tmp-check.js model-check
BookReferral model accessible. Current count: 0
```
O script temporário `qa-tmp-check.js` foi apagado ao final da sessão.

---

## Veredito geral

**⚠️ Aprovado com ressalvas.** T-1, T-2, T-3 e T-5 estão sólidos — todos os cenários de API e UI passaram com evidência real, incluindo os fluxos completos de indicação, honeypot, rate limit, atribuição de conversão (API e UI) e a nova seção da home (desktop e mobile). T-4 tem uma falha confirmada e bem localizada (bloco de indicação não aparece na newsletter de artigo, nem no preview nem no envio real) que deve ser corrigida antes de considerar a atividade totalmente concluída — o resto do T-4 (confirmação/entrega/nutrição do livro) foi verificado apenas estaticamente por falta de rota de teste dinâmico, com wiring de código aparentemente correto mas não confirmado por execução real.
