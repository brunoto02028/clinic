# QA — Atividade 115

Cenários por tarefa. Ambiente local, porta confirmada pelo *command line* antes
de medir; paciente de teste identificado, nunca um paciente real.

## T-1 — O painel deixa de oferecer a câmera

| # | tipo | passos | esperado |
|---|---|---|---|
| 1a | UI | abrir `/admin/blood-pressure` logado como clínica | nenhum cartão a oferecer medir por câmera |
| 1b | UI | ler o `innerText` inteiro da tela, EN e PT | zero ocorrências de `PPG`, `photoplethysmo`, `Scan to Measure` |
| 1c | UI | conferir o resto | lista de pacientes, legenda das faixas e frase do NHS continuam |
| 1d | UI | console | nenhum erro novo (o de hidratação do QR code é pré-existente) |

## T-2 — A captura sai da web do paciente

| # | tipo | passos | esperado |
|---|---|---|---|
| 2a | UI | abrir `/dashboard/blood-pressure` como paciente de teste | carrega e mostra o histórico |
| 2b | UI | observar os pedidos do navegador | **nenhum** pedido de permissão de câmera |
| 2c | UI | digitar uma leitura e gravar | grava, aparece na lista, `method: MANUAL` |
| 2d | UI | a frase do NHS (105 T-6) | continua acima da lista, EN e PT |
| 2e | API | `tsc --noEmit` | 0 na web |

## T-3 — Os textos, o crachá e o enum

| # | tipo | passos | esperado |
|---|---|---|---|
| 3a | estático | varrer o produto por frases de medição por câmera | nenhuma |
| 3b | UI | abrir a ficha de um paciente com leitura `CAMERA_PPG` antiga | a leitura aparece, com a origem certa |
| 3c | API | contar as linhas de `BloodPressureReading` antes e depois | o mesmo número, os mesmos valores |
| 3d | teste | mutação: escrever `CAMERA_PPG` num caminho vivo | o teste cai |

## T-4 — O que fica no lugar

| # | tipo | passos | esperado |
|---|---|---|---|
| 4a | UI | `/admin/blood-pressure`, EN e PT | diz por onde a leitura entra |
| 4b | UI | seguir cada caminho indicado | chega à caixa de medições e à ficha |
| 4c | UI | com a 114 feita | uma leitura da Withings chega e aparece |

## Transversal

- Nenhuma leitura de paciente real tocada; `OUTBOUND_MODE=sink`.
- Capturas em `qa/screenshots/`, prefixo `t<N>-`.
- Suíte completa e `tsc` nos dois lados ao fim de cada tarefa.
