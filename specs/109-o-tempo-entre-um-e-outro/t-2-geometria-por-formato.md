# T-2: Cada formato tem a sua geometria

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que vídeo, presencial e domicílio não caibam na mesma casa de grade.

## Contexto

`slotMinutes` é da janela e `kind` distingue consulta de tratamento — nenhum dos
dois distingue **presencial, vídeo e domicílio**, que têm necessidades
diferentes:

| formato | por quê |
|---|---|
| vídeo | sem deslocamento, sem sala para arrumar — o intervalo pode ser menor |
| presencial | o intervalo normal da clínica |
| domicílio | precisa do tempo de ir **e voltar**; é um bloco em volta, não um intervalo depois |

## Passos

1. O intervalo da T-1 ganha ajuste por formato: um número para vídeo e outro
   para presencial. Vazio herda o da clínica — não se configura duas vezes a
   mesma coisa.
2. A duração sugerida também pode variar por formato, e a consulta continua
   podendo ter a sua própria.
3. O domicílio fica para a T-3: ele não é "um intervalo maior", é outra conta.
4. O app e o painel passam a pedir disponibilidade **com o formato**, porque a
   resposta depende dele. Hoje a pergunta leva a duração e ignora o formato.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/schedule.ts`, `lib/availability-day.ts`
- `app/api/availability/route.ts`
- as duas telas que perguntam
- `__tests__/agenda/geometria-por-formato.test.ts`

## Critérios de aceite
- [ ] Vídeo e presencial podem ter intervalos diferentes.
- [ ] Vazio herda o da clínica.
- [ ] A disponibilidade responde de acordo com o formato pedido.
- [ ] Sem configurar nada, a agenda é a mesma de hoje.
