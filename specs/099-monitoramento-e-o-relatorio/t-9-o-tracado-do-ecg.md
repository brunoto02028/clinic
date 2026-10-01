# T-9: O traçado do ECG, e o *play*

**Status:** pendente
**Depende de:** T-1 (que já guarda o registo e a conclusão)

## O pedido

O Bruno mandou o vídeo do app da Withings: o traçado **a correr no tempo** —
9'→10'→11', com um botão que alterna *Play ECG* / *Pause ECG* — por cima do
estado (`Sinus Rhythm`, `78 bpm`) e da nota do fabricante.

> *"do vídeo que vem depois das análises etc... tudo precisamos ter em nosso
> APP"*

## O que já existe

`withingsEcg()` chama `v2/heart` com `action: "list"` e já guarda, por registo:
a data, a **conclusão do aparelho**, a frequência, e — o que importa aqui — o
**`signalid`**.

A tela do paciente já mostra a lista de ECG do período com a conclusão, e já
diz que não interpretamos o traçado.

## O que falta: o sinal

Falta a segunda chamada, `v2/heart` com `action: "get"` e o `signalid`, que é a
que devolve **as amostras** — o traçado. Nunca a fizemos.

| peça | estado |
|---|---|
| a lista de ECG e a conclusão | **feito** (T-1) |
| o `signalid` guardado | **feito** (T-1) |
| as amostras do traçado | **falta** |
| desenhar o traçado | **falta** |
| o *play* a correr no tempo | **falta** |

## A dúvida que decide a tarefa, e que não dá para resolver lendo

O levantamento da T-7 encontrou **pacotes de biomarcadores** na API deles, e a
divisão publicada põe **"ECG signal, atrial fibrillation, QT/PR/QRS intervals"**
no pacote **pago**.

E o pior: *"pedir dado a que não se tem direito **não falha** — o campo
simplesmente não vem, indistinguível de 'o utilizador não tem esse dado'"*.

Então **o primeiro passo não é desenhar: é medir.** Uma chamada `action: "get"`
com um `signalid` real da conta do Bruno responde o que nenhuma tabela responde.
Três desfechos, três caminhos:

| o que volta | o que significa | o que fazer |
|---|---|---|
| as amostras | o nosso plano inclui | construir tudo |
| erro explícito de permissão | o pacote barra | é decisão comercial do Bruno |
| **vazio, sem erro** | ambíguo — é o caso traiçoeiro | perguntar ao gestor de conta, e **registar como não lido**, nunca como "sem ECG" |

## O desenho, se o sinal vier

### Onde mora o traçado

Um ECG de 30 segundos a ~300 Hz são **~9.000 amostras** por registo. É série, e
vai na `WearableSeries` que a T-7 criou — `kind: "ECG_SIGNAL"`, uma linha por
registo.

**Não vai para o `rawPayload` do ponto diário**, que é onde a tentação mora: o
traçado é consultado sozinho, por registo, e não junto com o resto do dia.

### A tela

Um traçado em papel milimetrado escuro, como o do aparelho, com o *play* a
correr a janela no tempo. A escala tem de ser **a clínica** — 25 mm/s e
10 mm/mV — porque um ECG desenhado noutra escala não é legível para quem sabe
ler ECG, e passa a ser desenho bonito.

Por cima: a conclusão **do aparelho** e a frequência, como já está.

### A frase que não pode faltar

A Withings põe, no próprio ecrã: *"Withings ECG App never checks for heart
attacks"*. Nós precisamos do equivalente, e por uma razão que é nossa: **um
traçado na tela convida à leitura**. Sem a frase, mostrar o desenho é um convite
tácito a interpretá-lo — e quem interpreta ECG é médico.

O texto diz o que o aparelho faz e o que não faz, e que a conclusão é dele.

## O que não fazer

**Não calcular nada a partir do traçado.** Nem frequência, nem intervalo, nem
"parece irregular". Os intervalos QT/PR/QRS, se vierem, vêm **medidos por eles**
como tipos de medida — não se derivam aqui.

**Não desenhar sem a escala certa.** Um traçado sem mm/s e mm/mV é ilustração.

**Não guardar o traçado no registo do dia.** Série é série.

## Passos

1. **Medir**: `v2/heart get` com um `signalid` real, e registar o que volta.
2. Se vier: ingerir para `WearableSeries`, `kind: "ECG_SIGNAL"`.
3. Rota que serve um traçado por registo.
4. A tela: papel, traçado, escala clínica, *play*.
5. A frase do que não é.
6. Testes: o formato da resposta; a escala; e que nada é calculado do sinal.

## Critérios de aceite

- [ ] O resultado da medição está escrito aqui — inclusive se for "não dá"
- [ ] O traçado desenha na escala clínica, e a tela diz qual é
- [ ] O *play* corre no tempo e pára
- [ ] A conclusão continua a ser a do aparelho, citada
- [ ] A frase do que o aparelho **não** faz está lá, nas duas línguas
- [ ] Nenhum número é derivado do sinal por nós
- [ ] Um sinal que não vem fica **"não lido"**, nunca "sem ECG"
