# Atividade 13 — Gráficos de progresso do paciente (portal web)

**Status geral:** em andamento — 4 tarefas implementadas, em QA (agente qa-tester)

## Objetivo
Mostrar ao paciente a **evolução ao longo do tempo** das métricas de reabilitação
que já são coletadas: **dor (VAS 0–10)**, **função (FAAM ADL% / Sport% / função geral)**
e **aderência aos exercícios**. Hoje o portal mostra só o **último** valor — o dado
histórico existe, mas é desperdiçado. Reabilitação *é* demonstrar dor caindo e função
subindo; o gráfico é a prova visual disso, e o que mais motiva aderência e retenção.

Escopo desta atividade: **portal web do paciente** (`app/dashboard/**`), que já é
embrulhado pelo app **Capacitor** (`com.bpr.clinic`) — logo, aparece nas duas superfícies
de uma vez. A mudança de API deixa o terreno pronto para o app **Expo** (`mobile/`)
consumir depois, mas **as telas nativas do Expo estão fora desta atividade**.

## Contexto técnico (levantado antes do plano)
- `PatientOutcomeMeasure` (schema ~L771) é **append-only**: cada `POST` cria um novo
  registro com `recordedAt` (`app/api/patient/outcome-measures/route.ts:96`). O histórico
  já está no banco.
- A rota `GET /api/patient/outcome-measures` devolve **apenas o mais recente**
  (`findFirst ... orderBy recordedAt desc`, linha 30). É usada hoje para pré-preencher o
  formulário — **não pode quebrar**.
- Não há biblioteca de gráficos no `app/dashboard` (sem recharts). Já existe **SVG
  desenhado à mão** em `app/dashboard/blood-pressure/page.tsx` (`PPGWaveformChart`,
  `viewBox`/`path`/gradiente) — usaremos esse mesmo padrão.
- Aderência: `DailyCheckIn` (schema ~L3463) tem histórico com flag de "exercícios feitos";
  `ExercisePrescription` tem `completedCount`/`lastCompletedAt`.
- Auth do paciente: `getRequestSession` / `dual-auth` (sessão web ou token do app).
- Bilíngue EN/PT em todo o portal, **default `en-GB`** (padrão `useLocale`/`i18n`).

## Decisões de design
1. **Sem dependência nova de chart.** Componente SVG in-house reutilizável
   (`TrendChart`), seguindo o padrão já existente em `blood-pressure`. Menos código,
   sem peso de bundle, controle total de tema claro/escuro.
2. **Foco clínico, não biohacking.** O MVP cobre **dor, função e aderência** — as
   métricas acionáveis em fisioterapia. Tendências de wearable/HRV/readiness ficam **fora**
   (já têm seu próprio espaço no `biohacking`; não são o diferencial da clínica).
3. **Dor é "quanto menor, melhor".** O gráfico de VAS sinaliza melhora quando a linha
   **cai** (cor/《seta》de progresso invertida em relação à função).
4. **Compatibilidade da API.** A série vira um endpoint/《modo》**novo**; o `GET` atual
   (latest, usado pelo formulário) permanece intacto.
5. **Estados vazios de verdade.** Com menos de 2 pontos não há linha — mostra mensagem
   ("ainda sem histórico suficiente para um gráfico") em vez de um SVG quebrado.
6. **Onde aparece:** uma seção **"Meu progresso"** na página `app/dashboard/follow-up`
   (que já é a visão de acompanhamento: mostra scores atuais + timeline). Sem página nova.

## Tarefas

| Tarefa | Nome | Status |
|--------|------|--------|
| T-1 | API de histórico de outcome measures (série temporal) | implementada — em QA |
| T-2 | Componente `TrendChart` (SVG in-house, reutilizável) | implementada — em QA |
| T-3 | Seção "Meu progresso": tendências de dor e função | implementada — em QA |
| T-4 | Tendência de aderência aos exercícios | implementada — em QA |

Ciclo por tarefa: implementar → agente **qa-tester** gera `qa/report-t-N.md` com
evidências → code review → só então marcar concluído (nunca antes).

## Suposições (validar antes de implementar)
- **Biblioteca de gráfico:** decidido *não* adicionar (SVG in-house). Se você preferir
  `recharts`/similar (curva mais suave, tooltips prontos), é dependência nova e precisa do
  seu OK — muda T-2.
- **Local de exibição:** seção nova dentro de `app/dashboard/follow-up`. Se preferir em
  `app/dashboard/outcome-measures` ou numa aba "Progresso" própria, me avise.
- **Janela padrão:** o gráfico mostra **todo o histórico** por default, com atalhos
  30d / 90d / tudo. (Assumido; ajustável.)
- **Métricas do MVP:** VAS, FAAM ADL%, FAAM Sport%, função geral, e aderência. Wearables
  ficam de fora nesta atividade.
- **Aderência (T-4):** série derivada do `DailyCheckIn` (flag "exercícios feitos" por dia),
  agregada por semana. Se preferir contar `completedCount` das prescrições, muda a fonte.
- **Mínimo para desenhar linha:** 2 pontos. Abaixo disso, estado vazio.

## Fora de escopo
- Telas nativas do app **Expo** (`mobile/`) — só a API fica pronta para elas.
- Gráficos de métricas de wearable/biohacking.
- Widgets de home-screen / Apple Watch.
- Lembretes automáticos de reavaliação (é a lacuna #3, atividade futura).
