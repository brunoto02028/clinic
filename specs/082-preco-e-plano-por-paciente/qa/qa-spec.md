# QA — atividade 082 (preço e plano por paciente)

Paciente de teste identificado, nunca paciente real. Banco local compartilhado: zero DDL.

## T-1 · Preço por paciente: modelo, resolução e API

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | `migrate diff` contra `main` | zero `DROP` |
| 1.2 | API | paciente sem exceção | vê o preço da clínica |
| 1.3 | API | exceção de £80 com preço de clínica £100 | o paciente vê e é cobrado £80 |
| 1.4 | API | exceção de £0 | 0 é preço (cortesia), não "não precificado" |
| 1.5 | API | exceção de serviço que a clínica não precificou | vale por si |
| 1.6 | API | nada configurado | `null` — nunca 60 |
| 1.7 | API | `/api/patient/service-prices` do paciente com exceção | traz o preço dele, sem `note`, sem dizer que é exceção |
| 1.8 | API | `booking-options` e `POST /api/appointments` | o mesmo número nos dois |
| 1.9 | API | `PUT /api/admin/patient-prices` com paciente de outra clínica | 404 |
| 1.10 | API | `PUT` por THERAPIST | 403 |
| 1.11 | API | `PUT` com preço negativo / não-número | 400 |
| 1.12 | API | `PUT` duas vezes no mesmo serviço | substitui, não duplica (`@@unique`) |
| 1.13 | API | `DELETE` com id de outra clínica | 404 |
| 1.14 | API | `DELETE` | o paciente volta ao preço da clínica |
| 1.15 | API | auditoria | `PATIENT_PRICE_SET` / `PATIENT_PRICE_REMOVED` com e-mail real do autor |

## T-2 · Preço por paciente no painel

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | buscar paciente → "Set a price for this patient" | abre a janela com os quatro serviços |
| 2.2 | UI | cada linha | mostra o preço da clínica e, quando há, o do paciente |
| 2.3 | UI | salvar £80 com motivo | salva, recarrega, o motivo persiste |
| 2.4 | UI | "Clear" | a exceção some e a linha volta a mostrar só o preço da clínica |
| 2.5 | UI | terapeuta | não consegue salvar (403 do servidor) |

## T-3 · Planos no app do paciente da clínica

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | API | plano `patientScope: "all"` ativo | aparece para qualquer paciente da clínica |
| 3.2 | API | plano `"specific"` de outro paciente | **não** aparece |
| 3.3 | API | plano `"specific"` dele | aparece |
| 3.4 | API | plano de outra clínica | não aparece |
| 3.5 | API | `subscribe` num plano não oferecido a ele | 404 |
| 3.6 | API | `subscribe` em plano pago sem `stripePriceId` | recusa (não ativa de graça) |
| 3.7 | UI | menu da clínica | tem "Plans"/"Planos" e abre a tela |
| 3.8 | UI | sem planos | texto honesto, sem card vazio |
| 3.9 | UI | com assinatura ativa | mostra o plano e o botão de cancelar |
| 3.10 | API | `tsc` do mobile | limpo |

## O que não será medido, e por quê

| item | motivo |
|---|---|
| telas nativas | exigem build novo no aparelho |
| Checkout real da Stripe | proibido; só as recusas |
