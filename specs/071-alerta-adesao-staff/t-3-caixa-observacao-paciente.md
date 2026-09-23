# T-3: Caixa de observação do paciente (web)

**Status:** concluído
**Depende de:** nenhuma (independente de T-1/T-2, pode ser feita em paralelo)

## Objetivo

Dar ao paciente um jeito real de escrever uma observação num exercício do
protocolo — hoje o campo e a rota existem, mas nenhuma tela chama isso.

## Contexto

`ProtocolItem.patientNotes` (schema) e `PATCH app/api/patient/protocol/route.ts:210-247`
(campo `notes` → `patientNotes`) já existem e funcionam — confirmado por
leitura direta do código nesta sessão. Falta só a UI, em
`app/dashboard/treatment/page.tsx` (mesma tela do toggle "fiz hoje",
`handleToggleLog`).

## Passos

1. Em cada item de exercício da tela `Today`/semana (`WeekSection`/
   `PrescriptionSection`, `app/dashboard/treatment/page.tsx:884-1149`),
   adicionar um campo de texto opcional ("Add a note" / "Deixar uma
   observação") — não obrigatório, não bloqueia marcar o exercício como
   feito.
2. Salvar via `PATCH app/api/patient/protocol/route.ts` (`itemId` +
   `itemUpdate: { patientNotes }`) — rota já existe e já aceita esse campo,
   confirmar que o `pickEditable("ProtocolItem", ...)` usado lá permite
   `patientNotes` (se não permitir, esse é o único ponto do backend que
   pode precisar de ajuste).
3. Mostrar a observação já salva (se houver) ao reabrir a tela — não deixar
   o paciente reescrever do zero toda vez.

## Arquivos afetados

- `app/dashboard/treatment/page.tsx`
- `app/api/patient/protocol/route.ts` (só se `pickEditable` bloquear
  `patientNotes` — confirmar antes de mexer)

## Critérios de aceite

- [ ] Paciente consegue escrever, salvar e ver de novo uma observação num
      item do protocolo.
- [ ] Campo é opcional — não interfere no fluxo de marcar exercício feito.
- [ ] Observação de um paciente nunca aparece pra outro (mesma checagem de
      tenant/ownership já usada no resto da rota).
- [ ] `npm run build` local limpo (arquivo de página alterado).
