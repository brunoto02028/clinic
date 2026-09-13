# T-5: QA de Planos/Mensalidade no contexto do personal trainer

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Confirmar que o fluxo de `MembershipPlan` (que já é genérico por `clinicId` e já aparece pro personal trainer hoje) funciona de ponta a ponta nesse contexto, sem vazar vocabulário clínico.

## Contexto
Não é construção nova — é validar o que já existe. `MembershipPlan`/a aba "Memberships" não tem `clinicalOnly`/`personalOnly`, ou seja, já está visível pro personal. Ninguém testou esse fluxo especificamente como personal trainer ainda.

## Passos
1. Como personal trainer (tenant QA Studio PT), criar um plano de mensalidade novo em `/admin/memberships` — conferir que os textos/labels da tela já usam `relabel()` corretamente (não deveria aparecer "Patient"/"Treatment" nem nada clínico).
2. Aluno assinando o plano — conferir a tela do lado do aluno (`/dashboard/membership` ou equivalente) com o mesmo cuidado de vocabulário.
3. Checkout/cobrança do plano — confirmar que usa a conta de pagamento certa pro personal (mesma preocupação de roteamento de Stripe já resolvida na atividade 36 pro Instagram — aqui é sobre cobrança de verdade, então merece atenção redobrada, mesmo que a ativação real do Stripe Connect fique pra atividade 28).
4. Corrigir qualquer string hardcoded em inglês/português que vaze linguagem clínica encontrada nesse caminho.

## Arquivos afetados
- A localizar durante o QA (provavelmente `app/admin/memberships/*`, `app/dashboard/membership/*`, e os componentes de vocabulário se precisarem de entradas novas em `lib/tenant-vocab.ts`)

## Critérios de aceite
- [x] Personal trainer consegue criar um plano de mensalidade sem ver nenhum texto clínico.
- [x] Aluno consegue ver/assinar o plano sem ver nenhum texto clínico.
- [x] Nenhuma cobrança real acontece durante o QA (mesma guarda de outbound/Stripe test-mode já usada no resto do projeto).

## Resultado
QA encontrou vazamento real de vocabulário clínico em `/admin/memberships` e `/dashboard/membership` (nunca usavam `relabel()`) — corrigido reaproveitando `useVocab()`. Code review achou um bug na própria correção (locale da sessão, não o idioma real do texto, decidia qual dicionário aplicar — silenciosamente não substituía "patients" numa sessão pt-BR numa tela sempre em inglês) — corrigido forçando o dicionário certo pras telas sem tradução PT própria. Achado informativo sem ação: `MembershipPlan` do personal usa a conta Stripe da BPR por design (cobrança real do personal é escopo da atividade 28, arquitetura já preparada, não tocada). QA e code review (2 rodadas cada) aprovados — ver `qa/report-t-5.md`.
