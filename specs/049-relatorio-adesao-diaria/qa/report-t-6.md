# QA Report — T-6: QA de ponta a ponta (Ativ. 49)

**Data:** 16/09/2026
**Ambiente:** Produção — https://bpr.clinic (evoluiu por vários commits ao longo do dia; commit final
verificado: `9ba5dce`)
**Resultado geral:** ✅ aprovado — T-1, T-2, T-3 e T-5 concluídos e no ar; agendamento das 21h ativo.
T-4 (resumo por WhatsApp pro Bruno) segue adiada, não implementada.

## Resumo

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Cron manual: agregação correta por clínica | ✅ |
| 2 | Cron manual: lembrete ao paciente disparado só quando falta algo | ✅ |
| 3 | Dedupe do lembrete ao paciente (2 chamadas no mesmo dia) | ✅ |
| 4 | Dedupe do e-mail-resumo (2 chamadas no mesmo dia) | ✅ (achado e corrigido durante o QA) |
| 5 | Painel "Today's adherence" no admin bate com o cron | ✅ |
| 6 | Cross-tenant: painel não vaza dado de outra clínica | ✅ (mesma trava de `sessionClinicId`, Ativ. 47) |
| 7 | `?force=true` reenvia sem duplicar lembrete ao paciente | ✅ |
| 8 | Agendamento no Coolify (21h clínica) | ✅ ativo |
| 9 | Template do e-mail — identidade visual | ✅ (3 rodadas até aprovar, ver abaixo) |
| 10 | Preview sem enviar (`/api/admin/adherence/preview-email`) | ✅ |
| 11 | Mudança no `wrapInLayout` não quebra outros e-mails do sistema | ⚠️ verificado por leitura de código, não renderizado (ver nota) |

## 1-2. Cron manual — agregação e lembrete ✅
Rodado repetidas vezes ao longo do dia via `POST /api/cron/daily-adherence?key=...` (chave sempre
lida do Coolify pra uma variável de shell, nunca impressa; URL sempre com `encodeURIComponent` —
achado um `401` na primeira tentativa por um caractere especial no segredo não escapado, corrigido
codificando antes de montar a URL).

Resultado típico do dia (clínica BPR, `cmska2rj90000sb4gqbfqzb0o`):
```json
{"results":[{"clinicId":"cmska2rj90000sb4gqbfqzb0o","completed":0,"missing":1,"remindersSent":1,"reportSent":true}]}
```
Único paciente com protocolo ativo hoje é a Ana Livia Pessin Prata — 11 itens esperados, nenhum
completado ainda no momento do teste, lembrete disparado corretamente pra ela.

## 3. Dedupe do lembrete ao paciente ✅
Rodando o cron duas vezes seguidas no mesmo dia: segunda chamada sempre devolveu `remindersSent:0`
pra Ana Livia — não manda o lembrete de novo (checagem por `AuditLog.action=DAILY_ADHERENCE_REMINDER_SENT`
do dia).

## 4. Dedupe do e-mail-resumo ✅ — achado durante o QA
Na primeira versão do código, `reportSent` não tinha proteção nenhuma: rodar o cron 2x no mesmo dia
mandava o e-mail-resumo duplicado pro Bruno. Corrigido no commit `82816f7` com a mesma técnica do
lembrete (`AuditLog.action=DAILY_ADHERENCE_REPORT_SENT`, chave por `clinicId`). Revalidado depois do
deploy: chamadas seguidas passaram a devolver `reportSent:false` na segunda em diante.

## 5-6. Painel admin ✅
`GET /api/admin/adherence/today` (gated por `sessionClinicId`, mesma trava da Ativ. 47) devolveu os
mesmos números do cron pra Ana Livia. Card "Today's adherence" visível em `/admin` (Today at a
Glance), evidência: `t-6-admin-card.png`. Cross-tenant não testado nesta rodada com uma segunda
clínica ativa de propósito (já coberto estruturalmente pelo mesmo helper testado na Ativ. 47/48).

## 7. `?force=true` ✅
Adicionado depois de precisar testar o template sem esperar o próximo dia. Reenvia o e-mail mesmo já
enviado, nunca reenvia o lembrete ao paciente (a checagem de dedupe do lembrete não tem `force`).
Usado 1x pra validar a segunda versão do template (cards); a terceira versão (rebrand do cabeçalho)
foi validada só pelo endpoint de preview, sem gastar mais um envio real.

## 8. Agendamento no Coolify ✅
Scheduled task `daily-adherence` (uuid `kudbnaznqbvkdbaxxdbidsq5`), criada desativada, **ativada**
depois que o código e o template já estavam validados. `frequency: "0 20 * * *"` (UTC) — hoje
(16/09/2026) Londres está em BST (UTC+1), então 20:00 UTC = 21:00 local, batendo com a decisão do
plano. **Ressalva já documentada em `t-3-cron-lembrete-email.md`**: isso desalinha 1h quando o
horário de verão terminar (final de outubro/2026) — não confirmado se o agendador do Coolify aceita
fuso IANA direto; até lá, precisa ajuste manual pra `0 21 * * *` na volta ao horário de inverno.

## 9. Template do e-mail — 3 rodadas até a identidade correta
1. **v1 — texto simples**: só `<h2>`/`<p>`/`<ul>` sem estilo, sem `wrapInLayout`. Funcionou (e-mail
   chegou, confirmado pelo usuário), mas ilegível — cada paciente virou um bloco de texto corrido
   (vários `<li>` sem bullet visível na maioria dos clientes de e-mail).
   Evidência: `t-6-email-recebido-whatsapp-v1.png` (print do usuário via WhatsApp).
2. **v2 — cards com `wrapInLayout`**: reescrito com tabelas (padrão seguro pra e-mail HTML — `<ul>/<li>`
   perde o `list-style` em clientes como o Gmail mobile), um card por paciente com cada item em linha
   própria com bullet real, pills de contagem. Usa o cabeçalho compartilhado (`wrapInLayout`) — que
   nessa hora ainda era bloco verde sólido com logo branco.
   Evidência: `t-6-email-preview-v1.png`.
3. **v3 — rebrand do cabeçalho compartilhado**: usuário comparou com a home real do site
   (`t-6-homepage-reference.png`) e apontou que o cabeçalho verde sólido + logo branco não representa
   a marca (a home usa fundo bege/creme, tinta escura, verde-musgo só como destaque pontual — nunca
   como bloco preenchido). Corrigido em `lib/email-templates.ts` (`wrapInLayout`): cabeçalho agora
   com fundo `BRAND_BONE` (creme), logo escuro/colorido da clínica (antes só usado no rodapé) e uma
   linha fina de `primaryColor` como único bloco de cor — **essa mudança vale pra todos os e-mails do
   sistema**, não só o de adesão diária, porque o cabeçalho é compartilhado.
   Evidência: `t-6-email-preview-v2-rebrand.png` — aprovado.

## 10. Preview sem enviar ✅
`GET /api/admin/adherence/preview-email` — **decisão de segurança importante**: gated pela sessão de
admin (mesmo padrão das outras rotas `/api/admin/*`), não pela chave do cron. A chave do cron
(`NEXTAUTH_SECRET`) nunca pode aparecer numa URL que se abre num navegador ou num comando visível —
é o mesmo segredo que assina toda sessão do app. A primeira tentativa de fazer isso foi um GET dentro
da própria rota `/api/cron/daily-adherence` usando a chave — corrigido movendo pra
`/api/admin/adherence/preview-email`, autenticado por sessão, antes de ser usado de verdade.

## 11. Risco pra outros e-mails do sistema ⚠️ verificado por leitura, não renderizado
A mudança em `wrapInLayout` foi só no header (bgcolor, logo, borda) — o parâmetro `content` (o corpo
de cada e-mail específico) não foi tocado, nem o rodapé (exceto reaproveitar a mesma logo, já usada
lá). Lido o `DEFAULT_TEMPLATES` (ex. "Welcome, {{patientName}}!") — usa `wrapInLayout` exatamente do
mesmo jeito, sem nada que dependesse do header antigo. Risco avaliado como baixo, mas **não renderizei
de fato nenhum outro e-mail do sistema nesta rodada** (não achei uma rota de preview fácil pra outros
templates fora deste). Recomendo conferir visualmente o próximo e-mail real de boas-vindas/confirmação
de consulta que sair, só pra fechar essa ponta solta.

## Escopo não coberto
- T-4 (WhatsApp pro Bruno) — adiada, não implementada, por decisão do usuário ("começa por e-mail").
- `npm test`/`npx tsc --noEmit` locais rodados a cada commit desta atividade (limpos, ver histórico de
  commits); não repetidos aqui por já estarem cobertos.
- Não testei o disparo real das 21h ainda (é hoje à noite, depois deste relatório) — o agendamento
  está ativo e vai ser a primeira validação de ponta a ponta sem intervenção manual.

## Evidências
`specs/049-relatorio-adesao-diaria/qa/screenshots/`: `t-6-admin-card.png`,
`t-6-email-recebido-whatsapp-v1.png` (print do usuário, versão 1), `t-6-email-preview-v1.png`
(versão 2, cards), `t-6-homepage-reference.png` (referência da home real), `t-6-email-preview-v2-rebrand.png`
(versão 3, aprovada).
