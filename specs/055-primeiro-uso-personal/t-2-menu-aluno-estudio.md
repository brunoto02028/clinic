# T-2: Menu do aluno de estúdio sem itens quebrados ou clínicos

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Tirar do menu do aluno de estúdio o item "Exercises" (leva a `/dashboard/treatment`, bloqueada) e o guia "How It Works" (guia clínico da BPR).

## Contexto
Achados A2 e A4 da revisão.

## Passos
1. Esconder "exercises" (seção do menu) e o módulo do guia para aluno de estúdio em `patient-sidebar`.

## Arquivos afetados
- `components/dashboard/patient-sidebar.tsx`
- `lib/patient-sections.ts` (se preciso)

## Critérios de aceite
- [ ] Aluno de estúdio (1366 e 390): sem "Exercises" e sem "How It Works"; os demais itens abrem sem redirecionar.
- [ ] Paciente de clínica: menu igual.
