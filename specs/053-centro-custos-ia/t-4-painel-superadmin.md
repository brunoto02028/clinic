# T-4: Painel SUPERADMIN `/admin/ai-costs`

**Status:** pendente
**Depende de:** T-2 (dados), T-5 (margem/câmbio para a coluna "a cobrar"; até lá mostra só custo)

## Objetivo
Uma tela, só para o SUPERADMIN, que responde: **quanto a IA custou neste mês, de quem veio, e quanto vou repassar a cada personal.**

## Contexto
- Gating com o helper `requireSuperadmin` da ativ. 52 (T-2): página + API + menu.
- Decisão do Bruno: o uso dos alunos soma na conta do personal, com detalhe por aluno.

## Passos
1. `GET /api/admin/ai-costs?month=YYYY-MM` (SUPERADMIN). Devolve:
   - **totais do mês:** custo total, custo da BPR (não faturável), custo faturável, valor a cobrar (com margem e câmbio), número de chamadas, % de chamadas não atribuídas;
   - **por tenant:** nome, tipo, faturável?, chamadas, custo USD, margem %, valor a cobrar GBP, status da fatura do mês (nenhuma / rascunho / aguardando aprovação / enviada);
   - **série diária** do mês (custo por dia).
2. `GET /api/admin/ai-costs/tenant/[clinicId]?month=`: detalhe do tenant (**por usuário**, com o personal e cada aluno separados, papel e custo; **por funcionalidade**; últimas 100 chamadas).
3. `GET /api/admin/ai-costs/unattributed?month=`: chamadas sem `clinicId`, agrupadas por `feature`/função. Serve para caçar o que falta atribuir.
4. `GET /api/admin/ai-costs/export?month=` → CSV (um evento por linha).
5. Página `app/admin/ai-costs/page.tsx`:
   - seletor de mês;
   - cartões de totais;
   - gráfico diário (seguir a skill `dataviz` / padrão de gráficos do projeto);
   - tabela por tenant, clicável para o detalhe;
   - aba "Não atribuídos";
   - botão CSV;
   - botões da T-6 ("Gerar faturas do mês").
6. Menu: em Settings (ou Finance) com um flag só SUPERADMIN (o mesmo da ativ. 52).

## Arquivos afetados
- `app/api/admin/ai-costs/route.ts`, `.../tenant/[clinicId]/route.ts`, `.../unattributed/route.ts`, `.../export/route.ts` (novos)
- `app/admin/ai-costs/page.tsx` + componentes (novos)
- `lib/admin-sections.ts`

## Critérios de aceite
- [ ] `qa.superadmin` abre `/admin/ai-costs` → totais batem com a soma dos eventos do mês (conferido por SQL no QA).
- [ ] Detalhe do QA Studio PT mostra trainer e alunos separados, e a soma deles = total do tenant.
- [ ] Os eventos da clínica A aparecem com "não faturável" quando A é o tenant padrão/BPR, ou conforme a configuração.
- [ ] Aba "Não atribuídos" lista os eventos sem `clinicId`.
- [ ] CSV baixa com uma linha por evento do mês.
- [ ] `qa.trainer`, `qa.admina`, `qa.aluno` → página redireciona, APIs 403, item fora do menu.
- [ ] Mês sem dados → tela vazia com mensagem, sem erro.
