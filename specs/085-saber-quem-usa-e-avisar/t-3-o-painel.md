# T-3: O painel — quem são, onde estão, quanto usam

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo

Uma tela que responde as três perguntas do Bruno de uma vez.

## Passos

1. `app/api/admin/usage/route.ts` — por clínica, pelo actor: pessoas ativas em 7/30 dias, tempo
   médio por sessão, sessões por pessoa, cidades mais frequentes, versão do app em uso.
2. `/admin/usage` — a tela. Lista por pessoa: quando usou pela última vez, quantas sessões, quanto
   tempo no total, cidade, versão do app.
3. A versão do app na lista responde sozinha a pergunta que já custou horas: *"o update chegou?"*.

## Arquivos afetados

- `app/api/admin/usage/route.ts`, `app/admin/usage/page.tsx` (novos)
- `lib/admin-sections.ts` (entrada no menu)
- `__tests__/usage/admin-route.test.ts` (novo)

## Critérios de aceite

- [ ] Tenant pelo actor; uma clínica nunca vê o uso de outra
- [ ] THERAPIST recebe 403 — **decisão do Bruno, 26/09/2026: só ADMIN e SUPERADMIN**
- [ ] Pessoa sem nenhuma sessão aparece como "nunca abriu", não some da lista
- [ ] A cidade vazia aparece como "—", não como "desconhecida"
