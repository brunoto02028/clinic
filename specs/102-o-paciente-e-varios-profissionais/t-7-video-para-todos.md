# T-7: Consulta por vídeo para todos os tipos

**Status:** concluída (28/09/2026)
**Depende de:** T-1, T-3

## Objetivo

> *"Esses todos precisam de consulta por vídeo. Fundamental."*

## Contexto

A sala existe e está no ar (101 T-1): privada, token por pessoa preso à janela
do horário, e a porta recusa quem não é da consulta.

A regra de quem entra é `therapistId === quemPede || patientId === quemPede`.
Com o profissional em outro inquilino, `therapistId` continua sendo ele — então
a regra **já funciona**, desde que a consulta seja criada com ele como
terapeuta.

O que muda é pouco, e é justamente por isso que esta tarefa existe: para
**medir** que é pouco, em vez de supor.

## Passos

1. A consulta criada pelo paciente com profissional externo grava
   `therapistId` = o profissional. (Hoje a rota da clínica grava sempre quem
   criou — é a suposição 1 da [101](../101-o-video-o-artigo-e-o-agendamento/).)
2. Percorrer a matriz inteira de recusas com um profissional de outro
   inquilino, do mesmo jeito que a 101 T-1 fez.
3. O nome que aparece na sala é o do profissional, com o registro dele.

## Critérios de aceite

- [x] Matriz medida contra a Daily real, com profissional de **outro
      inquilino**:

      | quem | resultado |
      |---|---|
      | paciente da BPR | **200**, `ehTerapeuta: false` |
      | o médico (outro inquilino) | **200**, `nome: "Ana Medica (CRM 123456)"` |
      | terapeuta da BPR, estranho à consulta | **404** |
      | sem autenticação | **401** |
      | o médico chama o paciente | **200** |
      | a BPR tenta chamar | **404** |

- [x] **A BPR não entra na sala de uma consulta que não é dela** — ela é a
      plataforma, não participante.
- [x] O nome na sala leva o registro, e só para profissional intermediado.
- [x] A agenda do médico sem janela configurada responde `not_working` — ele
      não é oferecido, como manda a T-4.

## O que a medição achou, e nenhum teste de código acharia

O catálogo vinha **vazio** com todos os dados certos no banco. O `where`
filtrava por `visibleInApp`, então toda linha que chegava tinha `true` — mas o
`select` não trazia o campo, e `podeAparecerNoApp` **lê o campo**. Ele via
`undefined` e respondia "não".

O filtro estava escrito certo; faltava o dado. Só rodar pegou — e agora há um
teste que confronta o `select` com todo campo que os dois filtros leem.
