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
| T-1 | [Voltar ao app traz dado novo](t-1-voltar-traz-dado-novo.md) | pendente |
| T-2 | [Puxar para baixo, em toda tela](t-2-puxar-em-toda-tela.md) | pendente |
| T-3 | [O que não se atualiza sozinho](t-3-o-que-nao-se-atualiza.md) | pendente |

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
