# Atividade 074 — Monitoramento contínuo do paciente

**Decidido com o Bruno em 23/09/2026.**
**Depende de:** 070 (app do paciente, pressão arterial, integração Withings) e 072 (motor de automação).

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

**D5 — O token de push é dado por aparelho, não por paciente.**
Uma pessoa pode ter celular e tablet. Tabela própria, com `lastSeenAt`, e token inválido é
removido quando o provedor diz que morreu — token zumbi é a causa clássica de "não recebi".

## Tarefas

| T-N | Nome | Status |
|---|---|---|
| T-1 | `expo-notifications` no app e registro do token | pendente |
| T-2 | Envio de push no backend, com limpeza de token morto | pendente |
| T-3 | Limiares de pressão como `AutomationRule` | pendente |
| T-4 | Alerta de emergência: clínica sempre, paciente só em crise | pendente |
| T-5 | Preferências de notificação do paciente | pendente |
| T-6 | Relatório consolidado do paciente (tela) | pendente |
| T-7 | Exportação do relatório em PDF | pendente |

T-1 e T-2 são pré-requisito de T-4 e T-5. T-3 é independente. T-6 e T-7 são independentes das
demais e podem ser feitas em paralelo.

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
- **O limiar de 130/80 gera muito alerta.** Estágio 1 é comum. A clínica vai receber bastante
  alerta no painel; por isso T-3 deixa o número editável, e a deduplicação da 072
  (`alertDedupeKey`) evita repetir o mesmo alerta no mesmo dia.
- **Ambiente Withings em `Development`** limita o número de pacientes que podem autorizar. Não é
  desta atividade, mas trava o cenário real de ponta a ponta.
