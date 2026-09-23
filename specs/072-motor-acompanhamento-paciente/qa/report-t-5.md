# QA — T-5: `AutomationRun`, idempotência e log unificados

**Data:** 23/09/2026 · **Commit:** `13487de9` (T-5 em `bbd19d8e`)
**Resultado: REPROVADO** (corrigido depois; ver `report-t-5-recheck.md`)

> O mecanismo de idempotência está correto e bem construído — 5.1, 5.2 e 5.3 passam com folga,
> inclusive sob concorrência real e sob falha. **O que reprova é o 5.4:** a aba que mostra o
> histórico foi para uma ficha de paciente que nenhum papel de staff consegue abrir.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| 0 | `migrate diff` sem `DROP` | ✅ |
| — | Unitários (`run-key` + `rules`) | ✅ 25/25 |
| 5.1 | `runOnce` duas vezes, mesma chave | ✅ |
| 5.2 | 8 concorrentes | ✅ |
| 5.3 | Janela diferente / situação pior | ✅ |
| **5.4** | **Ficha do paciente mostra o histórico** | ❌ **F1** |
| E1 | Cron N vezes, mesmos dados → sem linha nova | ✅ |
| E1b | Uma piora cria linha nova | ✅ (ressalva F2) |
| E2 | Falha: linha `FAILED`, exceção sobe | ✅ |
| E3 | Aba: vazio × falha | ⚠️ não executável |
| E4 | Clínica A pedindo runs de paciente da B → 404 | ✅ |
| E5 | `runKey` com `patientId` nulo | ✅ |
| F3 | Linha presa em `RUNNING` é recuperada? | ❌ |

## O que passou

```
5.1  1a ran=true | 2a ran=false reason=already-done | efeitos=1
5.2  ran=1/8 | efeitos=1 | linhas no banco=1
5.3  janela nova: efeitos=2 | situacao pior: ALERT_ESCALATED
E1   4 execucoes do cron, mesmos dados -> 2 linhas, 2 alertas
E2   excecao subiu | linha FAILED | retentativa -> DONE attempts=2
E4   paciente da propria clinica 200 | de outra 404 | inexistente 404
E5   chave de clinica e chave de paciente nao colidem
```

## F1 — a aba é inalcançável por qualquer papel de staff ❌

A aba foi para `components/patients/patient-detail.tsx`, importado só por
`app/dashboard/patients/[id]/page.tsx`. E `middleware.ts:406-438` redireciona **todo** staff para
fora de `/dashboard/*`. Capturado ao vivo, como THERAPIST da clínica do paciente:

```
307 /dashboard/patients/<id>  ->  /admin/patients/<id>
200 /admin/patients/<id>
getByRole('tab', { name: 'Automation' }).count() -> 0
```

Agrava: `alerts-centre.tsx:222` apontava o paciente para `/dashboard/patients/<id>` — o caminho que
a T-5 existe para servir (*abrir o alerta → por que este paciente foi sinalizado?*) desembocava na
ficha sem a aba.

**É a segunda vez que esta divisão de fichas morde esta atividade** — a T-2 tropeçou nela antes.

## F2 — a piora gera linha, mas o alerta fica com os números velhos 🟠

```
PASSO 1 (1 pendencia): ALERT "1 activities missed today" details={missingItems:1}
PASSO 2 (piora para 2): RUN nova com details={missingItems:2}, mas
                        ALERT continua "1 activities missed today"
```

A escalada do `createAlert` depende de **prioridade**, que é constante `LOW` — o ramo é inalcançável
para esta regra. O log fica certo e a tela fica errada.

## F3 — uma linha presa em `RUNNING` silencia a regra para sempre 🟠

Sem lease, timeout nem verificação de idade:

```
linha RUNNING criada ha 7 dias:
  1 minuto depois: ran=false reason=in-progress
  1 dia depois:    ran=false reason=in-progress
  7 dias depois:   ran=false reason=in-progress
  efeitos totais = 0
```

## F4, F5, F6 🟢

- **F4:** `patientId: "-"` literal colide com a chave de regra de clínica.
- **F5:** a rota responde 200 para o id de um membro do staff (`{"runs":[]}`) — filtra por
  `clinicId`, não por `role`.
- **F6:** se a causa da falha for o banco fora, o `update` do `catch` também lança e a exceção
  original se perde.

## Notas de ambiente

Árvore suja com a T-7 em andamento; os cenários de unidade e de API foram medidos sobre código
idêntico ao `HEAD`, os que passam pelo cron exercitam a T-7 e estão marcados. O servidor caiu às
~11:51 UTC (`.next` corrompido pela corrida entre `next build` e `next dev`); toda a evidência de UI
foi colhida antes.
