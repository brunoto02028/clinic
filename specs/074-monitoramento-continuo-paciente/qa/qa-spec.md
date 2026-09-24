# QA — Atividade 074

**Pré-requisito que vale para T-1, T-2, T-4 e T-5:** push não funciona no Expo Go nem na web.
Esses cenários **só podem ser executados em build nativo** (EAS development ou TestFlight), num
aparelho real. Cenário marcado com 📱 exige isso; sem o build, o QA deve reprovar por *não
executado*, nunca aprovar por suposição.

**Paciente de teste em produção:** a convenção é `admin+qaN@bpr.clinic`
(`specs/009-fluxo-acesso-paciente/qa/qa-spec.md`). Nunca usar paciente real.

**Atenção ao slug:** em produção a clínica é `bruno-physical-rehab`, não
`bruno-physical-rehabilitation` — a forma longa devolve `{"schedule":[]}` com HTTP 200, que é
indistinguível de falha.

---

## T-1 — Token de push

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 1.1 | 📱 UI | Primeiro login num aparelho novo | O diálogo do sistema aparece uma vez |
| 1.2 | 📱 UI | Recusar a permissão e reabrir o app | Não pede de novo; o app funciona normalmente |
| 1.3 | 📱 API | Aceitar a permissão | `PushToken` gravado com `platform` correto e `lastSeenAt` |
| 1.4 | API | `POST /api/patient/push-tokens` com o mesmo token duas vezes | Uma linha só, `lastSeenAt` atualizado |
| 1.5 | API | Sem bearer | 401, nada gravado |
| 1.6 | API | Token de outro paciente no corpo | Grava para o dono do bearer, nunca para o id enviado |
| 1.7 | 📱 UI | Logout | O token daquele aparelho some; os de outros aparelhos permanecem |
| 1.8 | UI | Abrir o app na web | Nenhum erro de console; a ausência de push é silenciosa |

## T-2 — Envio

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 2.1 | API | `sendPushToUser` para paciente com um token | Uma chamada ao provedor, receipt lido |
| 2.2 | API | Paciente sem nenhum token | Retorna sem erro e sem chamada |
| 2.3 | API | 150 tokens | Dois lotes, nenhum acima de 100 |
| 2.4 | API | Provedor devolve `DeviceNotRegistered` | O token é apagado do banco |
| 2.5 | API | Provedor fora do ar | Não lança; o chamador conclui normalmente |
| 2.6 | API | `sendPushToClinicStaff` | Só a equipe daquela clínica recebe — nenhum staff de outra |

## T-3 — Limiares

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 3.1 | API | Banco sem a regra | Usa 130/80 e 180/120; comportamento idêntico ao de hoje |
| 3.2 | API | Regra global em 140/90 | Leitura em 135/85 não alerta |
| 3.3 | API | Regra da clínica diverge da global | A da clínica vence |
| 3.4 | UI | Salvar crise **abaixo** do alerta em `/admin/automation` | Recusado com mensagem |
| 3.5 | UI | Alterar a regra e registrar uma leitura | Novo limiar vale sem deploy |

## T-4 — Emergência

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 4.1 | API | Leitura 118/76 | Nenhum alerta, nenhum push, nenhum e-mail |
| 4.2 | API | Leitura 145/92 | `Alert` na central + push à equipe; **nada** ao paciente |
| 4.3 | 📱 API | Leitura 190/125 | Tudo de 4.2 + push ao paciente + e-mail de crise |
| 4.4 | API | Duas leituras altas no mesmo dia | **Um** alerta, não dois (`alertDedupeKey`) |
| 4.5 | API | Leitura alta chegando pelo sync Withings | Dispara igual à digitada |
| 4.6 | UI | Central `/admin/alerts` | Crise aparece como `URGENT` |
| 4.7 | API | Staff de outra clínica abre o alerta | 403/404 |

## T-5 — Preferências

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 5.1 | 📱 UI | Desligar "lembretes de exercício" | Aquele push não chega; os outros sim |
| 5.2 | 📱 UI | Desligar tudo e gerar uma crise | O push de emergência chega assim mesmo |
| 5.3 | 📱 UI | Permissão negada no sistema | A tela explica e oferece abrir os ajustes |
| 5.4 | UI | Reinstalar o app e entrar | As preferências voltam (estão no servidor) |
| 5.5 | UI | Tela em inglês e em português | Nenhuma string no idioma errado |

## T-6 — Relatório

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 6.1 | UI | Paciente com dado nas oito áreas | Todas aparecem, no período pedido |
| 6.2 | UI | Período sem nenhum dado | Diz que não há dado; não desenha gráfico vazio |
| 6.3 | API | Staff de outra clínica | 403/404, nenhum dado no corpo |
| 6.4 | API | `from` posterior a `to` | 400 com mensagem |
| 6.5 | UI | Conferir contra as telas individuais | Os números batem |
| 6.6 | UI | Inglês e português | Bilíngue, inglês primeiro |
| 6.7 | UI | Paciente com 90 dias de pressão | O gráfico usa uma escala só, e todo rótulo nomeia um valor que o gráfico alcança |

## T-7 — PDF

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 7.1 | UI | Baixar o PDF | Abre em leitor comum |
| 7.2 | UI | Comparar com a tela | Mesmo conteúdo, mesmo período |
| 7.3 | UI | Cabeçalho | Logo da clínica, nome do paciente, período, data |
| 7.4 | UI | Nome do arquivo | Identifica paciente e período |
| 7.5 | API | Verificar que nada foi enviado | Nenhum e-mail, nenhuma `OutboundMessage` criada |

## T-8 — Sync Withings completo

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 8.1 | API | Conta com SpO2, HRV e temperatura | Os três chegam ao banco |
| 8.2 | API | Conta sem nenhum deles | O resto sincroniza, sem erro |
| 8.3 | API | Métrica ausente | Aparece como ausente, nunca como zero |
| 8.4 | API | Token expirado no meio do sync | Renova e continua (o refresh gira a cada uso) |

## T-9 — Webhook da Withings

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 9.1 | API | Notificação válida de conexão conhecida | A medida entra em segundos |
| 9.2 | API | `userid` desconhecido | 200 `{"status":0}` e nada gravado |
| 9.3 | API | `GET`/`HEAD` na URL do webhook | 200 (a Withings verifica antes de inscrever) |
| 9.4 | API | A mesma notificação duas vezes | Uma linha só |
| 9.5 | API | Medida que o sync agendado também traz | Uma linha só (dedup por `grpid`) |
| 9.6 | API | Linha antiga sem `grpid`, mesmo horário | Reconhecida e completada, não duplicada |
| 9.7 | API | Conexão desconectada | 200 e nada gravado |
| 9.8 | API | Token inválido na conexão notificada | 200, erro no log, servidor de pé |
| 9.9 | API | Rota fora do gate de sessão | Sem 307 para /login |

## T-10 — Desconectar

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 10.1 | API | Desconectar uma conexão Withings | Tokens **apagados** do banco, não só status |
| 10.2 | API | Inscrições de notificação | Canceladas; nada chega depois |
| 10.3 | API | Falha ao cancelar inscrição | Desconecta assim mesmo, com log |
| 10.4 | UI | Tela do paciente após desconectar | Diz o que foi feito e o que só ele pode fazer, com o link |
| 10.5 | API | Histórico já sincronizado | Continua no prontuário |

## T-11 — Bloqueio pré-exercício

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 11.1 | API | 205/112 há 10 min | `BLOCKED`; alerta à clínica |
| 11.2 | API | A mesma leitura de 3 h atrás | `NO_RECENT_READING`, não bloqueia |
| 11.3 | API | 150/95 recente | `CLEAR` |
| 11.4 | API | Exatamente 200/110 | Não bloqueia ("acima de" é acima) |
| 11.5 | API | 170/105 (bloqueia treino, não é crise) | Clínica avisada, **paciente não** |
| 11.6 | UI | Tela de treino bloqueada (web e app) | Banner com valor, hora e orientação; marcar desabilitado |
| 11.7 | UI | Item já marcado com bloqueio ativo | Continua desmarcável |
| 11.8 | UI | `/admin/automation` | Os quatro limites editáveis; 600/400 recusado nos dois idiomas |
| 11.9 | UI | Preview da regra de exercício | Fala de leitura, não de "missing activities" |
| 11.10 | API | Editar uma regra de PA | Não altera a outra |

## T-12 — Planos

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 12.1 | UI | Paciente no Essencial | Não vê pressão, no app nem na web |
| 12.2 | UI | Upgrade | Libera sem novo login |
| 12.3 | UI | Downgrade | Esconde, não apaga |
| 12.4 | UI | Override do admin | Manda mais que o plano |

## T-13 — Aviso de não emergência

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 13.1 | UI | Telas de dispositivos e de pressão | O aviso aparece |
| 13.2 | API | Rodapé de alerta (e-mail e push) | O aviso vai junto |
| 13.3 | UI | Primeiro aparelho sem aceite | Não conecta |
| 13.4 | API | Aceite registrado | `ConsentLog` com data e versão do texto |
| 13.5 | UI | Inglês e português | Bilíngue, inglês primeiro, sem "Rehab" |

## T-14 — Dispositivo da clínica (atribuição)

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 14.1 | API | Sessão aberta e medida dentro da janela | Entra no prontuário do paciente, `method=CLINIC_DEVICE`, `recordedById` = quem abriu |
| 14.2 | API | Medida 10 min depois de expirar | Vai para `UnassignedMeasurement`; nenhum prontuário tocado |
| 14.3 | API | Duas sessões cuja janela contém a medida | Vai para a caixa de entrada, não para um palpite |
| 14.4 | API | Abrir segunda sessão no mesmo aparelho | A primeira é fechada, com `closedById` |
| 14.5 | API | Mesma medida por webhook e por sync | Uma linha só |
| 14.6 | API | Medida de aparelho da clínica A com sessão aberta na clínica B | Não atribui; fica não atribuída na clínica A |
| 14.7 | API | Horário da medida anterior ao `openedAt` | Não atribui (a janela é fechada nos dois lados) |
| 14.8 | API | `AuditLog` após abrir e após atribuir | Duas entradas, com paciente, leitura e autor |
| 14.9 | API | Abrir sessão como staff de outra clínica | 403/404 |
| 14.10 | API | Medida com o mesmo `grpid` por webhook e por sync | Uma linha (dedup por `withingsMeasureId`) |
| 14.11 | API | Medida 20s antes do `openedAt` | Atribui (a folga de 30s da spec) |
| 14.12 | API | Conectar conta Withings já ligada a outro paciente | Recusado, com mensagem clara |
| 14.13 | API | Paciente com aparelho próprio mede em casa | `PATIENT_DEVICE` / `HOME`, como hoje |
| 14.14 | API | Sessão aberta e não usada, consultada depois de 3 min | Status `EXPIRED`, sem cron

## T-15 — Botão e caixa de entrada

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 15.1 | UI | Clínica sem aparelho configurado | O botão não aparece |
| 15.2 | UI | Abrir sessão e medir | A leitura aparece na ficha sem recarregar |
| 15.3 | UI | Deixar expirar | A tela diz que expirou e oferece abrir de novo |
| 15.4 | UI | Atribuir da caixa de entrada | Vai para o paciente escolhido; some da caixa; consta no `AuditLog` |
| 15.5 | UI | Descartar sem motivo | Recusado; com motivo, some sem entrar em prontuário |
| 15.6 | UI | Badge de contagem | Bate com o número de não atribuídas da clínica |
| 15.7 | UI | Inglês e português | Bilíngue, inglês primeiro |
| 15.8 | UI | Sair da tela com a sessão aberta | O polling para (conferir na aba de rede) |
| 15.9 | UI | Histórico do paciente (admin, web e app) | Cada leitura mostra origem e contexto |
| 15.10 | API | Paciente logado chamando as rotas de staff | Recusado, sem dado no corpo |

---

## Regressão obrigatória ao final

- As 21 telas da clínica abrem nos dois idiomas e nos dois estados do gate de plano, sem erro de
  console e sem chamada de API com falha.
- `npm run build` com `exit=0`.
- `tsc` do mobile no baseline de então, sem erro novo.
- Diff de schema contra a `main`, **schema contra schema**, com zero DROP.
