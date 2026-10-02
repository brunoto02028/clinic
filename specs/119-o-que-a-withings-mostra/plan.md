# Atividade 119 — O que a Withings mostra, e o que a API nos dá

**Aberta:** 02/10/2026, 04:45, a pedido do Bruno.
**Status:** aprovado em 02/10 — T-2 e T-3 feitas e em produção; a T-1 é a próxima

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

## O que sabemos — **medido em 02/10**, não suposto

A tabela completa está em [`qa/o-que-a-api-devolve.md`](qa/o-que-a-api-devolve.md).
O essencial:

**Quase tudo vem.** Incluindo as duas coisas que estavam dadas como perdidas:

- **O traçado do ECG: 9.000 amostras** (30 s a 300 Hz). O PDF para levar ao
  médico é montável.
- **O hipnograma: 12 fases**, com a frequência cardíaca dentro de cada uma — o
  que traz a curva da noite junto.
- Frequência do sono (55), respiração (12 rpm), pontuação deles (47), duração
  (3h43) — todos conferidos contra as capturas do próprio Bruno.

**O único que não veio: o HRV.** Pedido por `rmssd` e `sdnn_1`, ausente do
corpo. Pode ser plano, pode ser nome de campo.

**E a suposição anterior estava errada.** Eu tinha escrito aqui que hipnograma,
treinos e traçado "voltam vazios, sem erro" e que a sobreposição com o pacote
pago era exacta. Não era: o hipnograma e o traçado **vêm**. O que havia era
parâmetro nosso errado — um `data_fields` inválido que derrubava três chamadas
de uma vez. A sondagem foi construída para não repetir isso, e **repetiu-o uma
vez**: pediu sete dias ao `getintradayactivity`, que só aceita um, e leu o vazio
como se fosse falta de plano.

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
| T-1 | [**Medir, biomarcador a biomarcador, o que a API devolve**](t-1-medir-o-que-a-api-devolve.md) | — | **medido** (02/10) — [a tabela](qa/o-que-a-api-devolve.md) |
| T-2 | O ECG deixa de ser um por dia — tabela própria, uma linha por registo | — | **feito** (02/10) |
| T-3 | O ECG dentro da página Heart, com a lista e a hora | T-2 | **feito** (02/10) |
| T-4 | O hipnograma da noite, se a T-1 disser que vem | T-1 | pendente |
| T-5 | A curva da frequência durante a noite | T-1 | pendente |
| T-6 | O que faltar: dizer **porquê** na tela, em vez de esconder | T-1 | pendente — **subiu de prioridade**, ver abaixo |
| T-7 | A contrapartida de tudo isto no painel da clínica | T-2..T-6 | pendente |
| T-8 | [**Puxar a tela fala com a Withings**](t-8-puxar-fala-com-a-withings.md) | — | **concluído** (02/10) — [QA](qa/report-t-8.md) reprovado na 1ª rodada, aprovado na 2ª; 11 mutações |
| T-9 | [**A gaveta vazia**](t-9-a-gaveta-vazia.md) | — | **concluído** (02/10) — três leitores procuravam `restingHr`/`hrv`/`spo2` em `BODY`, que ninguém escreve; 9 mutações |

**A T-2 não espera pela T-1.** É um defeito provado e independente do plano da
Withings: `upsertPoint` grava o ECG com chave `(utilizador, dia, tipo)` e faz
`update` se já existir, e um ECG é um **evento**. O Bruno fez dois em 01/10 —
22:44 e 23:54 — e o segundo apagou o primeiro. A mesma linha tem um segundo
defeito: o dia vem de `recordedAt.toISOString()`, que é **UTC**, então um ECG às
00:30 em Londres no verão fica guardado como sendo do dia anterior.

O traçado propriamente dito é a **099 T-9**, que já existe e está à espera da
mesma medição — a T-1 daqui fecha-a também.

## ⚠️ Porque a T-6 deixou de ser um extra

O painel de programador, lido com sessão em 02/10, mostra que **o ECG e a
fibrilhação têm ✗ no nosso plano** — e ✗ também no Enterprise. Só o *Advanced
Biomarkers* os tem.

**E nós recebemos os dois assim mesmo.** A tabela descreve o direito
contratual; a API, hoje, não o está a impedir.

O modo como eles retiram dado fora do plano é sempre o mesmo: **o campo deixa de
vir, sem erro**. Logo o que temos hoje pode desaparecer sem aviso, e a tela, sem
a T-6, mostraria um buraco indistinguível de *"o paciente não gravou nenhum"*.

Há ainda uma data: **a partir de 12/10/2026**, qualquer paciente que crie conta
Withings depois disso precisa de **Withings+** para ligar o relógio a uma app do
plano gratuito. Os actuais ficam como estão.

Nada disto é código. É o que torna a T-6 a tarefa que impede a tela de mentir.

## Suposições — preciso da sua validação

1. **A pontuação de sono deles não entra**, nem citada. Se quiser citá-la com a
   marca deles ao lado, é decisão sua e eu faço — mas não parte de mim.
2. **Se a T-1 disser que falta o pacote pago**, eu trago o preço e a decisão é
   sua. Não assino nada.
3. **A paridade é com o que a API dá**, não com o app deles. Onde a API não der,
   a tela diz o que falta e porquê — nunca finge que o dado não existe.
4. O ECG passa a ter tabela própria. Os registos já guardados são migrados pelo
   que houver no `WearableDataPoint` — um por dia, que é o que sobrou.
