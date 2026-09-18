# Report T-1 — Discovery + gap de dados (protocolos)

**Data:** 2026-08-25 · **Tipo:** discovery (sem runtime) · **Resultado:** ✅ concluído (aguardando 1 decisão do Bruno)

## Mapa do fluxo ATUAL (já existe — não recriar)
- **Biblioteca:** `app/admin/protocols/page.tsx` — "Treatment Protocol Library (reusable templates per service/equipment/condition)".
- **CRUD templates:** `app/api/admin/protocols/route.ts` (+ `[id]`).
- **Seed:** `app/api/admin/protocols/seed/route.ts` — já traz protocolos clínicos reais (ex.: Tendinopatia Patelar) com fases, itens IN_CLINIC/HOME_EXERCISE/HOME_CARE/ASSESSMENT, equipamento e doses.
- **Aplicar ao paciente (= T-3):** `app/api/admin/protocols/[id]/assign/route.ts` — cria um `TreatmentProtocol` (status SENT_TO_PATIENT) **+ `ExercisePrescription`** para os itens HOME_EXERCISE. **Já funciona.**
- **Instância por paciente:** `TreatmentProtocol` tem `templateId`, `language` (en-GB/pt-BR), `references` (Json), `goals` (Json), `precautions` (Json).

**Conclusão:** T-3 (aplicar protocolo) **já está pronto**. A Fase 1 encolhe para **conteúdo + bilíngue limpo + evidência**.

## Modelos
- `ProtocolTemplate`: `name`, `description`, `condition`, `bodyRegion`, `equipment[]`, `category`, `estimatedWeeks`, `sessionsPerWeek`, `items[]`. **Sem campos `*Pt`. Sem campo de referências.**
- `ProtocolTemplateItem`: `phase` (SHORT/MEDIUM/LONG_TERM), `itemType`, `title`, `description`, `instructions`, `exerciseId`, `sets/reps/holdSeconds/…`, `startWeek/endWeek`. **Sem `*Pt`.**

## GAP (o que falta para o pedido "sempre bilíngue de verdade")
1. **Bilíngue está concatenado num único campo** — hoje o seed grava `"EN: … \n PT: …"` dentro de `description`/`instructions`. Funciona, mas aparece "mastigado" na tela e não dá para mostrar só um idioma pelo toggle.
2. **Referências de evidência não são de primeira classe** no template — `TreatmentProtocol.references` existe (Json), mas o **template** não tem onde guardar as citações; o `assign` grava `references: []`.

## Decisão de migração (aditiva, precisa do teu OK antes de aplicar em prod)
**Opção A (recomendada) — separar de verdade:** adicionar colunas aditivas:
- `ProtocolTemplate`: `namePt`, `descriptionPt`, `referencesJson` (Text/Json)
- `ProtocolTemplateItem`: `titlePt`, `descriptionPt`, `instructionsPt`
- (e propagar `referencesJson` → `TreatmentProtocol.references` no `assign`)

Prós: toggle mostra 1 idioma limpo; evidência estruturada. Contra: migração + ajuste do form do `admin/protocols` (2 campos por idioma) + do `assign` (escolher idioma).

**Opção B — sem migração:** guardar `{en, pt}` como JSON nos campos atuais e renderizar por idioma. Menos colunas, mas muda parsing em vários lugares.

**Opção C — mínima:** manter concatenado por ora e focar a Fase 1 só em **autoria de 3 protocolos de qualidade + referências**, deixando a separação limpa para depois.

## Impacto nas próximas tarefas
- **T-3** já existe → vira "verificar + fazer o `assign` respeitar idioma/refs".
- **T-2** usa o padrão do seed existente, mas na estrutura bilíngue escolhida (A/B/C).
- Migração é **aditiva** (não quebra nada). Nada toca o model `Article` (separação garantida).

## Recomendação
**Opção A.** É a única que entrega "bilíngue de verdade" (toggle limpo) que você pediu, e a evidência vira campo próprio. É mais trabalho, mas é o jeito certo — e o resto (aplicar ao paciente, prescrição) já está pronto, então sobra orçamento pra fazer bem.
