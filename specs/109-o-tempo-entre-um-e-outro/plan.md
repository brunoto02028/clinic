# Atividade 109 — O tempo entre um paciente e outro

## Objetivo

> O Bruno, 29/09/2026:
>
> *"Eu preciso de um gap entre um horário e outro. Se eu tenho uma consulta,
> normalmente é de uma hora, uma hora e meia, e aí mais um intervalo de um ou
> outro paciente aparecer. Esses horários a gente vai ter que organizar melhor
> lá dentro do nosso calendário, **para nunca marcar e deixar a paciente
> esperando** — tanto por vídeo quanto pessoalmente. No home visit eu vou ter
> que fazer um book com horários muito maiores, que tem um tempo de
> deslocamento."*

## O que já existe — e é mais do que eu esperava

Antes de planejar, medi. A agenda já faz três coisas que pareciam faltar:

| | onde |
|---|---|
| A ocupação é por **sobreposição real**, não por casa de grade: uma consulta de 90 minutos às 10:00 já bloqueia as 11:00 | `lib/schedule.ts`, `ocupacao()` |
| Cada janela tem a **sua** duração de slot (`slotMinutes`) e a sua capacidade | `ScheduleWindow` |
| Quem está pagando **segura a vaga por 30 minutos** e depois a solta | `limiteDeEspera` |

Esse último responde de antemão a outra coisa que o Bruno pediu no mesmo dia —
*"se ele não fez contato com a clínica, tem que pagar, senão não pode liberar o
slot"*. O Checkout abandonado não prende horário: meia hora é o tempo de pagar.

## O que falta de verdade

### 1. Não existe intervalo entre um paciente e outro

A ocupação usa **exatamente** a duração da consulta. Uma de 60 minutos às 10:00
libera as 11:00 em ponto — sem um minuto para o paciente sair, a sala ser
arrumada, a anotação ser feita ou o atraso de cinco minutos ser absorvido.

É a diferença entre uma agenda que fecha na teoria e uma que funciona na
prática. E o custo dela é exatamente o que o Bruno descreveu: *paciente
esperando*.

### 2. A duração não conhece o formato

`slotMinutes` é da **janela**, e `kind` distingue consulta de tratamento — não
distingue **presencial, vídeo e domicílio**.

Os três têm geometrias diferentes:

- **vídeo** não tem deslocamento nem sala para arrumar: o intervalo pode ser
  menor;
- **presencial** precisa do intervalo normal;
- **domicílio** precisa do tempo de ir **e voltar**, e isso não é um intervalo
  depois: é um bloco muito maior em volta.

Hoje os três cabem na mesma casa de grade.

### 3. O domicílio não sabe que existe distância

Ir a um endereço a vinte minutos e a um a uma hora ocupa a tarde de formas
diferentes. Nenhum dado de distância entra na conta hoje.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O intervalo entre um e outro](t-1-o-intervalo.md) | pendente |
| T-2 | [Cada formato tem a sua geometria](t-2-geometria-por-formato.md) | pendente |
| T-3 | [O domicílio ocupa a ida e a volta](t-3-o-domicilio-ocupa-a-viagem.md) | pendente — espera o Bruno |
| T-4 | [A agenda mostra o intervalo](t-4-a-agenda-mostra-o-intervalo.md) | pendente |

**T-1 primeiro, e sozinha resolve a dor principal.** A T-2 refina; a T-3
depende de uma decisão sua.

## Decisões de design

### O intervalo é da clínica, não do tipo de tratamento

Um tratamento não sabe quanto tempo você precisa entre um paciente e outro —
isso é da sala, da agenda e de como a clínica trabalha. Fica no `Clinic`, com
ajuste por formato na T-2.

### O intervalo ocupa, mas não é consulta

Ele some da lista de horários oferecidos, aparece na agenda como espaço
reservado, e **não** vira um registro de consulta. Um bloco fantasma de 15
minutos na lista de consultas do paciente seria pior que o problema.

### O padrão não muda a agenda de ninguém

Intervalo **zero** por omissão, que é o comportamento de hoje. Quem quiser
intervalo escolhe — e uma agenda que encolhe sozinha depois de um deploy é a
espécie de surpresa que se descobre com o paciente na porta.

## Suposições — para você validar

1. O intervalo vem **depois** da consulta, não antes. Quem chega cedo espera;
   quem sai atrasado não empurra o próximo.
2. Ele vale para consulta marcada pelo paciente **e** pela clínica. A marcação
   manual pode ignorá-lo de propósito, como o `forceTime` da 106 T-4.
3. Ninguém é reagendado por causa disto: o intervalo vale para o que for
   marcado daqui para a frente.
4. **Vídeo também tem intervalo**, só que menor. O Bruno citou os dois.
