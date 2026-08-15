# T-2: Estado real da triagem na ficha

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que a ficha do paciente diga a verdade sobre a triagem: se foi respondida, por
quem, e se está apenas começada.

## Contexto

`app/admin/patients/[id]/page.tsx:1059` marca `"Completed"` quando
`data.screening` é verdadeiro — ou seja, quando **a linha existe**. Não olha
`isSubmitted`. A tela de Permissões faz a checagem certa
(`permissions/route.ts:54`), e por isso as duas discordam.

O caso que motivou: um paciente recém-criado apareceu com triagem "Completed" e
bandeira vermelha de trauma. A investigação mostrou que alguém preencheu à mão
(`redFlagDetails: {"traumaHistory": "Kicked in the shin"}`) — o dado era real,
mas a ficha teria dito "Completed" mesmo para um rascunho vazio.

Origem importa clinicamente: uma triagem que o paciente respondeu e uma que a
clínica preencheu por ele valem diferente na hora de decidir conduta.

## Passos

1. Campo `filledBy` no `MedicalScreening`: `PATIENT` | `CLINIC`, com os
   registros existentes marcados como `CLINIC` (não dá para provar a origem
   retroativamente, e é a suposição conservadora).
2. `app/api/medical-screening/route.ts` grava `PATIENT`; os caminhos do admin
   gravam `CLINIC`.
3. A ficha passa a exibir três estados, não dois:
   - "Não preenchida" — sem linha
   - "Em preenchimento" — linha com `isSubmitted: false`
   - "Respondida pelo paciente" / "Preenchida pela clínica" — `isSubmitted: true`
4. Conferir se algum outro lugar decide por existência de linha em vez de
   `isSubmitted`.

## Arquivos afetados

- `prisma/schema.prisma`
- `app/admin/patients/[id]/page.tsx`
- `app/api/medical-screening/route.ts`
- `app/api/admin/patients/[id]/ai-import/route.ts`

## Critérios de aceite

- [ ] Paciente sem triagem mostra "Não preenchida"
- [ ] Registro com `isSubmitted: false` mostra "Em preenchimento", nunca "Completed"
- [ ] Triagem respondida pelo paciente é rotulada como tal
- [ ] Triagem preenchida no admin é rotulada como preenchida pela clínica
- [ ] A ficha e a tela de Permissões concordam para o mesmo paciente
- [ ] Os 3 registros existentes em produção continuam íntegros
