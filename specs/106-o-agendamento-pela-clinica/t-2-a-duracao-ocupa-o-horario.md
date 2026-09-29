# T-2: A duração ocupa o horário

**Status:** 🟢 concluída (29/09) — QA aprovado, review feito, achados corrigidos
**Depende de:** nenhuma

## Objetivo

Olhar a agenda e ver o que está ocupado.

## Contexto

O bloco no calendário tem altura fixa. Uma consulta de 60 minutos e uma de 30
ocupam o mesmo espaço, e o horário seguinte **parece livre** quando não está.

Numa agenda, isso não é estética: é a informação principal. Quem marca por cima
de um horário ocupado descobre no dia.

## Passos

1. A altura do bloco sai da duração, sobre a mesma escala das linhas de hora.
2. O bloco começa no minuto certo — 10:38 não é 10:00.
3. Duas consultas no mesmo horário aparecem lado a lado, e não uma escondendo a
   outra.
4. Bloco curto continua legível: o nome não some numa consulta de 15 minutos.
5. O contador de vagas do dia concorda com o que se vê.

## Como ficou

A conta saiu da tela e virou `lib/agenda-layout.ts` — `disporDia()`, pura,
testável, sem React. Três coisas que só apareceram ao separar:

1. **A colisão não pode ser calculada por linha de hora.** Uma consulta de 90
   minutos às 10:00 ainda ocupa espaço às 11:00, e a grade desenha as duas
   horas em `div`s diferentes. Quem decide se duas ficam lado a lado é o
   relógio, não a linha da grade.
2. **Encostar não é sobrepor.** 10:00–11:00 e 11:00–12:00 são duas consultas
   seguidas; espremer as duas em meia largura seria inventar um conflito.
3. **O piso de legibilidade cria colisão de verdade.** 15 minutos desenhados em
   20px ocupam mais que 15 minutos de relógio, então a colisão é medida sobre o
   que **aparece** — senão o próximo bloco some atrás do anterior.

De brinde: a linha da hora passou a usar o fuso da clínica, o mesmo que já
aparecia escrito dentro do bloco. Antes usava o relógio do navegador e podia
discordar do próprio rótulo.

## Arquivos afetados
- `lib/agenda-layout.ts` (novo)
- `app/admin/appointments/page.tsx`
- `__tests__/agenda/a-duracao-ocupa-o-horario.test.ts` (novo, 12 casos)

## Critérios de aceite
- [x] Altura proporcional à duração, medida.
- [x] Início no minuto certo.
- [x] Sobreposição visível, sem esconder — inclusive entre horas diferentes.
- [x] Consulta curta continua legível.
- [x] O contador de vagas não discorda do desenho (QA mede na tela).
- [x] QA mediu a altura em pixels.
- [x] Bloco não vaza para fora da moldura (achado do QA).
- [x] Consulta invisível não rouba coluna de quem aparece (achado do review).

## O que esta tarefa **não** faz

Desenhar não é impedir. Marcar duas consultas no mesmo horário continua
possível; elas agora aparecem lado a lado em vez de uma esconder a outra.
Impedir a marcação é a pergunta 2 do plano, ainda sem resposta do Bruno.
