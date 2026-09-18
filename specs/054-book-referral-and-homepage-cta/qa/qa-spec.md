# QA Spec — Atividade 1: Indicação do livro + chamada na home

## T-1 — Modelo `BookReferral`
- **API/DB**: rodar `npx prisma db push` local — sem erro. Confirmar via `prisma studio` ou script Node que a tabela `BookReferral` existe com todos os campos do schema.

## T-2 — API de indicação
- **API — happy path**: `POST /api/beyond-pain/refer` com `{ friendEmail: "amigo@teste.com", friendName: "Amigo", referrerName: "Bruno", locale: "en", website: "" }` → 200, `BookReferral` criada no banco, tentativa de envio de e-mail registrada (log ou resposta).
- **API — honeypot**: mesmo payload com `website: "algumacoisa"` → 200 (não denuncia), mas NENHUMA `BookReferral` é criada.
- **API — e-mail inválido**: `friendEmail: "não-é-email"` → 400.
- **API — auto-indicação**: `referrerContactId` de um contato cujo e-mail é igual a `friendEmail` → 400 (ou mensagem de erro clara).
- **API — limite de abuso**: criar 11 indicações em sequência com o mesmo `referrerContactId` (ou mesmo IP sem contactId) → a 11ª retorna 429.
- **API — atribuição de conversão**: criar uma `BookReferral` via `/refer`, pegar o `id`, chamar `POST /api/beyond-pain/capture` com `{ email: "amigo@teste.com", ref: "<id da referral>" }` → a `BookReferral` correspondente deve ter `convertedAt` preenchido e `friendContactId` apontando pro `EmailContact` recém-criado.
- **API — ref inválido**: capturar com `ref: "id-que-nao-existe"` → captura funciona normalmente (sem erro 500), só não atribui nada.

## T-3 — Formulário de indicação (UI, Playwright)
- Visitar `/beyond-pain` sem parâmetros → formulário de indicação visível, com campo "Seu nome" (opcional) e campo de e-mail do amigo.
- Preencher e-mail de amigo válido + enviar → mensagem de sucesso aparece, formulário não deixa reenviar imediatamente (evitar duplo clique) ou reresponde com clareza se reenviado.
- Deixar e-mail vazio e enviar → validação impede o envio (HTML5 ou mensagem própria).
- Visitar `/beyond-pain?refFrom={contactId válido, criar um contato de teste antes}` → mostra "Indicando como {nome}" em vez do campo de nome; envia normalmente.
- Visitar `/beyond-pain?refFrom={id inválido}` → cai no comportamento anônimo (campo de nome normal), sem quebrar a página.
- Repetir a checagem básica (formulário visível, campo de e-mail funciona) em `/beyond-pain/chapter-one`.
- Fluxo completo do lado do amigo: visitar `/beyond-pain?ref={referralId de teste}`, completar o formulário de captura normal (`BookCaptureForm`) com um e-mail novo → captura funciona (mesmo comportamento de sempre do ponto de vista do usuário); confirmar no banco que a `BookReferral` foi marcada como convertida (cruza com o teste de API do T-2).

## T-4 — CTA nos e-mails (UI, preview)
- Em `/admin/email-marketing` → Campaigns → criar/usar uma campanha "Article Newsletter" → usar o preview EN/PT já existente na tela → confirmar visualmente que o bloco de indicação aparece no HTML renderizado, com um link contendo `/beyond-pain?refFrom=`.
- Conferir (via código/teste manual de envio, se aplicável) que o e-mail de confirmação do livro (transacional) NÃO tem o bloco.
- Se houver rota de teste/preview pros e-mails de entrega/nutrição do livro, confirmar visualmente o bloco também aparece ali; senão, validar por leitura do HTML gerado (teste unitário simples ou log).

## T-5 — Seção do livro na home (UI, Playwright)
- Visitar `/` (home) → nova seção do livro visível entre a faixa escura de CTA e a seção de Artigos — capturar screenshot.
- Capa do livro (`Book3DCover`) renderiza sem erro visual/quebra de imagem.
- Clicar no botão CTA da seção → navega corretamente pra `/beyond-pain` (ou `/beyond-pain/chapter-one`, conforme decidido na implementação).
- Redimensionar pra viewport mobile (ex: 390px) → seção continua legível, sem overflow horizontal, sem elementos cortados — screenshot mobile.
- Checar console do navegador em todas as páginas visitadas (home, `/beyond-pain`, `/beyond-pain/chapter-one`) — sem erros JS novos introduzidos por esta atividade.
