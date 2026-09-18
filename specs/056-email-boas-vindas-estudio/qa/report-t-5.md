# QA — Atividade 56, T-5 (logo da BPR + prévia obrigatória antes do envio)

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`, com as duas correções do code review:
  - a prévia de criação exige nome e sobrenome do dono;
  - o diálogo de reenvio mostra o erro da prévia.
- **Ambiente:** Next dev :4002 com `OUTBOUND_MODE=sink`, então nada saiu de verdade. Fixtures locais, Playwright com contexto novo e cache desligado.
- **Executado por:** agente qa-tester. Validação visual do Bruno com o logo real de produção.
- **Veredito:** **APROVADO**.

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1.1 | GET da prévia EN/PT/sem locale | API | ✅ senha mascarada `St-••••••••••••••`, `<img alt="BPR">` (src 200 image/png), assuntos EN/PT certos, sem locale → EN |
| 1.2 | O GET não muda nada | API+DB+log | ✅ hash, seleção do SA e totais iguais; nenhuma linha nova no sink |
| 1.3/1.4 | Permissões e tipos | API | ✅ 403 (trainer/admina/aluno), 307 anônimo, 400 clínica, 404 inexistente |
| 2.1–2.4 | POST `welcome-email-preview` | API+DB | ✅ 200 para SUPERADMIN; 403/307 para os outros; 400 sem nome do estúdio, e-mail ou primeiro nome; nada criado no banco |
| 3.1/3.2 | Reenvio: carregando → prévia → troca de idioma | UI | ✅ "Send e-mail" desabilitado até a prévia; PT recarrega com "Seu estúdio … está pronto" |
| 3.3 | Envio real em `qa-studio-pt` | UI+log+DB | ✅ toast; **1** linha no sink; hash trocado |
| 3.4 | Estúdio sem dono | UI | ✅ erro "This studio has no active owner" em destaque, sem "Loading…" preso, envio desabilitado |
| 4.1 | Criar clínica | UI+log | ✅ sem prévia, e-mail de equipe de sempre (sem mudança) |
| 4.2 | Criar estúdio sem dono | UI | ✅ cria direto, sem e-mail |
| 4.3 | Estúdio com e-mail e sem nome | UI | ✅ toast "Fill in the owner's first and last name", sem prévia |
| 4.4–4.6 | "Review e-mail" → prévia → "Back" (form mantido) → "Create studio and send e-mail" | UI+log+DB | ✅ **1** linha no sink em PT; dono ADMIN com `bookable: true`; o estúdio só foi criado depois da prévia |
| 5.1/5.2 | Logo no HTML | lib+API | ✅ mesma URL do cabeçalho do `wrapInLayout`; logo acima do nome do estúdio; `src` escapado |

**Validação do Bruno (18/09):** as prévias EN e PT renderizadas com o logo real de produção (`https://bpr.clinic/api/email-logo?src=…logo.png&bg=F5F4F1`) foram abertas no navegador dele. Ele respondeu **"Validado, pode publicar"**.

Screenshots em `qa/screenshots/`:
- `t-5-reenvio-{carregando,previa-en,previa-pt,enviado-toast,erro-sem-dono,com-previa}.png`
- `t-5-criar-{clinica-sem-previa,estudio-sem-dono,sem-nome-toast,previa,voltar-form,enviado-toast}.png`

## Observações
- **R-1 (herdada da T-3):** o login com a senha nova não é testável localmente, porque o sink não guarda o corpo. A troca está comprovada pelo hash.
- **O-8:** a prévia de criação não confere se o slug ou o e-mail já existem. O erro aparece no passo "Create studio and send e-mail", como antes.
- **Console:** só os 403 de `/api/admin/notifications` do SA (preexistente) e os 404 esperados do 3.4.

## Limpeza
Clínicas e usuários `qa056t5*` apagados (totais de volta a 6 clínicas e 37 usuários). As fixtures rodaram de novo: `qa.trainer` entra com `QaTenant#2026`. SA sem seleção.
