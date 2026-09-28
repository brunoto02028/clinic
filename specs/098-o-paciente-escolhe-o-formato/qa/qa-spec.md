# QA — Atividade 098 (o paciente escolhe o formato)

Escrita com o plano, em 28/09/2026. O que não puder ser executado é **"não
executado"**, nunca "passou".

## Ambiente

- **Paciente de teste identificado.** Nunca um paciente real: aqui se marca
  consulta e se decide sobre ela.
- Dev server em porta própria, confirmada como este checkout.
- Depois do deploy, conferir `in sync` no log do contêiner — a T-1 mexe no
  schema.

## T-1 — O banco e a regra

| # | cenário | esperado |
|---|---|---|
| 1.1 | consulta marcada sem escolher formato | idêntica às de hoje: `IN_PERSON`, sem `requestedMode` |
| 1.2 | tipo com `requiresInPerson: true` | vídeo **não** permitido |
| 1.3 | tipo com `allowsHomeVisit: false` | domicílio **não** permitido |
| 1.4 | paciente sem código postal | domicílio não permitido, mesmo com o tipo permitindo |
| 1.5 | pedido feito e não decidido | `pedidoPendente` verdadeiro |
| 1.6 | pedido aprovado | `pedidoPendente` falso, `mode` mudou |

## T-2 — O paciente escolhe

| # | cenário | esperado |
|---|---|---|
| 2.1 | eletroterapia | o seletor não mostra vídeo |
| 2.2 | consulta de avaliação | mostra vídeo |
| 2.3 | sem endereço | não mostra domicílio, e explica com atalho para o perfil |
| 2.4 | escolher vídeo | avisa que é **pedido** antes de confirmar |
| 2.5 | confirmar | consulta nasce na clínica, com o pedido ao lado |
| 2.6 | `mode` de vídeo mandado no corpo | ignorado — quem grava `mode` é o servidor |
| 2.7 | marcar sem tocar no seletor | igual a hoje |

**A que mais importa:** 2.6. Se o corpo pudesse gravar `mode`, a aprovação
viraria enfeite.

## T-3 — A clínica decide

| # | cenário | esperado |
|---|---|---|
| 3.1 | filtro "Pedido de formato" | só as pendentes |
| 3.2 | aprovar vídeo | `mode` vira vídeo, e a consulta abre sala na janela |
| 3.3 | recusar sem motivo | recusado pelo servidor |
| 3.4 | recusar com motivo | consulta continua de pé, presencial, mesmo horário |
| 3.5 | terapeuta de outra clínica | 404 |
| 3.6 | admin da mesma clínica | decide |
| 3.7 | o log de auditoria | registra quem decidiu e quando |

## T-4 — O que o paciente vê

| # | cenário | esperado |
|---|---|---|
| 4.1 | pendente | "aguardando a clínica", nas duas línguas |
| 4.2 | aprovado para vídeo | ícone de câmera e "Entrar" na janela |
| 4.3 | recusado | a frase e o motivo |
| 4.4 | **os avisos** | **nenhum** sai sozinho |
| 4.5 | botão "Avisar o paciente" | dispara naquele clique, e diz em quantos aparelhos |
| 4.6 | consulta sem pedido | nada disto aparece |

## T-5 — Ligar o domicílio

| # | cenário | esperado |
|---|---|---|
| 5.1 | ligar a chave | o app oferece domicílio na marcação seguinte |
| 5.2 | desligar | some da marcação, e consulta já aprovada não muda |
| 5.3 | as duas chaves | explicam o efeito na própria tela |
