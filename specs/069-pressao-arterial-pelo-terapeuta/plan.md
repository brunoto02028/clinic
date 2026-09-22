# 069 — Pressão arterial registrada pelo terapeuta

## Objetivo
Bruno quer medir a pressão arterial de pacientes (principalmente idosos) antes de começar os exercícios de cada sessão, e ir registrando isso ao longo do tratamento, direto na ficha do paciente no admin — hoje só existe autorregistro pelo próprio paciente (app do paciente, com câmera/PPG ou manual).

## O que já existia (reaproveitado)
- Model `BloodPressureReading` (systolic/diastolic/heartRate/method/notes/measuredAt), já usado pelo autorregistro do paciente (`app/api/patient/blood-pressure`, `app/dashboard/blood-pressure`).
- `GET /api/admin/patients/[id]/blood-pressure` já existia (visão de leitura, com stats), mas sem UI nenhuma usando essa rota e sem POST — não havia como o staff registrar uma leitura.

## Decisão validada com o Bruno
**Pergunta:** quando o terapeuta registra a pressão pela ficha admin, a paciente vê isso no próprio histórico dela?
**Resposta:** sim — fica junto do histórico dela (a consulta do paciente já não distingue quem registrou; adicionamos `recordedById` só para identificar/exibir "registrada por X" no lado do admin, sem filtrar nada do lado do paciente).

## O que foi implementado
- `prisma/schema.prisma`: `BloodPressureReading.recordedById`/`recordedBy` (nullable — null = a própria paciente registrou).
- `lib/blood-pressure.ts`: validação (`parseBPBody`, inteiros, sistólica 50–300, diastólica 30–200, diastólica < sistólica, FC 30–220, notas ≤2000, data não futura/não antes de 2000) + `classifyBP` (Low/Normal/Elevated/Stage1/Stage2/Crisis, mesmas faixas já usadas nas páginas existentes).
- `app/api/admin/patients/[id]/blood-pressure/route.ts`: GET (agora com `include: recordedBy`, bloqueio de tenant personal) + POST novo.
- `app/api/admin/patients/[id]/blood-pressure/[readingId]/route.ts`: PATCH/DELETE novos, escopados por paciente.
- `components/admin/blood-pressure-tab.tsx`: nova aba "Blood Pressure" na ficha do paciente — formulário (data/hora no fuso do Reino Unido, sistólica, diastólica, FC opcional, observações), badge de classificação ao salvar, histórico com editar/excluir, gráficos (sistólica, diastólica, FC quando houver).
- **Nunca envia nada à paciente automaticamente** — diferente do autorregistro (que dispara `BP_HIGH_ALERT` por e-mail numa leitura alta), o registro pelo staff só mostra a classificação na tela para o terapeuta decidir na hora.
- Oculto para tenant personal (aba escondida + 403 na API), como Measurements e o e-mail da atividade 068.

## Verificação feita
- 25 testes de lógica (validação de criação/edição, `checkBPOrder` após merge no PATCH, `classifyBP` nas 6 faixas).
- `tsc`/`eslint` limpos nos arquivos novos.
- Conferência visual (navegador isolado, Playwright): salvar leitura alta (classificação "High (Stage 2)"), salvar leitura normal em data retroativa, editar, excluir, validação de diastólica ≥ sistólica bloqueada com mensagem, persiste após recarregar, tradução completa em PT. Dados de teste apagados.

## Code review
Aprovado, sem bloqueante. Um ponto corrigido: as duas rotas refaziam a checagem de sessão com `getServerSession` em vez de reaproveitar o `actor` já resolvido por `staffPatientAccess` — isso derrubava (401) qualquer chamada autenticada por bearer token (app mobile) mesmo sendo staff válido da clínica certa. Corrigido para usar `tenantAccess.actor` diretamente (mesmo padrão da atividade 067); a checagem de papel (ADMIN/SUPERADMIN/THERAPIST) já era feita dentro de `staffPatientAccess` via `isStaff()`, então a checagem manual duplicada também foi removida. `tsc`/`eslint` limpos após a correção.

## Deploy
Commitado (`207f7e6d`) e publicado. Um esquecimento de `git add` (mesmo erro já cometido na 068) quebrou o primeiro deploy — corrigido em `47a8df33`, desta vez verificado com `npm run build` local antes do push. No ar desde 2026-09-22T08:03:45Z.

## QA online
Aprovado, sem bugs — ver `qa/report-online.md`.
