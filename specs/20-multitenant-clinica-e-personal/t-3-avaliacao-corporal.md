# T-3: Avaliação corporal — vazamento que existe hoje em prod

**Status:** pendente
**Trilha:** CLÍNICA (usa o helper da plataforma)
**Depende de:** T-2

## Objetivo
Fechar o achado C1 e o que apareceu em volta dele.

Hoje qualquer usuário logado, inclusive paciente, lê a avaliação corporal de qualquer paciente pelo ID, com e-mail e telefone (confirmado no ISO-7 da atividade 19). O mapeamento da T-3 mostrou que isso se estende a **13 rotas**.

## Escopo real (mapeado em 2026-09-10)

| Rota | Hoje | Correção |
|---|---|---|
| `admin/body-assessments/[id]` GET | só sessão (**C1**) | staff do mesmo tenant |
| `[id]` PUT | papel, sem tenant | staff do mesmo tenant |
| `[id]` DELETE | ADMIN/SUPERADMIN (revisar tenant) | staff do mesmo tenant |
| `[id]/ai-enhance` | **só sessão** | staff do mesmo tenant |
| `[id]/analyze` | **só sessão** (paciente dispara IA e altera avaliação alheia) | staff do mesmo tenant |
| `[id]/request-recapture` | **só sessão** | staff do mesmo tenant |
| `[id]/send-capture-link` | **só sessão** (manda link ao paciente de outro) | staff do mesmo tenant |
| `[id]/export-exercises`, `[id]/generate-home-protocol` | papel, sem tenant; gravam `clinicId: ""` sem sessão de clínica | staff do mesmo tenant; gravar o `clinicId` **da avaliação** |
| `[id]/generate-notes`, `[id]/send-to-patient` (POST/DELETE), `[id]/upload-photo` | papel, sem tenant | staff do mesmo tenant |
| `admin/body-assessments` GET (lista) | SUPERADMIN sem clínica vê todos os tenants | escopo pelo tenant do ator (D4) |
| `admin/body-assessments` POST | aceita `patientId` de outro tenant | `assertPatientAccess` |
| `body-assessments/[id]/report-pdf` | paciente ok; staff sem tenant | paciente dono ou staff do mesmo tenant |

Fora do escopo desta tarefa (já estão corretas ou pertencem a outra):
- `body-assessments/capture/[token]`: acesso por token de captura, correto.
- `patient/body-assessments`: só as do próprio paciente, correto.
- `admin/body-assessments/generate-avatars`: ativos da plataforma, entra na triagem da T-6.

## Passos
1. Em cada rota acima: `getActor`, depois `requireStaff` (nas rotas de admin), depois `assertRecordAccess(actor, avaliação)`. Registro de outro tenant responde 404.
2. Lista e criação: `tenantWhere(actor)` e `assertPatientAccess`.
3. `export-exercises` e `generate-home-protocol`: gravar com o `clinicId` da avaliação, nunca `""`.
4. É candidata a push isolado (vale para prod hoje), se o Bruno quiser adiantar.

## Critérios de aceite
- [ ] Cenários da T-3 na qa-spec passando, estendidos às 13 rotas (paciente e staff de outro tenant recebem 404 em todas).
- [ ] Regressão: o SUPERADMIN da BPR vê as mesmas avaliações e roda a análise normalmente.
