# T-5: Configuração de repasse — margem, faturável, câmbio, tabela de preços

**Status:** pendente
**Depende de:** T-1

## Objetivo
O SUPERADMIN define, no próprio painel:
- quanto cobrar em cima do custo (margem global + ajuste por personal);
- quem é faturável;
- o câmbio USD→GBP;
- o preço por modelo dos provedores que não informam custo.

## Contexto
- Decisão do Bruno: custo real + margem %, com padrão global e ajuste por personal.
- Configurações globais do projeto moram em `SystemConfig` (`lib/system-config.ts`, com cache e segredo criptografado).
- Suposições do plano: margem começa em 0%, câmbio é manual e cada fatura grava o câmbio usado.

## Passos
1. **Global** (`SystemConfig`, só SUPERADMIN):
   - `AI_COST_MARKUP_PCT` (default `0`);
   - `AI_USD_GBP_RATE` (sem default: sem câmbio, o painel mostra só USD e a T-6 não gera fatura);
   - `AI_PRICE_TABLE` (JSON `{ "<provider>/<model>": { "inputPer1M": n, "outputPer1M": n, "perImage"?: n, "perAudioMinute"?: n } }`);
   - `AI_MIN_INVOICE_GBP` (default `1.00`).
2. **Por tenant** (campos novos em `Clinic`, aditivos):
   - `aiBillable Boolean?` (null = padrão pelo tipo: PERSONAL_TRAINER → sim; CLINIC → não);
   - `aiMarkupPct Decimal?` (null = usa o global).
3. `GET|PUT /api/admin/ai-costs/settings` (SUPERADMIN) + `PATCH /api/admin/ai-costs/tenant/[clinicId]/settings`. Validar: margem entre 0 e 500%; câmbio > 0; tabela em JSON válido.
4. UI no painel da T-4: aba "Configuração" (global + tabela de preços) e, no detalhe do tenant, faturável e margem própria.
5. `estimateCostUsd` (T-2) passa a ler `AI_PRICE_TABLE`. O cálculo "a cobrar" = `custoUSD × (1 + margem/100) × câmbio`, arredondado a 2 casas **só no total**.

## Arquivos afetados
- `prisma/schema.prisma` (`Clinic.aiBillable`, `Clinic.aiMarkupPct`)
- `app/api/admin/ai-costs/settings/route.ts`, `.../tenant/[clinicId]/settings/route.ts` (novos)
- `lib/ai-usage.ts`, componentes do painel

## Critérios de aceite
- [ ] SUPERADMIN define margem global 30%, câmbio 0,79 → "a cobrar" do QA Studio PT = custo × 1,30 × 0,79 (conferido à mão).
- [ ] Margem própria 50% no QA Studio PT → usa 50% só nele.
- [ ] `aiBillable = false` no QA Studio PT → sai do "faturável", mas continua visível.
- [ ] Clínica (tipo CLINIC) sem override → não faturável.
- [ ] Margem −10%, câmbio 0 ou JSON inválido → 400 com mensagem.
- [ ] Mudar a tabela de preços muda as **estimativas novas**. Eventos antigos guardam o custo calculado na hora (não recalcula o passado).
- [ ] Não-SUPERADMIN → 403.
