# T-4: A agenda de cada profissional

**Status:** concluída (28/09/2026)
**Depende de:** T-1

## Objetivo

Cada profissional tem a própria disponibilidade, e o paciente vê **a agenda de
quem ele escolheu** — não a da clínica.

## Contexto

`ScheduleWindow` e `ScheduleException` já têm `therapistId`. O que responde
hoje é `/api/availability`, **sem** o id da pessoa: é a disponibilidade da
clínica.

Isso foi deliberado e está comentado na agenda: passar o id de quem estava
logado fazia o painel e o app discordarem sobre o mesmo dia, e um segundo
terapeuta sem janela própria via a semana inteira fechada. A saída foi tirar o
id — **e a dívida ficou escrita ali**: *"modelar agenda por pessoa é outra
atividade"*. Esta é a atividade.

## Passos

1. `/api/availability` aceita `professionalId` e responde pela pessoa.
2. Sem `professionalId`, continua respondendo pela clínica — para a agenda da
   reabilitação não mudar.
3. Profissional sem janela configurada **não aparece como disponível**, em vez
   de aparecer com a semana inteira aberta ou fechada.
4. Fuso: o profissional pode estar no Brasil e o paciente em Londres. O horário
   mostrado é o do **paciente**, e o guardado é UTC.

## Critérios de aceite

- [x] Dois profissionais com janelas diferentes devolvem vagas diferentes —
      **já funcionava**: `ScheduleWindow` e `disponibilidadeDoDia` sempre
      filtraram por `therapistId`. Fui conferir antes de escrever código.
- [x] Quem não configurou janela não é oferecido — também já era verdade
      (`reason: "not_working"`), e agora tem teste.
- [x] **O paciente alcança a agenda de outro inquilino**, e só por o
      profissional estar no catálogo.
- [x] A `clinicId` que decide a agenda é a **dele**, não a de quem pergunta.
- [x] O fuso é o de quem atende, passado nas duas formas de pedir — com
      padrão, para a BPR não mudar em nada.

## O que sobrou

O **painel** do profissional continua editando janela como sempre editou: a
tela de disponibilidade é por terapeuta desde antes. O que esta tarefa não fez
foi uma tela de "minha agenda" separada — ela não é necessária, e inventá-la
seria uma segunda porta para o mesmo dado.
