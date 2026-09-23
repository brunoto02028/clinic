# T-4: Mostrar a observação do paciente pro staff

**Status:** concluído
**Depende de:** T-3 (precisa existir observação real pra mostrar), T-1 (pro sinal no card)

## Objetivo

A observação que o paciente agora consegue escrever (T-3) precisa aparecer
pro terapeuta/staff — senão continua invisível na prática.

## Contexto

Local natural: `components/admin/patient-adherence-panel.tsx` (painel por
paciente, já mostra hoje/ontem) e o sinal resumido no card novo de T-2.

## Passos

1. Em `patient-adherence-panel.tsx`, mostrar a `patientNotes` de cada item
   junto com o status de completude dele (hoje mostra só feito/não feito).
2. Marcar/considerar "vista" quando o staff abre o perfil (ou um botão
   explícito "marcar como lida") — decidir o mecanismo mais simples que evite
   o staff perder uma nota nova sem precisar reabrir tudo toda vez.
3. Conectar o sinal "tem nota não vista" no card de T-2 com esse estado.

## Arquivos afetados

- `components/admin/patient-adherence-panel.tsx`
- `app/api/admin/adherence/falling-behind/route.ts` (campo "hasUnseenNote", de T-1)

## Critérios de aceite

- [ ] Observação do paciente aparece pro staff da clínica dele, nunca pra
      staff de outra clínica.
- [ ] Sinal de "nota nova" reflete a realidade — não fica preso em true/false
      incorretamente após o staff ver.
