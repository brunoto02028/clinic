# T-1: Profissional agendável

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

Que só quem atende paciente apareça na hora de marcar consulta. Hoje o
desenvolvedor da clínica aparece como opção porque tem role de administrador.

## Contexto

`app/api/therapists/route.ts` devolve todo `ADMIN`, `THERAPIST` e `SUPERADMIN`.
Role não serve para decidir isto: o Bruno é `SUPERADMIN` e atende, o Kaio é
`SUPERADMIN` e não atende. Precisa ser uma marcação explícita.

A rota também devolve o `email` de cada profissional, que a tela de
agendamento não usa — sai junto.

## Passos

1. Campo `bookable Boolean @default(false)` no `User`, aplicado em produção com
   `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (aditivo, nunca `db push`).
2. Marcar `bookable = true` para o Bruno, e só para ele.
3. `/api/therapists` passa a filtrar por `bookable: true` e a devolver apenas
   `id`, `firstName`, `lastName`.
4. Interruptor na ficha do profissional em Admin → Settings (ou na tela de
   equipe, onde estiver a lista de staff), para o Bruno marcar quem atende.
5. Confirmar que a rota exige sessão — hoje não há checagem visível de auth.

## Arquivos afetados

- `prisma/schema.prisma`
- `app/api/therapists/route.ts`
- tela de staff/settings do admin (localizar durante a implementação)

## Critérios de aceite

- [ ] Kaio Passos não aparece na lista ao agendar consulta
- [ ] Bruno aparece
- [ ] A resposta da rota não contém `email`
- [ ] Um novo staff criado não aparece na agenda até ser marcado
- [ ] A rota recusa requisição sem sessão
- [ ] Nenhum agendamento existente foi afetado
