# QA — Atividade 108

Regras da casa: paciente de teste, nunca real; confirmar qual checkout serve a
porta; afirmar o status exato; nenhum token no relatório.

## T-1 — Onde a clínica decide

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | ADMIN abre os ajustes | os quatro campos estão lá |
| 1.2 | UI | desliga o vídeo | a opção some do app do paciente |
| 1.3 | API | ADMIN de outra clínica tenta mudar | **404** |
| 1.4 | UI | liga o domicílio | a tela explica o pré-requisito do endereço |
| 1.5 | dados | depois de mudar | log de auditoria com autor e data |

O 1.2 é o cenário que importa: foi a falta dele que fez parecer que o recurso
não existia.

## T-2 — A primeira consulta

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | API | clínica nova, sem tocar em nada | primeira consulta paga no ato |
| 2.2 | UI | com `INVOICE` | nasce `CONFIRMED`, sem cobrança |
| 2.3 | UI | com `AT_BOOKING` | nasce `PENDING`, e o webhook confirma |
| 2.4 | UI | sessão do pacote, nas duas | continua grátis |

## T-3 — O paciente sabe antes

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | clínica cobrando no ato | o botão diz "Confirmar e pagar" |
| 3.2 | UI | clínica faturando | o botão diz "Confirmar agendamento" |
| 3.3 | UI | fechar a folha do Stripe | o horário não fica preso |
| 3.4 | UI | as duas línguas | dizem a mesma coisa |
