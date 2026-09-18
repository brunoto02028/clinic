# QA Report — T-4: UI admin — histórico/adesão por item

**Data:** 2026-09-15 (re-verificação pós-fix)
**Resultado geral:** ✅ aprovado

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Item com dia(s) marcado(s) mostra as datas certas na aba Protocol | UI+API | ✅ |
| 2 | Item sem log não quebra layout | UI | ✅ |
| 3 | Sem erro de console | UI | ✅ |

## Ambiente
Admin `qa.admina@example.test`, paciente de teste `qa.pacientea` (reaproveitada) com protocolo
ACL novo. Marquei "hoje" (2026-09-15) em 3 itens como paciente — "Quad Sets (Isometric)",
"Ankle Pumps", "Heel Slides" — e deixei outros itens (ex. "Passive Knee Extension (Heel Prop)")
sem nenhum dia marcado, pra testar os dois casos juntos.

## Detalhes

### 1. Datas aparecem corretamente na aba Protocol ✅
Fix aplicado em `app/api/admin/patients/[id]/route.ts` (adicionou `completionLogs` dentro do
`include.items` do `treatmentProtocol.findMany`, que é o endpoint que
`GET /api/admin/patients/[id]` — usado de fato pela tela do admin — expõe). Confirmado em duas
camadas:

**API** — `GET /api/admin/patients/[id]` (o endpoint real da tela, não o `/protocol` isolado)
agora retorna `completionLogs` por item:
```
Quad Sets (Isometric) -> [ { completedDate: '2026-09-15T00:00:00.000Z' } ]
Ankle Pumps           -> [ { completedDate: '2026-09-15T00:00:00.000Z' } ]
Heel Slides           -> [ { completedDate: '2026-09-15T00:00:00.000Z' } ]
```

**UI** — aba Protocol do paciente (`/admin/patients/[id]`), screenshot
`t-4-reverify-admin-protocol-dates.png`: os três itens marcados mostram "✓ 15/09" ao lado do
título, exatamente a data que a paciente marcou; "Passive Knee Extension (Heel Prop)" (sem log)
não mostra nada — sem "undefined", sem quebra de layout.

### 2. Item sem log ✅
Confirmado com dado real chegando corretamente pros outros itens (ao contrário do relatório
anterior, onde isso era só incidental por o bug afetar todos igualmente): "Manual therapy +
NMES + Laser" e "Passive Knee Extension (Heel Prop)", sem nenhum `completionLog`, aparecem sem
qualquer marcação de data — nem espaço em branco quebrado, nem "undefined".

### 3. Console ✅
Sem erros de console ao abrir a aba Protocol, navegar e trocar de aba.

## Erros de console
Nenhum.

## Falhas e recomendações
Nenhuma. O fix em `app/api/admin/patients/[id]/route.ts` (adicionar `completionLogs` ao
`include.items`) resolveu o bloqueador do relatório anterior — confirmado tanto no endpoint
quanto na tela real do admin, com múltiplos itens (com e sem log) e sem erros de console.

## Limpeza de dados de teste
Os protocolos de teste usados nesta verificação (e na de T-3, mesma paciente) foram removidos
ao final da sessão — ver `report-t-3.md` para o detalhe da limpeza (mesma paciente, mesma
sessão de QA).

## Limpeza de dados de teste
Ao final da bateria de QA (T-1 a T-4), removi todos os dados de teste criados nesta sessão:
- Protocolo `cmu2nqzuv0003xz943l6k9b5s` (ACL Reconstruction, atribuído a `qa.pacientea`) —
  deletado, com cascade para `ProtocolItem` e `ExerciseCompletionLog`.
- 28 `ExercisePrescription` criadas pela atribuição do template — deletadas.
- `fullAccessOverride` que precisei ligar temporariamente em `qa.pacientea` e `qa.pacientea2`
  (para contornar o gate de módulo `mod_treatment`, que bloqueava até o `GET` inicial) — revertido
  para `false` em ambos, `moduleOverrides` limpo.
- Scripts Prisma temporários (reset de senha, teste de constraint, cleanup) ficaram apenas no
  diretório de scratchpad da sessão, fora do repositório — nenhum arquivo novo deixado em
  `scripts/`.
- Confirmado via `GET /api/admin/patients/[id]/protocol` que o paciente voltou a `{"protocols":[]}`.
