# T-6: QA de ponta a ponta

**Status:** concluído
**Depende de:** T-1, T-2, T-3, T-5 (T-4 adiada — QA cobre e-mail + painel, WhatsApp fica pra quando
essa tarefa entrar)

## Objetivo
Confirmar os 3 canais (e-mail, WhatsApp, painel) batendo entre si e com a realidade, num dia real.

## Passos
1. Local: `npx tsc --noEmit` (filtrando `reconstruir/`) + lint dos arquivos novos.
2. Online: rodar o cron manualmente (`POST /api/cron/daily-adherence?key=...`) num dia com a Ana
   Livia tendo itens pendentes de propósito — conferir que ela recebe o lembrete, o Bruno recebe
   e-mail + WhatsApp, e o painel do admin bate com os dois.
3. Rodar o cron de novo no mesmo dia — conferir que não duplica lembrete pro paciente (critério de
   aceite da T-3).
4. Trocar a Active Clinic do SUPERADMIN e conferir que o painel (T-5) mostra a clínica errada não
   vaza dado da BPR.

## Arquivos afetados
- nenhum (só QA)

## Critérios de aceite
- [ ] `qa/report-t-6.md` com evidências (prints do painel, e-mail recebido, mensagem de WhatsApp,
      resposta da API do cron).
