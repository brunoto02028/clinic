# QA — Atividade 53 (centro de custos de IA)

## Ambiente
- **Banco local** com fixtures (`node scripts/qa/tenant-fixtures.cjs`), senha `QaTenant#2026`.
- **Contas:** `qa.superadmin`, `qa.trainer` (QA Studio PT, personal), `qa.aluno`, `qa.admina` (QA Clinic A).
- **IA real via OpenRouter** com a chave de dev (custo de centavos). Os cenários que só precisam de volume usam eventos inseridos direto no banco (script de seed de QA), não chamadas reais.
- **Envio de e-mail desligado** (`RESEND_API_KEY` vazio). Faturas ficam em PENDING_APPROVAL.
- **Pré-requisito do gerador de treino:** o QA Studio PT precisa de ao menos 3 exercícios ativos com `videoUrl` (criar no seed e apagar no fim).

## T-1 — Modelo + inventário

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | DB | `prisma migrate diff` banco local → schema | só criação de tabela/índices/FKs |
| 1.2 | DB | inserir e ler um `AiUsageEvent` via Prisma | ok |
| 1.3 | Doc | rodar o grep anotado no inventário | cada arquivo retornado está no inventário |

## T-2 — Registro de uso e custo

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | API | chamada real de `callAI` via rota de IA qualquer (ex.: gerador de treino) | 1 evento: `provider=openrouter`, tokens > 0, `costUsd > 0`, `costSource=provider`, `success=true` |
| 2.2 | Unit | provedor retornando erro | evento `success=false`; o erro chega a quem chamou |
| 2.3 | Unit | `recordAiUsage` com Prisma lançando erro | a função de IA retorna normalmente |
| 2.4 | API | uma rota com streaming | evento com tokens após o fim do stream |
| 2.5 | Unit | provedor sem custo (ex.: Gemini mockado com `usageMetadata`) | `costSource=estimated`, custo = tokens × tabela |
| 2.6 | UI | gerador de treino, tradução de exercício, uma função clínica de IA | funcionam como antes |

## T-3 — Atribuição

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | UI | `qa.trainer` gera treino com IA para `qa.aluno` | evento: `clinicId`=QA Studio PT, `userId`=trainer, `feature=workout.ai-generate` |
| 3.2 | API | `qa.aluno` dispara a funcionalidade de IA de aluno apontada no inventário | evento com `clinicId`=QA Studio PT, `userId`=aluno |
| 3.3 | API | `qa.admina` dispara uma funcionalidade de IA da clínica | evento com `clinicId`=Clinic A |
| 3.4 | Script | `node scripts/check-ai-usage-attribution.cjs` | sai com 0; nenhuma rota de prioridade 1 sem `usage` |

## T-4 — Painel

Seed: eventos do mês corrente com custos conhecidos. Por exemplo:
- QA Studio PT: trainer US$ 2,00 e aluno US$ 1,00;
- Clinic A: US$ 4,00;
- não atribuído: US$ 0,50.

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 4.1 | API | `qa.superadmin` GET `/api/admin/ai-costs?month=<atual>` | total 7,50; faturável 3,00 (QA Studio PT); % não atribuído correto |
| 4.2 | API | detalhe QA Studio PT | trainer 2,00 + aluno 1,00 = 3,00; por funcionalidade soma 3,00 |
| 4.3 | API | não atribuídos | 0,50, agrupado por feature |
| 4.4 | API | export CSV | nº de linhas = nº de eventos do mês |
| 4.5 | UI | `qa.superadmin` abre `/admin/ai-costs` | cartões, gráfico diário, tabela; clicar no tenant abre o detalhe |
| 4.6 | UI/API | `qa.trainer`, `qa.admina`, `qa.aluno` | página redireciona; APIs 403; item fora do menu |
| 4.7 | UI | mês sem eventos | estado vazio, sem erro |

## T-5 — Configuração

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 5.1 | API | margem global 30%, câmbio 0,79 | "a cobrar" QA Studio PT = 3,00 × 1,30 × 0,79 = £3,08 |
| 5.2 | API | margem própria 50% no QA Studio PT | 3,00 × 1,50 × 0,79 = £3,56; outros tenants usam 30% |
| 5.3 | API | `aiBillable=false` no QA Studio PT | faturável 0; tenant continua listado |
| 5.4 | API | margem −10 / câmbio 0 / JSON de tabela inválido | 400 com mensagem |
| 5.5 | API | mudar tabela de preços | eventos antigos inalterados; novos estimados com a tabela nova |
| 5.6 | API | não-SUPERADMIN nas rotas de configuração | 403 |

## T-6 — Fatura mensal

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 6.1 | API | com a config de 5.1: POST `/api/admin/ai-costs/invoices {month}` | 1 `Invoice` DRAFT para o QA Studio PT com itens por feature; total = £3,08 + IVA conforme o `BusinessProfile` |
| 6.2 | DB/UI | `/admin/email`, pasta aguardando aprovação | 1 e-mail para `qa.trainer@example.test` com tabela trainer/aluno; **não enviado** |
| 6.3 | API | repetir o POST | nada novo; resposta "já existia" |
| 6.4 | API | inserir evento novo no mês e repetir | fatura fechada inalterada; evento com `billingPeriod=null` |
| 6.5 | API | tenant com repasse £0,40 | pulado ("abaixo do mínimo"); eventos ficam para o mês seguinte |
| 6.6 | API | Clinic A | nunca gera fatura |
| 6.7 | API | sem câmbio configurado | recusa com mensagem; botão desabilitado na UI |
| 6.8 | UI | "Approve & Send" na fila (envio desligado) | status muda; conteúdo = o previsto |
| 6.9 | API | não-SUPERADMIN | 403 |

## Regressão
- Crawl do admin do personal e do portal do aluno: nada novo quebrado.
- Funções de IA existentes (clínica e personal) continuam respondendo igual.
- Limpeza: apagar os eventos de seed, faturas e e-mails de QA; restaurar a configuração global.
