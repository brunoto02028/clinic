# Report — Kit de Rotina Clínica, Fase 1 (T-1..T-3, T-6)

**Data:** 2026-08-25 · **Resultado:** ✅ Aprovado (painel de especialistas + E2E).

## Entregue
1. **Migração aditiva** (`ProtocolTemplate`: `namePt`, `descriptionPt`, `referencesJson`; `ProtocolTemplateItem`: `titlePt`, `descriptionPt`, `instructionsPt`) — aplicada em **local e produção**. Não toca o model `Article`.
2. **3 protocolos-piloto** originais, bilíngues limpos + citações reais, semeados via `scripts/seed-kit-protocols.cjs` (idempotente, upsert por nome preservando id, em transação):
   - Knee Osteoarthritis — Exercise-Led (5 itens)
   - Plantar Heel Pain (Plantar Fasciopathy) (4 itens)
   - Achilles Tendinopathy — Mid-Portion (5 itens)
3. **T-3 (`app/api/admin/protocols/[id]/assign`)** — já criava `TreatmentProtocol` + prescrições; **estendido** para: propagar `template.referencesJson` → `TreatmentProtocol.references` e renderizar a instância no idioma pedido (`language`, usa `*Pt` quando pt-BR).

## Painel de QA especialista (5 dimensões)
Todos **PASS** após correções: **clínico/segurança**, **ciência do exercício**, **evidência/citações** (9 refs reais, DOIs conferidos), **código**, **planejamento**.

### Correções aplicadas (tudo que o painel apontou)
- **Segurança:** rastreio de RUPTURA no Aquiles antes de carga (Thompson/Simmonds + gap + "pop" → não carregar/imobilizar/encaminhar); **red-flags enumerados** por condição + gatilho de reencaminhamento (6–12 sem); **regra de stop/regressão** em todos os itens de carga; **precauções de modalidade** (US: malignidade/TVP/infecção/gestante; laser: proteção ocular/malignidade/tireoide/fotossensibilizantes).
- **Exercício:** item neuromuscular no joelho (GLA:D); intensidade da isometria do Aquiles (~70%/RPE); transição de fase por **critério de sintoma** (não só calendário); HSR 3×/sem (casa com Beyer).
- **Evidência:** títulos OARSI/Cook&Purdam ajustados; framing isométrico suavizado (evidência mista).
- **Código:** upsert preservando id em `$transaction`; `??` p/ numéricos; `try/finally` + `$disconnect`; `.env` via `__dirname`.

## T-6 — E2E do `assign` (LOCAL, com limpeza)
Aplicado o protocolo Achilles a um paciente de teste, em **pt-BR**:
- `language == "pt-BR"` ✅
- **references propagadas = 3** (ex.: Alfredson 1998) ✅
- título e itens em **PT** (assessment com "rastreio de ruptura") ✅
- 5/5 itens ✅ · dados de teste **removidos** ✅
- Typecheck do route: **0 erros**.

## Observações
- A UI do `admin/protocols` ainda não envia `language` no assign (default en-GB) — o endpoint já suporta; expor a escolha de idioma no botão "Aplicar" é um retoque de UI para a Fase 2.
- Fase 2 (progressão/regressão de exercícios — T-4/T-5) pendente, sob demanda.
