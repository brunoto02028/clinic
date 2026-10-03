# Mutações — T-1 e T-2 (03/10/2026)

Cada correção tem de ter uma mutação que mate um teste com nome. Medido com as
duas suítes da atividade (30 testes), revertendo entre cada uma.

| # | Mutação | Testes mortos |
|---|---|---|
| M1 | `wanted` da clínica volta a `["bp"]` | **5** |
| M2 | o `create.userId` do ECG volta a ser o dono da ligação | **1** |
| M3 | `if (!dono) continue` desaparece e o dono cai para `userId` | **3** |
| M4 | `aJanelaDecide` esquece os aparelhos de pulso | **2** |
| M5 | `janelaDaMedicao` atribui à primeira janela quando há duas | **1** |
| — | controlo, sem mutação | **0** (30 passam) |

## O controlo falhou à primeira, e disso veio um achado

Para reverter a M5 usei `git checkout lib/clinic-device.ts` — e o arquivo
estava **novo no working tree**, logo o `checkout` trouxe a versão do HEAD e
apagou o `janelaDaMedicao` inteiro. O controlo passou a falhar 5 testes, com a
mesma assinatura da M1.

Foi a suíte que o disse, em dois segundos. É a mesma lição de
`agente-restaura-e-apaga-a-correcao`: uma correção sem teste desaparece com a
suíte verde. Com teste, desaparecer **é** uma falha vermelha.

## Segunda rodada — as correções do QA e do review (03/10, à noite)

| # | Mutação | Testes mortos |
|---|---|---|
| M8 | `ESTADOS_QUE_RECEBEM_EVENTO` volta a `["OPEN","EXPIRED"]` (G1) | 1 |
| M9a | a falha das janelas volta a valer "não havia janela", lado da clínica (G2) | 1 |
| M9b | idem, lado pessoal — o lado que **escreve** | 1 |
| M10 | o motivo volta a ser "o que sobrou" em vez da causa (G6) | 1 |
| M11 | a auditoria volta a repetir-se em cada passagem (G8) | 1 |
| M12 | a tela volta a contar os dias anteriores à ligação (120 T-11) | 4 |
| — | controlo | 0 (47 passam) |
