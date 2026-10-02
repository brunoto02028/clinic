# QA Report — T-9: O ECG em papel, para o paciente levar a um médico

**Data:** 02/10/2026
**Rodada 1:** ❌ reprovado — 28 aprovados, 4 reprovados, 1 não executado
**Rodada 2 (após correções):** ✅ aprovado — todos os reprovados fechados, 1 continua não executado

> A rodada 1 foi corrida pelo agente **qa-tester**, que mediu o PDF **por dentro**
> — lendo as coordenadas do content stream do jsPDF e convertendo pt→mm — em vez
> de aceitar os testes unitários. É por isso que ela encontrou coisas que 3.400
> testes verdes não encontravam.

---

## O que estava em causa

Um ECG impresso é um **instrumento de medida**: quem o recebe põe uma régua em
cima e conta quadradinhos. A família de defeito desta tarefa é uma só —
**parece um ECG e mede errado em silêncio** —, e é pior do que não imprimir,
porque a folha passa por facto na mão de quem decide.

## Resumo das duas rodadas

| # | Cenário | R1 | R2 | O que mudou |
|---|---|---|---|---|
| **A. O papel, e se mede certo** | | | | |
| A1 | PDF sai e é PDF (A4 deitada, 297×210 mm) | ✅ | ✅ | |
| A2 | **Um segundo ocupa 25 mm** | ✅ | ✅ | |
| A3 | **1000 µV sobem 10 mm** | ✅ | ✅ | |
| A4 | **Três faixas para 30 s** | ✅ | ✅ | |
| A5 | **Grelha de 1 mm e de 5 mm** | ✅ | ✅ | |
| A6 | Rodapé com a escala e a frequência | ✅ | ✅ | |
| A7 | **O traçado não sai invertido** | ✅ | ✅ | |
| A8 | Gravação curta (7 s) dá uma faixa só | ✅ | ✅ | |
| A9 | Amplitude acima da faixa (2,5 mV) é dita no papel | ✅ | ✅ | corrigido durante a R1 |
| A10 | **Sinal constante → linha reta sem ressalva** | ❌ | ✅ | `AMPLITUDE_MINIMA_UV` |
| **B. O que o papel recusa dizer** | | | | |
| B1 | "diagnóstico" só negada — 3 desfechos × 2 línguas | ✅ | ✅ | |
| B2 | Nenhuma sugestão de conduta | ✅ | ✅ | |
| B3 | Conclusão sempre atribuída ao relógio | ✅ | ✅ | |
| B4 | Nenhum número derivado por nós do sinal | ✅ | ✅ | |
| B5 | EN e PT | ⚠️ | ✅ | escala e corte agora traduzidos |
| **C. Sem traçado** | | | | |
| C1 | `signal` nulo → sai, e diz que não foi obtido | ✅ | ✅ | |
| C2 | Sem `samplingHz` → idem | ✅ | ✅ | |
| C3 | Sinal só com lixo → idem | ✅ | ✅ | corrigido durante a R1 |
| C4 | **Nunca uma linha reta** | ❌ | ✅ | ver A10 |
| **D. As duas portas** | | | | |
| D1–D10 | sessão, token, cruzamento, expiração, cabeçalhos | ✅ | ✅ | agora **com testes** |
| **F. Gates** | | | | |
| F1 | `npx jest` | ❌ 10 falhas | ✅ 3.484 | |
| F2 | `npx tsc --noEmit` (raiz) | ❌ 12 erros | ✅ | |
| F3 | `npx tsc --noEmit` (mobile/) | ✅ | ✅ | |
| F4 | `next build` | ✅ | ✅ | |
| **G. Produção** | | | | |
| G1–G4 | os dois ECG, com `signalId` e traçado; 404 no de outro | ✅ | ✅ | |
| **H. Tela do app** | | | | |
| H1 | Botão "Abrir em PDF" | ⚠️ | ⚠️ | React Native — só num aparelho |

## Os quatro reprovados, e o que cada um era

### A10 / C4 — sinal constante desenhava linha reta ❌ → ✅

**O achado mais grave, e o mais silencioso.** Reproduzia nas três versões da
árvore que a R1 mediu.

```
tudo-zeros    tracado=objeto  faixas=3  colunas(f0)=1000  pdf=368682B
=== medido dentro do PDF ===
  segmentos: 2997   y distintos (mm): [55, 99, 143]
    faixa 1: 999 segs, y 55..55    faixa 2: y 99..99    faixa 3: y 143..143
=== o papel diz alguma coisa? ===
  "not been retrieved": 0     avisos (clip|flat|zero|constant): 0
```

Três faixas de papel milimetrado com uma linha **perfeitamente reta**, debaixo de
*"Sinus rhythm"*, com `25mm/s, 10mm/mV` declarado e nenhuma ressalva. Em papel de
ECG isso lê-se como **assistolia**.

E é alcançável: a ingestão só descarta o que **não é número**, e `0` é número —
passa o filtro, passa o `amostras.length > 0`, e é guardado como traçado
legítimo.

**Correção:** `AMPLITUDE_MINIMA_UV = 50` em `lib/ecg-tracado.ts`. Abaixo de 50 µV
de ponta a ponta — **0,5 mm**, metade da menor divisão da grelha — não há
traçado: devolve `null`, e a folha diz *"o traçado não foi obtido"*, que é verdade
e já era o comportamento de quando ele falta.

A amplitude é medida **de ponta a ponta**, não contra o zero: um sinal a oscilar
entre 2000 e 2010 µV tem picos grandes e movimento nenhum, e um `Math.abs`
deixava-o passar. Há teste para esse caso.

`screenshots/t-9-pdf-sinal-tudo-zeros-linha-reta.png`

### F1 / F2 — suíte e typecheck vermelhos ❌ → ✅

A refatoração do traçado renomeou `Faixa.pontos` → `Faixa.colunas` (envelope
mín/máx em vez de média) e **os testes ficaram para trás**: 10 testes em 3 suítes,
12 erros de `tsc`, todos a mesma causa.

Não eram falhas de lógica do papel — mas os oito que falhavam eram os que guardam
a escala, a não-inversão e o traçado dentro da faixa. **As invariantes ficaram sem
rede exactamente enquanto o papel estava a ser mexido.**

Reescritos, e os dois que mediam coisas que deixaram de ser verdade foram
reescritos para o que é verdade agora:

- `as-series-do-dia-e-da-noite`: *"descarta valores que não são número"* →
  **"o que não é número vira buraco, e não desaparece"**;
- `o-pdf-do-ecg-nao-diagnostica`: *"avisa que cada ponto é uma média"* →
  **"diz que cada coluna é o mínimo e o máximo"** — a frase antiga passou a ser
  falsa, e um teste que a exigia estaria a exigir a mentira.

### B5 / #3 — rodapé técnico só em inglês ⚠️ → ✅

No PDF em português, a linha da escala saía inteira em inglês — **a linha que diz
a quem recebe o papel que pode medi-lo com uma régua**. `frasePadraoDaEscala()`
não recebia idioma, e a rota nunca passava nenhum: a metade portuguesa do
`ecg-pdf.ts` existia e era código morto.

Agora: `frasePadraoDaEscala(hz, idioma)`, a frase do corte no dicionário `T`, e a
rota a passar `user.reportLanguage` e `clinic.timezone` — o mesmo campo que os
relatórios usam, porque um paciente não tem uma língua para o relatório e outra
para o ECG.

### #4 — `Date of birth: 15/01/1980,` ⚠️ → ✅

Vírgula a mais, nos dois idiomas: `toLocaleString` dá `"15/01/1980, 00:00:00"` e
o `split(" ")[0]` cortava no espaço deixando a vírgula. Passou a `comoDia()`, com
`toLocaleDateString`.

### #5 — estado da fonte do jsPDF vazava ⚠️ → ✅

O estilo é estado do **documento**, não da chamada. No papel de uma fibrilhação o
`bold` nunca era reposto e a escala e o rodapé saíam a negrito; no sem-traçado o
`italic` vazava igual. Num papel de ECG, dar o mesmo peso gráfico ao achado e à
letra miudinha desfaz a diferença entre os dois.

### #7 — `temTracado` chegava tarde para o que prometia ⚠️ → ✅

O comentário da rota do link dizia que a tela usa isto para *"avisar antes do
toque"*, mas o campo só vinha na resposta do link — **pedida no toque**. O
comentário estava à frente do código.

Agora `/api/wearables/data` manda `temTracado` com a lista, e a tela escreve
*"traçado não obtido"* ao lado da hora. Só quando a resposta é `false` explícito:
`undefined` é uma app anterior a este campo, e "não sei" não se mostra como "não
tem".

### #6 — `base` do URL divergia dos irmãos 🔎 → ✅

Sem consequência medida (em produção é `https://bpr.clinic`, e a barra dupla dá
308 com a query intacta), mas três rotas que emitem a mesma espécie de link não
deviam ter três respostas diferentes para a mesma variável em falta.

## Achados do code review, fechados na mesma rodada

Quatro da mesma família — *parece um ECG e mede errado sem dizer nada*:

| | O defeito | A medida |
|---|---|---|
| D1 | amostras inválidas eram **apagadas** | 299 buracos em 9.000 encurtavam 30 s para **29,003 s**, com o papel a declarar 300 Hz |
| D2 | cada coluna era a **média** de 3 amostras | espiga de 1,5 mV saía a **0,5 mV** — um terço |
| D3 | o que não cabia era desenhado **fora da faixa** | 2,5 mV em 36 mm saía **7 mm acima** do topo, por cima do cabeçalho |
| D4 | sem quebra de página | com 6 faixas o rodapé caía em **y=303 mm** numa folha de 210 — e **o teste passava**, porque lia bytes |

E mais quatro, de robustez:

- **D13**: `samplingHz: Int?` + frequência fraccionada = Prisma recusa a escrita
  inteira → o traçado **nunca** era guardado e era pedido outra vez em **todas**
  as sincronizações seguintes, para sempre. Agora `inteiroOuNulo()`: perder meio
  hertz desloca o papel em menos de 0,2% e o papel declara a frequência que usou;
  perder o traçado não tem conserto.
- **D6**: `withingsEcg` engolia **qualquer** erro e devolvia lista vazia — um 429,
  um token expirado ou uma avaria deles chegavam à tela como *"ainda sem
  registos"*. E a ausência verdadeira nem vem por erro: vem `status: 0` com
  `series` vazia. Agora propaga, e o log diz o que foi.
- **Rajada de limite**: até 150 chamadas numa passagem contra um limite de
  **120/min por `client_id`** — nosso, partilhado por todos os pacientes a
  sincronizar. Tecto de 20 traçados por passagem; o resto vem na seguinte.
- **D8**: `select: { signal: true }` trazia ~40 KB do banco só para comparar com
  `null`, em três sítios. `lib/ecg-tem-sinal.ts` responde com SQL parametrizado.
- **D9**: o filtro do nome do ficheiro deixava passar `"` e `;` — os dois
  caracteres que delimitam o valor e separam os parâmetros do
  `Content-Disposition`. O nome vem do perfil, que a pessoa escreve.

## As portas, medidas

Fixture de dois pacientes na mesma clínica + um terceiro com sessão viva, banco
**local** (o script aborta se `DATABASE_URL` não for localhost), servidor na
:4100 confirmado pelo PID como sendo deste worktree.

```
[1. token do próprio, com traçado]        200 application/pdf  368706 bytes
[2. token do próprio, SEM traçado]        200 application/pdf    4033 bytes
[3. token de OUTRA PESSOA na gravação A]  404 {"error":"not_found"}
[4. token de A reutilizado na gravação B] 404 {"error":"not_found"}
[5. token de A colado noutra gravação]    401 {"error":"Unauthorized"}
[6. token EXPIRADO]                       401 {"error":"Unauthorized"}
[7. sem nada]                             401 {"code":"session_expired"}
[8. token adulterado]                     401 {"error":"Unauthorized"}
[9. gravação inexistente]                 404 {"error":"not_found"}
[10. rota do link sem sessão]             401 {"code":"session_expired"}
```

E a expiração provada com o **mesmo token**, só o relógio a mudar: 200 em t+0s,
401 em t+7s com um TTL de 6 s.

**O que a R1 não tinha: testes.** Estava tudo medido à mão, e à mão não fica
medido amanhã. `__tests__/wearables/a-porta-do-ecg-em-pdf.test.ts` guarda agora as
sete propriedades, e as sete mutações correspondentes matam um teste com nome.

## Prova por mutação

Nenhum destes testes passa por acidente. Cada mutação foi aplicada ao código real
e o teste que morreu está nomeado.

**A geometria** (`lib/ecg-tracado.ts`) — 9 mutações:

| Mutação | Teste que morreu |
|---|---|
| a média de volta | *uma espiga de 1,5 mV chega ao papel com 15 mm, não com 5* |
| sem o clamp | *e fica preso dentro da faixa* |
| nunca diz que cortou | *diz que cortou — em vez de desenhar por cima da faixa de cima* |
| o buraco é apagado | *um buraco não vira zero — e não encolhe o tempo* |
| uma coluna só passa por traçado | *uma coluna desenhável no meio de buracos não é um traçado* |
| o pico não é medido | *o pico medido é registado, em mV* |
| sem a guarda da reta | *tudo a zeros não é traçado* (e 3 mais) |
| amplitude contra o zero (`abs`) | *a amplitude é de ponta a ponta, não distância ao zero* |
| o `x` do desenho em vez do tempo | **sobreviveu — mutante equivalente**: `(i - de)` e `colunas.length × amostrasPorPonto` são o mesmo valor em todas as iterações, porque toda iteração empurra exactamente uma coluna, buraco incluído. Não é lacuna de teste. |

**A porta** (`lib/file-access-token.ts` e as duas rotas) — 7 mutações, **7 mortas,
nenhuma sobreviveu**.

## O que fica aberto

| | |
|---|---|
| **H1 — o botão na tela** | React Native, sem navegador onde correr. Fica para o aparelho do Bruno depois do `eas update`: o botão por gravação, o bloqueio do duplo toque, a frase de erro, e a linha *"traçado não obtido"*. O caminho do servidor que ele consome está testado. |
| ~~**D7 — o `with_filtered` é honrado?**~~ | **Medido em produção, 02/10 09:41Z — fechado. Não é.** Ver abaixo. |

## D7, medido: o `with_filtered` não faz nada

Pedido contra a gravação `763283988` do Bruno, as duas versões do **mesmo** sinal
com onze segundos entre elas:

| | com filtro | sem filtro |
|---|---|---|
| amostras | 9.000 | 9.000 |
| buracos | 0 | 0 |
| frequência | 300 Hz | 300 Hz |
| posição | 1 (pulso esquerdo) | 1 |
| min / max | −277 / 690 µV | −277 / 690 µV |
| aspereza (RMS entre vizinhas) | 24,555750593490114 | 24,555750593490114 |

Idênticas até à última casa decimal — não são parecidas, são **a mesma
resposta**. As chaves do corpo também: `signal`, `sampling_frequency`,
`wearposition`, `model`, `heart_rate`.

**O que isto fecha, e o que não.** Fecha a pergunta "o parâmetro faz alguma
coisa": não faz. **Não** diz qual das versões recebemos — pode ser que só exista
uma. Do sinal que chega sabemos que tem ~967 µV de ponta a ponta, amplitude
plausível de pulso, e aspereza baixa entre amostras vizinhas.

O comentário do `sinalDoEcg` passou a dizer isto em vez da inferência que lá
estava (*"é improvável que seja o sinal cru"*). A medição repete-se com
`/api/cron/wearables-probe?sinal=<signalid>`.

**De brinde, outra inferência fechada:** o campo é `signal` no topo do corpo — a
versão anterior aceitava `signal`, `ecg.signal` e `series.signal` porque *"esta é
a primeira chamada real"*. Agora é a segunda, e sabe-se qual é.

## Nota sobre ficheiros

`scripts/qa/t9-gerar-pdfs.ts`, `t9-ecg-fixtures.cjs`, `t9-bordas.ts`, `t9-corte.ts`
e `t9-perdas.ts` foram criados pelo QA. São instrumentos de medida, e ficam.
