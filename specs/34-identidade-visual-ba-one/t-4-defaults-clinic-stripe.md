# T-4: Defaults de `Clinic.primaryColor`/`secondaryColor` + branding do Stripe

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Clínicas/personal trainers novos nascem com a cor de marca em moss (BA1), em vez do slate/turquoise antigo. Fallback do branding do Stripe também alinhado. Nenhuma clínica existente tem sua cor customizada sobrescrita.

## Contexto
Ver plan.md, decisões 4 e 5, e a Suposição sobre não migrar clínicas existentes.

## Passos
1. `prisma/schema.prisma`: `Clinic.primaryColor` `@default("#607d7d")` → `@default("#4F7361")`; `Clinic.secondaryColor` `@default("#5dc9c0")` → uma variante (ex.: `#3D5A4D`, moss mais escuro, já que não há um "secondary" natural de pilar único no mockup — usar um moss escurecido em vez de inventar uma cor fora do sistema). `npx prisma db push` (aditivo, só muda o default de linhas futuras, não re-escreve dado existente).
2. `app/api/admin/stripe-branding/route.ts`: trocar os 3 fallbacks hardcoded `'#5dc9c0'`/`'#1a6b6b'` → moss/variante escura (mesmos valores da tarefa acima, pra consistência). Só o fallback usado quando a conta Stripe não tem cor configurada — não sobrescreve conta já configurada.

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/admin/stripe-branding/route.ts`

## Critérios de aceite
- [ ] Criar uma clínica nova (sem passar cor) → `primaryColor`/`secondaryColor` vêm em moss.
- [ ] Clínica existente com cor customizada mantém a cor dela após a migração (verificar direto no banco antes/depois).
- [ ] `stripe-branding` sem config prévia no Stripe → sugere moss como fallback.
