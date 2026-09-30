# QA — Atividade 113

O par que importa: **mudar algo fora do app** e confirmar que o app mostra a
mudança sem ser fechado. Um cenário que só recarrega a tela não prova nada — ele
passaria com o app de ontem.

## T-1 — voltar traz dado novo

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | Desligar um módulo no painel com o app aberto em segundo plano, voltar | O item sumiu do menu, sem fechar o app |
| 1.2 | UI | Ligar de novo, voltar | O item voltou — o outro sentido |
| 1.3 | rede | Sair e voltar em 2 s | Não dispara a enxurrada |
| 1.4 | UI | Voltar sem rede | A tela mostra o que tinha; nenhum erro na cara |
| 1.5 | UI | Durante a atualização | A tela não pisca nem fica em branco |

## T-2 — puxar para baixo

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | Puxar em cada tela de dado do paciente | Indicador aparece, some, e o dado é o novo |
| 2.2 | UI | Mudar no painel, puxar | A mudança chegou — sem sair do app |
| 2.3 | UI | Rolar para cima no meio de uma lista longa | **Não** dispara |
| 2.4 | UI | Puxar sem rede | Falha visível e honesta, e a lista fica |
| 2.5 | teste | Varredura das telas | Nenhuma tela de dado ficou sem o gesto |

## T-3 — o que não se atualiza

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | Agendamento meio preenchido, sair e voltar | O que foi escrito continua |
| 3.2 | UI | Mensagem em rascunho, sair e voltar | O rascunho continua |
| 3.3 | UI | Horário escolhido que deixou de existir | Avisa, e não troca calado |

## O que não se faz

- Nada disto em conta de paciente real.
