# T-8: Lotes de protocolos por região (autoria + painel + seed)

**Status:** aguardando GO
**Depende de:** T-7

## Objetivo
Popular com abundância os protocolos por região do corpo (Volume 05), autorais e bilíngues, revisados pelo painel.

## Passos (por lote/região)
1. Autoro 2–3 protocolos originais da região (EN/PT + citações), na estrutura da Fase 1.
2. Painel de especialistas revisa cada um (clínico + exercício + evidência + código).
3. Corrijo o apontado.
4. Seed idempotente em prod (reusa `scripts/seed-kit-protocols.cjs` como padrão).
5. Próxima região (roadmap no plan.md).

## Critérios de aceite
- [ ] Cada protocolo aprovado pelo painel antes da prod.
- [ ] Bilíngue limpo + 2–4 citações reais.
- [ ] Seed idempotente; não toca `Article`.
