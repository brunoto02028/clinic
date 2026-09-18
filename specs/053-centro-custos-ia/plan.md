# Atividade 53 — Centro de controle de custos de IA (repasse ao personal)

## Objetivo

Saber **quanto cada chamada de IA custa**, **de quem é** (tenant, usuário, funcionalidade) e **repassar** ao personal o custo gerado por ele e por todos os alunos dele. O centro de controle é exclusivo do SUPERADMIN (dono da plataforma).

Contexto de negócio: a BPR terceiriza a plataforma para personal trainers. A IA (OpenRouter → Claude Sonnet 5, já ativa em prod via `SystemConfig.OPENROUTER_API_KEY`, e outros provedores) é paga pela BPR. Sem medição, esse custo fica invisível e sai do bolso da BPR.

## Decisões do Bruno (18/09/2026)

1. **Cobrança:** medir o custo real + gerar a **fatura mensal do personal para aprovação**. Nada é enviado sem clique ("Approve & Send", fila da ativ. 39). Cobrança automática no cartão fica para depois.
2. **Preço:** **custo real + margem %**, com margem global padrão e ajuste por personal.
3. **Alunos:** o uso de IA dos alunos **soma na conta do personal**, com detalhe por aluno. Se quiser, o personal repassa aos alunos pelos planos que já cobra via Stripe Connect (ativ. 28).
4. **Acesso:** o centro de custos é só do SUPERADMIN. O personal não tem painel próprio nesta versão e recebe a fatura detalhada.

## Estado atual (levantado em 18/09)

- **Não existe nenhum registro de uso ou custo de IA** no banco.
- **Entradas centrais:**
  - `lib/ai-provider.ts`: `callAI`, `callAIChat`, `streamAI`, `analyzeImage`, `analyzeMultipleImages`, `generateImage`, `generateImageSmart`, `transcribeAudioMinimax`, `callAIClinical`;
  - `lib/claude.ts`: `claudeGenerate`, `claudeStream`, `claudeVision`, `claudeGenerateWithFallback`;
  - `lib/ai-providers/{groq,minimax}.ts`.
  - São 48 arquivos chamando essas funções.
- **Chamadas diretas ao provedor, fora das entradas centrais** (12):
  - transcrições: `admin/clinical-scribe/transcribe`, `admin/education/transcribe`, `admin/transcribe`, `patient/voice-transcribe`, `patient/consultation-recording`;
  - `admin/qualifications/advisor`, `admin/settings/generate-image`, `vapi/minimax-proxy`, `lib/system-config.ts`.
- O OpenRouter devolve o **custo real** de cada chamada quando a requisição pede `usage: { include: true }` (`usage.cost`, em USD). Para os outros provedores, o custo precisa ser **estimado** por tokens × tabela de preço.
- Faturamento: o modelo `Invoice` (financeiro: `BusinessProfile` + `clientName/clientEmail` + itens) serve para faturar o personal como cliente. O envio passa pela fila `EmailMessage.PENDING_APPROVAL` (ativ. 39).

## Decisões de design

- **D1 — Um evento por chamada** (`AiUsageEvent`), gravado no ponto único do provedor. Nada de somar em contadores: o evento é a fonte da verdade, e os totais são consultas agregadas. Se a gravação falhar, a chamada de IA **não** falha (só loga).
- **D2 — Atribuição explícita.** As funções de IA ganham um parâmetro opcional `usage: { clinicId, userId, feature }`, preenchido pela rota que chama (ela já tem o actor). Chamada sem esse contexto é gravada como **"não atribuída"** e aparece num balde próprio do painel, pra você enxergar o que ainda falta atribuir. Escolhi parâmetro explícito em vez de contexto implícito (AsyncLocalStorage) porque é mais simples de ler e testar.
- **D3 — Custo real quando existe, estimado quando não.**
  - OpenRouter: `usage.include` → custo real (`costSource: "provider"`).
  - Demais provedores: tokens × tabela de preço editável pelo SUPERADMIN (`costSource: "estimated"`).
  - Sem tokens nem tabela: `costSource: "unknown"`, custo 0, e o evento fica destacado no painel.
- **D4 — Custo em USD, fatura em GBP.** O evento guarda USD, a moeda em que os provedores cobram. A conversão para GBP usa um câmbio que o SUPERADMIN define no painel, e cada fatura grava o câmbio usado.
- **D5 — Faturável por tenant.**
  - Tenant `PERSONAL_TRAINER` → faturável por padrão.
  - Clínica BPR (tenant padrão) → nunca faturada, mas aparece no painel (você passa a saber quanto a própria clínica gasta).
  - Override por tenant: faturável sim/não + margem própria.
- **D6 — Fatura fechada é imutável.** Gerar a fatura do mês cria um `Invoice` DRAFT por tenant faturável com os totais do período **congelados** (snapshot), e um e-mail `PENDING_APPROVAL`. Gerar de novo para o mesmo tenant+mês não duplica. Um evento que chegar atrasado entra no mês seguinte.
- **D7 — Nada automático.** A geração das faturas do mês é por botão no painel, não cron, seguindo a regra do projeto de não enviar nada sem clique. Um cron só entra depois, se você pedir.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Modelo `AiUsageEvent` + inventário classificado das chamadas de IA | pendente |
| T-2 | Registro de uso e custo nas entradas centrais e nas chamadas diretas | pendente |
| T-3 | Atribuição: contexto `usage` nas rotas (prioridade: tudo que o personal e o aluno alcançam) | pendente |
| T-4 | Painel SUPERADMIN `/admin/ai-costs` (mês, tenant, usuário, funcionalidade, não atribuídos, CSV) | pendente |
| T-5 | Configuração de repasse: margem global/por tenant, faturável, câmbio, tabela de preços | pendente |
| T-6 | Fatura mensal do personal para aprovação (snapshot, idempotente, fila da ativ. 39) | pendente |

Depende da **Atividade 52** só para o gating (`requireSuperadmin` da T-2 da 52). Pode ser feita em paralelo desde que use o mesmo helper.

## Fora de escopo (v1)

- Cobrança automática no cartão do personal (cartão salvo + cobrança recorrente pela Stripe da BPR).
- Painel de consumo para o próprio personal.
- Limite/teto de gasto por tenant que bloqueie a IA. Sugiro como próxima etapa, porque protege contra um aluno ou personal que gaste demais antes da fatura.
- Custo por minuto do assistente de voz (VAPI): a VAPI cobra à parte. O painel registra só a parte de LLM que passa pelo `minimax-proxy`.
- Cardápio com IA (nova funcionalidade de nutrição), que será uma atividade própria. Quando existir, já nasce registrando custo por aqui.

## Suposições (peço validação)

1. **Margem padrão global começa em 0%**, e você define o valor real no painel. Não chuto um número de negócio.
2. **Câmbio USD→GBP manual** (campo no painel), sem API de câmbio. Cada fatura registra o câmbio usado.
3. **IVA:** a fatura usa a mesma configuração de IVA do `BusinessProfile` da BPR que as outras faturas do financeiro já usam.
4. **O histórico começa no deploy.** Custos anteriores não existem e não serão reconstruídos.
5. **Agrupamento da fatura:** uma linha por funcionalidade (ex.: "Gerador de treino com IA — 42 usos"), com anexo/tabela por aluno no corpo do e-mail. Sem uma linha por chamada.
6. **Retenção:** os eventos ficam guardados por 24 meses.
7. **Valor mínimo:** mês com repasse abaixo de £1,00 não gera fatura e acumula para o mês seguinte.
