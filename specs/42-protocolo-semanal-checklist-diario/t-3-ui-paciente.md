# T-3: UI paciente — agrupar por semana + tira de 7 dias

**Status:** concluído
**Depende de:** T-2

## Objetivo
A paciente vê o protocolo dividido por semana e consegue marcar os dias da semana atual como
feitos, em cada item.

## Contexto
Ver plan.md, decisão 3. Arquivo: `app/dashboard/treatment/page.tsx`.

## Passos
1. Calcular a semana atual a partir de `protocol.startDate` (`Math.floor(diasDesdeInicio / 7) + 1`).
2. Agrupar os itens visíveis (já filtrados por `hiddenFromPatient`) por `startWeek`–`endWeek`
   em seções "Week N" (ou intervalo "Weeks N-M" quando `startWeek !== endWeek`), em vez da
   lista sequencial atual por fase.
3. Pra cada item cuja faixa de semana inclui a semana atual: renderizar uma tira de 7 dias
   (Seg–Dom da semana atual), cada dia um botão pequeno — marcado (✓, cor `ba1-ok`) se tem log
   pra aquela data, clicável pra chamar `toggleLog`. Dias fora da semana atual (passado/futuro)
   ficam só leitura (sem tira, ou tira desabilitada).
4. Manter o texto "Feito Nx" existente como total, mas a fonte da verdade visual agora é a
   tira semanal.

## Arquivos afetados
- `app/dashboard/treatment/page.tsx`

## Critérios de aceite
- [ ] Itens aparecem agrupados por semana, não mais em lista única
- [ ] Tira de 7 dias aparece só nos itens da semana atual
- [ ] Clicar num dia da tira marca/desmarca (chama a API, sem erro no console)
- [ ] Responsivo em ~390px (mobile)
