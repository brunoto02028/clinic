# T-4: A agenda mostra o intervalo

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que o espaço reservado apareça, em vez de parecer vazio.

## Contexto

Depois da T-1 o intervalo ocupa de verdade — mas na grade semanal ele fica
**invisível**. Quem olha vê um espaço livre entre duas consultas e não entende
por que o sistema recusa marcar ali.

É o mesmo defeito da 106 T-2, em outro lugar: a agenda mostrando livre o que
não está.

## Passos

1. O intervalo desenha como faixa discreta logo abaixo da consulta — clara o
   bastante para se ver, apagada o bastante para não competir com ela.
2. Não é clicável e não abre nada: não é uma consulta.
3. Passar o mouse diz o que é: *"intervalo entre pacientes"*.
4. Sem intervalo configurado, nada muda na tela.

## Arquivos afetados
- `lib/agenda-layout.ts`
- `app/admin/appointments/page.tsx`
- `__tests__/agenda/o-intervalo-aparece.test.ts`

## Critérios de aceite
- [ ] O intervalo aparece, e é distinguível de consulta.
- [ ] Não é clicável.
- [ ] Sem intervalo, a grade é a de hoje.
- [ ] Medido em pixels, como a 106 T-2.
