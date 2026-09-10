# T-3: Avaliação corporal — vazamento que existe hoje em prod

**Status:** concluído
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
- [x] Cenários da T-3 na qa-spec passando, estendidos às 13 rotas (paciente e staff de outro tenant recebem 404 em todas).
- [x] Regressão: o SUPERADMIN da BPR vê as mesmas avaliações e roda a análise normalmente.

## Registro
- **QA:** `qa/report-t-3.md` — aprovado, 11 de 11 cenários. Staff de outro tenant recebe 404 idêntico nas 13 rotas, o dono continua baixando o próprio PDF, o cookie de impersonação forjado por paciente não muda nada e a criação nasce no tenant do paciente.
- **Code review (`/code-review high`):** 7 achados, todos corrigidos:
  1. **(alto)** SUPERADMIN no modo "todas as clínicas" perderia acesso assim que existisse um segundo tenant. Agora ele trabalha na clínica do próprio usuário e só cai no tenant padrão se não tiver uma. Em prod as duas contas SUPERADMIN têm clínica, então nada muda.
  2. e 3. **(médios)** Paciente sem clínica (cadastro pelo app grava `clinicId` nulo) recebia 404 mentiroso. Agora responde 409 com mensagem clara. O preenchimento desses registros entra na T-14.
  4. **(médio)** E-mail bloqueado era arquivado como "enviado", o que em produção com `OUTBOUND_MODE=sink` mostraria entrega que não houve. Agora não é arquivado, só registrado no log.
  5. **(baixo)** Comentário prometia um fallback que a função não fazia.
  6. **(baixo)** `OUTBOUND_MODE` era escrito no escopo do módulo e vazava para outros arquivos de teste.
  7. **(baixo)** Variável morta no POST.
- **Verificação pós-correção:** 129/129 testes (2 novos do SUPERADMIN); `tsc` sem erro nos arquivos tocados; em runtime, 2 e-mails bloqueados, 0 linhas arquivadas, 0 P2002 e 0 envio real.
