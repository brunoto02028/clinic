# T-4: QA de ponta a ponta + checagem cross-tenant

**Status:** concluído
**Depende de:** T-1, T-2, T-3

## Objetivo
Confirmar a timeline funcionando com dados reais e a trava de clínica funcionando.

## Contexto
Paciente Ana Livia Pessin Prata (`cmu09ydj5000fmv08rmkzaz4j`) já tem login, exercícios marcados como
feitos e (depois da T-2) vídeos assistidos — bom caso real para validar. Ver decisão 4 do plano
(mesma trava da Ativ. 47).

## Passos
1. Local: `npm test` (se houver suíte) + `npx tsc --noEmit` no projeto inteiro (filtrando
   `reconstruir/`, ver memória `pasta-reconstruir-ruido-tsc`).
2. Online, com a Active Clinic da BPR: abrir a aba Atividade da Ana, conferir que aparecem login,
   exercício marcado como feito, vídeo assistido (assistir um vídeo antes e conferir que a linha
   aparece).
3. Trocar a Active Clinic do SUPERADMIN para outra clínica e tentar `GET
   /api/admin/patients/{id-da-ana}/activity` diretamente — esperar 404.
4. Conferir paginação: com `limit=1`, `hasMore: true` e um segundo `GET` com `offset=1` trazendo o
   próximo evento sem repetir o primeiro.

## Arquivos afetados
- nenhum (só QA)

## Critérios de aceite
- [ ] `qa/report-t-4.md` com evidências (prints da aba, respostas da API) anexado.
