# T-12: Segurança clínica — triagem e consentimento

**Status:** reimplementado com a opção A (schema tri-estado) — aguardando re-QA
**Depende de:** nenhuma — **executar antes de tudo**

## Objetivo
Parar o app de registrar, em nome do paciente, respostas clínicas e um consentimento que ele nunca deu.

## Contexto
Dois achados da T-11 (`qa/report-t-11.md`). São os únicos da lista com consequência clínica e de compliance, por isso não esperam fase nenhuma.

### 1. A triagem afirma coisas que ninguém perguntou

`mobile/app/(app)/(clinica)/screening.tsx:72`:

```tsx
mutationFn: () => saveScreening({ ...form, consentGiven: true }, false),
```

O app **envia `consentGiven: true` no submit**, sem exibir texto de consentimento nem checkbox. O paciente nunca vê o que está aceitando.

Pior: as **12 red flags** da triagem web (dor noturna, disfunção vesical/intestinal, histórico de câncer, sintomas neurológicos, perda de peso inexplicada, febre, trauma recente, uso de corticoide, dor em repouso, dormência em sela, fraqueza progressiva, dor torácica) **não existem no formulário do app**. A rota grava `?? false`, então uma triagem criada pelo app registra as 12 como **"Não" sem terem sido perguntadas**.

Um terapeuta lendo esse prontuário conclui que o paciente negou sinais de alarme.

Ainda: `smoker` envia string para coluna `Boolean` — salvar "Estilo de vida" estoura.

### 2. O consentimento é inteiramente mock

`mobile/app/(app)/(clinica)/consent.tsx` não faz **nenhuma** chamada de API. Os textos estão fixos no JSX (a web busca de `/api/admin/consent-texts`, editável e bilíngue). A data **"Você aceitou os termos em 04/06/2026"** é literal — aparece para paciente criado hoje. O card "Termos aceitos" renderiza incondicionalmente. Diz "Você pode atualizar abaixo" e não há nada abaixo. Não existe checkbox nem ação de aceite.

## Passos
1. **Triagem:** ou incluir as 12 red flags no formulário do app, ou fazer a rota **não gravar** o que não foi perguntado (preservar `null`/valor anterior em vez de `?? false`). Decidir com o Bruno — a segunda é menor e imediata; a primeira é a paridade real.
2. Remover o `consentGiven: true` automático. O consentimento é ato explícito.
3. Corrigir o tipo de `smoker`.
4. **Consentimento:** buscar os textos de `/api/admin/consent-texts`, mostrar o estado real de aceite (data verdadeira ou nenhuma), e implementar o aceite — ou, se ficar para depois, **remover a tela do app** em vez de deixar uma que mente.
5. Verificar se alguma triagem/consentimento **já foi gravado em produção pelo app** e, se sim, avisar o Bruno: são dados clínicos a corrigir, não só código.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/screening.tsx`
- `mobile/app/(app)/(clinica)/consent.tsx`
- `mobile/src/api/screening.ts`
- a rota de screening no backend (a que aplica `?? false`)

## Critérios de aceite
- [ ] Nenhuma red flag gravada sem ter sido perguntada
- [ ] `consentGiven` só vira `true` por ação explícita do paciente
- [ ] Tela de consentimento mostra o estado real, ou não existe
- [ ] `smoker` grava sem erro
- [ ] Levantamento de dados já afetados em produção, com resultado no report


---

## Revisão após o QA (22/09/2026)

O QA reprovou a primeira implementação (`qa/report-t-12-t-15.md`, C11 e C12). A causa não era do app: as 12 colunas eram `Boolean @default(false)` e **o banco não conseguia guardar "não perguntado"**. Bruno escolheu a solução mais completa.

**Opção A — as 12 colunas viraram `Boolean?`.** `null` = não perguntado, e nunca pode ser lido como "não".

| Onde | O que mudou |
|---|---|
| `prisma/schema.prisma` | 12 colunas `Boolean?`, sem default |
| `lib/red-flags.ts` (novo) | **fonte única** da semântica tri-estado: `redFlagAnswer`, `unansweredRedFlags`, `isRedFlagScreenComplete` |
| `lib/red-flags-config.ts` (novo) | quais red flags a clínica realmente pergunta — respeita pergunta e seção desativadas |
| `lib/clinical-analysis.ts` | status novo **`incomplete`**; precedência urgent > incomplete > possible > none |
| `lib/evidence-report.ts` | **o relatório para em `incomplete`**, como já parava em urgente — não sugere tratamento a paciente não rastreado |
| `app/api/medical-screening/route.ts` | CREATE também só grava o que veio; **servidor recusa envio com red flag ativa em aberto** |
| `components/screening/medical-screening-form.tsx` | web começa com nulo, carrega nulo como nulo, "Não" só acende para `false`, envio bloqueado |
| `app/admin/patients/[id]/page.tsx` | três estados (cinza = não respondida); ciclo de edição não respondida → sim → não |
| `app/api/admin/patients/[id]/ai-import/route.ts` | extração por IA **preenche lacunas, não sobrescreve resposta do paciente, não inventa "não"** |
| `components/clinical-analysis/clinical-report-viewer.tsx` | não diz mais "conduta padrão apropriada" para triagem incompleta |
| `__tests__/screening/red-flags.test.ts` (novo) | 14 testes travando a regra |

### Três achados além do QA

1. **O relatório de evidência gerava sugestão de tratamento para paciente não rastreado.** O gate de red flag só parava em `urgent_red_flags`; triagem vazia saía como `none_detected` e seguia.
2. **O visualizador recomendava conduta padrão.** "No red flags detected. Standard care pathway appropriate." aparecia sempre que a lista estava vazia — inclusive para quem ninguém tinha perguntado nada.
3. **A importação por IA sobrescrevia o paciente.** O molde do prompt defaultava as 12 para `false` e o código fazia `!!valor`; na atualização, um "Sim" do paciente virava "Não" porque o documento importado não mencionava.

### Desativar pergunta é recurso real

O `screening-config` tem `enabled` por pergunta e por seção. Por isso "completa" significa **todas as perguntas ativas** respondidas — contar as 12 fixas travaria para sempre o relatório de uma clínica que desativou uma delas.

### Produção

- `start.sh` roda `prisma db push --accept-data-loss` no deploy, então a mudança de schema vai sozinha. Ela é um **relaxamento** (`NOT NULL` → nulável, sem default): **nenhum dado existente é alterado**.
- **Não dá para corrigir o passado.** Triagens já gravadas com `false` indevido continuam `false` — web e app gravam `filledBy: PATIENT` e nenhum campo registra a origem, então não há como separar um "Não" real de um default.

### Critérios de aceite

- [x] Nenhuma red flag gravada sem ter sido perguntada — schema, CREATE, UPDATE e IA
- [x] `consentGiven` só vira `true` por ação explícita
- [x] Tela de consentimento mostra o estado real
- [x] `smoker` grava sem erro
- [x] Envio com red flag ativa em aberto recusado **no servidor**
- [ ] Re-QA
- [ ] Levantamento de dados já afetados em produção — **inviável**: a origem não é rastreável
