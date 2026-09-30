# T-1: A varredura que mede, e a trava

**Status:** ✅ concluída (30/09)
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

---

# A medição, e o que ela desmentiu

Medi o contraste **que sai no navegador**, com as camadas semitransparentes
compostas — e a primeira versão da minha própria medição estava errada: ela
comparava o texto contra um fundo de 10% de alfa sem o compor sobre o que estava
atrás, e dava contraste **1** em vinte e quatro elementos. Um número alarmante e
falso. Compor as camadas trocou-o por 2,78.

## O que a paleta crua faz, de facto

**Está largamente bem.** A legenda das faixas de pressão dá de **4,84 a 6,16**,
porque cada célula junta um fundo claro com um texto escuro **da mesma cor**
(`bg-blue-50 text-blue-700`).

Ou seja: as 608 ocorrências que eu ia perseguir não são, na maioria, o defeito.
A trava sobre elas continua a valer — uma classe crua **sozinha**, sem o par, é
que faz a caixa creme com texto de token — mas não era ali que estava o que o
Bruno viu.

## O que falha mesmo

`/admin/blood-pressure`, 72 elementos de texto medidos, **29 abaixo do mínimo** —
e só **quatro pares distintos**:

| par | contraste | mínimo | quantos |
|---|---|---|---|
| `#4F7361` sobre o cartão | 2,78 | 4,5 | 10 |
| `#4F7361` sobre o cartão claro | 3,04 | 4,5 | 10 |
| `#4F7361` sobre o diálogo | 2,95 | 4,5 | 2 |
| cinza a 45% de alfa | 3,81 | 4,5 | 7 |

**Vinte e duas das vinte e nove são a mesma cor**: o verde da marca usado como
**texto** sobre o painel escuro.

## Provas

`__tests__/aparencia/a-paleta-crua-so-pode-descer.test.ts` — a trava, com teto
em 608 e folga zero. Por mutação: acrescentar uma classe crua derruba.
