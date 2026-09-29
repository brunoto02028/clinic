# QA — Atividade 106

Regras da casa: paciente de teste, nunca real; confirmar qual checkout serve a
porta; afirmar o status exato; nenhum token no relatório.

## T-1 — O texto que mente

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | abrir o diálogo | nenhuma frase diz "automaticamente" |
| 1.2 | UI | criar **sem** marcar a caixa | **nenhum e-mail sai** — medido na caixa do paciente de teste, não deduzido da tela |
| 1.3 | UI | criar **marcando** a caixa | o e-mail sai |
| 1.4 | UI | depois de criar | há caminho visível para escrever a confirmação |
| 1.5 | UI | as duas línguas | dizem a mesma coisa |

O 1.2 é o cenário que importa: a promessa da casa é que nada sai sozinho, e ela
tem de ser medida no destino, não na interface.

## T-2 — A duração ocupa o horário

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | 60 min e 30 min no mesmo dia | o de 60 tem o dobro da altura, medido em pixels |
| 2.2 | UI | consulta às 10:38 | começa entre 10:00 e 11:00, no minuto certo |
| 2.3 | UI | duas no mesmo horário | as duas visíveis, nenhuma escondida |
| 2.4 | UI | consulta de 15 min | o nome continua legível |
| 2.5 | UI | contador de vagas do dia | concorda com o que se vê |

## T-3

Bloqueada. Sem cenário até o Bruno dizer o que falta.
