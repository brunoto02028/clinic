# T-2: Tela do cupom no painel da clínica

**Status:** implementada · QA pendente
**Depende de:** T-1

## Objetivo

O Bruno cria, edita, desliga e **acompanha** um cupom sem eu rodar nada. Self-service, como ele
pediu para o idioma do paciente.

## Contexto

O preço por paciente mora em `/admin/service-pricing` (superadmin). O cupom é da mesma família de
decisões, então fica ao lado — não numa tela nova e solta.

## Passos (feitos)

1. `app/api/admin/coupons/route.ts` — GET (lista + contagem de resgates), POST (criar),
   `[id]/route.ts` — PATCH (editar, ligar/desligar), DELETE (só sem resgate; com resgate,
   desativa em vez de apagar — o histórico da cobrança não se apaga).
2. Guarda: `getSessionStaffActor` + `role === "SUPERADMIN"`, e o tenant sempre pelo actor.
   `logAudit` em criação, edição e desativação.
3. Tela em `/admin/coupons` (ou aba dentro do hub de preços):
   - lista com código, o que desconta, alcance, mira, janela, resgates `usados/limite`, ativo;
   - formulário: código, descrição, % **ou** valor, alcance (caixas), mira (todos / escolher
     paciente), datas, limites;
   - a lista de alcance tem cinco opções — consulta, sessão, pacote de sessões, plano de
     tratamento e assinatura. **Exame não está lá**, e a tela diz isso em uma linha, senão a
     ausência parece esquecimento (decisão 5).
   - o botão "Ativo" salva na hora — não numa gravação separada, que foi o defeito da tela de
     preços em 26/09.
4. Painel de resgates do cupom: quem usou, quando, quanto desceu.

## Arquivos afetados

- `app/api/admin/coupons/route.ts`, `app/api/admin/coupons/[id]/route.ts`,
  `app/api/admin/coupons/[id]/redemptions/route.ts` (novos)
- `lib/superadmin-routes.ts`, `lib/admin-sections.ts` (a entrada no menu)
- `app/admin/coupons/page.tsx` + componente de formulário (novos)
- navegação do admin (onde `/admin/service-pricing` aparece)
- `__tests__/coupon/admin-route.test.ts` (novo)

## Critérios de aceite

- [ ] ADMIN e THERAPIST recebem 403; SUPERADMIN cria
- [ ] Código repetido na mesma clínica é recusado com frase, não com erro de banco
- [ ] Cupom sem nenhum alcance marcado não salva
- [ ] Percentual **e** valor fixo juntos não salvam
- [ ] Cupom com resgate não é apagado — é desativado, e a tela diz por quê
- [ ] A tela oferece os cinco alcances, não oferece exame, e explica por quê em uma linha
- [ ] "Ativo" persiste ao primeiro clique
- [ ] Toda escrita gera `logAudit`
