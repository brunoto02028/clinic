# T-2: A fila do que venceu, no painel

**Status:** pendente
**Depende de:** T-1

## Objetivo

Um lugar onde aparece tudo o que passou e não teve desfecho — e dois botões.

## Contexto

Os botões de `COMPLETED`, `CANCELLED` e `NO_SHOW` já existem em
`/admin/appointments`, um a um, dentro da lista inteira. O que não existe é a
pergunta *"o que ficou em aberto?"*.

Uma consulta vence no fim da janela: horário + duração + 30 min, a mesma folga
da sala de vídeo. Antes disso ela ainda pode estar acontecendo.

## Passos

1. `GET /api/admin/appointments/pending-outcome`: consultas do inquilino, com
   `dateTime` vencido e status aberto (`PENDING`, `PENDING_PATIENT`,
   `CONFIRMED`). Ordenadas da mais antiga — quem esperou mais aparece primeiro.
2. Para as de vídeo, juntar `resumoDaChamada` e dizer em texto o que houve.
3. **"Só o paciente entrou" tem tratamento próprio**: a frase diz que a falta foi
   da clínica, e o botão de marcar falta do paciente **não** aparece nesse caso.
4. Tela: uma aba em `/admin/appointments`, com contador. Cada linha: quem,
   quando, formato, a prova quando houver, e os botões.
5. Marcar em lote o que é óbvio — "os dois entraram" — mas um a um, com
   confirmação, nunca tudo de uma vez sem olhar.

## Arquivos afetados
- `app/api/admin/appointments/pending-outcome/route.ts` (novo)
- `app/admin/appointments/page.tsx`
- `__tests__/agenda/a-fila-do-que-venceu.test.ts`

## Critérios de aceite
- [ ] Só consultas vencidas e em aberto entram na fila.
- [ ] A fila é do inquilino de quem pergunta, provado por teste.
- [ ] Vídeo mostra o que aconteceu; presencial e domicílio não inventam.
- [ ] "Só o paciente entrou" não oferece marcar falta dele.
- [ ] Resolver tira a linha da fila na hora.
- [ ] Nenhum status muda sozinho.
