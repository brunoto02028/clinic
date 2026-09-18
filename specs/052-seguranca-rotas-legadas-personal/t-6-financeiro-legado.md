# T-6: Financeiro legado — treatment plans, memberships, invoices, marketplace, finance

**Status:** pendente
**Depende de:** T-1 (a parte "aluno" já cai no 403 da T-1; aqui fechamos a parte staff entre tenants)

## Objetivo
Toda rota financeira legada respeita tenant e papel: um staff só mexe no que é do próprio tenant, e o que usa a conta Stripe global da BPR fica só com o SUPERADMIN.

## Contexto
| Rota | Problema |
|---|---|
| `app/api/admin/treatment-plans/[id]/route.ts` GET/PUT/DELETE (:21-43, :52-118, :178-205) | sem tenant |
| `app/api/admin/treatment-plans/route.ts:73` | POST aceita `patientId` de outro tenant |
| `app/api/admin/memberships/[id]/route.ts` PUT/DELETE (:11-107, :118-141) | sem tenant |
| `app/api/admin/memberships/route.ts:57` | POST aceita `patientId` de outro tenant |
| `app/api/admin/appointments/[id]/invoice/route.ts:64-71,91-103` | sem tenant; HTML com dados pessoais do paciente + dados bancários da BPR |
| `app/api/admin/patients/[id]/invoice/route.ts:18-48` | única rota de `patients/[id]/**` sem `staffPatientAccess`; enfileira fatura falsa na fila de aprovação da BPR |
| `app/api/admin/marketplace/products/route.ts` GET/POST/PATCH/DELETE | só checam sessão |
| `app/api/admin/marketplace/orders/route.ts:80` | marca pedido de outro tenant como `paid` |
| `app/api/patient/marketplace/checkout/route.ts:28,48,119-123` | total 0 → pedido `paid` |
| `app/api/admin/finance/stripe/route.ts` GET/POST | só sessão; usa a chave Stripe global da BPR (saldo, cobranças com e-mail, importação para o livro de qualquer tenant) |
| `app/api/admin/finance/route.ts:10-15` (+ `categories`, `api-keys` :46-72, `ocr`) | só sessão + `clinicId`, sem papel |
| `app/api/patient/membership/subscribe/route.ts:67-73,105-122` | plano por id sem tenant/`patientScope`; plano pago sem `stripePriceId` ativa em "manual payment mode" |

## Passos
1. Treatment plans e memberships (`[id]` e POST): `getActor` + `clinicId` no `where`; `patientId` validado com `staffPatientAccess`.
2. Invoices: `appointments/[id]/invoice` → tenant do actor. `patients/[id]/invoice` → `staffPatientAccess`, igual às rotas irmãs.
3. Marketplace:
   - produtos e pedidos → staff do tenant (ADMIN) + `clinicId` no `where`;
   - checkout do paciente → produto do tenant do paciente;
   - total 0 **não** vira `paid` automaticamente, a não ser que o produto seja gratuito de propósito (preço cadastrado 0).
4. `finance/stripe` (usa a chave global da BPR) → **só SUPERADMIN**.
5. `finance` e subrotas → staff (ADMIN/SUPERADMIN) do tenant. API keys: só ADMIN do tenant.
6. `membership/subscribe`:
   - plano precisa ser do tenant do paciente e estar no `patientScope` dele;
   - plano com preço > 0 e sem `stripePriceId` → erro, nunca ativação manual.

## Arquivos afetados
- `app/api/admin/treatment-plans/route.ts`, `app/api/admin/treatment-plans/[id]/route.ts`
- `app/api/admin/memberships/route.ts`, `app/api/admin/memberships/[id]/route.ts`
- `app/api/admin/appointments/[id]/invoice/route.ts`, `app/api/admin/patients/[id]/invoice/route.ts`
- `app/api/admin/marketplace/products/route.ts`, `app/api/admin/marketplace/orders/route.ts`, `app/api/patient/marketplace/checkout/route.ts`
- `app/api/admin/finance/stripe/route.ts`, `app/api/admin/finance/**`
- `app/api/patient/membership/subscribe/route.ts`

## Critérios de aceite
- [ ] Personal B → GET/PUT/DELETE de treatment plan e membership do A → 404; banco inalterado.
- [ ] Personal B → POST treatment plan/membership com `patientId` do A → 404; nenhuma notificação.
- [ ] Personal B → invoice de sessão do A → 404; `POST patients/<A>/invoice` → 404; fila de aprovação sem item novo.
- [ ] Personal (ADMIN) → `GET /api/admin/finance/stripe` → 403; SUPERADMIN → 200.
- [ ] Staff B → produto/pedido do A → 404.
- [ ] Checkout de marketplace com total 0 num produto pago → não vira `paid`.
- [ ] Aluno assina plano de outro tenant → 404. Plano pago sem preço Stripe → erro, sem `ServiceAccess` criado.
- [ ] Clínica BPR (SUPERADMIN): treatment plans, memberships, invoices, marketplace e finance funcionam como antes (regressão).
