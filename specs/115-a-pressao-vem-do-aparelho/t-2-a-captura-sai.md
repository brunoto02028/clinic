# T-2: A captura sai da web do paciente

**Status:** implementada (30/09) — QA pendente
**Depende de:** T-1

## Objetivo

Remover a captura por câmera de `app/dashboard/blood-pressure/page.tsx` — o
único lugar onde ela existe de facto.

## Contexto

São 41 referências num arquivo de 2015 linhas: acesso à câmera, flash, amostragem
do sinal, `analyzePPGSignal`, forma de onda "tipo ECG", detecção de arritmia,
métricas de VFC, e as telas de ajuda que explicam como pôr o dedo.

**O que a remoção também apaga:** a estimativa de pressão, a análise de ritmo e a
VFC vinham todas do mesmo sinal. Nenhuma tem outra fonte, então nenhuma sobrevive
à câmera — e é bom que não sobreviva, porque *"detecção de arritmia pelo
telefone"* é a mais arriscada das três promessas.

A tela perde acesso no lançamento, então isto é limpeza de código e não conserto
de algo em uso. Vem depois da T-1 por esse motivo.

## Passos

1. Remover a captura, a análise e as telas de ajuda.
2. Deixar a tela com o que ela ainda faz: **ver o histórico** e **digitar uma
   leitura**, com a frase do parâmetro do NHS que a 105 T-6 pôs lá.
3. Conferir que nada mais importa o que foi removido.

## Arquivos afetados

- `app/dashboard/blood-pressure/page.tsx`

## Critérios de aceite

- [ ] A tela abre, mostra o histórico e aceita uma leitura digitada
- [ ] Nenhum pedido de permissão de câmera
- [ ] `tsc --noEmit` em 0
- [ ] Nada do que foi removido sobrou importado sem uso

## O que foi feito

**1.251 linhas cortadas** — de 2.015 para 573. Saíram inteiros: `getDeviceInfo`,
`analyzePPGSignal`, `PPGWaveformChart`, `PPGReport` e `PPGCamera`, mais o estado,
os manipuladores e as telas de ajuda no componente principal.

Com eles foram, como a tarefa previa, a **estimativa de pressão**, a **análise de
ritmo** e a **VFC**: as três vinham do mesmo sinal óptico e nenhuma tinha outra
fonte.

### Três coisas que apareceram ao cortar

**Eram dois botões, e o segundo já se desmentia.** *Enter Cuff Reading* vinha
marcado *recommended*; ao lado, *Camera Estimate* dizia *PPG — estimate only*.
Duas portas para a mesma coisa, uma delas avisando que não servia. Ficou uma.

**O crachá de ritmo dizia "AFib?" numa leitura antiga.** Era calculado dos
intervalos entre batimentos lidos pelo telefone — a mais arriscada das três
promessas, e a única que **nomeava uma condição**. A leitura continua na lista; o
veredito sobre ela, não.

**A forma de onda guardada saiu junto.** Leituras antigas têm o sinal gravado, e
a tela desenhava um gráfico "tipo ECG" com ele. O dado fica no banco; a tela
deixa de o interpretar.

### Provas

`__tests__/pressao/o-painel-nao-oferece-a-camera.test.ts`, alargado do painel
para o produto inteiro. Dois cenários novos: a tela **não pede a câmera**
(`getUserMedia`, `videoRef`, `torch`, `facingMode`) e **continua a gravar** a
leitura digitada.

Por mutação, duas — e a segunda ensinou alguma coisa: pedir a câmera de volta
derruba 1; **quebrar a gravação da leitura não derrubou nada** na primeira
versão, porque o teste procurava `method: "MANUAL"` no arquivo inteiro e a string
também está na declaração do tipo. Passou a procurar **dentro** do
`handleManualSubmit`, e aí morre.

Suíte: **2956 testes, 200 suítes** verdes. `tsc` em 0 nos dois lados. Build ok.
