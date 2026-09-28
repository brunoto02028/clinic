# T-8: O calendário mostra disponibilidade de verdade

**Status:** feita (27/09) — em QA
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

---

## O que já existia, e o que faltava

**Já existia, da 087:** `/api/availability?from=&to=` devolve **quantos**
horários cada dia tem (contagem, não a lista — um mês com todos os horários de
todos os dias é uma resposta enorme para desenhar trinta bolinhas), e o
`CalendarioDeAgenda` do app já pinta semana e mês com isso, respeitando bloqueio
e separando consulta de tratamento pelo `kind`.

**Faltava, no app:** o calendário dizia onde havia vaga e **não dizia o que a
pessoa já tinha**. Quem vai marcar faz as duas perguntas ao mesmo tempo — *"dá
nesse dia?"* e *"eu já não tenho alguma coisa aí?"* — e sem a segunda marca duas
na mesma tarde e descobre depois. Agora a célula ganha uma **barrinha** (não
outra bolinha: a bolinha já significa vaga), na cor que separa presencial de
vídeo. Cancelada não conta.

**Faltava, no painel:** a agenda mostrava só o que já foi marcado, e a pergunta
que se faz ao telefone com um paciente esperando é a outra — *"onde ainda
cabe?"*. O cabeçalho de cada dia agora diz **"N livres"**, **"cheio"** ou
**"fechado"**. Zero aparece, porque "cheio" é uma resposta e a ausência do número
não é.

**E as duas telas leem a mesma rota.** Se discordassem sobre um dia, seria por
estarem olhando fontes diferentes — e agora não estão.
