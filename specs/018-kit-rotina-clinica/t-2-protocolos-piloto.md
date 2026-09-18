# T-2: Autoria dos 3 protocolos-piloto (seed)

**Status:** pendente
**Depende de:** T-1

## Objetivo
Escrever 3 protocolos de tratamento **originais e baseados em evidência** (joelho OA, fáscia plantar, Aquiles) e semeá-los como `ProtocolTemplate` bilíngues, com citações.

## Contexto
Conteúdo é o coração do kit. **Autoral** — nada de produto pago. Fonte: Europe PMC (já integrado) + diretrizes públicas.

## Passos
1. Para cada condição: definir fases (ex.: agudo → carga progressiva → retorno), objetivos, marcadores de progressão e 2–4 referências (Europe PMC).
2. Redigir EN + PT (texto próprio, sem cópia).
3. Script de seed **idempotente** (upsert por slug) criando os `ProtocolTemplate`/itens.
4. Rodar o seed em local; conferir no `admin/protocols`.

## Arquivos afetados
- `scripts/seed-protocol-templates.ts` (ou .cjs) — seed idempotente
- (dados) 3 protocolos

## Critérios de aceite
- [ ] 3 templates criados, bilíngues, com 2–4 citações cada.
- [ ] Texto 100% autoral (sem reprodução de terceiros).
- [ ] Seed idempotente (rodar 2× não duplica).
