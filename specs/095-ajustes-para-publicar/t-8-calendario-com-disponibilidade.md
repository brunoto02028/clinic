# T-8: O calendário mostra disponibilidade de verdade

**Status:** pendente
**Depende de:** T-2

## Objetivo

O paciente abre o calendário e vê **quando dá para marcar**: os dias com vaga, os
horários livres, e o que ele já tem. E o lado da clínica mostra a mesma coisa,
sem os dois discordarem.

## Contexto

Palavras do Bruno: *"No calendário, quero que o paciente veja mais informações,
como dias disponíveis para consulta e dias e horários disponíveis para ele
reservar para o tratamento. Quero que essa tela tenha mais informações, ver como
fica isso do lado do paciente, no app e da clínica."*

A disponibilidade **já existe**: `/admin/availability` guarda janelas e
bloqueios, e a rota `/api/availability` os serve. A tela do paciente não mostra
nada disso — ele escolhe no escuro e descobre depois se havia vaga.

Isto não é um cadastro novo de horário. É mostrar o que já está cadastrado.

## Passos

1. No app, no calendário do paciente: marcar os dias com vaga, e ao tocar num
   dia mostrar os horários livres.
2. Distinguir com clareza **consulta** de **sessão de tratamento**, que têm
   duração e disponibilidade diferentes.
3. Mostrar o que ele já tem marcado — e se é presencial ou por vídeo (o selo que
   a T-2 arrumou do lado da clínica).
4. Respeitar os bloqueios: dia bloqueado não aparece como livre.
5. No painel, a mesma leitura: a agenda mostrando onde há vaga, não só o que já
   foi marcado.
6. Conferir os dois lados com o mesmo dado, no mesmo dia, para não haver uma
   tela dizendo livre e a outra cheio.

## Arquivos afetados

- `app/api/availability/route.ts` (o que o app precisa ler)
- `mobile/app/(app)/(clinica)/book-appointment.tsx` e o calendário do paciente
- `app/admin/appointments/page.tsx` (a visão de vagas)
- `app/admin/availability/page.tsx` se faltar dado

## Critérios de aceite

- [ ] O paciente vê os dias com vaga antes de escolher
- [ ] Ao tocar num dia, vê os horários
- [ ] Consulta e sessão de tratamento aparecem separadas
- [ ] Dia bloqueado nunca aparece como livre
- [ ] As duas telas concordam sobre o mesmo dia
