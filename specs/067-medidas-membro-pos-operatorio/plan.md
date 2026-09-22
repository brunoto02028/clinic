# 067 — Medidas do membro no pós-operatório (coxas + ADM do joelho)

## Objetivo
Bruno precisa registrar, ao longo do pós-operatório, (a) a circunferência das **duas coxas** (sabendo qual é a operada) e (b) o **ângulo de flexão e extensão** do joelho operado, e ver a evolução junto do protocolo semanal e da evolução do paciente. Caso de uso imediato: Ana Livia Pessin Prata (LCA esquerdo, cirurgia 25/08/2026).

## Decisões de design
- **Novo model `PatientLimbMeasurement`** (`patient_limb_measurements`). Nada existente serve: `BodyAssessment.thighCm` é uma medida só (lado dominante), `PatientOutcomeMeasure` guarda escores, `StudentAssessment` é do personal.
- Cada registro guarda o **lado operado** (LEFT/RIGHT) como snapshot; o formulário pré-preenche com o último registro.
- **Dois pontos de medida da coxa**, fixos: vasto medial (VMO) e meio de coxa (reto femoral). Cada um com a **distância da base da patela (cm)** registrada, para a medida ser reprodutível, e circunferência esquerda/direita.
- **ADM do joelho operado:** flexão (0–180°) e extensão (−40…+30°; negativo = déficit de extensão, positivo = hiperextensão), com modo ATIVO/PASSIVO.
- **Vínculo com o protocolo:** o servidor resolve o protocolo ativo do paciente (mais recente, não substituído, não arquivado, com `startDate`) e grava `protocolId` + `protocolWeek = floor((medida − startDate)/7d)+1`. A tabela mostra a semana; assim a evolução fica salva junto do protocolo.
- **Só clínica:** aba "Measurements" na ficha do paciente, oculta para o personal, nada na área do paciente.
- Sem dependência nova; reaproveita `TrendChart` (SVG interno).
- Rotas admin com `staffPatientAccess` (escopo de clínica; registro de outro tenant responde como inexistente).
- Deploy do schema é por `prisma db push` no `start.sh` (sem pasta de migrations) — model novo é só adição.

## Tarefas
| T-N | nome | status |
|---|---|---|
| T-1 | Model + API (GET/POST/PATCH/DELETE) | concluído |
| T-2 | Aba "Measurements" (formulário, histórico, gráficos) | concluído |
| T-3 | Vínculo com protocolo/semana + atalho na aba de protocolo | concluído |

## Suposições (validar)
1. Pontos fixos VMO + meio de coxa (Bruno não escolheu entre fixos e genéricos; ele mesmo mediu esses dois).
2. Um par flexão/extensão por registro, com modo ativo/passivo (Bruno disse "graus de extensão e flexão" sem especificar).
3. Semana do protocolo calculada do `startDate` do protocolo ativo (para a Ana, `startDate` = 25/08 = data da cirurgia, então semana do protocolo = semana pós-op).
4. Os valores de 19 cm e 22 cm citados no 1º dia parecem pequenos para circunferência de coxa de adolescente — **não foram lançados**; Bruno confirma antes.
5. Rótulos da aba seguem o `useLocale` (EN/PT); texto clínico de uso interno, nunca enviado à paciente.

## Resultado
QA local aprovado (reports t-1..t-3, incluindo 2 retestes) e code review independente feito (sem bloqueantes; corrigidos: protocolo ativo só `SENT_TO_PATIENT`, PATCH sem re-vincular protocolo, semana por dia de calendário, validação estrita, mensagem para texto não numérico, arredondamento simétrico). **QA online (prod) aprovado após o deploy do commit b0859f30 — ver qa/report-online.md.**

## Pendências / decisões
- API de medidas acessível a staff de estúdio personal por chamada direta (só a aba é escondida) — igual às demais rotas clínicas; bloquear por tipo de tenant é decisão de produto.
- Lançar as medidas reais da Ana (1º dia e hoje) após Bruno confirmar os valores (19 cm/22 cm parecem pequenos para circunferência de coxa) e o lado operado.

## Correção pós-deploy (22/09/2026)
Bruno pediu 3 pontos de medida fixos (5, 10 e 15 cm acima da patela) em vez de 2 sítios (VMO/meio de coxa) com distância livre. Como nenhuma medida real havia sido lançada ainda (nem a da Ana), a troca de schema foi direta, sem migração de dados.

**Mudanças:** `prisma/schema.prisma` (`thigh5/10/15 Left/RightCm` no lugar de `vmo*`/`midThigh*`), `lib/limb-measurements.ts` (validação genérica por `POINTS = [5,10,15]`), `components/admin/limb-measurements-tab.tsx` (formulário com 3 seções fixas, sem campo de distância; tabela e gráficos por ponto). API (`route.ts`/`[measurementId]/route.ts`) não mudou — já era genérica.

**Verificação:** 10 testes de lógica (validação + cálculo de Δ, incl. arredondamento simétrico) + conferência visual no navegador (Playwright): salvar 1ª e 2ª medida, Δ correto nos 3 pontos, gráficos com 2 pontos, edição pré-preenchida, tradução PT. Dados de teste apagados.
