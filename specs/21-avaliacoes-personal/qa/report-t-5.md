# QA T-5 — Módulo Avaliações no app do aluno (mobile)

**Data:** 2026-09-10
**Ambiente:** local :4213 (banco `bpr_clinic_local`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (backend runtime 63/63; telas mobile = código + tsc, entrega via EAS)

## Entregue
- `mobile/src/api/assessments.ts` — `fetchAssessments()` → `GET /api/mobile/assessments` (Bearer, já feito na T-1).
- Grupo `mobile/app/(app)/(avaliacoes)/`:
  - `_layout.tsx` — Stack (headerless), detectado pelo router file-based.
  - `index.tsx` — lista das avaliações do aluno (newest-first) + bloco de **tendências** (peso/gordura/cintura, primeira→última, verde=baixou/vermelho=subiu), espelhando a web `student-assessments.tsx`.
  - `[id].tsx` — detalhe read-only: composição corporal (peso/altura/IMC/%GC+método/massa magra/gorda/RCQ), sinais vitais (FC repouso, PA), medidas (circunferências), notas e **fotos de progresso**.
- Módulo `avaliacoes` ligado (gated por TRAINING, como `treino`):
  - server `app/api/mobile/modules/route.ts` — `AVALIACOES_DEF` anexado junto do `TREINO_DEF` quando `trainingOn`.
  - `mobile/src/api/modules.ts` — key `avaliacoes`.
  - `mobile/app/(app)/module-select.tsx` — `ROUTE_MAP.avaliacoes` + ícone `body-outline`.

## Evidência

### tsc
- Mobile (`tsc -p mobile/tsconfig.json`): **0 erros** nos arquivos novos (único achado é o warning pré-existente `baseUrl` deprecated no tsconfig).
- Web (`tsc --noEmit`): rota `/api/mobile/modules` sem erros.

### runtime `npm run test:tenants` → **63/63** (contra :4213)
- **M6**: aluno personal → `/api/mobile/modules` inclui `"avaliacoes"` (200).
- **M7**: paciente clínico → `/api/mobile/modules` **não** inclui `avaliacoes` (isolamento por tipo de tenant).
- **A7**: aluno personal lista as próprias avaliações via Bearer (200) — fonte de dados das telas.
- **A7b**: paciente clínico → `/api/mobile/assessments` 404 (fail-closed).

## Fora de alcance (declarado)
- Execução das telas no dispositivo/emulador e QA visual via **expo-web** não são possíveis neste ambiente. Entrega das telas ao app é por **EAS**, fora do push (Suposição 5 do plano). A verificação foi: tipos (tsc) + o comportamento server-side que as telas consomem (runtime 63/63).

## Critérios de aceite
- [x] Aluno do personal tem o módulo "Assessments" no app e vê suas avaliações (lista + tendências + detalhe + fotos), espelhando a web.
- [x] Isolado por tenant/aluno; paciente clínico não recebe o módulo nem o endpoint.

**Conclusão: APROVADO** (backend com evidência runtime; telas entregam via EAS).
