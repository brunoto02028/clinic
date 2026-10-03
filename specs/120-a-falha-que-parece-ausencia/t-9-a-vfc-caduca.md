# T-9: A VFC caduca com o Withings+ e ninguém avisa

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que o dia em que o plano da Withings expirar não se leia como *"o paciente
deixou de usar o relógio"*.

## Contexto

`rmssd_start_avg` e `rmssd_end_avg` são **escopo Total (Withings+)**
(`docs/withings-api-2026-10-02.md`, l. 453-454). O teste do plano acaba por volta
de **16/10/2026** (ver [[withings-plus-teste-ate-16-10-2026]]).

Quando caducar, a API deixa de mandar os dois campos e `hrv` volta a `null` para
todos. Na tela e no papel isso é **indistinguível** de uma noite sem relógio no
pulso — e foi exactamente o estado em que a VFC esteve durante semanas, enquanto
pedíamos o campo errado, sem ninguém dar conta.

O mesmo vale para o hipnograma e o traçado do ECG, que vieram com o teste ligado.

## Passos

1. A ingestão distingue *"o campo não veio"* de *"a API recusou o escopo"*: a
   resposta do `getsummary` traz os campos pedidos que não pôde servir, e é isso
   que se lê — não a ausência de valor.
2. O estado vive na **ligação**, não no dia: o plano é da conta. Uma coluna em
   `WearableConnection` com o que o escopo não cobre.
3. A tela do paciente e o papel escrevem, no lugar da métrica, *"esta medição
   depende de um plano da Withings que não está activo"* — não um gráfico vazio.
4. O painel da clínica mostra o mesmo (ver [[o-que-esta-no-app-esta-na-clinic]]).
5. **Remedir depois de 16/10** e registar o que caiu: é a única forma de saber o
   que era do plano e o que era nosso.

## Arquivos afetados

- `prisma/schema.prisma` (`WearableConnection`)
- `lib/withings.ts`, `lib/withings-ingest.ts`
- `lib/patient-report.ts`, a aba Saúde do app, o painel da clínica
- `__tests__/wearables/sem-plano-nao-e-sem-medicao.test.ts` (novo)

## Critérios de aceite

- [ ] Uma resposta sem os campos do escopo marca a ligação, não o dia
- [ ] A tela diz *"depende de um plano"* em vez de desenhar vazio
- [ ] O papel diz o mesmo, nas duas línguas
- [ ] Uma noite sem relógio continua a ser um buraco, e lê-se diferente
- [ ] Depois de 16/10: medir outra vez e escrever o resultado no QA desta tarefa
