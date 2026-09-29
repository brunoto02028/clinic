# T-1: Quem entrou na sala fica registrado

**Status:** implementada — aguardando QA
**Depende de:** nenhuma

## Objetivo

Guardar quem entrou numa consulta por vídeo, e quando. Sem isso, a fila da T-2
só consegue perguntar; com isso, ela consegue sugerir.

## Contexto

A sala já é criada por pessoa: `POST /api/appointments/[id]/video` emite um token
com o nome de quem pede e sabe se é o terapeuta ou o paciente. O dado passa por
ali toda vez e é descartado.

Não é gravação de chamada, e não é a API da Daily: é uma linha por entrada,
escrita no momento em que o token é emitido. Se a pessoa recebeu o token, ela
abriu a sala.

## Passos

1. Modelo `VideoJoin`: `appointmentId`, `userId`, `role` (`THERAPIST`/`PATIENT`),
   `joinedAt`, `clinicId`. Índice por consulta.
2. Escrever a linha na rota de entrar, **depois** de a janela e o token darem
   certo — entrada que falhou não é entrada.
3. Não duplicar por reentrada no mesmo minuto: quem cai e volta não vira duas
   pessoas. `@@unique` não serve (reentrar depois de uma hora é legítimo); a
   regra é ignorar se já houve entrada da mesma pessoa há menos de 2 minutos.
4. Um resumo reutilizável: `resumoDaChamada(appointmentId)` → quem entrou, a
   primeira entrada de cada lado, e o veredito cru: `ninguem`, `so_paciente`,
   `so_profissional`, `os_dois`.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/video-call.ts` ou `lib/chamada-aconteceu.ts` (novo)
- `app/api/appointments/[id]/video/route.ts`
- `__tests__/agenda/quem-entrou-na-sala.test.ts`

## Critérios de aceite
- [ ] Entrar na sala grava uma linha, com o papel certo.
- [ ] Token recusado (fora da janela, consulta cancelada) **não** grava nada.
- [ ] Reentrar em menos de dois minutos não cria segunda linha.
- [ ] `resumoDaChamada` distingue os quatro casos.
- [ ] O registro é do inquilino da consulta, e não de quem perguntou.
