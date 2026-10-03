# QA — o fluxo do BeamO, medido contra o código (03/10/2026)

**Alvo:** `o-fluxo-do-beamo.md` · **Ambiente:** local, porta 4000 confirmada como
sendo deste checkout, `NEXT_DIST_DIR=.next-qa122`, banco `bpr_clinic_local`,
paciente de teste `qa114.ana@example.test`. **Nenhuma conta real usada.**
Screenshots em `qa/screenshots/`.

**Resultado:** o documento não correspondia ao código em quatro pontos, e havia
**um crítico de código** que o documento não podia saber.

## Veredicto

| # | O que o documento diz | Veredicto |
|---|---|---|
| 1 | Passo 0: com a ligação parada, a ficha mostra o aviso com o link | metade — o aviso aparecia; **o destino do link negava que houvesse aparelho** |
| 2 | A janela abre, conta 3 min, expira; "Já medi"; a 2.ª é recusada | os quatro confirmados na tela |
| 3 | Com janela: pressão→paciente, ECG→paciente, temp/SpO₂→lado nenhum | as três verdadeiras **no código**, duas com meia-verdade por cima |
| 4 | (não estava no documento) o que o paciente vê no app | **o app diz que foi o relógio**, sempre |
| 5 | Ausências silenciosas novas | **quatro** |

## Achados, e o que foi feito

| # | Gravidade | O que é | Estado |
|---|---|---|---|
| **A-1** | **crítico** | o `select` da sessão não pedia `patientId`; o Prisma ignora um `where` `undefined`, logo a contagem de ECG do "Já medi" **perdia o filtro e varria a tabela inteira**, incluindo outras clínicas | **corrigido** + teste que mata a mutação exacta |
| **A-2** | alto | token morto com `status: CONNECTED` era indistinguível de um aparelho são — e era **o único estado possível antes de 03/10** | **corrigido**: a pergunta passa a ser feita à mensagem de erro, não ao `status` |
| A-3 | médio-alto | a caixa de entrada descartava o `deviceParado` que a rota entrega e dizia *"No clinic device connected yet"* — **era o destino do link do passo 0** | **corrigido** |
| A-4 | médio | uma janela abandonada continua a reclamar medições, e não havia como a desdizer | **corrigido**: `EXPIRED` passa a cancelar-se, e a tela oferece **"Não medi"** |
| A-5 | médio | **reconectar não apagava o `needsReauthAt`** — o aviso sobrevivia à solução | **corrigido** |
| A-6 | médio | o app diz *"o relógio"* sobre um ECG medido na clínica | **por corrigir** — está no fluxo e precisa de rota + strings + `eas update` |
| A-7 | médio-baixo | o botão "Corrigir" do paciente devolvia 404 numa ligação em `ERROR` — que é exactamente quando ele aparece | **corrigido** |
| A-8 | baixo-médio | nada diz se a subscrição de ECG do aparelho da clínica existe | **aceite** — sem perda (a rede de 15 min alcança-o); a promessa de "segundos" não é verificável numa tela |
| A-9 | baixo | *"The trace is not stored"* — e é guardado | **corrigido** |
| A-10 | informativo | `janelaDaMedicao` era código morto com a lista de estados **errada** | **removida** |
| A-11 | informativo | o `select` que o t-2 dizia ter posto não estava lá | **posto** |
| A-12 | informativo | `clinicDevice()` sorteava entre vários aparelhos de clínica | **corrigido**: vence o que entregou mais recentemente |

## O A-1, com o detalhe que interessa

```
session (pelo select real da rota) = {"id":"...","clinicId":"...","status":"CANCELLED",...}
session.patientId                  = undefined
count SEM filtro de userId                = 2
count com userId: session.patientId       = 2   <-- o que a rota contava
count com um userId inexistente           = 0   <-- o que devia contar
```

E atravessava inquilinos: o dono do ECG contado estava **noutra clínica**.

É a mesma correcção (G5) que o review de há duas horas deu por boa — e ficou
pior do que o original: o original contava a passagem, este contava a base. O
que o deixou passar foram as duas coisas de sempre: `(prisma as any)` apaga o
tipo, e os testes que guardavam a rota **liam-na como texto** sem nunca a
executar.

O teste novo tem um mock que **aplica o `select`** — devolve só os campos
pedidos, como o banco faz. Com `patientId` fora da lista, os quatro testes ficam
vermelhos.

## O que não foi medido

- **Produção** — em particular o estado real da ligação da clínica e o
  `role`/`clinicId` do dono da ligação pessoal. Os dois estão no fluxo como
  verificação de um minuto antes de medir.
- **O app a correr** — o item 4 é inteiramente leitura de código.
- **O BeamO.** O cenário 2.11 continua por executar, e só o aparelho o resolve.
