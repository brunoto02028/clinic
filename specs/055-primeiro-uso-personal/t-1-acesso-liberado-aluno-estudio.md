# T-1: Aluno de estúdio com acesso liberado por padrão

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Aluno de tenant PERSONAL_TRAINER vê Sessões, Exercícios, Aprender e demais módulos sem o paywall falso ("Upgrade your plan · From £0.90/month").

## Contexto
Decisão 3 do Bruno. `lib/patient-access.ts` (`computePatientAccess`) hoje só libera por plano, pacote, plano grátis ou override total.

## Passos
1. `PATIENT_ACCESS_SELECT` passa a trazer `clinic.type`.
2. Aluno de estúdio: todos os módulos e permissões concedidos (motivo `studio`); os ajustes por aluno (hidden/locked) continuam valendo por último.
3. A clínica não muda.

## Arquivos afetados
- `lib/patient-access.ts`

## Critérios de aceite
- [ ] Aluno do estúdio agenda sessão e abre Aprender sem paywall.
- [ ] `/api/patient/access` do aluno: módulos liberados, motivo `studio`.
- [ ] Módulo escondido/travado pelo personal some/trava.
- [ ] Paciente de clínica sem plano: paywall igual a antes.
