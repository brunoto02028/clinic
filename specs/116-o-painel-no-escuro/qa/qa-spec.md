# QA — Atividade 116

O QA desta atividade é **medição**, não olhadela. Contraste lido das cores
computadas no navegador (`getComputedStyle`), nunca das cores do código — o
fundo efetivo pode vir de um pai, de um gradiente ou de uma transparência.

## Regra de aceitação

| o quê | mínimo |
|---|---|
| texto corrido | 4,5:1 |
| texto grande (≥18,66px negrito ou ≥24px) | 3:1 |
| crachá, selo, borda que carrega significado | 3:1 |

## T-1 — A varredura e a trava

| # | tipo | passos | esperado |
|---|---|---|---|
| 1a | UI | medir os quatro pares da captura do Bruno | os números de hoje, escritos |
| 1b | teste | rodar a varredura | a linha de base bate com o repositório |
| 1c | teste | mutação: acrescentar `bg-amber-50` a uma tela | o teste cai, nomeando o arquivo |
| 1d | teste | mutação: remover uma classe crua | o teste **não** cai |

## T-2 — As telas da pressão

| # | tipo | passos | esperado |
|---|---|---|---|
| 2a | UI | `/admin/blood-pressure`, cada par de fundo e texto | tudo dentro do mínimo |
| 2b | UI | a legenda das faixas, as seis | a escada de gravidade sobe, medida |
| 2c | UI | a frase do NHS, EN e PT | legível, dentro do mínimo |
| 2d | UI | aba de pressão da ficha | o mesmo |
| 2e | UI | antes e depois, lado a lado | o número subiu em todos os pares tocados |

## T-3 — A ficha e a agenda

| # | tipo | passos | esperado |
|---|---|---|---|
| 3a | UI | ficha do paciente, bloco a bloco | dentro do mínimo |
| 3b | UI | agenda, incluindo os estados de consulta | dentro do mínimo |
| 3c | UI | os crachás de origem de leitura | ≥3:1, e ainda distinguíveis entre si |
| 3d | teste | a linha de base | desceu, e o teste verde |

## Transversal

- Capturas em `qa/screenshots/`, com o número do contraste anotado.
- Nenhum paciente real; sessão de teste identificada.
- Se um par piorar, o relatório diz **qual** e com que números — uma melhoria
  média que esconde uma piora pontual não é melhoria.
