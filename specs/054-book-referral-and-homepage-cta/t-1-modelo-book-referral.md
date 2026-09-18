# T-1: Modelo `BookReferral` no schema

**Status:** concluído (QA aprovado, sem achados de review)
**Depende de:** nenhuma

## Objetivo
Criar a estrutura de dados pra rastrear indicações do livro: quem indicou, quem foi indicado, e se o amigo converteu (se cadastrou de fato).

## Contexto
`EmailContact` é o modelo compartilhado de contatos (ver `prisma/schema.prisma:3542+`). O padrão já usado no projeto pra "link solto" (sem FK obrigatória) é o `EmailContact.patientId` — vamos seguir o mesmo padrão pra `referrerContactId`/`friendContactId`, evitando obrigar uma relação Prisma formal onde nem sempre há um contato conhecido do lado de quem indica (visitante anônimo em `/beyond-pain`).

## Passos
1. Adicionar em `prisma/schema.prisma`:
```prisma
model BookReferral {
  id                String    @id @default(cuid())
  referrerContactId String?   // EmailContact.id de quem indicou, quando veio de um link de e-mail (?refFrom=)
  referrerName      String?   // nome digitado por visitante anônimo em /beyond-pain (sem contactId conhecido)
  friendEmail       String
  friendName        String?
  locale            String    @default("en")
  ipHash            String?   // hash do IP de quem indicou, só pra limite anti-abuso — nunca o IP puro
  sentAt            DateTime  @default(now())
  convertedAt       DateTime? // quando o amigo efetivamente completou a captura (?ref=)
  friendContactId   String?   // EmailContact.id do amigo, preenchido na conversão

  @@index([referrerContactId])
  @@index([friendEmail])
  @@index([sentAt])
}
```
2. `npx prisma generate`.
3. `npx prisma db push --skip-generate` contra o banco local de dev — confirmar que sincroniza sem erro.

## Arquivos afetados
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] `BookReferral` existe no schema com os campos acima.
- [ ] `npx prisma db push` roda sem erro no banco local.
- [ ] `npx prisma generate` roda sem erro (client atualizado).
