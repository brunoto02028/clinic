# QA — Atividade 42: Protocolo semanal + checklist diário

## T-1: Schema

- **API** — Criar dois logs iguais (mesmo item/paciente/data) via Prisma direto num script de
  teste local → a segunda gravação deve falhar por violação da constraint única.

## T-2: API toggle + GET

- **API** — `POST toggleLog` num item válido, sem log ainda → cria, resposta de sucesso.
- **API** — `POST toggleLog` de novo, mesmo item/dia → remove (desmarca), resposta de sucesso.
- **API** — `POST toggleLog` num `itemId` que não pertence ao paciente autenticado → erro,
  nenhum log criado.
- **API** — `GET` do protocolo (paciente) inclui as datas certas por item após marcar 2-3 dias.
- **API** — `GET` do protocolo (admin) inclui as mesmas datas pro mesmo item.

## T-3: UI paciente

- **UI** — Logar como a paciente de teste → `/dashboard/treatment` → itens aparecem agrupados
  por "Week N" (não mais lista única).
- **UI** — Item da semana atual mostra a tira de 7 dias; item de semana futura/passada não (ou
  aparece só leitura).
- **UI** — Clicar num dia da tira marca (fica verde/✓); clicar de novo desmarca — sem erro no
  console.
- **UI** — Testar em viewport ~390px: tira de 7 dias não quebra o layout, cabe na tela.

## T-4: UI admin

- **UI** — Como admin, abrir a aba Protocol de um paciente de teste com pelo menos 1 dia
  marcado → a data aparece no item certo.
- **UI** — Item sem nenhum dia marcado não mostra nada quebrado (sem "undefined", sem erro).
