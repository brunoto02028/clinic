# Atividade 119 — O que a Withings mostra, e o que a API nos dá

**Aberta:** 02/10/2026, 04:45, a pedido do Bruno.
**Status:** plano escrito, **à espera de aprovação**

> *"Quero as mesmas informações do app da Withings aqui no nosso. Mas puxando
> da API."*

## O pedido, e porque ele não é uma tarefa de ecrã

O Bruno mandou seis capturas do app da Withings. O que está lá:

| no app deles | o que é |
|---|---|
| Hipnograma da noite | Awake / REM / Light / Deep, barra a barra |
| Sleep Quality Score **47** | pontuação deles |
| Duration 3h43 · Heart Rate 55 bpm · **HRV 14 ms** | submétricas do sono |
| Depth *Good* · Regularity *Poor* · Interruptions *None* | julgamentos deles |
| Curva da frequência durante a noite (50–74) | série intranoite |
| SpO2 do sono 96% · pontual 99% | |
| Temperatura contínua 36,6 °C | |
| Daily Steps · Average Heart Rate 60 bpm + curva | |
| **ECG com traçado e botão *Play*** | sinal, amostra a amostra |
| Pressão 136/79 · Altura 188 cm | |

A pergunta que decide esta atividade inteira **não é de desenho**: é *quais
destes a nossa chave da API devolve*. A divisão publicada pela Withings põe
vários deles no **pacote pago** — pontuação de sono, HRV, SpO₂ automático,
frequência durante o sono, respiração, e **o sinal do ECG**.

E o modo de falhar é o pior possível: **dado fora do plano não dá erro.** O
campo simplesmente não vem. Medido por nós em produção em 01/10: o hipnograma e
os treinos voltaram **vazios, sem erro**, e o intraday de frequência funcionou.
Vazio e sem-direito são a mesma resposta e levam a acções opostas — comprar o
pacote, ou procurar um defeito nosso que não existe.

**Por isso a T-1 é medição, e nada mais.** Nenhuma tela antes de saber.

## O que já sabemos, e não é suposição

- **Funciona hoje:** frequência minuto a minuto (`intradayDays: 1` medido),
  SpO₂ pontual, temperatura, passos/calorias/minutos activos, pressão arterial,
  peso e composição, e a **conclusão** do ECG.
- **Volta vazio, sem erro:** hipnograma (`v2/sleep get`), treinos, e as
  **amostras** do ECG (`v2/heart get`).
- **Nunca apareceu:** HRV, pontuação de sono, frequência durante o sono,
  respiração.

A sobreposição entre "volta vazio" e "está no pacote pago" é exacta. Mas
*exacta* não é *provada* — pode ser escopo OAuth, pode ser o modelo do relógio,
pode ser um parâmetro nosso errado (já aconteceu: um `data_fields` inválido
derrubou as três chamadas de série de uma vez).

## O que **não** vamos copiar, e porquê

1. **A pontuação de sono (47) e os julgamentos — *Good*, *Poor*, *None*.**
   Mesmo que a API os devolva, são **afirmação sobre o corpo de alguém**. A
   regra desta base desde a 099 T-2: nenhuma faixa de referência, nenhuma
   pontuação nossa. A deles é deles; se a mostrarmos, é citando a fonte, nunca
   como nossa.
2. **Qualquer leitura do traçado.** O traçado pode ser mostrado; interpretá-lo
   é outro produto, regulado. Ver [[feedback_nunca-dizer-diagnostico]].
3. **O verde e o vermelho.** O app deles pinta ✓ e ! em tudo. Cor de julgamento
   na tela do paciente saiu na 099 T-2 e não volta por imitação.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | **Medir, biomarcador a biomarcador, o que a API devolve** | — | pendente |
| T-2 | O ECG deixa de ser um por dia — tabela própria, uma linha por registo | — | pendente |
| T-3 | O ECG dentro da página Heart, com a lista e a hora | T-2 | pendente |
| T-4 | O hipnograma da noite, se a T-1 disser que vem | T-1 | pendente |
| T-5 | A curva da frequência durante a noite | T-1 | pendente |
| T-6 | O que faltar: dizer **porquê** na tela, em vez de esconder | T-1 | pendente |
| T-7 | A contrapartida de tudo isto no painel da clínica | T-2..T-6 | pendente |

**A T-2 não espera pela T-1.** É um defeito provado e independente do plano da
Withings: `upsertPoint` grava o ECG com chave `(utilizador, dia, tipo)` e faz
`update` se já existir, e um ECG é um **evento**. O Bruno fez dois em 01/10 —
22:44 e 23:54 — e o segundo apagou o primeiro. A mesma linha tem um segundo
defeito: o dia vem de `recordedAt.toISOString()`, que é **UTC**, então um ECG às
00:30 em Londres no verão fica guardado como sendo do dia anterior.

O traçado propriamente dito é a **099 T-9**, que já existe e está à espera da
mesma medição — a T-1 daqui fecha-a também.

## Suposições — preciso da sua validação

1. **A pontuação de sono deles não entra**, nem citada. Se quiser citá-la com a
   marca deles ao lado, é decisão sua e eu faço — mas não parte de mim.
2. **Se a T-1 disser que falta o pacote pago**, eu trago o preço e a decisão é
   sua. Não assino nada.
3. **A paridade é com o que a API dá**, não com o app deles. Onde a API não der,
   a tela diz o que falta e porquê — nunca finge que o dado não existe.
4. O ECG passa a ter tabela própria. Os registos já guardados são migrados pelo
   que houver no `WearableDataPoint` — um por dia, que é o que sobrou.
