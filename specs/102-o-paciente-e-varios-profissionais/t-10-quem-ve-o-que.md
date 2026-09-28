# T-10: A parede clínica — quem vê o quê

**Status:** pendente
**Depende de:** T-3, T-9 · **fecha por último, e é testada em todas as outras**

## Objetivo

Provar, e não afirmar, que cada profissional enxerga exatamente o que o vínculo
autoriza.

## Contexto

Esta é a tarefa que justifica a atividade inteira ser feita com cuidado.

Em 28/09 apareceram, num dia só, dois vazamentos entre inquilinos no material
educativo — e um incidente de envio em massa em 11/09 com a mesma forma. Todos
eram a mesma coisa: **o id vem de fora, o inquilino vem da sessão, e ninguém
verifica que combinam.**

A 102 abre, de propósito, uma porta entre inquilinos — e a T-9 abre uma
segunda, entre profissionais. Sem esta tarefa, elas viram três.

## Passos

1. Escrever, em uma tabela, o que cada tipo de profissional vê de um paciente
   vinculado — e o que **não** vê.
2. Um teste de varredura, no espírito de `toda-tela-tem-caminho`: percorre as
   rotas que aceitam `patientId` e falha se alguma não passar pelo helper de
   acesso da T-3.
3. QA adversário: logado como cada tipo, tentar alcançar paciente de outro
   profissional, de outra clínica, e sem vínculo — por rota, não só por tela.
4. O paciente vê, no app, **quem tem acesso aos dados dele** e desde quando.

## Critérios de aceite

- [ ] A tabela de quem-vê-o-quê existe e está no relatório de QA.
- [ ] Toda rota que aceita `patientId` passa pelo helper, provado por varredura.
- [ ] Nenhuma tentativa adversária devolve dado — e todas devolvem 404.
- [ ] O paciente consegue ver e encerrar cada acesso.
- [ ] O QA online repete a matriz adversária em produção, com paciente de teste.
