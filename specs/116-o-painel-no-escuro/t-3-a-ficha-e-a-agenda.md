# T-3: A ficha do paciente e a agenda

**Status:** pendente
**Depende de:** T-2

## Objetivo

As duas telas que a clínica abre todos os dias: a ficha do paciente
(`app/admin/patients/[id]/page.tsx`, 63 classes cruas) e a agenda
(`app/admin/appointments/page.tsx`, 22).

## Por que estas duas, e não as maiores

`instagram-studio` tem mais classes cruas do que qualquer outra (65) e **não
entra**: não é tela de uso diário. Consertar por tamanho da lista e não por uso
arruma o que ninguém abre.

A ficha é onde o terapeuta passa a sessão inteira. A agenda é a primeira tela do
dia.

## Contexto

A ficha do paciente é o arquivo mais longo do painel e mistura tudo: crachás de
origem de leitura, blocos de avaliação, avisos. É também onde vive o crachá
`PPG`, que a 115 T-3 vai rotular — as duas tarefas tocam o mesmo trecho e é
melhor que não se cruzem no mesmo dia.

## Passos

1. A ficha, por bloco, medindo cada par.
2. A agenda, com o mesmo critério.
3. Atualizar a linha de base da trava (ela desce).

## Arquivos afetados

- `app/admin/patients/[id]/page.tsx`
- `app/admin/appointments/page.tsx`
- o teste da T-1 (a linha de base)

## Critérios de aceite

- [ ] Nenhum par abaixo de 4,5:1 no texto corrido
- [ ] Nenhum crachá abaixo de 3:1
- [ ] A linha de base desceu, e o teste continua verde
- [ ] Nada mudou de significado — só de cor
