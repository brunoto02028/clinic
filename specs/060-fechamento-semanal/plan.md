# Atividade 60 — Fechamento semanal

## Objetivo

Dar ao terapeuta um jeito rápido de, na ficha de qualquer paciente, mandar uma mensagem de
"fechamento da semana" pedindo pra ela (a) marcar no app qualquer exercício/cuidado que já fez
mas esqueceu de clicar, e (b) escrever em Mensagens o motivo de qualquer item que realmente não
fez. Nasceu de uma investigação nesta sessão: os números do painel de aderência batem 100% com
os completion logs reais (confirmado ao vivo pra Ana Livia Pessin Prata) — não havia bug de
dado, só uma lacuna de comunicação (o texto dos lembretes não deixava claro que "não marcado"
pode significar só "esqueceu de clicar", não "não fez").

## Contexto técnico já levantado

- Já existe um sistema de mensagens clínica↔paciente pronto: `ClinicMessage`
  (`app/api/admin/patients/[id]/messages/route.ts`), a mesma aba "Messages" que a paciente usa
  pra responder. `POST` já cria a mensagem e chama `notifyPatient` (ping genérico "you have a
  new message" no canal preferido dela) — não precisamos reinventar esse transporte.
- Já existe o padrão visual e de estado exato que essa feature precisa: o card "Adherence" na
  ficha do paciente (`components/admin/patient-adherence-panel.tsx`), com o componente genérico
  `AdherenceSection` (Preview + Send now + "Sent [data]") usado hoje pra "Today"/"Yesterday"/
  "Onboarding". Vamos reaproveitar esse componente pro fechamento semanal, não criar um novo.
- **Armadilha encontrada em `lib/notify-patient.ts`**: `notifyPatient` recebe `plainMessage` (EN)
  e `plainMessagePt` (PT) e **decide sozinho** qual mandar com base no `preferredLocale` salvo no
  cadastro da paciente — ignora qual botão o terapeuta clicou. Isso quebraria a decisão do Bruno
  ("EN sempre, PT só quando eu escolher mandar"): se a paciente tiver `preferredLocale: pt-BR`,
  clicar em "Send (EN)" mandaria PT do mesmo jeito. **Decisão:** a rota de envio passa **só** o
  texto do idioma escolhido em `plainMessage`, nunca preenche `plainMessagePt` — o idioma que o
  terapeuta clicou sempre vence, a auto-detecção do `notifyPatient` fica sem efeito aqui.

## Decisões de design

1. **Texto da mensagem**: fixo, genérico, sem listar os itens da semana (o Bruno já aprovou os
   dois textos nesta conversa — ver `t-1`). Interpola o primeiro nome da paciente na saudação,
   igual aos outros templates do projeto.
2. **Mecanismo de envio**: rota nova e pequena, `POST /api/admin/patients/[id]/weekly-closing`
   (não reaproveita a rota genérica de mensagens diretamente, porque precisamos registrar
   `logAudit` — ver decisão 4). Internamente ela cria o `ClinicMessage` do mesmo jeito que a rota
   genérica (`kind: "notice"`, título fixo por idioma) e chama `notifyPatient` com o texto certo.
3. **UI**: reaproveita `AdherenceSection` (nenhuma mudança visual nova) com duas entradas lado a
   lado no card "Adherence" existente — "Weekly closing (EN)" em destaque, "Weekly closing (PT)"
   como a opção secundária que o Bruno pediu. Cada uma com seu próprio Preview + Send + "Sent
   [data]", independentes (pode mandar as duas na mesma semana se quiser).
4. **Rastreio "já mandei essa semana"**: dois `AuditLog` novos, `WEEKLY_CLOSING_SENT_EN` e
   `WEEKLY_CLOSING_SENT_PT` — mesmo padrão já usado pelos lembretes diários
   (`REMINDER_ACTION`/`YESTERDAY_ACTION`), só que a janela de dedupe é a semana corrente (segunda
   00:00 em vez do dia). Isso também faz o envio aparecer na aba Activity da paciente, seguindo o
   padrão que a atividade 51 já estabeleceu pra ações clínicas (SOAP note, protocolo, exercício).
5. **"Semana"**: segunda a domingo, calculado em hora local do servidor com o mesmo padrão
   simples (`setHours(0,0,0,0)` + recuar até a segunda) já usado em `patient-daily-adherence.ts`
   — sem lib de timezone nova, consistente com o resto do projeto.

## Suposições (peço validação)

1. **Escopo**: entendo que isso é uma feature reutilizável pra qualquer paciente toda semana
   (rotina da clínica), não um envio único pra Ana Livia — é o que "fechamento da semana" e
   "opção de eu enviar" sugerem. Se for só pra ela agora, me avisa que eu simplifico bastante
   (só disparo a mensagem uma vez, sem construir card/rota nova).
2. Mantenho o texto exatamente como você aprovou nesta conversa (sem listar os itens da semana
   sem log). Se quiser que eu liste os itens sem nenhum registro nos últimos 7 dias dentro da
   mensagem, é uma mudança pequena no `t-1`, mas muda o tom (fica mais "cobrança", menos
   "convite") — prefiro manter como está a menos que você peça.
3. O card só aparece pra pacientes com um protocolo/prescrição ativo (mesma regra que já existe
   pras seções "Today"/"Yesterday") — pra paciente sem plano nenhum, não faz sentido "fechar a
   semana".
4. Envio único por idioma por semana (o botão desabilita depois de clicado, mostra "Sent [data]",
   igual ao padrão de hoje/ontem) — não dá pra mandar EN duas vezes na mesma semana sem esperar a
   próxima segunda. Se quiser poder reenviar manualmente mesmo já tendo mandado, avisa que ajusto.
5. Preview (botão "Preview" ao lado do "Send") mostra o e-mail exatamente como ele sairia pelo
   fallback de e-mail do `notifyPatient` (mesmo H TML de `wrapInLayout` que as outras seções já
   usam) — mesmo que o canal real dela seja WhatsApp, o preview é só uma referência do texto.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Texto do fechamento semanal (lib) | concluído |
| T-2 | Rota de envio + status (API) | concluído |
| T-3 | Card na ficha do paciente (UI) | concluído |
| T-4 | Preview de e-mail + Activity log | concluído |

## QA e code review

QA (agente qa-tester, ambiente local, paciente fixture `qa.pacientea` — nunca produção/paciente
real): 20 cenários cobrindo os 4 T-N, incluindo a armadilha do idioma (confirmado: escolha do
terapeuta vence o `preferredLocale` da paciente) e a checagem de acesso cross-tenant (staff de
outra clínica → 404, sem enviar nada). Achou 1 bug real de UI: depois de mandar, o texto de
status acima do botão ficava "Not sent this week" desatualizado (só o botão em si mostrava
"Sent...") até recarregar a página — causa: `weeklyClosing` só era buscado uma vez no `useEffect`
inicial do componente pai, sem se atualizar após o envio de um filho. Corrigido com um callback
`onSent` que o `AdherenceSection` chama após um POST bem-sucedido, atualizando o estado do pai na
hora. Reverificado pelo mesmo agente: confirmado corrigido, sem novos problemas.

Code review (self-review sobre o diff completo): sem achados que exigissem correção. Nota: o
`POST /weekly-closing` sempre responde `sent: true` (reflete a criação do `ClinicMessage`, que é
o registro que realmente importa pro "já mandei essa semana"), não necessariamente o sucesso do
canal externo do `notifyPatient` — decisão consistente com o resto do arquivo, não uma omissão.
