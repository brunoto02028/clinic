# T-9: Pré-preencher contato de emergência na triagem

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Se a paciente já informou o contato de emergência no intake/perfil, a triagem já vem com esses
campos preenchidos — ela não digita a mesma coisa pela terceira vez.

## Contexto
Três lugares pedem contato de emergência, salvando em tabelas/campos diferentes:
- Intake (`app/intake/[token]/page.tsx`) e Perfil (`app/dashboard/profile/page.tsx`) → gravam em
  `User.emergencyContactName`/`emergencyContactPhone`/`emergencyContactRelation`.
- Triagem (`components/screening/medical-screening-form.tsx`, campos nas linhas 1146-1164) →
  grava em `MedicalScreening.emergencyContact`/`emergencyContactPhone` (nomes de campo
  diferentes, sem `relation`). O carregamento de valor existente (linhas ~350-351) só olha pro
  próprio `MedicalScreening`, nunca pro `User`.

Fix escolhido (ver decisão no `plan.md`): pré-preencher a partir do `User` só quando a triagem
ainda não tiver valor próprio — sem mudar schema, sem tocar a API de submissão, sem adicionar
`relation` (não existe campo pra isso na UI da triagem).

## Passos (ajustado durante a implementação)
1. Em `app/api/medical-screening/route.ts`, `GET`: se `!screening?.emergencyContact ||
   !screening?.emergencyContactPhone`, buscar `User.emergencyContactName/Phone` e devolver como
   um campo **separado** `emergencyContactDefault: { name, phone } | null` na resposta —
   **não** mesclado dentro de `screening`.
   > Correção em relação ao plano original: mesclar dentro de `screening` faria o front-end
   > (`medical-screening-form.tsx`) achar que `hasExisting = true` pra qualquer paciente nova
   > que só tivesse o contato de emergência preenchido no perfil — isso desligava a restauração
   > de rascunho do localStorage (`if (!hasExistingRef.current) { restore draft }`) e trocava o
   > texto do botão de "Submit" pra "Update" incorretamente. Campo separado evita esse efeito
   > colateral.
2. Em `medical-screening-form.tsx`: usar `data.emergencyContactDefault` em dois pontos — (a) ao
   montar `formData` a partir de uma triagem já existente, como fallback quando
   `s.emergencyContact`/`emergencyContactPhone` vierem vazios; (b) no branch "sem triagem e sem
   rascunho salvo" (dentro do `finally`), aplicando o default só ali, sem nunca sobrescrever um
   rascunho restaurado.

## Arquivos afetados
- `app/api/medical-screening/route.ts`
- (conferir, sem necessariamente editar) `components/screening/medical-screening-form.tsx`

## Critérios de aceite
- [ ] Paciente que já preencheu contato de emergência no intake/perfil, ao abrir a triagem pela
      primeira vez, já vê nome e telefone preenchidos nesses campos.
- [ ] Paciente que edita esses campos na triagem e envia — grava o valor editado em
      `MedicalScreening`, sem afetar o que está salvo em `User`.
- [ ] Paciente sem nada preenchido em nenhum lugar → campos continuam vazios, sem erro.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
