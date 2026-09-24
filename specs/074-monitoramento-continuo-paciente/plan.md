# Atividade 074 — Monitoramento contínuo do paciente

**Decidido com o Bruno em 23/09/2026.**
**Depende de:** 070 (app do paciente, pressão arterial, integração Withings) e 072 (motor de automação).
**Specs de origem:** `plano-comercial.md` (23/09/2026) e `spec-medicao-pressao-clinica.md`
(23/09/2026, o aparelho compartilhado da clínica — detalha T-14 e T-15).
**Origem comercial:** `plano-comercial.md` (23/09/2026) — o Acompanhamento BPR, assinatura mensal
que esta atividade existe para sustentar. Leia-o antes de mexer em qualquer tarefa: ele define os
três planos, o que cada um libera, os limiares de pressão do exercício e as nove pendências
jurídicas.

## Objetivo

Fechar o ciclo que o Bruno descreveu: *"paciente usando app + relógio + medidor de pressão, tudo
vai ficando registrado; se tiver emergência, a clínica e o paciente são avisados por notificação;
e a clínica gera relatórios daquele paciente juntando consulta, triagem, tratamento, exercícios."*

Três peças, nessa ordem, porque cada uma depende da anterior:

1. **O aviso chega** — push notification no celular, que hoje não existe.
2. **O limiar é da clínica** — as regras de emergência saem do código e vão para o motor da 072.
3. **A clínica enxerga o conjunto** — um relatório por paciente, exportável.

## O que já existe (e não vamos refazer)

O sistema está mais adiantado do que a descrição sugere.

| Peça | Situação real |
|---|---|
| Registro de pressão arterial | **Existe**: `BloodPressureReading`, app (ativ. 070), web, prontuário do clínico |
| Wearable → banco | **Existe**: Withings direta (ativ. 070) grava pressão, sono e atividade |
| Alerta para a clínica | **Existe**: `Alert` + `/admin/alerts` (ativ. 072) e `sendAdminAlert` por e-mail |
| Fila com aprovação humana | **Existe**: `OutboundMessage` + `/admin/outbox` (ativ. 072) |
| Regras em banco | **Existe**: `AutomationRule` + `/admin/automation` (ativ. 072) |
| Check-in diário, exercícios, aderência | **Existe**: ativ. 042–049 |
| Triagem, protocolo, notas clínicas | **Existe** |
| **Push notification** | **Falta** — `expo-notifications` não está instalado |
| **Limiares de PA configuráveis** | **Falta** — `130/80` e `180/120` estão cravados na rota |
| **Relatório consolidado do paciente** | **Falta** — o dado está todo lá, falta a tela que junta |

## O que o plano comercial acrescenta

O documento chegou depois do plano técnico e muda três coisas.

**A assinatura decide o que o paciente vê.** Três planos — Essencial (£49), Cardio (£59),
Performance (£79) — e a diferença entre eles é exatamente quais dados aparecem: o Essencial não
tem pressão, o Cardio não tem sono/HRV/SpO2/ECG. Isso é o sistema de módulos que já existe
(`MODULE_REGISTRY`, `mod_devices`), não um mecanismo novo — mas as chaves precisam existir e os
planos precisam concedê-las.

**Os limiares do exercício não são os do consultório.** O que implementei na T-3 (130/80 alerta,
180/120 crise) são as faixas ACC/AHA para classificar uma leitura. O plano comercial define outra
coisa: **200/110 antes do exercício bloqueia a sessão do dia**, e 250/115 durante manda
interromper. São limiares de segurança do treino, não de diagnóstico, e convivem com os primeiros.

**Uma restrição regulatória que manda no produto.** O documento é explícito: *"se o app passar a
diagnosticar ou recomendar tratamento, pode ser classificado como dispositivo médico pela MHRA"*.
Isso confirma a decisão D3 e a transforma em regra dura, não preferência: o relatório agrega,
nunca conclui. Vale para qualquer coisa que venhamos a construir aqui.

### Uma correção de fato

A suposição de que o ambiente `Development` da Withings limitaria o piloto **estava errada**. O
documento traz a fonte: o plano **Standard é gratuito até 5.000 usuários ativos** e 120
requisições por minuto ([Withings API plans](https://developer.withings.com/developer-guide/v3/withings-solutions/withings-api-plans/)).
Não há trava de custo para o piloto nem para os 100 assinantes do cenário de crescimento.

### Atenção: quatro itens marcados como prontos que não estão

O `plano-comercial.md` marca com `[x]` cinco itens da integração Withings. Um está certo
(escopos OAuth, que a 070 entregou: `user.metrics,user.activity`). **Quatro não estão feitos:**

| Item marcado `[x]` | Situação real |
|---|---|
| Ampliar o sync para SpO2, FC intraday, temperatura, HRV e ECG | **Falta** — a 070 traz pressão, sono e atividade |
| Webhook de notificações para medidas novas | **Falta** — `app/api/wearables/webhook` não trata Withings |
| Botão "Desconectar" que revoga na Withings | **Parcial** — apaga a conexão aqui, não revoga lá |
| Promover a aplicação para produção | **Falta** — está em `Development` |

Viraram T-8 a T-11. O escopo `user.info`, que o documento também lista, **não** está pedido hoje
e precisa entrar se for necessário.

## Decisões de design

**D1 — Push para os dois lados, com regras diferentes.**
Alerta para a **clínica** é automático, sempre: é segurança clínica, e foi a decisão da 072
("motor prepara, você aprova" vale para mensagem ao paciente, não para alerta ao terapeuta).
Push para o **paciente** segue a aprovação humana, com **uma exceção**: crise hipertensiva
(≥180/120), onde a mensagem é "vá ao pronto-socorro agora" e esperar alguém abrir o admin é
inaceitável.

**D2 — O limiar vira regra, não constante.**
Hoje `130/80` e `180/120` estão no código de `app/api/patient/blood-pressure/route.ts`. Vão para
`AutomationRule`, editáveis por clínica em `/admin/automation`, com os valores atuais como
*seed* e *fallback* — o mesmo padrão que a 072 usou para o limiar de aderência
(`lib/automation/adherence-threshold.ts`).

**D3 — O relatório é leitura, não geração de conteúdo.**
Ele junta o que já foi registrado num período. Não usa IA, não infere, não conclui. Um relatório
clínico que inventa é pior que nenhum.

**D4 — Push não substitui e-mail; reforça.**
Nem todo paciente instala o app, e push falha (permissão negada, token expirado, aparelho
desligado). O e-mail continua sendo o canal de garantia; o push é o que chega a tempo.

**D7 — Um aparelho, uma sessão aberta, e nada fecha sozinho.**
Abrir uma segunda janela no mesmo aparelho é recusado com a mensagem dizendo qual paciente está
esperando; fechar a anterior em silêncio é a conveniência que troca prontuário. A tela do terapeuta
acompanha por polling de 3 segundos (`spec-medicao-pressao-clinica.md`, seção 6), e a sessão vencida
é marcada na própria leitura de status, sem cron — um cron a mais é uma peça a mais para falhar
calada.

**D6 — A leitura do aparelho da clínica é atribuída por janela de tempo, e a dúvida vira fila.**
Um BPM Connect na recepção é uma conta Withings medindo dez pacientes por dia, o que quebra a
premissa de "uma conexão, um paciente". O terapeuta abre uma janela de 3 minutos no prontuário
antes de medir, e a medida que cair dentro dela é daquele paciente. **Se cair em nenhuma janela, ou
em duas, ninguém adivinha**: vai para uma caixa de entrada e um humano atribui. Pressão arterial no
prontuário errado é um erro clínico; pedir um clique não é. Detalhe em T-14 e T-15.

**D5 — O token de push é dado por aparelho, não por paciente.**
Uma pessoa pode ter celular e tablet. Tabela própria, com `lastSeenAt`, e token inválido é
removido quando o provedor diz que morreu — token zumbi é a causa clássica de "não recebi".

## Tarefas

| T-N | Nome | Status |
|---|---|---|
| T-1 | `expo-notifications` no app e registro do token | pendente |
| T-2 | Envio de push no backend, com limpeza de token morto | pendente |
| T-3 | Limiares de pressão como `AutomationRule` | ✅ concluída |
| T-4 | Alerta de emergência: clínica sempre, paciente só em crise | pendente |
| T-5 | Preferências de notificação do paciente | pendente |
| T-6 | Relatório consolidado do paciente (tela) | ✅ concluída |
| T-7 | Exportação do relatório em PDF | ✅ concluída |
| T-8 | Sync Withings completo: SpO2, HRV, temperatura, FC intraday, ECG | pendente |
| T-9 | Webhook da Withings para medidas novas | ✅ concluída |
| T-10 | Desconectar revogando o acesso na Withings | 🟡 feita, QA pendente |
| T-11 | Bloqueio da sessão por pressão pré-exercício (200/110) | ✅ concluída |
| T-12 | Módulos e permissões por plano de assinatura | pendente |
| T-13 | Aviso de não emergência no app | pendente |
| T-14 | Dispositivo da clínica: sessão de medição e atribuição da leitura | ✅ concluída |
| T-15 | Botão "Medir pressão" na ficha e caixa de entrada de não atribuídas | ✅ concluída |

T-1 e T-2 são pré-requisito de T-4 e T-5. T-3 é independente. T-6 e T-7 são independentes das
demais e podem ser feitas em paralelo. T-8 a T-11 vêm do plano comercial e são pré-requisito do
piloto. T-13 é pré-requisito de **vender**, não de construir — mas é barata e não tem motivo para
esperar.

T-14 e T-15 vêm da `spec-medicao-pressao-clinica.md` (23/09/2026): um BPM Connect da clínica,
medindo vários pacientes, com a atribuição decidida aqui e não pela Withings. T-14 depende da T-9,
porque a janela de 3 minutos só faz sentido com a medida chegando por webhook; sem ela funciona
pelo sync agendado, com atraso de minutos.

**Ordem sugerida para destravar o piloto**, seguindo o checklist do plano comercial: T-3 (feita),
T-6, T-7, T-11, T-8, T-13 — depois T-9 e T-14/T-15, que dependem dela, depois T-1/T-2/T-4/T-5, que
dependem do build nativo, e T-12, que depende de decidir o processador de pagamento.

## Suposições

Tudo aqui foi decidido por mim e precisa da sua validação antes de virar código.

1. **Provedor de push:** Expo Push Notifications (gratuito, já integrado ao EAS que vamos usar
   para o TestFlight). A alternativa é Firebase Cloud Messaging direto, que dá mais controle e
   mais trabalho. **Assumi Expo.**
2. **T-1 exige build nativo.** Push não funciona no Expo Go nem na web. Ou seja: **esta
   atividade só é testável depois do primeiro build EAS**, e o QA de T-1/T-2 depende disso.
3. **Período padrão do relatório:** últimos 90 dias, ajustável. Assumi que é o que cobre um
   ciclo de tratamento.
4. **Quem vê o relatório:** staff da clínica do paciente (`getSessionStaffActor`). O paciente
   **não** vê esta tela — ele já tem as telas individuais no app. Se você quiser que ele veja,
   é outra decisão.
5. **PDF:** mesma biblioteca já usada nas faturas (ativ. 070/072), para não introduzir
   dependência nova.
6. **Emergência = só pressão arterial, por enquanto.** Nada de wearable dispara emergência nesta
   atividade: frequência cardíaca de repouso alta ou sono ruim não são evento agudo, e um alerta
   por dado de pulseira é ruído. Se você quiser regras sobre eles, é uma T-8.
7. **Sem escalonamento.** Se ninguém abrir o alerta, ele fica lá. Fila de escalonamento
   (avisar outro terapeuta após N minutos) ficou fora.

## Riscos

- **Permissão de notificação negada** é o estado mais comum em iOS. A tela de preferências (T-5)
  precisa dizer o que está desligado e como religar nos ajustes do sistema — senão o paciente
  acha que o app está quebrado.
- **Dois conjuntos de limiares convivendo** é o risco de confusão mais provável desta atividade:
  130/80 classifica uma leitura em casa; 200/110 bloqueia uma sessão de exercício. São propósitos
  diferentes e precisam de nomes diferentes na interface e no código, ou alguém vai ajustar um
  achando que mexe no outro.
- **O limiar de 130/80 gera muito alerta.** Estágio 1 é comum. A clínica vai receber bastante
  alerta no painel; por isso T-3 deixa o número editável, e a deduplicação da 072
  (`alertDedupeKey`) evita repetir o mesmo alerta no mesmo dia.
- **Ambiente Withings em `Development`.** Não é limite de custo — o Standard é gratuito até
  5.000 usuários —, mas a aplicação precisa ser promovida para produção antes do piloto.
  Enquanto estiver em Development, o cenário real de ponta a ponta não roda.
- **A janela de medição da clínica erra para os dois lados.** Curta demais, perde a leitura e
  enche a caixa de entrada; longa demais, captura a medida do paciente seguinte — e este é o erro
  caro, porque ninguém percebe. Por isso o padrão é 3 minutos, a comparação é sobre o horário da
  medida (não o da chegada) e ambiguidade nunca vira palpite.
- **Relógio do aparelho fora de hora** desloca todas as janelas de uma vez. Vale conferir a hora do
  BPM Connect no primeiro uso, e a caixa de entrada é a rede de proteção quando isso acontecer.
- **As nove pendências jurídicas** do plano comercial (ICO, DPIA, seguro, termos, entidade) são
  pré-requisito de **vender**, não de construir, e nenhuma é minha para fazer — mas a T-13
  entrega a peça de software que uma delas exige.
