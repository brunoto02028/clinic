# T-3: O domicílio ocupa a ida e a volta

**Status:** implementada — aguardando QA
**Depende de:** T-2

## Objetivo

Que um atendimento em casa ocupe o tempo que ele realmente toma.

## Contexto

> *"No home visit eu vou ter que fazer um book com horários muito maiores, que
> tem um tempo de deslocamento."*

Ir a um endereço a vinte minutos e a um a uma hora ocupa a tarde de formas
diferentes, e hoje nenhum dado de distância entra na conta.

## A resposta do Bruno, 29/09/2026

> *"O postcode, a gente parte do princípio: postcode da clínica, IP1. Aí eu vou
> fazer uma visita na casa da pessoa. **Pelo menos bloqueio os slots.** O tempo
> de deslocamento eu tenho que calcular para ir atender o paciente. Então pelo
> menos os slots não podem estar disponíveis naquele dia por conta da ida e da
> volta."*

Escolhida a **(b)**, com uma correção de rumo: o postcode **sugere**, e o
bloqueio é o que importa. Primeiro o campo que bloqueia; depois o número que o
preenche.

## O que foi feito

### O bloqueio

`Appointment.travelMinutes` — minutos **de cada lado**. Fica na consulta, e não
na clínica nem no paciente, porque é da **viagem**: o mesmo paciente numa
terça de manhã e num sábado à tarde não custa o mesmo tempo, e quem sabe disso é
quem vai dirigir.

A ocupação passa a contar `viagem + intervalo + duração + intervalo + viagem`. A
viagem **soma** ao intervalo em vez de substituí-lo: chegar em casa e atender o
próximo no mesmo minuto é o mesmo problema de sempre, agora depois de quatro
horas de estrada.

### A estimativa

`lib/tempo-de-viagem.ts`, com `postcodes.io` — gratuito, sem chave, só Reino
Unido. Distância em linha reta, fator de estrada, velocidade média.

**Calibrada contra a viagem real**, e não com números redondos: IP1 até
KT20 5BF são 127,7 km em linha reta, e o Bruno leva 2h. Os parâmetros iniciais
(1,3 e 65 km/h) davam **165 minutos** — 45 a mais de cada lado, uma hora e meia
de agenda perdida por visita. Com 1,25 e 80 km/h dá exatamente 120.

É **um ponto de calibração só**, e por isso o número é editável: a segunda
viagem longa que o Bruno fizer vale mais que a constante.

### Os dados que faltavam, e que o caso real revelou

| | estado |
|---|---|
| postcode da clínica | **vazio** — só "Ipswich" no endereço |
| postcode da Mione | **vazio no campo**, e presente no endereço em texto livre: `8 South Tadworth Farm Close, KT20 5BF` |

Por isso `postcodeDoTexto()` existe: ler o postcode de dentro da linha é melhor
que desistir, e é o que separa "não dá para calcular" de um número útil. E é
também por isso que o domicílio não aparecia para nenhum paciente —
`enderecoCompleto()` reprova sem os campos.

Quando não dá para estimar, a tela **diz qual das duas pontas falta**, em vez de
mostrar um campo vazio sem explicação.

## Critérios de aceite
- [x] O Bruno escolheu: postcode sugere, o bloqueio é o que importa.
- [x] A viagem ocupa a agenda antes e depois da visita.
- [x] Soma ao intervalo, não o substitui.
- [x] Só no domicílio — consulta na clínica não bloqueia nada em volta.
- [x] A estimativa bate com a viagem real medida pelo Bruno.
- [x] Serviço fora do ar, postcode inexistente ou ausente **não impedem marcar**.
- [x] O número é editável, e a tela diz que é estimativa.
- [ ] QA: marcar a visita da Mione e conferir o dia bloqueado.
- [ ] Preencher o postcode da clínica e o da paciente — é dado, não código.
