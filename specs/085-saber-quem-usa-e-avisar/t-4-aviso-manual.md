# T-4: Aviso manual — público por tenant, prévia, histórico

**Status:** pendente
**Depende de:** T-3

## Objetivo

O Bruno manda um aviso para quem ele escolher, vendo antes exatamente o que a pessoa vai ler.

## Contexto

Decisões 3 e 4 do plano. **O envio em massa é a forma exata do incidente de 11/09/2026** — vazamento
cross-tenant. Por isso o filtro de tenant é a primeira coisa, com teste que reprova quem o remover.

E o push fica no transacional: novidade sobre o que vendemos vai para a T-5, dentro do app.

## Passos

1. `Announcement { id, clinicId, titleEn, titlePt, bodyEn, bodyPt, audience, sentAt?, sentById,
   recipients }` — aditivo.
2. Público: todos os pacientes da clínica, só quem tem a área clínica, só quem tem o laboratório, ou
   uma pessoa. **Sempre** derivado de `clinicId` do actor.
3. Prévia obrigatória: a tela mostra o cartão como ele chega no aparelho, com o logo BPR, nas duas
   línguas, e a contagem de quantas pessoas vão receber. Sem passar por ela, não há botão de enviar.
4. Enviar é **manual**, um clique, sem agendamento. Grava `sentAt`, quem mandou e quantos receberam.
5. Histórico: o que já foi enviado, para quem, quando.

## Arquivos afetados

- `prisma/schema.prisma`, `app/api/admin/announcements/route.ts` (novo)
- `app/admin/announcements/page.tsx` (novo), `lib/push-send.ts`
- `__tests__/usage/announcement-tenant.test.ts` (novo)

## Critérios de aceite

- [ ] O público **nunca** inclui pessoa de outra clínica — teste que reprova a remoção do filtro
- [ ] Sem prévia vista, o botão de enviar não existe
- [ ] A prévia mostra as duas línguas e o logo BPR
- [ ] Enviar duas vezes o mesmo aviso não manda duas vezes
- [ ] Quem não tem token de push simplesmente não recebe, e isso aparece na contagem
- [ ] Nada é enviado por cron, agendamento ou automação
