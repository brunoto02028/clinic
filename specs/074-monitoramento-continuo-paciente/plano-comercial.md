# Plano Comercial — Acompanhamento BPR

23 de setembro de 2026 · Bruno

## Visão geral

O Acompanhamento BPR é uma assinatura mensal de acompanhamento contínuo pelo app da clínica, vendida separadamente das consultas e do tratamento. O paciente paga só pelo serviço; o aparelho é dele.

O app trabalha para o paciente todos os dias: junta os dados dos aparelhos Withings (pressão, sono, FC, recuperação), as respostas do paciente (dor, energia, sono percebido, estresse) e a aderência aos exercícios. Bruno revisa os dados, ajusta o programa e envia relatórios periódicos.

Princípios do modelo:

- Assinatura = só serviço (mensal ou anual). Aparelhos nunca entram no preço do plano.
- O paciente compra o próprio aparelho. A clínica não imobiliza capital nem assume risco de perda ou dano.
- Consultas (presenciais ou por vídeo) são sempre cobradas à parte, com desconto para assinantes.
- Posicionamento: acompanhamento de exercício e bem-estar, não monitoramento médico nem serviço de emergência.

## Planos e preços

Três planos, todos só de serviço. A diferença de preço vem do tempo de revisão de Bruno e da quantidade de dados analisados, não do aparelho.

| Plano | Para quem | Aparelho necessário (compra do paciente) | Mensal (£) | Anual (£) |
| --- | --- | --- | --- | --- |
| Essencial | Pós-alta, manutenção, qualquer paciente | Nenhum | 49 | 490 |
| Cardio | Hipertensos e risco cardiovascular | Withings BPM Connect | 59 | 590 |
| Performance | Atletas e acompanhamento completo | Withings ScanWatch 2 + BPM Connect | 79 | 790 |

- Plano anual = 10 mensalidades (2 meses grátis), pago à vista. Não inclui aparelho.
- Contrato mínimo do plano mensal: 3 meses.
- Paciente que já tem aparelho Withings compatível entra no plano correspondente sem nenhum custo extra.

## O que está incluso

Todos os planos incluem o programa de exercícios no app e o questionário diário; Cardio e Performance acrescentam os dados dos aparelhos e revisões mais frequentes.

| Recurso | Essencial | Cardio | Performance |
| --- | --- | --- | --- |
| Programa de exercícios no app, ajustado por Bruno | Sim | Sim | Sim |
| Questionário diário (dor, energia, sono percebido, estresse) | Sim | Sim | Sim |
| Registro de aderência aos exercícios | Sim | Sim | Sim |
| Pressão arterial e FC com alertas | Não | Sim | Sim |
| Sono, FC 24h, HRV, SpO2, temperatura, ECG | Não | Não | Sim |
| Score de recuperação BPR | Não | Não | Sim |
| Revisão dos dados por Bruno | Mensal | Quinzenal | Semanal |
| Relatório no app + e-mail | Mensal | Mensal + resumo de pressão para o GP | Mensal completo + resumo para o GP |
| Mensagens: prazo de resposta | 48h úteis | 48h úteis | 24h úteis |
| Alertas revisados | Não se aplica | Até 1 dia útil | Até 1 dia útil |
| Consulta avulsa (presencial ou vídeo) | £100 | £100 | £100 |

Não inclui: consultas, sessões presenciais, aparelhos, atendimento fora do horário comercial nem qualquer resposta de emergência.

## Aparelhos

O paciente compra o próprio aparelho; aluguel só existe com caução igual ao valor total, para a clínica nunca financiar equipamento.

| Aparelho | Dados que envia ao app | Preço aprox. (£) | Link |
| --- | --- | --- | --- |
| Withings BPM Connect | Pressão sistólica e diastólica, FC | 95–120 | [Amazon UK](https://www.amazon.co.uk/dp/B07SJV1HNR?tag=bprrehab-21) |
| Withings ScanWatch 2 | Sono, passos, FC 24h, HRV, SpO2, temperatura, ECG | 320 | [Amazon UK](https://www.amazon.co.uk/dp/B0CSDX3YJ6?tag=bprrehab-21) |
| Withings ScanWatch Light | Sono, passos, FC, HRV (sem SpO2 e ECG) | 230 | [Amazon UK](https://www.amazon.co.uk/s?k=withings+scanwatch+light&tag=bprrehab-21) |

Opções para o paciente:

1. Comprar pelo link de afiliado da BPR. A Amazon UK oferece parcelamento, então o paciente divide o valor sem a clínica financiar nada.
2. Usar um aparelho Withings que já tenha.
3. Alugar (exceção): caução igual ao valor do aparelho (BPM Connect £120; kit completo £440), mais £5/mês (BPM) ou £15/mês (kit). A caução é devolvida quando o aparelho volta em bom estado.

Aparelho de demonstração: o BPM Connect comprado para os testes fica na clínica para medições nas sessões e para o paciente experimentar por até 30 dias antes de comprar o dele.

Regras:

- Recomendar sempre o vendedor Withings UK.
- Informar ao paciente que os links são de afiliado (exigência de transparência no Reino Unido).
- Só aparelhos Withings são compatíveis hoje. Outras marcas não enviam dados ao app.

## Consultas avulsas

Consultas nunca estão incluídas nos planos: custam £120, ou £100 para assinantes ativos.

| Tipo | Não assinante (£) | Assinante (£) |
| --- | --- | --- |
| Presencial (Russell House, Ipswich) | 120 | 100 |
| Híbrida por vídeo | 120 | 100 |

- O agendamento é feito pelo app, e o relatório do plano serve de base para a consulta.
- Quando um alerta ou relatório indicar necessidade, Bruno sugere uma consulta pelo app; a decisão e o pagamento são do paciente.

## Requisitos técnicos do app

A integração Withings já existe (app "BPR Clinic", callback em bpr.clinic); falta ligar planos, pagamentos e permissões por plano.

Integração Withings:

- [x] Ampliar o sync para buscar SpO2, FC intraday, temperatura, HRV e ECG, além de pressão, sono e atividade
- [x] Confirmar escopos OAuth: user.info, user.metrics, user.activity
- [x] Webhook de notificações ativo para medidas novas
- [x] Botão "Desconectar" que revoga o acesso na Withings
- [x] Promover a aplicação de Development para produção no painel Withings

API Withings: plano Standard gratuito até 5.000 usuários ativos e 120 requisições/minuto ([Withings API plans](https://developer.withings.com/developer-guide/v3/withings-solutions/withings-api-plans/)). O Enterprise é recomendado para produção, mas o preço não é público.

Planos e pagamentos:

- [ ] Assinaturas mensal e anual (ex.: Stripe Billing) com os três planos
- [ ] Permissões por plano: cada plano libera os painéis e dados correspondentes
- [ ] Cobrança de consulta avulsa com preço de assinante
- [ ] Caução e aluguel (se usados): cartão salvo com autorização de cobrança

Funcionalidades:

- [ ] Questionário diário (dor, energia, sono percebido, estresse)
- [ ] Registro de aderência por sessão de exercício
- [ ] Score de recuperação calculado a partir de FC de repouso, HRV e sono
- [ ] Relatório mensal automático (PDF no app + e-mail), revisado por Bruno antes do envio
- [ ] Resumo de pressão exportável para o GP
- [ ] Painel de alertas para Bruno, ordenado por prioridade

## Protocolos clínicos e alertas de pressão

Os alertas sinalizam para revisão e encaminham ao GP; decisões sobre medicação são sempre do médico.

Medição de pressão (padrão para medida em casa):

1. Sentado, costas apoiadas, pés no chão, braço apoiado na altura do coração
2. 5 minutos de repouso antes; sem café, cigarro ou exercício nos 30 minutos anteriores
3. Duas leituras com 1 minuto de intervalo; registrar a média
4. Em casa: manhã e noite, por 7 dias antes de cada revisão
5. Manguito do BPM Connect: braço de 22 a 42 cm de circunferência

| Situação | Limite | Ação do app | Ação de Bruno |
| --- | --- | --- | --- |
| Pressão antes do exercício | Acima de 200/110 mmHg | Bloqueia a sessão do dia e orienta o paciente | Revisar e contatar o paciente |
| Durante o exercício | Acima de 250/115 mmHg, ou sistólica caindo com o aumento da carga | Orientar a interrupção imediata | Revisar e encaminhar ao GP |
| Tendência em casa | Acima do limite combinado com o GP por vários dias | Alerta no painel | Contatar o paciente e sugerir revisão com o GP |
| Sintomas (dor no peito, tontura, falta de ar desproporcional) | Qualquer valor | Mensagem: procure o 999/111 | Registrar e acompanhar |

Limites de exercício baseados nos critérios do ACSM. No treino de força: respiração contínua, sem apneia (Valsalva).

## Termos, jurídico e compliance

Estes nove itens precisam estar resolvidos antes de vender o primeiro plano.

- [ ] Posicionamento: vender como acompanhamento de exercício e bem-estar. Se o app passar a diagnosticar ou recomendar tratamento, pode ser classificado como dispositivo médico pela MHRA.
- [ ] Aviso de não emergência no contrato e no app: alertas revisados em horário comercial; em caso de sintomas, procurar GP, 111 ou 999.
- [ ] Âmbito profissional: como terapeuta Level 5, alertas encaminham ao GP e decisões de medicação ficam com o médico.
- [ ] Seguro: confirmar com a seguradora que a apólice cobre acompanhamento remoto e o uso desses dados.
- [ ] Proteção de dados (UK GDPR, dados de saúde): registro no ICO, consentimento explícito no app, DPIA, política de privacidade e criptografia de tokens e medidas.
- [ ] Termos do plano: o que está incluso, prazos de resposta, contrato mínimo, cancelamento e renovação do anual.
- [ ] Termos de aluguel (se usado): caução, devolução, dano, perda e autorização de cobrança no cartão.
- [ ] Afiliados: aviso de links de afiliado em todo material com links da Amazon.
- [ ] Entidade: definir qual empresa vende o plano (ex.: BPR Ltd) para contrato, faturamento e seguro.

## Plano de lançamento

Começar com um piloto de 5 a 10 pacientes por 3 meses, a começar pela paciente hipertensa com o BPM Connect.

| Fase | Duração | O que acontece | Meta |
| --- | --- | --- | --- |
| 1. Preparação | 2–4 semanas | Checklist técnico e jurídico, testes com o BPM Connect da clínica | Integração e termos prontos |
| 2. Piloto | 3 meses | 5–10 pacientes com preço de fundador (ex.: 40% de desconto) | Medir aderência, pressão, dor e satisfação |
| 3. Lançamento | Contínuo | Oferta do plano a todo paciente na alta | 20–40% dos pacientes em alta assinando |
| 4. B2B | Após 6 meses | Clubes amadores, empresas e academias com contrato por grupo | Primeiro contrato de grupo |

- Coletar depoimentos com consentimento por escrito durante o piloto.
- Os resultados do piloto (ex.: evolução da pressão, aderência) viram o material de venda.

## Projeção financeira e capacidade

Com 50 assinantes, o acompanhamento gera cerca de £2.900/mês com ~32 horas de revisão, em torno de £90 por hora, sem contar consultas.

Premissas de tempo de Bruno por paciente/mês: Essencial 20 min, Cardio 40 min, Performance 80 min. Mix: 50% Essencial, 30% Cardio, 20% Performance.

| Cenário | Assinantes (E / C / P) | Receita mensal (£) | Receita anual (£) | Horas de Bruno/mês |
| --- | --- | --- | --- | --- |
| Piloto | 10 (5 / 3 / 2) | 580 | 6.960 | 6 |
| Inicial | 20 (10 / 6 / 4) | 1.160 | 13.920 | 13 |
| Meta 1º ano | 50 (25 / 15 / 10) | 2.900 | 34.800 | 32 |
| Crescimento | 100 (50 / 30 / 20) | 5.800 | 69.600 | 63 |

- Receita do piloto calculada a preço cheio; com desconto de fundador, será menor.
- Não inclui: consultas avulsas (£100–120), comissões de afiliado e contratos B2B.
- Custos variáveis: taxas do processador de pagamento; API Withings gratuita até 5.000 usuários.
- Acima de ~60 horas/mês, avaliar um assistente ou automatizar mais a triagem de alertas e relatórios.

## Checklist de implementação

Ordem sugerida: primeiro o que bloqueia o piloto, depois o que escala.

1. Antes do piloto
   - [ ] Receber o BPM Connect e testar o fluxo completo (OAuth, webhook, dados no app)
   - [ ] Ampliar o sync Withings para todos os dados
   - [ ] Criar alertas de pressão e o bloqueio da sessão pré-exercício
   - [ ] Confirmar a cobertura do seguro para acompanhamento remoto
   - [ ] Registro no ICO, DPIA e política de privacidade
   - [ ] Redigir os termos do plano e o aviso de não emergência
   - [ ] Configurar as assinaturas no processador de pagamento
2. Durante o piloto
   - [ ] Iniciar com a paciente hipertensa
   - [ ] Recrutar mais 4–9 pacientes com preço de fundador
   - [ ] Enviar o primeiro relatório mensal e colher feedback
   - [ ] Medir aderência, evolução da pressão e satisfação
3. Lançamento
   - [ ] Ajustar os preços com base no piloto
   - [ ] Material para pacientes: planos, aparelhos e links com aviso de afiliado
   - [ ] Oferecer o plano a todo paciente na alta
   - [ ] Solicitar a promoção da aplicação Withings para produção
