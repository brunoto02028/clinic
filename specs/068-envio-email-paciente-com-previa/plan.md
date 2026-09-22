# 068 — Envio de e-mail ao paciente pelo sistema, com prévia e aprovação

## Objetivo
Hoje o único jeito de mandar um e-mail avulso ao paciente é a aba Messages, que dispara um e-mail genérico (assunto padrão fixo, corpo padrão com só os 120 primeiros caracteres do texto e link para o portal), **sem prévia** e sem controle de assunto. Bruno precisa escrever e-mails de verdade (ex.: confirmação de visita domiciliar), **ver exatamente o e-mail que a paciente vai receber** e só então enviar — sempre por clique explícito dele, nunca automático.

## Decisões de design
- **Composer "Email to patient"** (modal) aberto por botão na ficha do paciente (ao lado de "Send Invoice") e na aba Messages. Campos: modelo (Em branco / Confirmação de consulta / Confirmação de visita domiciliar), assunto e corpo em **EN e PT**, idioma de envio.
- **3 etapas:** Escrever → **Prévia** (o HTML exato com logo BPR num iframe, assunto, destinatário mascarado) → **Enviar** (clique explícito). O servidor só envia se o conteúdo bater com o que foi pré-visualizado (hash de assunto+corpo+idioma).
- **Idioma:** padrão = `preferredLocale` do paciente; opção "os dois" (idioma do paciente primeiro, o outro abaixo). Ana: EN primeiro.
- **Layout:** reaproveita `wrapInLayout` (logo/cores da clínica) — nada sai sem logo. Corpo é texto puro (escapado; quebras de linha → `<br>`), sem HTML livre.
- **Modelos com variáveis** preenchidas a partir da consulta (data/hora **no fuso Europe/London**, endereço do cadastro, terapeuta, valor) — editáveis antes da prévia. Texto usa "Terapeuta"/"therapist" (nunca "fisioterapeuta").
- **Histórico:** novo model `PatientOutboundEmail` (assunto, corpo, idioma, quem enviou, quando, resultado do provedor) exibido na aba Messages ("Emails sent") — Bruno vê depois o que foi mandado. Cópia oculta (BCC) para o e-mail de notificação da clínica, como o envio atual.
- **Nunca automático:** só existe rota de envio disparada por staff logado; escopo `staffPatientAccess` (clínica do paciente); só ao e-mail cadastrado do próprio paciente; limite de envios por paciente/hora.
- **Só clínica:** oculto para o tenant personal; nada disso aparece na área do paciente.
- Sem dependência nova. Deploy do schema por `prisma db push` (model novo, aditivo).

## Tarefas
| T-N | nome | status |
|---|---|---|
| T-1 | Model `PatientOutboundEmail` + APIs `preview` e `send` (com hash e log) | concluído |
| T-2 | Composer em 3 etapas (escrever → prévia → enviar) + histórico "Emails sent" | concluído |
| T-3 | Modelos de confirmação de consulta/visita com variáveis (fuso London, endereço) + atalho na linha da consulta | concluído |

## Suposições (validar)
1. Composer em modal, aberto da ficha do paciente e da aba Messages (não uma página nova).
2. Idioma: padrão do paciente, com opção de enviar nos dois (paciente primeiro).
3. Registrar cada envio num model novo (`PatientOutboundEmail`) em vez de reaproveitar `ClinicMessage`, para guardar assunto/HTML e o resultado do provedor.
4. Modelos iniciais: só "Confirmação de consulta" e "Confirmação de visita domiciliar" + em branco.
5. Anexos: fora do escopo.
6. **Decisão do Bruno:** o formulário "New Appointment" hoje **envia sozinho** o e-mail de confirmação ao criar (regra dele: nada sai sem prévia). Trocar esse comportamento (criar sem enviar + botão "Enviar confirmação" com prévia) é uma mudança de comportamento existente — incluir nesta atividade ou deixar para depois?
7. **A verificar (pode ser bug existente, fora do escopo):** os e-mails automáticos de consulta formatam a hora com `toLocaleTimeString('en-GB')` no servidor, sem fuso; se o container roda em UTC, a hora sai 1 h adiantada no horário de verão do Reino Unido. Verificar antes de mexer.

## Restrições fixas
Nada é enviado automaticamente; nada sai sem Bruno ver a prévia; texto com "Terapeuta"; PT+EN; logo BPR.

## Decisões tomadas na implementação (aprovadas por Bruno: "aprovo, pode prosseguir")
- O composer fica na aba **Messages** da ficha (painel acima da conversa), não no cabeçalho; a agenda abre a ficha com `?email=<consulta>` e o composer já vem preenchido.
- Suposição 6 incluída: o formulário "New Appointment" passa a **criar sem enviar** por padrão (checkbox "Enviar e-mail de confirmação agora (sem prévia)" desmarcado). Pagamento online continua enviando, porque o e-mail leva o link de pagamento. A API mantém o comportamento antigo quando `sendConfirmation` não é informado (compatibilidade).
- Data/hora dos modelos no fuso `Europe/London` (`Intl`, independente do fuso do servidor).
- Bloqueado para tenants personal (403 na API; painel oculto).
- Pendente de verificação (fora do escopo): e-mails automáticos de consulta formatam a hora sem fuso no servidor (`toLocaleTimeString('en-GB')`) e não há `TZ` no Dockerfile/compose — provável hora adiantada em 1 h no horário de verão.

## Resultado
QA local aprovado (20/20 cenários, ver qa/report-t-1.md, report-t-2.md, report-t-3.md) e code review independente feito duas vezes (implementação inicial + correções pós-QA: CRLF no assunto), sem bloqueantes nas duas rodadas. **QA online (prod) aprovado — commit 933efd74, ver qa/report-online.md.**

Correção adicional feita após o QA (pedido do Bruno, 22/09): a caixa "Write your message to the patient…" (aba Messages, mensagem avulsa fora do composer de e-mail) também passou a exigir prévia — Enter e o botão só abrem um diálogo com o texto exato; só o botão do diálogo envia.
