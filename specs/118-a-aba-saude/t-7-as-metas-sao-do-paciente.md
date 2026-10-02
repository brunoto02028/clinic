# T-7: As metas são do paciente

**Status:** **concluída** (02/10/2026) — QA em `qa/report-t-7.md` (0 reprovados,
2 ressalvas), code review feito, 9 achados fechados, 27 mutações mortas.

**Duas ressalvas ficam abertas, e são decisão do Bruno:** o painel da clínica não
tem português (é assim desde a 099, nas 289 linhas todas — bilingue seria outra
atividade); e cinco critérios estão provados uma camada abaixo da tela, que só
fecha com binário — a T-6, que precisa de `eas build` autorizado.
**Depende de:** T-2
**Aberta:** 01/10/2026 — *"o paciente define as metas"* (Bruno)

## Porque existe, e porque veio antes dos anéis

A T-4 ficou **parcial** por uma razão concreta, registada na altura: *"os anéis
exigem metas que não existem"*. Um anel de progresso mede contra um alvo. Sem
metas guardadas, desenhar um exigiria inventar um — "8.000 passos" — e isso é
pôr na tela de alguém uma régua que ele não escolheu, e depois mostrar-lhe o
quanto lhe falta para a atingir.

É a mesma classe de coisa que a faixa de referência que saiu da tela na 099 T-2,
e é o primeiro dos cinco limites deste plano: *"os anéis de hoje, contra **as
metas da pessoa** — nunca contra uma faixa 'normal'"*.

A decisão do Bruno fecha a questão de quem escolhe: **o paciente**. Esta tarefa
é essa frase transformada em tabela, rota e tela.

## Objetivo

O paciente define, muda e **apaga** as suas metas diárias no app. O resumo da
aba Saúde desenha progresso **só** onde existe meta. O painel da clínica mostra
as metas que o paciente escolheu, porque *"o que aparece no app precisa aparecer
na clinic"*.

## As quatro decisões

1. **Nada vem preenchido, e nada é sugerido.** Um valor por omissão seria a
   régua emprestada outra vez. Campo vazio = sem meta = o número aparece sozinho,
   sem barra.

2. **`null` é um valor, não um campo em falta.** É *apagar a meta*. Uma meta que
   não se consegue remover deixa de ser escolha na primeira vez que a pessoa
   muda de ideias.

3. **Só há meta para o que se faz, não para o que o corpo é.** Passos, minutos
   ativos, calorias ativas e sono — coisas que alguém decide fazer. **Não** há
   meta de frequência cardíaca, de HRV nem de oxigenação: seria deixar o paciente
   definir uma régua sobre o próprio coração, o oposto do que a decisão pretendia.
   Um alvo de FC é alvo clínico.

4. **Passar da meta não é achatado em 100%.** Quem andou o dobro andou o dobro;
   cortar em 1 apaga a única parte boa do dia.

## Os limites, e o que eles são

| campo | mín | máx | unidade guardada |
|---|---|---|---|
| `steps` | 500 | 100 000 | passos |
| `activeMinutes` | 5 | 1 440 | minutos |
| `activeCalories` | 50 | 10 000 | kcal |
| `sleepMinutes` | 120 | 960 | **minutos** (escritos em horas na tela) |

**Não são recomendações** — nenhum destes números diz a ninguém o que deve
fazer. São o que torna o valor utilizável *como meta*: 400 passos não mede nada
e um milhão desenha uma barra que nunca sai do chão. Os dois tornam a tela
inútil, que é diferente de errada.

O sono é guardado em minutos porque **a medição é em minutos**. Guardar a meta
em horas daria um progresso de 7,5 em vez de 1 — a barra a dizer que a pessoa
dormiu sete vezes a meta.

## Passos

1. `PatientGoals` no schema, **todos os campos opcionais** — a ausência é o
   estado inicial legítimo, não um defeito de preenchimento.
2. `app/api/patient/goals/route.ts` — GET e PUT, atrás do `patientGate`.
   - sem registo → `200` com tudo `null`, **não 404**: é alguém que ainda não
     escolheu, e a tela trata os dois casos iguais;
   - fora do intervalo → `400` **nomeando o campo e o intervalo**. "Dados
     inválidos" obriga a pessoa a adivinhar qual dos quatro, e a tela não tem
     como lhe dizer;
   - uma recusa **não guarda as outras pela metade**.
3. `mobile/app/(app)/(clinica)/metas.tsx` — nada preenchido, campo vazio apaga,
   sono escrito em horas.
4. `progresso()` e `metaDoDestaque()` em `resumo-de-saude.ts` — ausência devolve
   `null`, e `null` não desenha barra.
5. **A contrapartida na clínica**: `monitoring/route.ts` devolve as metas e a aba
   do paciente mostra-as, em leitura. O terapeuta vê o alvo que o paciente
   escolheu — sem o poder mudar, porque a decisão é do paciente.

## O que o review de 02/10/2026 apanhou

Nove achados, todos fechados. Os quatro que mudaram o produto:

1. **A clínica conseguia escrever a meta do paciente.** A impersonação da web
   chega à rota com `role: "PATIENT"` e o `userId` **do paciente** — a conta do
   admin a escrever na linha dele, e o painel depois a rotular aquilo como
   *"Goals the patient set"*. O rótulo passaria a mentir sobre quem escolheu.
   Fechado com o `patientOnlyWriteRefusal`, o mesmo guarda que a foto de perfil
   usa desde o QA de 24/09. **Confirmado ao vivo**: o GET devolve as metas do
   paciente (a cadeia era real), o PUT dá `403`, e as metas ficam como estavam.

2. **O teste dos limites não podia cair.** Era uma terceira cópia dos oito
   números escrita à mão dentro do teste: coincidia com a rota e por isso
   parecia uma guarda, mas nada a ligava ao servidor. A tabela foi para
   `lib/metas-do-paciente.ts` — um ficheiro próprio, porque **um `route.ts` não
   pode exportar mais nada** além dos handlers — e o teste importa os dois
   lados. Apertar um mínimo na rota faz cair um teste nomeado.

3. **A barra afirmava a meta de hoje com o valor de sábado.** O resumo mostra o
   último valor medido; um relógio calado há três dias dava 14.200 passos a uma
   terça parada, com a barra cheia debaixo de *"Boa tarde · terça"*. O destaque
   passou a carregar o dia, e a barra só se desenha se for hoje — **pelo dia
   local**, não por `toISOString()`.

4. **Duas das quatro metas não faziam nada.** O resumo não tem destaque para
   minutos ativos nem calorias: eram duas caixas que se guardavam sem que nada
   mudasse em tela nenhuma. Agora a meta resolve-se **por campo** e a página da
   família Atividade desenha-a.

E os outros cinco: `null`/`5`/`"abc"` no corpo davam `500`; a recusa chegava ao
app como código de máquina (`out_of_range`) e sem português; passar da meta
enchia a barra sem dizer que passou; o `(prisma as any)` do painel escondia os
tipos; e "não pude ler as metas" dava a mesma frase que "o paciente não definiu
nenhuma".

## Arquivos afetados

- `prisma/schema.prisma` — `PatientGoals`, relação `UserGoals`
- `app/api/patient/goals/route.ts` *(novo)*
- `mobile/app/(app)/(clinica)/metas.tsx` *(novo)*
- `mobile/src/api/wearables.ts` — `fetchMetas`, `salvarMetas`
- `mobile/src/lib/resumo-de-saude.ts` — `progresso`, `metaDoDestaque`
- `mobile/app/(app)/(clinica)/(tabs)/saude.tsx` — barra só com meta; entrada "As minhas metas"
- `app/api/admin/patients/[id]/monitoring/route.ts` + `components/admin/patient-monitoring-tab.tsx`
- `lib/metas-do-paciente.ts` *(novo — a tabela de limites, fora do `route.ts`)*
- `mobile/src/components/BarraDeMeta.tsx` *(novo — a barra das duas telas)*
- `mobile/src/lib/metas-formulario.ts` *(novo — a conta do formulário, e o tipo `Metas`)*
- `mobile/app/(app)/(clinica)/familia/[nome].tsx` — a meta de cada métrica
- `__tests__/wearables/a-rota-das-metas.test.ts`, `as-metas-sao-do-paciente.test.ts`,
  `o-formulario-das-metas.test.ts`, `o-hoje-sai-do-dia-local.test.ts`
- `scripts/qa/t118-metas-fixtures.cjs` *(novo — três pacientes de teste, banco local)*

## Critérios de aceite

- [x] Nenhuma meta vem preenchida nem sugerida ao abrir a tela
- [x] Deixar um campo vazio **apaga** a meta, e ela fica vazia depois de recarregar
- [x] Sem meta definida, o destaque mostra o número **sem barra de progresso**
- [x] Com meta, a barra desenha a fração — e **passar da meta não achata em 100%**
- [x] Não existe campo de meta para FC de repouso, HRV ou SpO2
- [x] Valor fora do intervalo é recusado **nomeando o campo e o intervalo**
- [x] Uma recusa não guarda os outros campos pela metade
- [x] Sem sessão, `401` e **nada escrito no banco**
- [x] As metas aparecem no painel da clínica, em leitura
- [x] EN e PT, inglês primeiro
- [x] Provado por mutação: reverter cada regra faz cair um teste nomeado
- [x] **A clínica não escreve** — nem impersonando, nem com sessão de staff
- [x] Corpo JSON que não é objeto é `400`, não `500`
- [x] Toda recusa tem frase em EN **e** PT; o código de máquina vai em `code`
- [x] Os limites da tela e os do servidor são **comparados por teste**, importando os dois lados
- [x] A barra é sobre **hoje**: valor de outro dia não desenha progresso
- [x] Passar da meta **aparece** — a percentagem é dita
- [x] As **quatro** metas chegam a alguma tela (as duas de atividade, na página da família)
- [x] No painel, "não pude ler" ≠ "não definiu nenhuma"
