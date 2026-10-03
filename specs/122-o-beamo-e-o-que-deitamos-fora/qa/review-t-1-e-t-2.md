# Code review — T-1 e T-2 (03/10/2026)

Dez achados, dois **críticos**. Todos com disposição abaixo. O review não
corrigiu nada; as correções e as mutações que as provam são de seguida.

## G1 · crítico · a pressão fechava a janela antes de o ECG ser atribuído

**Reproduzido** pelo review: pressão e ECG às 09:01, janela 09:00–09:03.

```
PRESSAO GRAVADA: 1 | STATUS DA JANELA: COMPLETED | ECG UPSERT: 0
LOGS: [withings-ingest] ECG nao atribuidos: 1 sem janela, ...
```

`attributeClinicReading` marca a sessão `COMPLETED`; `MATCHABLE_SESSION_STATUSES`
é `["OPEN","EXPIRED"]`; o bloco da pressão corre **antes** do do ECG. Ou seja:
**no uso normal do BeamO — os dois medidos nos mesmos três minutos — o ECG do
paciente era deitado fora.** E sem segunda oportunidade: a passagem seguinte
encontrava a janela na mesma `COMPLETED`, e o botão "Já medi" devolve 409.

O ponto 5 do t-2 raciocinava sobre não fechar a janela **no caminho do ECG**.
Quem a fechava era o caminho da pressão.

**Correção:** `ESTADOS_QUE_RECEBEM_EVENTO = ["OPEN","EXPIRED","COMPLETED"]`, uma
lista separada para o que **não é pressão**. `COMPLETED` quer dizer *"já recebi
a minha leitura de pressão"* — sobre um ECG não diz nada. `CANCELLED` continua
de fora: é o terapeuta a dizer *não atribua isto*.
**Os dois lados da régua passam a mesma lista** — se só um a passasse, a
gravação era guardada duas vezes.
**Mutação:** voltar `ESTADOS_QUE_RECEBEM_EVENTO` a `["OPEN","EXPIRED"]` → 1 teste morto.

## G2 · crítico · uma falha de banco punha a medição na ficha do dono, calada

`.catch(() => [])` na consulta das janelas. Lista vazia é indistinguível de
*"não há janela"*, e sem janela a regra diz **"é do dono"**. Qualquer erro
transitório — timeout do pool, coluna em falta depois de um `db push` que engole
a falha — escrevia a medição de um paciente no prontuário do dono, sem log, sem
`falhas`, com a passagem a declarar-se bem sucedida.

Era o único caminho de escrita-na-pessoa-errada do diff.

**Correção:** `janelasPorLer`. A dúvida trava a escrita nos dois lados — a
pessoal não escreve no dono, a da clínica não atribui a ninguém — e aparece em
`falhas` e em `ecgNaoAtribuidos`. A medição fica na Withings; a passagem
seguinte alcança-a.
**Mutação:** cada metade tem o seu teste morto.

## G3 · grave · a perda não chegava a número nenhum

`naoAtribuidos` vivia só no `console.log` do contentor — o sítio que esta base
já documentou que ninguém lê.

**Correção:** `ecgRead` e `ecgNaoAtribuidos` em `IngestCounts`, somados nos
totais do cron e na linha de log (`ecg=N/M ecgNaoAtribuidos=K`). Foi o teste
`o-cron-conta-o-que-entrou` que apanhou os contadores novos a não chegarem lá.

## G4 · grave · os vitais do próprio relógio, dentro da janela

`medidaNoutraPessoa(v.measuredAt)` é chamado **sem modelo** porque
`WithingsVital` não traz o aparelho — logo *"o que se usa no pulso é sempre do
dono"* não se aplica a temperatura, SpO₂ e FC. Com uma janela aberta, as
amostras do relógio **dele** nesses três minutos saem de `meus`, e
`vitalsByDay` reescreve a média do dia sem elas.

**Não corrigido**, e a razão está medida: o `getmeas` traz `deviceid` mas não o
`model`, e o `model` só vem do `v2/user getdevice`, que exige o scope
**`user.info`** — temos `user.metrics,user.activity`. Pedi-lo obriga **todos os
pacientes a reautorizar**.

**Fica na T-3**, com o caminho já identificado: o `v2/heart list` traz
`deviceid` **e** `model` na mesma resposta, logo dá para construir o mapa
`deviceid → model` a partir das gravações de ECG da própria passagem, sem scope
novo. Até lá a limitação está escrita no código, que era a metade que faltava.

## G5 · médio · a frase podia mentir, e escondia a que pede acção

Duas coisas. O contador era o da passagem, logo um ECG atribuído a **outro**
paciente por uma janela vizinha fazia a tela de quem estava à frente dizer *"um
ECG foi salvo neste histórico"*. E o ramo do ECG vinha **antes** do `lidas`,
escondendo *"está na caixa de entrada"* — a única das três mensagens que exige
uma pessoa.

**Correção:** a rota conta `ecgRecording` **no prontuário deste paciente**
dentro da janela (o que também torna o segundo toque honesto: contar linhas, não
incrementos), e a tela **soma** as frases em vez de as escolher.

## G6 · médio · o motivo era o que sobrava, não a causa

`rec.deviceModel != null && janela cobria` rotulava de "sem janela" todo o ECG
do relógio do dono **fora** de janela — o caso normal numa conta de clínica. O
contador que existe para gritar *"ninguém reclamou isto"* enchia-se do caso
benigno.

**Correção:** `ehDePulso(rec.deviceModel)` primeiro, com teste próprio.

## G7 · médio · dois testes alheios enfraquecidos sem necessidade

`\b(Sept|Aug|…)\b` deixa passar "September" — e o nome por extenso é exactamente
o que `toLocaleDateString("en")` produz. `\bgrupo:` deixa de inspeccionar
`subgrupo:`. O review mediu: **as duas suítes passam sem o enfraquecimento**.

**Correção:** os dois regexes voltaram ao que eram. 49 testes verdes.

## G8 · baixo · a auditoria repetia-se em cada passagem

**Correção:** pergunta-se primeiro se a gravação já estava guardada; a linha de
auditoria é escrita uma vez. **Mutação:** 1 teste morto.

## G9 · baixo · `select` em falta e um N+1

**Correção:** as janelas são carregadas **uma vez por passagem**, com `select`
explícito, e `pickSession` decide em memória. Deixou de haver consulta por
gravação.

## G10 · informativo · duas ligações de clínica da mesma conta

**Corrigido junto com o G9:** a lista de janelas é da **conta**
(`providerUserId` + `isClinicDevice`), e é a mesma nos dois lados. Com duas
ligações de clínica a cobrir o mesmo instante, `pickSession` devolve
`ambiguous` e nada é escrito — em vez de a gravação entrar em dois pacientes.

## O que o review confirmou que estava certo

Os quatro caminhos de escrita do ECG usam o dono da **gravação**; a invariante é
uma função só; modelo nulo não é tratado como de pulso; a ambiguidade não vira
palpite; zero bytes `\x08` nos testes; sem "diagnóstico" no componente.

## Uma consequência da ambiguidade, encontrada ao corrigir

Com `dentroDeUmaJanela: boolean`, **duas** janelas a cobrir a mesma medição
liam-se como *"não há janela"* do lado pessoal — e a medição caía no dono do
aparelho. Era a única situação em que uma medição que seguramente **não** é dele
lhe entrava na ficha. O campo passou a ser `janelasQueCobrem: number`, e a
propriedade provada deixou de ser a equivalência: é
`entraPelaAtribuicao ⇒ ehDeQuemFoiMedido`, com a diferença — a ambiguidade —
isolada, contada e com teste.
