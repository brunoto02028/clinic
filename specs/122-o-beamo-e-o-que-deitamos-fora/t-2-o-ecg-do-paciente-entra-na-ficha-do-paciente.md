# T-2: O ECG do paciente entra na ficha do paciente

**Status:** concluído (03/10/2026) — QA e review feitos
**Depende de:** T-1

## Objetivo

A outra metade da T-1. Ela ensinou a ligação pessoal a **não** ficar com o que
foi medido noutra pessoa; esta ensina a ligação da clínica a **ficar** com isso
e a escrevê-lo no prontuário certo.

Sem ela, o ECG desviado pela T-1 não era guardado por ninguém. *Em sítio
nenhum* é melhor do que *na pessoa errada*, mas continua a ser a ausência
silenciosa que as atividades 120 e 121 inteiras combateram.

## A régua é uma só, lida pelos dois lados

```ts
aJanelaDecide(ctx)          // não é de pulso E há pelo menos uma janela a cobrir
ehDeQuemFoiMedido(ctx)      // a pessoal cala-se: !ehDaClinica && partilhada && aJanelaDecide
entraPelaAtribuicao(ctx)    // a clínica fica:     ehDaClinica && aJanelaDecide && janelasQueCobrem === 1
```

A propriedade provada, e com teste próprio: **o que a clínica atribui, a pessoal
desviou** — `entraPelaAtribuicao ⇒ ehDeQuemFoiMedido`. Nunca escrito duas vezes.

A diferença entre os dois lados é **uma só e conhecida**: duas janelas a cobrir a
mesma medição. A da clínica recusa-se a escolher e a pessoal continua calada; a
gravação fica por atribuir, contada em `ecgNaoAtribuidos` e dita no log.

O campo é `janelasQueCobrem: number` e não um `boolean` por causa exactamente
desse caso: com um `boolean`, a ligação pessoal lia "não há janela" e **escrevia
no dono** — a única situação em que uma medição que seguramente não é dele lhe
caía na ficha.

## O que muda

1. **`wanted` da clínica: `["bp"]` → `["bp", "ecg"]`.**
2. **`"ecg"` passa a ser um tipo próprio**, e não parte de `"vitals"`. São duas
   formas de dado diferentes: o ECG é um **evento** com instante e dono; os
   vitais do dia são um **total** de quem traz o aparelho no corpo — numa
   ligação de clínica, seriam do funcionário.
3. **Cada gravação tem dono**, resolvido por `pickSession` sobre a lista de
   janelas da **conta**, carregada uma vez por passagem: uma janela → o paciente
   dela; nenhuma ou duas → nada é escrito. As quatro escritas do ECG (o `upsert`,
   a pergunta *já tenho o traçado?* e as duas escritas do traçado) passaram a
   apontar ao dono da **gravação**, não ao dono da **ligação**.
4. **A atribuição deixa rasto** — `logAudit` com `CLINIC_MEASUREMENT_ASSIGN` em
   `EcgRecording`, como a pressão já deixa. Um ECG no prontuário de alguém tem
   de poder dizer por que caminho chegou.
5. **A janela não é fechada pelo ECG** — o `readingId` dela é chave estrangeira
   para uma leitura de pressão. E, ao contrário, **uma janela já fechada pela
   pressão continua a receber o ECG**: `ESTADOS_QUE_RECEBEM_EVENTO` inclui
   `COMPLETED`. Sem isso, no uso normal do BeamO (os dois medidos nos mesmos três
   minutos, a pressão processada primeiro) o ECG do paciente era deitado fora —
   o crítico G1 do review.
6. **O botão "Já medi" puxa o ECG também** e diz o que trouxe. Sem isso a tela
   dizia *"nada veio do aparelho"* a um terapeuta que tinha acabado de gravar um
   ECG — a mesma ausência silenciosa, agora na cara dele.

## O que fica de fora, e porquê

**Temperatura e SpO₂ medidos num paciente.** A chave do `WearableDataPoint` é
`(utilizador, dia, tipo, provedor)` — a chave de um **total do dia**. Escrever
ali uma medição pontual da clínica apagaria, em silêncio, a média do dia que o
aparelho do próprio paciente tinha guardado. Precisam de uma tabela com forma de
evento: **T-3**.

**O ECG sem janela numa conta dedicada à clínica.** Fora de janela
`entraPelaAtribuicao` devolve `false`, e numa conta sem ligação pessoal isso
quer dizer que ninguém o guarda. Fica na Withings, e os trinta dias da janela de
leitura são o prazo em que uma caixa de entrada (**T-4**) ainda o pode ir
buscar. A alternativa era escrevê-lo no prontuário de quem autorizou a conta — a
medição de um paciente na ficha do funcionário — e essa não é alternativa. Até
lá, a contagem vai ao log, separada por motivo.

## Arquivos afetados

- `lib/withings-routing.ts` — `aJanelaDecide`, `entraPelaAtribuicao`
- `lib/clinic-session-match.ts` — `ESTADOS_QUE_RECEBEM_EVENTO`, `sessionCovers`/`pickSession` com estados
- `lib/clinic-device.ts` — `select` explícito em `matchingSessions`
- `lib/withings-ingest.ts` — `"ecg"` como tipo, `donoDaGravacao`, `donoId`, auditoria
- `app/api/admin/measurement-sessions/[id]/fetch/route.ts` — `kinds`, `ecg` na resposta
- `components/admin/clinic-measurement-button.tsx` — a quarta frase
- `__tests__/wearables/o-ecg-do-paciente-entra-na-ficha-do-paciente.test.ts`

## Critérios de aceite

- [x] Dentro da janela, o `ecgRecording.upsert` escreve no `userId` do paciente
- [x] Sem janela, nada é escrito, e o log conta
- [x] Duas janelas no mesmo instante → nada é escrito (ambiguidade não vira palpite)
- [x] Aparelho de pulso dentro de janela → nada é escrito (é do dono)
- [x] Ligação pessoal comum → inalterada
- [x] Auditoria com quem abriu a janela, o paciente e a sessão
- [x] Janela `COMPLETED` ainda recebe o ECG; `CANCELLED` não
- [x] Janelas por ler → nada escrito dos dois lados, e aparece em `falhas`
- [x] Dez mutações, dez testes mortos (`qa/mutacoes-t-2.md`)
- [x] QA aprovado (`qa/report-t-1-e-t-2.md`)
- [x] Code review feito (`qa/review-t-1-e-t-2.md`) — 10 achados, 2 críticos, todos dispostos
