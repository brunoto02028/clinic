# Atividade 25 — Limpeza do admin do personal (QA do Bruno)

## Objetivo
O Bruno logou como o personal e achou coisas que não deveriam estar lá. Corrigir os vazamentos para que o admin do personal-trainer seja focado em **estúdio/aluno/treino**, em **inglês UK**, sem clínico nem marketing.

## Achados (QA como trainer `qa.trainer`, local)
1. **Aba "Readiness" (ex-Screening)** na página `/admin/patients`: é o screening **clínico** (`/admin/screening-preview`), aparece para personal — a sub-aba `screening` em `lib/admin-sections.ts` **não** está marcada `clinicalOnly`.
2. **Dashboard admin** (`app/admin/page.tsx`) não é gateado por tenant: mostra cards **"Articles"/"New Article"** (marketing) e **"Training Notes" → `/admin/clinical-notes`** (clínico) para o personal (em Studio, Administration e Quick Actions).
3. **Ficha do aluno** (`app/admin/patients/[id]/page.tsx`): strings "Patient" hardcoded, não revocabuladas — **"Patient Invite Link"**, **"View as Patient"**, "so the **patient** can complete their profile".
> As abas clínicas DENTRO da ficha (Clinical Notes/Protocol/Rehab/Evidence/Screening) já estão escondidas (T-29 ok). Marketing/Instagram no nav também já escondidos.

## Decisões
| # | Decisão |
|---|---|
| D1 | `lib/admin-sections.ts`: marcar a sub-aba `screening` (patients) como `clinicalOnly: true` → some para personal (some junto com o resto do clínico) |
| D2 | `app/admin/page.tsx`: gatear por `isPersonal` (useVocab) os cards/quick-actions clínicos (clinical-notes/SOAP) e de marketing (Articles/New Article) |
| D3 | Ficha: revocabular as strings "Patient" via `relabel()` (Patient→Student) |
| D4 | Tudo inglês UK; sem API nova; clínica intocada |

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Esconder sub-aba clínica "Screening/Readiness" para personal (admin-sections) | concluído (QA) |
| T-2 | Gatear cards clínicos + marketing no dashboard admin para personal | concluído (QA) |
| T-3 | Revocabular strings "Patient" na ficha (invite link, view as, helper) | concluído (QA) |

## QA
- Trainer: nav/página de pacientes **sem** "Readiness/Screening"; dashboard **sem** Articles/New Article/clinical-notes; ficha diz "Student Invite Link"/"View as Student"/"...so the student...".
- Regressão: admin de **clínica** mantém tudo (Screening, Articles, Training Notes/SOAP, "Patient…").
