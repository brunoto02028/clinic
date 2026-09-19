# T-7: Histórico de sessões de gravação

**Status:** pendente
**Depende de:** T-1

## Objetivo
Achar uma gravação antiga — quem foi o paciente (se associado), quando foi, status, acesso rápido
ao transcript/SOAP.

## Contexto
Feature nova, não reaproveita nada da atividade 063 (que era sobre relatórios de evidência
clínica) — só o espírito de "não deixar histórico se perder".

## Passos
1. Rota `GET /api/admin/clinical-scribe/sessions/route.ts` (GET no mesmo arquivo do POST do T-2,
   ou separado se ficar mais limpo) — lista sessões do staff autenticado (ou de toda a clínica,
   pra outros terapeutas verem o que já foi gravado — decidir escopo: por padrão, staff vê as
   sessões da própria clínica, não só as próprias, já que qualquer THERAPIST/ADMIN da clínica pode
   precisar consultar). Ordenado por `createdAt desc`, com paginação simples se o volume justificar.
2. Tela nova (aba ou seção em `app/admin/clinical-ai/page.tsx`) listando as sessões: data, duração,
   paciente (se associado) ou "não associado", status com badge, link pra abrir a sessão (tela do
   T-6).

## Arquivos afetados
- `app/api/admin/clinical-scribe/sessions/route.ts`
- `app/admin/clinical-ai/page.tsx`

## Critérios de aceite
- [ ] Lista mostra todas as sessões da clínica, mais recente primeiro.
- [ ] Filtro/indicação clara de sessões sem paciente associado ainda.
- [ ] Clicar numa sessão abre a tela de detalhe (T-6) correspondente.
- [ ] Isolamento cross-tenant: sessões de uma clínica nunca aparecem pra staff de outra.
