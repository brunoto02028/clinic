# QA — T-2: Listas e cadastro de pacientes na clínica certa + vazamento `?clinicId`

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 097cf02

## Local (fixture de tenants: QA Clinic A, QA Studio PT, BPR local)
| Cenário | Esperado | Obtido |
|---|---|---|
| Terapeuta da clínica A: `GET /api/patients?clinicId=<BPR>` | só pacientes da A | só clínica A (antes: devolvia os da BPR) |
| Terapeuta da clínica A: `GET /api/patients` | só da A | só clínica A |
| Terapeuta da clínica A: `GET /api/admin/patients` | só da A | 2 pacientes (os da A) |
| SUPERADMIN trocando a Active Clinic | lista muda junto | BPR local: 1 · BPR2: 1 · clínica A: 2 |

## Produção
| Cenário | Obtido |
|---|---|
| Active Clinic padrão (BPR) | `/api/patients` e `/api/admin/patients` → 6 pacientes, todos com `clinicId` da BPR |
| SUPERADMIN com `?clinicId=<clínica "Bruno">` | devolve a clínica pedida (vazia — essa clínica não tem pacientes) |
| Active Clinic = "Bruno" | as duas listas ficam vazias; paciente da BPR responde 404 ao ser aberto |
| Criar paciente com Active Clinic = "Bruno" | 201 e `clinicId` da clínica "Bruno"; não aparece na lista da BPR (apagado em seguida) |
| Voltar para a BPR | listas voltam aos 6 pacientes |
| Tela `/admin/patients` | abre normalmente, "6 patients", sem erro no console — `screenshots/prod-t2-01-lista-pacientes.png` |

## Unit
`__tests__/tenant/patient-lists.test.ts`: `?clinicId` ignorado para staff; SUPERADMIN pode apontar
para outra clínica; sem clínica → 403; paciente → 403/401; filtros de busca e letra preservados.
