# Atividade 113 — O app se atualiza sozinho

**Aberta:** 30/09/2026, a pedido do Bruno.

## O que ele pediu

> *"O app queria que toda vez que eu sair e entrar, ao pedir meu Face ID ele já
> atualizasse além de todas as páginas; o segurar e arrastar para baixo já
> fizesse a atualização tb."*

Duas coisas, e elas se completam: **voltar ao app já traz dado novo**, e **puxar
para baixo** funciona em toda tela.

## Por que isto importa mais do que parece

O app mostra dado clínico. Uma tela que ficou aberta no bolso e volta mostrando o
que havia há duas horas não é só desatualizada — ela **parece atual**. O paciente
não tem como saber que aquilo é velho, e a pressão de ontem com cara de hoje é
pior que uma tela vazia.

E há o caso que o Bruno vive todo dia: ele desliga um módulo no painel e quer ver
o efeito no telefone. Sem atualização ao voltar, ele vê a tela antiga e conclui
que o interruptor não funcionou — foi exatamente assim que a atividade 110
começou.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [Voltar ao app traz dado novo](t-1-voltar-traz-dado-novo.md) | ✅ já existia (075 T-12), verificada |
| T-2 | [Puxar para baixo, em toda tela](t-2-puxar-em-toda-tela.md) | ✅ já existia, verificada |
| T-3 | [O que não se atualiza sozinho](t-3-o-que-nao-se-atualiza.md) | ✅ concluída (30/09) |

## Suposições

- **"Ao pedir o Face ID"** é o desbloqueio do app, que já existe
  (`lib/app-lock.ts`). Estou assumindo que o gatilho é o app voltar ao primeiro
  plano — e não o Face ID em si, que pode nem aparecer se o desbloqueio estiver
  desligado. Atualizar no retorno ao primeiro plano cobre os dois casos.
- **Atualizar tudo ao voltar custa bateria e dado.** A proposta é invalidar o
  que está em tela e o que ela depende, não o aplicativo inteiro; e só quando o
  app esteve fora por mais que alguns segundos, senão trocar de aba com o teclado
  dispara uma enxurrada.
- **Puxar para baixo compete com arrastar para reordenar** (atividade 112). As
  duas mexem nas mesmas telas e é melhor que saiam juntas.
- **Nem tudo deve atualizar sozinho.** Um formulário meio preenchido não pode
  perder o que foi escrito porque o app voltou ao primeiro plano — é a T-3.

---

# Fecho da atividade (30/09/2026)

**As duas metades já estavam construídas.** Medir antes valeu, e valeu duas
vezes — porque a primeira medição estava errada.

| | onde estava | desde |
|---|---|---|
| voltar ao app atualiza | `wireAppFocus` liga `AppState` ao `focusManager`, e `refetchOnWindowFocus: true` | 075 T-12 |
| puxar para baixo | o `Screen` traz o controle por omissão (`refreshable`), e `usePullToRefresh` refaz o que está montado | já existia |

## A varredura que mentiu

A minha primeira contagem disse **50 de 52 telas sem puxar-para-atualizar**. Ela
procurava `RefreshControl` arquivo a arquivo — e o controle vive no componente
partilhado. Media a ausência de uma linha **que ninguém precisa de escrever**.

Medir a coisa errada dá um número convincente e falso, e este era convincente:
50 de 52 é o tipo de número que faz começar a trabalhar sem perguntar mais nada.
A contagem certa deu **três**.

## As três, e porque não são pendência

| tela | porquê |
|---|---|
| conversa | a lista rola sozinha para a última mensagem; puxar no topo de um chat é o gesto de carregar histórico |
| escolher a área | tela centrada, sem rolagem — não há o que puxar |
| conquistas (BA) | fora do escopo do app do paciente até a clínica estar validada |

## A trava (T-3)

`__tests__/mobile/puxar-para-atualizar-em-toda-tela.test.ts`. Toda tela com
`useQuery` tem o gesto **ou** está na lista com uma razão escrita — e a razão tem
de ser uma frase, não um rótulo.

Por mutação, duas. A segunda ensinou o de sempre: trocar
`refetchQueries({ type: "active" })` por `refetchQueries()` **não derrubou nada**
na primeira versão, porque o docstring do próprio arquivo cita a chamada certa
para explicar a escolha — e a citação satisfazia a busca enquanto o código já
estava trocado. **O comentário certo sustentava um código errado.** O teste passou
a tirar os comentários antes de procurar.
