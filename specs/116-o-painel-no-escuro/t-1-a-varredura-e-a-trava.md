# T-1: A varredura que mede, e a trava

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Duas coisas que precisam de existir **antes** de qualquer cor mudar:

1. **medir o contraste que sai hoje**, tela a tela, para que a melhoria seja
   verificável e não anunciada;
2. **uma trava** que impeça o número de classes cruas de subir.

## Por que nesta ordem

Eu já troquei uma cor de 4,9 de contraste por uma de 3,2 dizendo ao Bruno que
estava a melhorar. A conta vem antes da troca, sempre. E vale para o par: o que
importa é **fundo contra texto**, não a bonitez de cada um sozinho.

## A trava

Uma varredura conta, por arquivo de `app/admin`, as classes de paleta crua clara
(`bg-*-50`, `bg-*-100`, e as de texto equivalentes) e compara com uma linha de
base gravada no próprio teste.

O número **pode descer e não pode subir**. Uma tela nova que nasça com paleta
crua derruba o teste, com o nome do arquivo e o número.

Isto é diferente de proibir a paleta crua: proibir de uma vez seria vermelho em
vinte telas no primeiro dia, e um teste vermelho por vinte telas é um teste que
se desliga.

## Passos

1. Medir o contraste real das combinações que a captura do Bruno mostra — o
   parágrafo do cartão, a caixa de nota, os dois botões — com as cores
   computadas na tela, e não com as do código.
2. Escrever a varredura e a linha de base.
3. Um caso que prova que a varredura enxerga: acrescentar uma classe crua a uma
   tela derruba o teste.

## Arquivos afetados

- um teste novo em `__tests__/aparencia/`
- `specs/116-o-painel-no-escuro/qa/` (as medições)

## Critérios de aceite

- [ ] O contraste de hoje está medido e escrito, por par
- [ ] A varredura conta certo e a linha de base bate com o que existe
- [ ] Acrescentar uma classe crua derruba o teste
- [ ] Remover classes cruas **não** derruba o teste
