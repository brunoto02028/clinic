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

---

## Regressão obrigatória ao final

- As 21 telas da clínica abrem nos dois idiomas e nos dois estados do gate de plano, sem erro de
  console e sem chamada de API com falha.
- `npm run build` com `exit=0`.
- `tsc` do mobile no baseline de então, sem erro novo.
- Diff de schema contra a `main`, **schema contra schema**, com zero DROP.
