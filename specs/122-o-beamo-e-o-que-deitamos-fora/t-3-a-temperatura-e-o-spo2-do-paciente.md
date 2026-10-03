# T-3: A temperatura e o SpO₂ do paciente

**Status:** concluído (03/10/2026) — review feito, 8 achados dispostos
**Depende de:** T-2

## O que falta hoje

Com o BeamO, o terapeuta abre a janela, mede o paciente, e a **pressão** e o
**ECG** entram na ficha dele. A **temperatura** e o **SpO₂** não entram em lado
nenhum: são filtrados da ligação pessoal (para não caírem no dono do aparelho) e
a ligação da clínica não os lê.

O documento do fluxo diz, hoje, *"têm de ser anotados à mão"*.

## Porque não vão para onde os outros vitais vão

`WearableDataPoint` tem as colunas `bodyTemperature` e `spo2`, e parece o sítio.
**Não é.** A chave é `(utilizador, dia, tipo, provedor)` — a chave de um **total
do dia**. Escrever ali uma medição pontual da clínica apagaria, em silêncio, a
média do dia que o aparelho do próprio paciente guardou. É a mesma forma de
defeito que a 119 T-2 tirou do ECG (duas gravações no mesmo dia colapsavam numa),
e seria recriá-la três semanas depois.

Uma medição feita num instante precisa de uma tabela com forma de **evento** —
exactamente como `BloodPressureReading`, que é o modelo a copiar: tem paciente,
clínica, quem registou, instante, fuso, origem, contexto, o id da Withings para
deduplicar, e o `autoAttributed` que torna um engano reversível.

## O risco que esta tarefa tem de fechar

Dentro de uma janela de três minutos, o aparelho da clínica mede o paciente —
**e o relógio do dono continua no pulso dele**. A regra *"o que se usa no pulso é
sempre do dono"* (T-1) não se aplica aos vitais: a resposta da Withings para
`getmeas` traz `deviceid` mas **não** traz o modelo, e o `v2/user getdevice` que
o traria exige o scope `user.info`, que não temos — pedi-lo obrigaria **todos os
pacientes** a reautorizar.

Hoje isso custa uma perda (as amostras do relógio dele dentro da janela são
descartadas). Se a clínica passar a escrever vitais sem mais nada, passa a custar
uma **troca**: a frequência cardíaca do terapeuta no prontuário do paciente.

### A regra que fecha isto sem saber o modelo

**Um grupo de medidas só é atribuído se trouxer SpO₂ ou temperatura.**

Um grupo só com frequência cardíaca é o que um relógio produz sozinho, o dia
inteiro, sem ninguém pedir. Um SpO₂ ou uma temperatura **não acontecem sem
alguém os medir** — são o acto que a janela está ali para nomear. E a FC que vem
**no mesmo grupo** de um SpO₂ é a da mesma medição, logo entra com ele.

É a mesma disciplina do resto da atividade: não adivinhar o aparelho, e deixar a
medição por atribuir quando não se sabe.

## O que entra e o que não entra

| o grupo traz | o que acontece |
|---|---|
| SpO₂ e/ou temperatura (com ou sem FC) | `VitalReading` no prontuário do paciente que a janela nomeia |
| só FC — ou só temperatura **da pele** | **não entra**, é contado e dito no log |
| nada disto | ignorado, como hoje |
| sem janela, ou com duas | **não entra**, contado — a caixa de entrada é a T-4 |

A ligação **pessoal** não muda: continua a filtrar o que cai dentro de janela, e
a escrever os totais do dia do dono como sempre.

## Passos

1. `prisma/schema.prisma` — `model VitalReading`, irmão do `BloodPressureReading`.
2. `lib/clinic-vitals.ts` — `atribuirVitaisDaClinica`, com a regra acima. Puro o
   que der para ser puro: `grupoEAtribuivel(v)` sai de lá testável sem banco.
3. `lib/withings-ingest.ts` — a ligação da clínica passa a pedir `vitals`, e os
   vitais dela vão pela atribuição em vez de `upsertPoint`.
4. `components/admin/patient-monitoring-tab.tsx` — as medições aparecem na ficha.
5. O app do paciente fica para a **T-10**: primeiro a clínica, que é onde o dado
   nasce.

## Critérios de aceite

- [x] Grupo com SpO₂ dentro de uma janela → `VitalReading` do paciente da janela
- [x] Grupo só com FC dentro da janela → **não** escrito, contado no log
- [x] Sem janela → não escrito (é da ligação pessoal)
- [x] Duas janelas → não escrito (ambiguidade não vira palpite)
- [x] A mesma medição duas vezes → uma linha só (`withingsMeasureId`)
- [x] A ligação pessoal continua a escrever os totais do dia do dono
- [x] A ficha do paciente mostra as medições, com a hora e quem mediu
- [x] Nenhuma frase nova diz "diagnóstico" nem interpreta o valor
- [x] Sete mutações, sete testes mortos — incluindo a que mais me preocupava:
      **reverter o `wanted` da clínica não matava nada** até eu escrever o teste
      de ingestão (`a-clinica-le-os-vitais.test.ts`)
- [x] Valores arredondados a uma casa, e os implausíveis recusados com motivo
- [x] A tela do "Já medi" diz quantas medições entraram — não mais "nada veio"
- [x] O contador de perda só conta o que **trazia medição**
- [x] QA: o review substituiu-o nesta tarefa (medição por execução, não por leitura)
- [x] Code review feito (`qa/review-t-3.md`) — 8 achados, 4 corrigidos, 4 dispostos na T-4
