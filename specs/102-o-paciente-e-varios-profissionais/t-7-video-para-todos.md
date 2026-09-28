# T-7: Consulta por vídeo para todos os tipos

**Status:** pendente
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

- [ ] A matriz de recusas medida contra a Daily real, com profissional externo.
- [ ] Admin da BPR **não** entra na sala de uma consulta que não é dele.
- [ ] O paciente entra pelo app, e o profissional pelo painel dele.
