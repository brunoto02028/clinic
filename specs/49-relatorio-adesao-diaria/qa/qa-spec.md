# QA — Ativ. 49: Relatório diário de adesão + lembrete ao paciente

## T-1/T-2 — Cálculo de adesão

**API/unit**
1. Paciente com todos os itens de hoje completados → `allDone: true`, `missing` vazio.
2. Paciente com 1+ item pendente → `allDone: false`, lista os itens pendentes corretamente.
3. Paciente sem nenhum item esperado hoje → fora de `completed` e `missing`.
4. Dois pacientes de clínicas diferentes → cada um só aparece no resumo da própria clínica.

## T-3 — Cron: lembrete + e-mail

**API**
1. `POST /api/cron/daily-adherence` sem `key` ou com `key` errada → 401, nada é enviado.
2. `key` correta → 200, lembrete disparado só para quem está em `missing`.
3. Rodar 2x no mesmo dia → segunda chamada não duplica o lembrete pro mesmo paciente.
4. E-mail do Bruno chega com a lista certa (completos/pendentes) do dia testado.

## T-4 — WhatsApp ao Bruno

**API**
1. Com WhatsApp configurado: mensagem chega com a contagem certa.
2. Sem WhatsApp configurado: cron não falha, e-mail ainda sai normalmente.

## T-5 — Painel admin

**UI**
1. Card mostra contagem e lista batendo com o e-mail do mesmo dia.
2. Clique num paciente pendente abre o perfil dele.
3. SUPERADMIN troca a Active Clinic → painel muda pra clínica selecionada, sem vazar dado da outra.

## T-6 — Ponta a ponta

1. Dia real de teste com a Ana Livia (1+ item pendente de propósito): lembrete recebido por ela,
   e-mail + WhatsApp recebidos pelo Bruno, painel do admin batendo com os dois — com prints/evidência
   de cada canal.
