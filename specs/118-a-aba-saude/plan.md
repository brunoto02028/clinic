# Atividade 118 — A aba Saúde

**Aberta:** 01/10/2026, a pedido do Bruno.
**Status:** plano escrito, à espera de aprovação

> *"aba saúde e dentro dela uma primeira página com um resumão de tudo e uma
> página para cada informação? como o withings faz?"*
> *"se o paciente quiser um relatório, ele precisa estar integrado a algum plano
> da clinic"*
> *"mas vamos antes conectar tudo e ver esse layout/design"*

## O problema, levantado e não suposto

O app tem **quatro abas** — Início, Consultas, Exercícios, Menu — e **todas as
medições vivem dentro do Menu**, numa lista de 18 entradas.

A tela dos dados do relógio não está sequer nessa lista. Chega-se a ela por
**Menu → Aparelhos → "Ver os meus dados"**: três toques, enterrada dentro da
tela de *ligação*. O comentário no próprio código regista que ela **não tinha
porta nenhuma** até alguém acrescentar esse botão.

Para a coisa que o Bruno quer no centro do produto, é o lugar errado.

## O desenho

### A aba

Início · **Saúde** · Consultas · Exercícios · Menu — a Saúde em segundo, que é
onde a referência a põe.

### O resumo, que responde a uma pergunta só

**"O que mudou desde ontem."** Não é um painel de tudo; é a primeira tela de
alguém que acorda e abre o telemóvel.

- os anéis de hoje, contra **as metas da pessoa** — nunca contra uma faixa "normal";
- três a quatro destaques, com a variação dita em palavras;
- **o que está em falta**: aparelho desligado, sincronização atrasada, autorização
  expirada. Esta parte é tão importante quanto os números — hoje um relógio
  desligado é indistinguível de um dia parado.

### Cinco páginas, não doze

Uma por **família**, não por métrica. São ~12 medições; doze páginas é muita
superfície para construir, testar e manter honesta — e ninguém pensa *"os meus
minutos de REM"*, pensa *"o meu sono"*.

| página | o que leva |
|---|---|
| **Coração** | FC de repouso, o dia hora a hora, HRV, SpO₂, ECG |
| **Sono** | duração, fases, hipnograma, despertares, FC e respiração da noite |
| **Atividade** | passos, calorias, minutos ativos, treinos |
| **Pressão** | a braçadeira — a tela que já existe, movida para cá |
| **Corpo** | temperatura, VO₂ máx |

As telas antigas continuam a existir para quem chegar por link; deixam de ser o
caminho.

### As cinco páginas cobrem a gama inteira da Withings, não só o relógio

Pedido do Bruno: *"vamos prever tudo para todos os equipamentos da Withings"*.
A divisão por família aguenta isso sem página nova — é a segunda razão para ela
existir, além de ninguém pensar em "minutos de REM":

| aparelho | onde cai |
|---|---|
| **ScanWatch / ScanWatch 2 / Pulse** | Coração, Sono, Atividade, Corpo |
| **BPM Connect / Core / Vision** | **Pressão** — e o ECG do BPM Core cai em Coração |
| **Body / Body Scan / Body Comp** (balanças) | **Corpo** — peso, massa gorda/magra, água, osso, gordura visceral, metabolismo basal; e **velocidade de onda de pulso e idade vascular** caem em Coração |
| **Sleep / Sleep Analyzer** (tapete) | **Sono** — e traz o que o relógio não tem: **ronco, índice de apneia, movimento** |
| **Thermo** | **Corpo** — temperatura |
| **BeamO** | atravessa quatro: temperatura e SpO₂ em Corpo, FC e **ECG** em Coração, e o **estetoscópio** não tem casa ainda |

**Duas coisas que isto deixa à vista, e é melhor saber agora:**

1. **O estetoscópio do BeamO não cabe em nenhuma das cinco.** Se um dia entrar,
   é página nova — e provavelmente outra conversa, porque som de ausculta é
   outro patamar de dado clínico.
2. **A apneia do tapete é diagnóstico em potência.** O índice de apneia (AHI) é
   o tipo de número que uma tela mal escrita transforma em "você tem apneia".
   Se esse aparelho entrar, a frase precisa de ser escrita antes do gráfico.

**O que não muda:** a ingestão já pede **todos** os tipos de medida desde a
099 T-7 — não há lista a ampliar por aparelho novo. Um aparelho que a conta
ganhe passa a mandar, e o que chegar com um tipo que não sabemos nomear é
**contado no log** em vez de descartado. A página é que decide onde mostrar.

### O visual

Escuro, cartões de vidro, hierarquia tipográfica — a prévia que o Bruno aprovou.
**O que entra por `eas update` e o que exige build novo está separado de
propósito**, porque a diferença é entre ele ver hoje ou daqui a uma submissão:

| entra por update | exige build |
|---|---|
| fundo escuro, cartões, tipografia, espaçamento, hierarquia | **anéis** de progresso |
| barras arredondadas no lugar dos anéis | **linhas suaves** |
| tudo o que é `View` e `Text` | vidro desfocado de verdade (`expo-blur`) |

### Duas coisas medidas em 01/10, que mudam esta tabela

**O escuro já existe.** O tema tem `light` e `dark`, e o padrão é `system` — o
app segue o telemóvel. Não havia nada a construir aí; o que faltava era o
**tratamento** dentro do escuro, não o escuro.

**Os anéis não entram, e não é por causa da biblioteca.** Os da referência medem
progresso **contra metas**, e nós não temos metas guardadas. Inventar "8.000
passos" seria pôr um alvo que o paciente não escolheu — a mesma classe de coisa
que a faixa de referência que saiu na 099 T-2.

Então os anéis dependem de uma decisão que vem antes do desenho: **o paciente
define metas, ou a clínica define com ele?** Enquanto isso não existir, os
números de hoje aparecem grandes e sem barra a dizer se são pouco.

`react-native-svg` e `expo-blur` são módulos **nativos**: mudam o *fingerprint*,
e os updates param de chegar ao binário antigo até toda a gente trocar.

## O relatório, preso ao plano

Decisão do Bruno: o relatório exige plano da clínica.

**A trava vai no servidor**, não em esconder o botão. É lição que já está escrita
neste código, e um relatório clínico é exatamente o que alguém tenta buscar pelo
endereço direto. O mecanismo existe: `patientGate({ module })`.

E a tela **diz porque não pode**, com o caminho para resolver — um botão que
some ensina à pessoa que o produto está estragado.

## O que atravessa tudo, e já é regra

1. **Nenhuma faixa de referência.** Nem cor, nem palavra. Saiu na 099 T-2 e não
   volta por um gráfico novo.
2. **Buraco é buraco**, e *"ainda não aconteceu"* é uma terceira coisa.
3. **A fonte é dita** — "segundo o seu ScanWatch".
4. **Nada de pontuação nossa.** As da Withings são delas e são pagas; as nossas
   seriam afirmação clínica.
5. **EN e PT**, inglês primeiro.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | A aba, e o que deixa de estar no Menu | — | **feito** (01/10) |
| T-2 | O resumo: o que mudou desde ontem | T-1 | **feito** (01/10) |
| T-3 | As cinco páginas de família | T-1 | **feito** (01/10) — uma tela parametrizada, não cinco |
| T-4 | O visual: o que cabe num update | T-2, T-3 | **parcial** (01/10) — cabeçalho e tipografia; os anéis exigem metas que não existem |
| T-5 | O relatório preso ao plano, com a trava no servidor | T-1 | pendente |
| T-6 | Os anéis e as linhas — **só com build autorizado** | T-4 | pendente |

**Ordem pedida pelo Bruno:** *"vamos antes conectar tudo e ver esse
layout/design"* — ou seja, T-1 a T-4 primeiro; a T-5 e a T-6 depois.

## Suposições — preciso da sua validação

1. **A Saúde entra como quinta aba**, e nenhuma sai. Cinco abas cabem; se
   preferir trocar alguma, é decisão sua.
2. **As telas antigas ficam.** Não apago `blood-pressure.tsx` nem
   `wearable-data.tsx` — mudo quem aponta para elas. Apagar quebraria links que
   já foram enviados a pacientes.
3. **O resumo não envia nada.** Um valor fora do esperado **não** dispara
   mensagem; continua a valer a regra de nunca enviar automaticamente.
4. **"Plano" é o que `patientGate` já entende.** Se a regra do relatório for
   outra — um plano específico, e não qualquer um — diga qual.
