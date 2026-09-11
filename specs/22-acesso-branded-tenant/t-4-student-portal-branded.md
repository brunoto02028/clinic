# T-4: Student Portal branded pós-login

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
O `/dashboard` do aluno de tenant personal se apresenta como **"Student Portal"** com marca do estúdio e vocabulário de aluno.

## Contexto
D8. `useVocab` já reetiqueta paciente→aluno etc. Fechar lacunas: título/cabeçalho "Student Portal", branding (cores/logo do estúdio) no shell do dashboard.

## Passos
1. Auditar `components/dashboard/dashboard-layout.tsx` para tenant personal.
2. Aplicar título "Student Portal" + branding do tenant + garantir vocabulário de aluno onde faltar.

## Arquivos afetados
- `components/dashboard/dashboard-layout.tsx` e componentes de cabeçalho do portal.

## Critérios de aceite
- [ ] Aluno personal vê "Student Portal" + marca do estúdio; nada diz "Patient/Clinic".
- [ ] Paciente da clínica inalterado.
