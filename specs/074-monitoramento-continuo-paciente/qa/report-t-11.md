# QA Report — T-11: Bloqueio da sessão por pressão pré-exercício

**Data:** 24/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic` · **Servidor:** `http://localhost:4010` (deste worktree)
**Dados de teste:** clínica `qa-t9t11-clinic`, paciente `qa-t9t11-patient-a@example.com`, admin
`qa-t9t11-admin@example.com`. Nenhum paciente real tocado. Tudo apagado ao final.
**Browser:** Chromium isolado por cenário (contexto novo, cache vazio) — por causa do
`Cache-Control: immutable` dos chunks do dev server.

**Resultado geral:** ⚠️ **aprovado com ressalva** — 15 de 16 verificações passaram; uma falha real
(R1), **corrigida depois deste QA**.

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 8 | Sem leitura recente → `NO_RECENT_READING`; bearer inválido → 401 | API | ✅ |
| 9a | 205/112 → `BLOCKED`, clínica avisada do bloqueio, paciente recebe a crise | API | ✅ |
| 9b | 195/112 → `BLOCKED` + crise (bloqueia pela diastólica) | API | ✅ |
| 9c | 175/112 → `BLOCKED` e **não** é crise: clínica sim, paciente **não** | API | ✅ |
| 9d | 170/105 com limites padrão → não bloqueia | API | ✅ |
| 10 | Leitura de 3 h atrás acima do limite → `NO_RECENT_READING` | API | ✅ |
| 11 | 150/95 recente → `CLEAR` | API | ✅ |
| 12 | Exatamente 200/110 → **não** bloqueia | API | ✅ |
| 13 | Banner com valor, hora e orientação; toggle desabilitado; item feito desmarcável — EN e PT | UI | ✅ |
| 13b | **O bloqueio era contornável pela tira de dias da mesma tela** | UI | ❌ → corrigido |
| 14a | Os quatro campos da `EXERCISE_BP_LIMITS` editáveis e salvando | UI | ✅ |
| 14b | 600/400 recusado **dentro do cartão**, nos dois idiomas | UI | ✅ |
| 14c | Preview diz "On a reading of 205/112 mmHg" (achado R6 anterior) | UI | ✅ |
| 15 | Editar uma regra não altera a outra, nos dois sentidos | UI+API | ✅ |
| 16 | Regra da clínica em 170/100: 175/102 bloqueia, 165/95 não | API | ✅ |
| — | `__tests__/automation/exercise-bp.test.ts` | Unit | ✅ 14/14 |

## Evidências decisivas

**9c — o caso que separa as duas perguntas** (bloqueia treino, não é crise):

```
{"state":"BLOCKED","blocked":true,"reading":{"systolic":175,"diastolic":112,...},"validForMinutes":60}
[OUTBOUND-SINK] email → qa-t9t11-clinic@example.com: 🚨 High Blood Pressure Reading — 175/112 mmHg
(nenhuma mensagem para o paciente)
```

Corpo do alerta à clínica, capturado substituindo só `@/lib/email` e rodando o handler real:

```
175/112 → | Reading | 175/112 mmHg | Classification | Stage 2 Hypertension |
           | Exercise | Today's session is blocked — above 200/110 mmHg. Review and contact the patient. |
205/112 → idem + e-mail ao paciente (⚠️ Blood Pressure Alert)
170/105 → sem a linha "Exercise"
```

A linha **Exercise** aparece exatamente quando bloqueia e some quando não bloqueia. "Revisar e
contatar o paciente" é a ação do plano comercial, com essas palavras.

**10 — leitura velha não decide nada:** 205/112 medida há 3 h → `NO_RECENT_READING`, `reading: null`.
**12 — o limite libera:** 200/110 exatos → `CLEAR`.

**13 — a tela, nos dois idiomas** (`screenshots/t-11-treatment-bloqueado-{en-GB,pt-BR}.png`):

```
No training today / Hoje não vamos treinar
Your reading at 05:02 was 205/112 mmHg, above the 200/110 limit we use to clear exercise.
Rest seated for 5 minutes and measure again. If it stays high, speak to your doctor.
  Your therapist has been notified.
With chest pain, breathlessness or dizziness, call the emergency services. This app is not an emergency service.
[Log a new reading] [Check again]

"Exercise Done"    title="Mark as done today"                   disabled=false jaFeito=true
"Exercise Pending" title="Blocked today by your blood pressure"  disabled=true  jaFeito=false
```

Item já marcado continua desmarcável (1/2 → 0/2), e depois de desmarcado fica bloqueado como o
outro — que é o que `disabled={blocked && !task.doneToday}` diz.

**14c — o R6 do QA anterior está corrigido:**

```
EN: On a reading of 205/112 mmHg: "Session blocked — blood pressure 205/112 mmHg"
PT: Numa leitura de 205/112 mmHg: "Sessao bloqueada — pressao 205/112 mmHg"
```

**15 — as duas regras não se contaminam**, provado nos dois sentidos e com efeito cruzado
(treino 170/100, alerta 140/90): 175/102 `BLOCKED`, 165/95 `CLEAR`.

## R1 — o bloqueio só cobria um dos controles da tela ❌ → corrigido

Com o banner na tela e o botão do cartão "Hoje" desabilitado, o círculo de **hoje** na tira de dias
de "General Exercises" continuava clicável e marcava o exercício (contador 1/2 → 2/2).
Evidência: `screenshots/t-11-treatment-bypass-tira-de-dias.png`.

Causa: só `TodayCard` recebia `blocked`; `DayStrip` e `WeekSection` não, e nenhuma rota de servidor
consultava o clearance — o bloqueio era só de interface.

**Corrigido depois deste QA, em duas frentes:**
- `blocked` propagado para `WeekSection` e `PrescriptionSection` → `DayStrip`, que desabilita **só
  o círculo de hoje** (dias passados continuam marcáveis: corrigir o histórico não é treinar).
- `lib/exercise-gate.ts` (novo) recusa no servidor: `PATCH /api/exercises` e
  `POST /api/patient/protocol` devolvem **409** com o motivo nos dois idiomas quando a marcação é de
  hoje e a pressão bloqueia. Desmarcar continua permitido.

Prova da correção no servidor:

```
1) sem leitura, hoje:            { blocked: false }
2) 205/112 agora, hoje:          { blocked: true, systolic: 205, diastolic: 112, limits: { 200, 110 } }
3) a mesma leitura, marcando ONTEM: { blocked: false }
4) 150/92 agora, hoje:           { blocked: false }
```

## Outras ressalvas (menores, nenhuma corrigida aqui)

- **R2 — o `name` da regra não é traduzido** em `/admin/automation`: o campo é único, sem par
  `namePt`. Vale para as quatro regras do painel; é anterior à T-11.
- **R3 — o e-mail de crise ao paciente traz o texto brando.** O `plainMessage` diz "Call 999/112 or
  go to A&E now", mas o template `BP_HIGH_ALERT` diz "contact your GP ... if this reading
  persists". Quem lê por e-mail recebe a versão branda de uma crise. É da T-4/T-13.

## Estado do banco

Tudo `qa-t9t11-*` apagado (leituras, conexões, logs, prescrições, exercícios, usuários e a clínica).
Restaram só as duas regras globais, nos valores semeados: `BP_THRESHOLDS` 130/80–180/120 e
`EXERCISE_BP_LIMITS` 200/110–250/115.
