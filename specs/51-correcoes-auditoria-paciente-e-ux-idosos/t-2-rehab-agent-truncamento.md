# T-2: Corrigir truncamento silencioso do Rehab Agent (Atlas)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Quando o Atlas gerar um plano de tratamento incompleto/truncado, o terapeuta vê um erro claro
em vez de um card vazio.

## Contexto
`app/api/admin/patients/[id]/atlas-treatment-plan/route.ts`, action `"generate"` (linha ~201-212):
`claudeGenerate(..., { maxTokens: 4000 })` — insuficiente para pacientes com histórico extenso,
a resposta trunca no meio do JSON. `JSON.parse` falha, o `catch` faz `plan = { notes: reply }`
(linha 210) e a rota **sempre** devolve `200 { plan }`. O front-end
(`app/admin/patients/[id]/page.tsx`, `handleGenerateTreatmentPlan`, linha 2245-2264) **já** trata
`!r.ok` corretamente (`throw new Error(d.error)` → `setError(...)`) — só nunca é acionado porque
a rota nunca retorna erro. `notes` é renderizado (linha ~1669, texto `text-[10px] italic`), mas
como só esse campo existe no objeto truncado, os campos principais (`diagnosis`, `phases`, `hep`)
ficam `undefined` e a UI parece vazia — e o próprio `notes`, quando o corte aconteceu no meio do
JSON, é um fragmento de JSON ilegível, não texto corrido.

## Passos
1. `maxTokens: 4000` → `6000` na chamada de `claudeGenerate` da action `"generate"` (linha 203).
2. Trocar o `catch` do `JSON.parse`: em vez de `plan = { notes: reply }`, retornar
   `NextResponse.json({ error: "..." }, { status: 502 })` (texto sugerido: "Atlas didn't return
   a complete plan — the response may have been cut off. Try again."). Também tratar o caso
   `match` vier `null` (nenhum `{...}` encontrado na resposta) da mesma forma.
3. Não mexer na action `"chat"` (linha ~231, `maxTokens: 3000`) — fora do escopo relatado, mas
   registrar no `plan.md`/commit que ela tem o mesmo padrão de risco, caso vire um problema
   depois.

## Arquivos afetados
- `app/api/admin/patients/[id]/atlas-treatment-plan/route.ts`

## Critérios de aceite
- [ ] Resposta truncada da IA (simulável limitando `maxTokens` bem baixo num teste, ex. 50) →
      `502` com mensagem clara, front-end mostra o erro via `setError`, não um card vazio.
- [ ] Geração normal (não truncada) continua funcionando igual, plano completo renderiza como
      antes.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
