# Inventário de botões e ações — painel da clínica (admin web)

Data: 24/09/2026 · Método: leitura de código (nenhum arquivo alterado, nada rodado contra banco ou produção).
Escopo: `app/admin/**` e os componentes que essas telas montam, com foco no que é usado no dia a dia.

**Legenda dos vereditos**

| veredito | significa |
|---|---|
| `OK` | faz o que promete, trata erro e dá retorno visual |
| `MORTO` | sem handler, handler vazio, ou código que roda mas nunca aparece na tela |
| `SEM RETORNO` | age, mas em algum caminho (normalmente a falha) não mostra nada ao usuário |
| `DESTRUTIVO SEM CONFIRMAR` | ação irreversível ou de alto impacto sem confirmação |
| `ROTA/API INEXISTENTE` | aponta para endpoint ou página que não existe |
| `INCERTO` | precisa de teste em tela para decidir |

**Verificação de rotas:** todas as ~45 chamadas `fetch()` e todos os `Link`/`router.push` das telas prioritárias (seções 1 a 4) foram conferidos um a um contra `app/api/**` e `app/**`. **Nenhuma rota ou endpoint inexistente nas telas prioritárias.** Os dois únicos casos do painel inteiro estão na seção 5, em telas de apoio.

---

## 1. Prontuário do paciente — `app/admin/patients/[id]/page.tsx`

É a tela mais usada e a mais carregada: 3.505 linhas, ~130 elementos clicáveis, 17 abas.

### 1.1 Cabeçalho e crachás de status

| elemento (arquivo:linha) | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:765` | Back | `router.back()`, com fallback para `/admin/patients` | OK |
| `page.tsx:787` | (barra de medição) | monta `ClinicMeasurementButton` — ver seção 2.2 | — |
| `page.tsx:792` | Report | vai para `/admin/patients/{id}/report` | OK |
| `page.tsx:793` | Permissions | vai para `/admin/patients/{id}/permissions` | OK |
| `page.tsx:794` | Documents | troca para a aba Documents | OK |
| `page.tsx:803` | AI Assessment · {status} | vai para `/admin/patients/{id}/diagnosis` | OK |
| `page.tsx:847` (handler `:625`) | Grant Full Access / Full Access Active | libera todos os módulos do paciente sem plano/pagamento | OK — tem loading e mensagem; é reversível, mas **não pede confirmação** para uma mudança de acesso |
| `page.tsx:858` | Reset Password | só abre o formulário abaixo | OK |
| `page.tsx:862` (handler `:728`) | View as Patient | cria sessão de impersonação e faz `window.open("/dashboard")` | **SEM RETORNO** — sem loading; se o bloqueador de pop-up barrar a aba, nada acontece na tela e o Bruno fica achando que o botão está quebrado |
| `page.tsx:866` | Send Invoice | abre o diálogo de fatura | OK |
| `page.tsx:876` | Emails: EN / PT | grava `preferredLocale` do paciente | OK — `disabled` quando já é o idioma ativo (correto, não é trava) |

### 1.2 Diálogo Send Invoice

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:899` / `:940` | X / Cancel | fecham o diálogo | OK |
| `page.tsx:923` | X (remover item) | remove a linha; `disabled` quando só resta 1 item (correto) | OK |
| `page.tsx:930` | Add item | acrescenta linha | OK |
| `page.tsx:941` (handler `:701`) | Generate Invoice | POST `/invoice`; **enfileira para aprovação**, nada vai ao paciente até o Bruno aprovar em Marketing → Email → Pending Approval | OK — respeita a regra da prévia |

### 1.3 Reset de senha inline

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:962` | olho | mostra/esconde a senha | OK |
| `page.tsx:966` (handler `:642`) | Confirm | troca a senha do paciente | OK — valida mínimo 6 caracteres, tem loading e mostra erro. Sem `confirm()`, mas é formulário explícito com senha digitada |
| `page.tsx:969` | X | cancela e limpa | OK |

### 1.4 Aba Summary (Resumo)

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:1122` (handler `:580`) | Copy (link de convite) | `navigator.clipboard.writeText` | **SEM RETORNO** — sem `try/catch`; em contexto não-seguro ou com permissão negada a promise rejeita, o "Copied!" nunca aparece e nada explica o porquê |
| `page.tsx:1127` (handler `:568`) | Generate Invite Link | POST `/invite` | OK |
| `page.tsx:1139` | SOAP Note | abre a aba Notas com nota nova | **INCERTO** — ver o bug de auto-save em 1.7 (não limpa `autoSavedNoteId`) |
| `page.tsx:1142` | Write History | abre o formulário de história clínica | OK |
| `page.tsx:1144` | Upload | abre o formulário de upload | OK |
| `page.tsx:1146` | View AI Assessment → | link para a página de diagnóstico | OK |
| `page.tsx:1152` (handler `:542`) | Generate AI Assessment | POST `/diagnosis` | OK |
| `page.tsx:1157` | AI Import | abre o painel de importação | OK |
| `page.tsx:989` / `:990` | Save / Cancel (história clínica) | `saveManualDoc` | OK |
| `page.tsx:1005` / `:1006` | Upload / Cancel (documento) | `handleUpload` | OK |
| `page.tsx:1171` | X (fechar AI Import) | fecha e limpa resultado | OK |
| `page.tsx:1182` | microfone (ditado) | Web Speech API; avisa por `alert()` se o navegador não suporta | OK |
| `page.tsx:1232` (handler `:608`) | Confirm & Save All | confirma a importação de IA | OK |
| `page.tsx:1239` (handler `:588`) | Run AI Import | roda a extração | OK |

### 1.5 Aba Screening

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:1293` | lápis | abre a edição da triagem | OK |
| `page.tsx:1300` | (12 red flags) | alterna cada bandeira vermelha | OK |
| `page.tsx:1312` / `:1313` | Save / Cancel | `saveScreening` | OK |
| `page.tsx:1346` | 🗑 (apagar conjunto de perguntas) | `confirm()` **e então** DELETE | **SEM RETORNO** — o `.then()` remove a linha da tela **sem checar `res.ok`**, e o `.catch(() => {})` engole a falha. Se a API recusar, a pergunta some da tela e volta no próximo refresh |

### 1.6 Aba Assessments (Avaliações)

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:1393` | lápis (foot scan) | abre edição | OK |
| `page.tsx:1406` | Save / Cancel | `saveScan` | OK |
| `page.tsx:1426` | lápis (body assessment) | abre edição | OK |
| `page.tsx:1427` (handler `:659`) | lixeira (body assessment) | DELETE com `confirm("...This cannot be undone.")` e erro tratado | OK |
| `page.tsx:1441` | Save / Cancel | `saveBA` | OK |
| `page.tsx:1458` | Upload (termografia) | abre o formulário | OK |
| `page.tsx:1473` (handler `:669`) | Upload (enviar) | sobe as imagens uma a uma | OK |
| `page.tsx:1476` | Cancel | limpa e fecha | OK |
| `page.tsx:1486` | (imagem da termografia) | abre o arquivo em nova aba | OK |
| `page.tsx:1495` / `:1502` | lápis / Save / Cancel (notas da termografia) | `saveThermoNotes` | OK |
| `page.tsx:1520` / `:1557` | Generate (AI Assessment) | `generateDiagnosis` | OK |
| `page.tsx:1532` / `:1545` | lápis / Save / Cancel (diagnóstico) | `saveDiag` | OK |
| `page.tsx:1533` (handler `:554`) | Protocol | gera protocolo a partir do diagnóstico | OK — observação: `genProtocol` é um único estado, então clicar em um desabilita o botão de **todos** os diagnósticos da lista |
| `page.tsx:1572` / `:1585` | lápis / Save / Cancel (protocolo) | `saveProto` | OK |
| `page.tsx:1598` | Generate Protocol | idem 1533 | OK |

### 1.7 Aba Clinical Notes — **a mais problemática**

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:3456` | Clinical Scribe (cabeçalho) | expande/recolhe o painel | OK |
| `page.tsx:3481` (handler `:3437`) | Transcribe | POST `/api/admin/transcribe` | OK — loading, progresso e erro na tela |
| `page.tsx:3492` | Insert into SOAP | joga a transcrição no campo S | OK |
| `page.tsx:3495` | Copy | `navigator.clipboard.writeText(transcript)` | **SEM RETORNO** — sem `catch` e **sem nenhum feedback**, nem quando dá certo |
| `page.tsx:1623` | Export PDF | `window.print()` | **INCERTO** — imprime a **página inteira do admin** (abas, menu, tudo), não só as notas SOAP. O rótulo promete um PDF das notas |
| `page.tsx:1638` | Pre-fill with Atlas | POST `/api/admin/atlas/soap-prefill` | **SEM RETORNO** — `if (res.ok)` sem `else` e `catch {}` vazio: se a IA falhar, o spinner some e os campos ficam vazios, sem nenhuma explicação |
| `page.tsx:1682` | Plan with Atlas | POST `/api/admin/atlas/treatment-plan` | **SEM RETORNO** — mesmo padrão: `if (r.ok) setAtlasPlan(d)` sem `else`, `catch {}` vazio |
| `page.tsx:1681` (handler `:365`) | Save Note | salva a nota SOAP | **SEM RETORNO** — `saveNewNote` chama `flash("SOAP note saved")` e **limpa o formulário incondicionalmente**, mesmo quando o `apiPatch` falhou. O usuário vê a faixa vermelha de erro E a verde de sucesso ao mesmo tempo, e o texto digitado é descartado |
| `page.tsx:1667` / `:1704` | X / Cancel (nova nota) | fecham o formulário | **INCERTO — bug real.** O auto-save (`:336-363`) já criou a nota no banco após 3s de digitação. Cancelar **não apaga** essa nota e **não limpa `autoSavedNoteId`**. Consequência: (a) a nota "cancelada" fica gravada no prontuário; (b) a **próxima** nota nova sobrescreve a cancelada em vez de criar outra, porque `saveNewNote` e o auto-save continuam usando o id antigo. Os três pontos de entrada (`:1139`, `:1667`, `:1704`, `:1762`) nunca resetam esse id |
| `page.tsx:336-363` | (auto-save de 3s) | cria/atualiza a nota em background | **SEM RETORNO** — `catch { setAutoSaveStatus("idle") }`: se a gravação falhar, o indicador só volta a "idle" e o terapeuta acha que está salvo |
| `page.tsx:1712` | X (fechar plano Atlas) | descarta a sugestão | OK |
| `page.tsx:1742` | Copy to P field | copia o plano para o campo P | OK |
| `page.tsx:1762` | Add (nova nota) | abre o formulário | **INCERTO** — mesmo bug de `autoSavedNoteId` |
| `page.tsx:1771` | Evidence | abre a aba Evidência na versão exata do relatório | OK |
| `page.tsx:1775` / `:1785` | lápis / Save / Cancel (editar nota) | `saveEditNote` | OK |
| `page.tsx:1776` (handler `:381`) | lixeira (apagar nota) | `confirm("...cannot be undone.")` e DELETE | **SEM RETORNO** — pede confirmação (bom), mas dá `flash("Note deleted")` mesmo se a API recusar |

### 1.8 Aba Documents

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:1890` / `:1895` | tipo de documento / idioma | selects do gerador Atlas | OK |
| `page.tsx:1905` (handler `:483`) | Generate document / Regenerate | POST `/documents/generate` | OK |
| `page.tsx:1908` | Close | fecha o gerador | OK |
| `page.tsx:1919` (handler `:498`) | Save to documents | grava no prontuário | OK |
| `page.tsx:1922` (handler `:506`) | Print / PDF | `window.open("", "_blank")` e escreve o HTML | **SEM RETORNO** — `if (!w) return;`: bloqueador de pop-up barra a janela e o botão não faz absolutamente nada, sem aviso |
| `page.tsx:1933` / `:1934` / `:1935` | Create with Atlas / Upload / Write | abrem os respectivos formulários | OK |
| `page.tsx:1936` | Full | vai para `/admin/patients/{id}/documents` | OK |
| `page.tsx:1952` / `:1958` | Save / Cancel / lápis (editar documento) | `saveDoc` | OK |

> Observação: esta aba não tem botão de apagar documento. Isso é intencional — apagar só acontece na página `/documents`, que pede `confirm()` (`documents/page.tsx:225`).

### 1.9 Aba Protocol

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:1992` / `:2003` | Assign template | abre `AssignProtocolDialog` | OK |
| `page.tsx:2007` | Generate Protocol | gera a partir do 1º diagnóstico | OK |
| `page.tsx:2012` | → Go to Assessments & Diagnosis | `<a href>` para `/diagnosis` | OK |
| `page.tsx:2044` | Edit | abre o editor completo com snapshot do que está gravado | OK |
| `page.tsx:2037` (handler `:431`) | Save | envia **só o que mudou** (diff contra o snapshot), para não parecer um reenvio ao paciente | OK — bem feito |
| `page.tsx:2040` | Cancel | fecha o editor | OK |
| `page.tsx:2075` (handler `:463`) | Send to Patient | valida data/dias/hora e pede `confirm()` com o resumo do agendamento antes de enviar | OK — **é o padrão certo**. Observação: `sendingProto` é um estado único, então desabilita o botão de todos os protocolos ao mesmo tempo |
| `page.tsx:2128` | MON…SUN | escolhe os dias da semana | OK |
| `page.tsx:2195` | Archived (n) | expande os arquivados | OK |
| `page.tsx:2206` (handler `:451`) | Restore | `confirm()` diferente conforme o protocolo já tenha sido enviado ou não | OK — bem pensado |
| `protocol-items-by-week.tsx:273/347/369/372/375/378/387` | ocultar semana / Save / lápis / mostrar-ocultar / duplicar / apagar / adicionar item | todos com `busy` por item; apagar pede `confirm()` (`:194`) | OK |

### 1.10 Aba Rehab Agent (Atlas)

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `page.tsx:2748` (handler `:2583`) | New Assessment | inicia a pré-avaliação | OK — em falha escreve "Connection error. Please retry." no próprio chat |
| `page.tsx:2789` / `:2791` | EN / PT | troca o idioma do plano exibido | OK |
| `page.tsx:2795` (handler `:2423`) | Generate Plan / Regenerate | job em background com polling e recuperação de estado ao remontar | OK — o melhor tratamento de erro do arquivo (`tpError` próprio) |
| `page.tsx:2894` | Discuss with Atlas | abre o chat sobre o plano | OK |
| **`page.tsx:2898` (handler `:2477`)** | **Share with Patient** | monta um texto em código (`:2486-2498`) e faz POST em `/questions`, que chama `notifyPatient()` → **e-mail real sai na hora** | **DESTRUTIVO SEM CONFIRMAR** — sem `confirm()`, sem prévia do texto exato. O que é enviado é montado no código e **não é o que está na tela**. Viola a regra de "nada sai para paciente sem ver a prévia" |
| `page.tsx:2932` | enviar (chat do plano) | `handleTpChat` | OK |
| `page.tsx:2952` | Send to Patient (chat livre) | pré-preenche e **abre o diálogo de prévia** | OK — caminho correto |
| `page.tsx:3005` | enviar (chat livre) | `handleQuickChat` | OK |
| `page.tsx:3016` | ↻ Refresh | recarrega o histórico enviado | OK |
| `page.tsx:3026` | (expandir conjunto) | marca como "reviewed" via PATCH | OK — falha só some (`.catch(() => {})`), impacto baixo |
| `page.tsx:3089` | 🗑 Delete report/questions | `confirm()` + DELETE | **SEM RETORNO** — remove da tela sem checar `res.ok`; `.catch(() => {})` |
| `page.tsx:3123` / `:3128` / `:3132` / `:3159` / `:3160` | X / Questions / Report / PT-BR / EN | controles do diálogo | OK |
| `page.tsx:3164` (handler `:2531`) | ✨ Reformulate to pt-BR | POST `/api/admin/reformat-questions` | **SEM RETORNO** — `if (d.questions?.length)` sem `else`, `catch {}` vazio: falhou, o texto fica igual e nada explica |
| `page.tsx:3200` (handler `:2681`) | Confirm and Send to Patient | envia perguntas/relatório; dispara e-mail | OK — o texto exato está no textarea editável (isso É a prévia) e o botão diz "Confirm and Send" |
| `page.tsx:3215` / `:3282` | ← voltar | voltam para a lista | OK |
| `page.tsx:3262` / `:3269` | enviar / Generate Full Rehab Plan | pré-avaliação e geração | OK |
| **`page.tsx:3368` (handler `:2726`)** | **Revoke patient access** | DELETE no envio do plano | **DESTRUTIVO SEM CONFIRMAR + SEM RETORNO** — sem `confirm()`, sem loading, **e o resultado é totalmente ignorado**: nenhum `if (res.ok)`, nenhum `catch`. A tela diz "revogado" mesmo se o servidor recusou, e o paciente continua vendo o plano |
| `page.tsx:3383` (handler `:2710`) | Confirm and send to patient | envia o plano de reabilitação | OK — o plano inteiro está na tela acima do botão |
| `page.tsx:3415` | enviar (chat do plano) | `handleChat` | OK |
| `page.tsx:3279` + `:3423` | (renderização) | `if (view === "plan" && plan) ... return null` | **INCERTO — risco de tela em branco.** `loadPlan` (`:2636`) não checa `res.ok`; se o carregamento falhar, `plan` fica indefinido e a aba renderiza **nada** — nem erro, nem botão de voltar |

### 1.11 Painel de Aderência (dentro do Resumo) — `components/admin/patient-adherence-panel.tsx`

Cinco seções com o mesmo par de botões: Today, Yesterday, Onboarding, Weekly closing (EN), Weekly closing (PT).

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `patient-adherence-panel.tsx:136` | Preview | abre um iframe com o e-mail exato | OK |
| **`patient-adherence-panel.tsx:149`** | **Send now** | POST direto → `notifyPatient()` → `sendEmail()` → **e-mail sai na hora, sem fila de aprovação** | **DESTRUTIVO SEM CONFIRMAR** — a prévia existe ao lado mas é **opcional**; o "Send now" manda sem confirmação. Verificado: `app/api/admin/adherence/send-reminder/route.ts:55` → `lib/notify-patient.ts:205` chama `sendEmail` direto. Vale para as 5 seções |
| `patient-adherence-panel.tsx:192` | Looks good — send it | envia a partir da prévia | OK — este é o caminho correto |
| `patient-adherence-panel.tsx:143` | Waiting for your approval | leva para `/admin/outbox` quando já há um enfileirado | OK — boa distinção de estado |
| `patient-adherence-panel.tsx:157` | EN / PT | força o idioma só deste envio | OK |
| `patient-adherence-panel.tsx:285` | Edit reminder text | `/admin/reminder-templates` | OK |
| `patient-adherence-panel.tsx:88-116` | (handler `send`) | trata recusa do servidor com texto explicativo | OK — bem feito; só não tem `catch` para falha de rede |

### 1.12 Aba Messages — `components/admin/patient-email-panel.tsx` e `patient-messages-tab.tsx`

**Estas duas são a referência de como deve ser feito.** O painel de e-mail (`patient-email-panel.tsx`) obriga escrever → prévia renderizada em iframe → enviar, e o servidor recusa qualquer coisa diferente da prévia (hash, `:137`). A aba de mensagens (`patient-messages-tab.tsx:121`) manda Enter e botão para a mesma prévia.

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `patient-email-panel.tsx:160` | Write email | abre o compositor; `disabled` se o paciente não tem e-mail (com explicação na tela) | OK |
| `patient-email-panel.tsx:213` | (template por consulta) | preenche a partir do agendamento | OK |
| `patient-email-panel.tsx:257` | Preview / Building preview… | gera a prévia + hash | OK |
| `patient-email-panel.tsx:273` | Back to edit | volta ao editor | OK |
| `patient-email-panel.tsx:274` | Send email | envia o **snapshot** que foi previsto, nunca o rascunho editado depois | OK — exemplar |
| `patient-email-panel.tsx:174` | (linha do histórico) | expande e mostra o HTML enviado | OK |
| `patient-messages-tab.tsx:264` | Attach file | abre o seletor | OK |
| `patient-messages-tab.tsx:267` | Send to patient | **só abre a prévia** | OK |
| `patient-messages-tab.tsx:294` / `:295` | Back to edit / Send to patient | confirmam ou voltam | OK |
| `patient-messages-tab.tsx:198` (handler `:126`) | lixeira (apagar mensagem) | `confirm()` + DELETE | **SEM RETORNO** — não checa `res.ok`; some da tela mesmo se falhar |
| `patient-messages-tab.tsx:218` / `:226` | message / notice | alterna o tipo | OK |

### 1.13 Demais abas (subcomponentes)

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `limb-measurements-tab.tsx:291` | Save | grava medida de membro | OK — loading e erro |
| `limb-measurements-tab.tsx:356` / `:357` | lápis / lixeira | editar / apagar com `confirm()` e erro tratado | OK |
| `evidence-report-tab.tsx:232` | Translate | traduz o relatório | OK |
| `evidence-report-tab.tsx:341` / `:344` | Save / Cancel (notas) | grava notas do clínico | OK |
| `evidence-report-tab.tsx:363` / `:366` | Mark under review / Approve | muda o status | OK — `disabled` enquanto ocupado ou se o relatório deu erro |
| `evidence-report-tab.tsx:496` / `:507` | Regenerate | refaz o relatório | OK |
| `patient-activity-tab.tsx:115` | Load more | pagina o histórico | OK |
| `patient-exercises-tab.tsx:277` | Prescribe folder | prescreve a pasta inteira | OK |
| `patient-exercises-tab.tsx:345/353/357` | salvar / editar / remover prescrição | remover pede `confirm()` (`:178`) | OK |
| `assign-protocol-dialog.tsx:323` / `:327` / `:338` | Archive and assign / Keep and assign / Assign | atribui template, oferecendo arquivar o protocolo atual | OK — boa pergunta antes de agir |
| `automation-runs.tsx:90` | Tentar de novo | recarrega | OK |

---

## 2. Fluxo de medição de pressão (construído hoje)

### 2.1 `components/admin/blood-pressure-tab.tsx`

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `blood-pressure-tab.tsx:253` | Save / Saving… | cria ou edita leitura | OK — valida inteiros, tem loading, mostra a classificação (Normal/Elevada/Estágio 1…) depois de salvar |
| `blood-pressure-tab.tsx:230` | Cancel (edição) | volta ao modo "nova medida" | OK |
| `blood-pressure-tab.tsx:326` | lápis | carrega a leitura no formulário e rola para o topo | OK |
| `blood-pressure-tab.tsx:327` (handler `:191`) | lixeira | `window.confirm("Excluir esta medida?")` + DELETE, com erro na tela | OK |
| **`blood-pressure-tab.tsx:88-109` + `:135`** | **(aviso de leituras órfãs)** | `useUnassignedCount()` busca `/measurements/unassigned` **a cada 15 segundos**, guarda em `esperando`… e **`esperando` nunca é usado em lugar nenhum do JSX**. `Link` e `Inbox` foram importados (`:10`, `:11`) e também não são usados | **MORTO** |

> Este é o achado mais irônico do inventário. O comentário nas linhas 78-87 do próprio arquivo diz, textualmente, que o aviso existe porque **aconteceu com o Bruno em 24/09/2026**: ele mediu, a leitura não apareceu no histórico e ele concluiu que tinha sumido. O contador foi escrito, faz polling a cada 15s, e **não renderiza nada**. O problema que ele deveria resolver continua exatamente igual.
>
> Agrava: a única pista hoje é o badge da seção "Patients" no menu lateral (`admin-mini-sidebar.tsx:256`), que **soma** `pendingPatients + unassignedMeasurements` num número só — ou seja, não diz o que é nem onde está, que é literalmente o que o comentário do código reclama.

### 2.2 `components/admin/clinic-measurement-button.tsx`

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `clinic-measurement-button.tsx:261` | Medir pressão | abre a escolha de contexto | OK |
| `clinic-measurement-button.tsx:249` / `:250` / `:251` | Antes da sessão / Depois da sessão / Outro | `open()` → POST cria a janela de 3 min | **INCERTO** — não há estado de carregamento entre o clique e a resposta. Dois cliques rápidos disparam dois POSTs. Mitigado: o servidor devolve 409 e a tela mostra "está sendo medido neste aparelho agora", mas o texto sugere outro paciente, não um clique duplo |
| `clinic-measurement-button.tsx:252` | X | volta ao estado inicial | OK |
| `clinic-measurement-button.tsx:204` (handler `:183`) | Cancelar (janela aberta) | para o polling, mostra "Medição cancelada" e **só então** faz POST `/cancel` com `.catch(() => {})` | **SEM RETORNO** — a tela declara cancelado antes de saber; se o POST falhar, a janela continua aberta no servidor e o aparelho fica travado para o próximo paciente sem que ninguém saiba |
| `clinic-measurement-button.tsx:220` | X (fechar resultado) | volta ao estado inicial | OK |
| `clinic-measurement-button.tsx:233` | Abrir a caixa de entrada | `/admin/measurements/inbox` | OK |
| `clinic-measurement-button.tsx:238` | Abrir de novo | reabre a escolha de contexto | OK |
| `clinic-measurement-button.tsx:91-102` + `:191` | (detecção do aparelho) | `if (!device) return null` — o botão inteiro some | **INCERTO** — o `catch {}` da linha 98 é vazio. Se a chamada falhar por rede ou 500, o resultado é indistinguível de "esta clínica não tem manguito": o botão simplesmente não existe e ninguém sabe por quê |

O resto do componente é muito bem resolvido: contagem regressiva real, nome do aparelho, os números na tela quando a leitura chega, e o caminho para a caixa de entrada quando expira.

---

## 3. Caixa de entrada de medições — `app/admin/measurements/inbox/page.tsx`

**Tela boa.** Distingue lista vazia de consulta que falhou (`:292` vs `:303`), exige motivo com no mínimo 3 caracteres para descartar, e explica quando o aparelho está conectado mas a Withings não confirmou o envio.

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `inbox/page.tsx:212` | Voltar aos pacientes | `/admin/patients` | OK |
| `inbox/page.tsx:232` | Conectar o aparelho da clínica | `window.location` → `/api/wearables/connect/withings?clinic=1` (rota existe) | OK |
| `inbox/page.tsx:260` | Tentar de novo (reinscrição Withings) | POST `/api/wearables/resubscribe` e diz se resolveu ou não | OK |
| `inbox/page.tsx:298` | Tentar de novo (recarregar) | `load()` | OK |
| `inbox/page.tsx:326` | Atribuir a um paciente | abre o painel de busca | OK |
| `inbox/page.tsx:334` | Descartar | abre o campo de motivo | OK |
| `inbox/page.tsx:350` | Antes / Depois / Em casa / Outro | escolhe o contexto | OK |
| `inbox/page.tsx:378` (handler `:169`) | Atribuir (no paciente escolhido) | POST `/assign`; mostra erro do servidor em PT ou EN | **SEM RETORNO** (só em falha de rede) — `try/finally` sem `catch`: se o `fetch` lançar, `busy` volta ao normal e nenhuma mensagem aparece |
| `inbox/page.tsx:397` (handler `:189`) | Descartar (confirmar) | POST `/discard`; `disabled` até o motivo ter 3+ caracteres | OK como confirmação — o motivo obrigatório faz o papel do `confirm()`. Mesma ressalva de falha de rede |
| `inbox/page.tsx:406` | Cancelar | fecha o campo | OK |

Detalhe cosmético (não é botão): `inbox/page.tsx:415` mostra um `Badge` com o número de leituras solto no fim da lista, sem rótulo nenhum.

---

## 4. Alertas e lista de pacientes

### 4.1 `app/admin/alerts/page.tsx` → `components/alerts/alerts-centre.tsx`

**Tela boa.** Separa lista vazia de consulta falha, e trata 409 (colega já tratou) com texto próprio.

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `alerts-centre.tsx:166` | Abertos / Ciente / Resolvidos / Todos | filtram e recarregam | OK |
| `alerts-centre.tsx:194` | Tentar de novo | `load()` | OK |
| `alerts-centre.tsx:227` | (nome do paciente) | abre o prontuário | OK |
| `alerts-centre.tsx:239` (handler `:124`) | Acknowledge / Ciente | PATCH `/api/alerts/{id}` | OK — recarrega sempre e explica a recusa |
| `alerts-centre.tsx:251` | Resolve / Resolver | idem | OK — mesma ressalva de falha de rede (`try/finally` sem `catch`) |

### 4.2 `app/admin/patients/page.tsx` → `components/patients/patients-list.tsx`

**Tela boa** no geral; apagar paciente usa `AlertDialog` com texto explícito sobre o que será perdido.

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `patients-list.tsx:214` | (busca) | filtra em memória | OK |
| `patients-list.tsx:221` | Add Patient | abre o diálogo de criação | OK |
| `patients-list.tsx:301` | (card do paciente) | abre o prontuário; suporta Enter | OK |
| `patients-list.tsx:351` / `:359` / `:377` | Docs / AI / Perm. | links diretos com `stopPropagation` | OK |
| `patients-list.tsx:386` | ⋮ | abre o menu | OK |
| `patients-list.tsx:391` | Edit Patient | abre o diálogo de edição | OK |
| `patients-list.tsx:411` (handler `:173`) | Delete Patient | abre `AlertDialog`; o confirmar tem loading e trata erro | OK |
| `patients-list.tsx:454` | copiar senha temporária | clipboard + toast | OK |
| `patients-list.tsx:464` / `:465` | Close / Add Another | OK |
| `patients-list.tsx:506` | Create Patient | POST; `disabled` sem nome/e-mail e durante o envio | OK |
| `patients-list.tsx:589` | Save Changes | PATCH com loading e toast | OK |
| `patients-list.tsx:119-129` | (carregamento da lista) | `catch { console.error }` | **SEM RETORNO** — se `/api/patients` falhar, a tela mostra "No patients registered / Add a patient to get started". **Lista vazia e consulta falha ficam idênticas** — exatamente o erro que as telas de Alertas e de Medições se deram ao trabalho de evitar |

### 4.3 `app/admin/patients/[id]/permissions/page.tsx` (um clique do prontuário)

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| **`permissions/page.tsx:523` (handler `:266`)** | **Deactivate / Activate** | PATCH `toggleActive` — desativa a conta do paciente (bloqueia o login dele) | **DESTRUTIVO SEM CONFIRMAR + SEM RETORNO** — sem `confirm()`, **sem estado de loading** (dá para clicar duas vezes e desativar/reativar), sem toast de erro quando `!res.ok`, e `catch {}` vazio na linha 277. É o handler mais descuidado de todo o inventário |
| `permissions/page.tsx:557` (handler `:235`) | (toggle Full Access) | libera todos os módulos | **SEM RETORNO** em falha — `if (res.ok)` sem `else`; tem loading |
| `permissions/page.tsx:393` / `:403` / `:413` (handler `:135`) | Unlock / Lock / Hide (por módulo) | pede `confirm()` explicando o efeito e salva na hora | OK — bem feito |
| `permissions/page.tsx:460` | (toggle de permissão) | marca alteração local | OK |
| `permissions/page.tsx:494` | (descartar alterações) | volta aos valores salvos | OK |
| `permissions/page.tsx:497` / `:754` | Save | PATCH com loading e toast | OK |
| `permissions/page.tsx:661` | Generate | gera senha aleatória de 12 caracteres | OK |
| `permissions/page.tsx:664` (handler `:209`) | Reset | troca a senha | OK |
| `permissions/page.tsx:678` | copiar | clipboard + toast | OK |
| `permissions/page.tsx:300` | voltar | `router.back()` com fallback | OK |
| `permissions/page.tsx:394/404/414/461` | (vários) | `disabled={fullAccess}` | OK — **não é trava permanente**: desligar o Full Access reabilita tudo |

### 4.4 `app/admin/patients/[id]/documents/page.tsx`

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `documents/page.tsx:279` / `:318` / `:322` | Use camera / capturar / Cancel | captura por câmera | OK |
| `documents/page.tsx:282` / `:375` / `:378` | Upload / enviar / Cancel | upload com loading | OK |
| `documents/page.tsx:457` / `:461` | verificar / rejeitar | `handleVerify` | OK |
| `documents/page.tsx:465` (handler `:225`) | apagar documento | `confirm("Delete this document?")` + DELETE | OK |
| `documents/page.tsx:401` / `:450` / `:483` | pré-visualizar / fechar | OK |

---

## 5. Resto de `app/admin/**`

Varredura superficial, só o que salta aos olhos. **Não é inventário completo** — é a lista dos problemas encontrados, sem as centenas de botões que estão bem.

### 5.1 Rota/API inexistente (os dois únicos do painel inteiro)

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `app/admin/email/page.tsx:179` | (carregar logo da assinatura) | `fetch('/api/admin/settings')` — **não existe**: em `app/api/admin/settings/` só há `generate/` e `generate-image/`, nenhum `route.ts`. O endpoint real é `/api/settings` | **ROTA/API INEXISTENTE** — o 404 devolve HTML, `r.json()` lança, e o `.catch(() => {})` engole: o logo simplesmente nunca aparece na assinatura e nada indica por quê |
| `components/admin/instagram-post-panel.tsx:61` (usado em `app/admin/articles/[id]/page.tsx:19`) | (upload de imagem do post) | `POST /api/uploads/image` — `app/api/uploads/[...path]/route.ts` **só exporta `GET`**, então todo POST leva 405 | **ROTA/API INEXISTENTE** — o upload de imagem do painel do Instagram nunca funcionou. Pelo menos mostra "Image upload failed" |

### 5.2 Envio em massa ao paciente sem prévia nem confirmação

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `app/admin/notifications/page.tsx:284` (handler `:96`) | **Send to all (N)** | POST `/api/admin/broadcasts` — **broadcast para TODOS os pacientes dispara no clique**, sem prévia e sem confirmação | **DESTRUTIVO SEM CONFIRMAR** — o pior caso do painel em termos de alcance. Compare com `app/admin/articles/page.tsx:146/172/228`, que faz preview + envio de teste antes |
| `app/admin/patient-tasks/page.tsx:501` (handler `:205`) | Send (audience "all") | cria a tarefa e notifica por e-mail/WhatsApp toda a base | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/email-marketing/CampaignsTab.tsx:506` (handler `:205`) | Start | prepara a campanha e dispara o primeiro lote na hora | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/education/create/page.tsx:784` (handler `:312`) | Send (modo "all") | envia conteúdo educacional a todos os pacientes | **INCERTO** — há um diálogo depois de publicar, mas nenhuma prévia do e-mail |

### 5.3 Ações irreversíveis sem confirmação

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `app/admin/cancellations/page.tsx:343` (handler `:66`) | Process Refund via Stripe | **reembolso real no Stripe** direto no clique, sem confirmar nem revisar o valor digitado | **DESTRUTIVO SEM CONFIRMAR** (tem loading e toast de erro) |
| `app/admin/users/page.tsx:635` e `:748` (handler `:362`) | Remove password | apaga a senha do usuário — ele perde o acesso | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/treatment-plans/page.tsx:542` (handler `:326`) | Cancel | põe o plano em `CANCELLED` (mexe no Stripe), lado a lado com "Pause"/"Complete" | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/appointments/page.tsx:600` (handler `:175`) | X (remover bloqueio de agenda) | DELETE direto; ainda remove da tela e diz "Block removed" sem checar `res.ok` | **DESTRUTIVO SEM CONFIRMAR + SEM RETORNO** |
| `app/admin/appointments/availability/page.tsx:421` (handler `:115`) | lixeira (bloqueio de disponibilidade) | DELETE direto | **DESTRUTIVO SEM CONFIRMAR** |
| `components/outbox/outbox-queue.tsx:230` (handler `:126`) | Descartar | descarta a mensagem da fila de aprovação sem confirmar, ao lado de "Aprovar e enviar" | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/waitlist/page.tsx:170` (handler `:62`) | Remove | tira da lista de espera | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/security/page.tsx:242` (handler `:70`) | bloquear IP | bloqueia o IP | **DESTRUTIVO SEM CONFIRMAR + SEM RETORNO** (`if (res.ok)` sem `else`) |
| `app/admin/email-marketing/CampaignsTab.tsx:516` · `ContactsTab.tsx:227` · `GroupsTab.tsx:106` | lixeiras (campanha / contato / grupo) | DELETE sem confirmar e sem checar resposta | **DESTRUTIVO SEM CONFIRMAR** |
| `app/admin/cpd-courses/page.tsx:476` (handler `:225`) | lixeira (curso CPD) | DELETE; em falha não mostra nada | **DESTRUTIVO SEM CONFIRMAR + SEM RETORNO** |
| `app/admin/my-education/page.tsx:333` (handler `:202`) | lixeira (qualificação) | remove da tela e diz "Qualification removed" mesmo em falha | **DESTRUTIVO SEM CONFIRMAR + SEM RETORNO** |
| `app/admin/marketing/instagram-studio/page.tsx:3641` · `:3054` · `:2689` | lixeiras (rascunho / faixa de música / rascunho viral) | DELETE sem confirmar; a de `:2689` tem `catch {}` vazio (`:1074`) | **DESTRUTIVO SEM CONFIRMAR** (+ **SEM RETORNO** na última) |

### 5.4 Erro silencioso / sem retorno

| elemento | rótulo | o que faz | veredito |
|---|---|---|---|
| `app/admin/finance/page.tsx:1483` (handler `:594`) | Salvar lançamento | não checa `res.ok`: fecha o formulário e diz "Sucesso" mesmo em falha. **E o botão não tem estado de loading — duplo clique grava duas vezes** | **SEM RETORNO** |
| `app/admin/finance/page.tsx:829` (handler `:430`) | Salvar categoria | mesmo padrão, também sem loading | **SEM RETORNO** |
| `app/admin/finance/page.tsx:938` (handler `:463`) | Criar chave de API | sem checar `res.ok`; em erro joga o JSON de erro na tela como se fosse a chave. Sem loading → duplo clique cria duas | **SEM RETORNO** |
| `app/admin/finance/page.tsx:627` | Excluir lançamento | tem `confirm()`, mas diz "Sucesso" sem checar `res.ok` | **SEM RETORNO** |
| `app/admin/finance/page.tsx:277, 288, 426, 459` | (carregamentos: Stripe, empresa, categorias, chaves) | quatro `catch {}` vazios | **SEM RETORNO** — a aba abre vazia sem explicação |
| `components/outbox/outbox-queue.tsx:126-141` | Aprovar e enviar / Descartar | `try/finally` sem `catch`: falha de rede vira unhandled rejection, o modal fecha e `load()` nunca roda | **SEM RETORNO** |
| `app/admin/journey/page.tsx:71, 94, 110, 126, 162, 185` | (ações da jornada) | seis `catch {}` vazios em handlers de clique | **SEM RETORNO** |
| `app/admin/ai-coworker/page.tsx:138, 149, 159, 160` | criar / salvar / ativar / excluir tarefa | `catch {}` vazios | **SEM RETORNO** |
| `app/admin/achievements/page.tsx:363` (handler `:171`) e `:105` | Salvar conquista / (carregar lista) | em `!res.ok` o diálogo fica aberto sem toast; o carregamento tem `catch {}` | **SEM RETORNO** |
| `app/admin/conditions/page.tsx:139, 150` · `email-templates/page.tsx:108` · `command-center/page.tsx:97, 111` | salvar / excluir | `catch {}` vazios | **SEM RETORNO** |

### 5.5 O que a varredura NÃO encontrou

- **Nenhum botão literalmente morto** no resto do painel: nenhum `onClick={() => {}}`, nenhum handler vazio, nenhum TODO/FIXME, nenhum "coming soon".
- **Nenhum `Link`/`router.push` quebrado**: todas as rotas `/admin/...` referenciadas existem. O único arquivo órfão é `components/admin/admin-sidebar.old.tsx`, que não é importado por ninguém.
- **Telas bem construídas** (nada a corrigir): `clinics` (prévia de e-mail antes de criar/enviar), `exercises` (confirmação em toda operação em massa e diálogo próprio para excluir pasta), `protocols`, `settings`, `documents`, `articles` (prévia + envio de teste antes de notificar), `appointments` (`AlertDialog` ao apagar agendamento), `instagram-dashboard`.

---

## Resumo contado

### Seções 1 a 4 — inventário completo das telas prioritárias

**191 entradas** (algumas agrupam dois botões, como "Save / Cancel", então o número de elementos clicáveis é um pouco maior). **162 OK, 29 com problema.**

| veredito | quantos |
|---|---|
| OK | 162 |
| SEM RETORNO | 19 |
| DESTRUTIVO SEM CONFIRMAR | 4 |
| INCERTO | 7 |
| MORTO | 1 |
| ROTA/API INEXISTENTE | **0** |

> A soma passa de 191 porque duas entradas carregam dois vereditos ("Revoke patient access" e "Deactivate" são destrutivos *e* sem retorno).

O prontuário e seus subcomponentes concentram **24 dos 29 problemas**. A caixa de entrada de medições, a central de alertas, o painel de e-mail e a aba de mensagens não têm nenhum.

### Seção 5 — resto do painel (só os problemas, não é inventário completo)

**28 achados:** 15 destrutivos sem confirmar, 15 sem retorno (7 entradas somam os dois), 2 rotas de API inexistentes, 1 incerto. Nenhum botão morto e nenhum link quebrado no resto do painel.

### Total

**57 problemas** em todo o admin, dos quais **6 destrutivos sem confirmar que mexem em dinheiro, acesso ou na caixa de entrada de todos os pacientes** (reembolso Stripe, cancelar plano, apagar senha, desativar conta, broadcast para todos, enviar tarefa para todos).

### Os que valem consertar primeiro

1. **`blood-pressure-tab.tsx:135` — o aviso de leituras órfãs está morto.** Faz polling a cada 15 segundos e nunca aparece na tela. É o conserto do incidente que o Bruno viveu em 24/09, e ele não chegou a existir. `Link` e `Inbox` importados sem uso são a prova.
2. **`page.tsx:3368` — "Revoke patient access"** revoga sem confirmar, sem loading, e **ignora a resposta do servidor**. Pode dizer "revogado" com o paciente ainda vendo o plano.
3. **`page.tsx:2898` — "Share with Patient"** dispara e-mail real ao paciente com um clique, sem confirmação e **sem prévia do texto exato** (o texto é montado em código, diferente do que está na tela). Quebra a regra da prévia.
4. **`permissions/page.tsx:523` — "Deactivate"** bloqueia o login do paciente sem confirmar, sem loading e sem dizer nada se falhar.
5. **`page.tsx:1667/1704/1762` — o auto-save das notas SOAP.** Cancelar deixa a nota gravada no banco e **a próxima nota nova sobrescreve a cancelada**, porque `autoSavedNoteId` nunca é limpo. Perda silenciosa de nota clínica.
6. **`patient-adherence-panel.tsx:149` — "Send now"** (×5 seções) manda e-mail de verdade sem passar pela prévia, que fica como botão opcional ao lado. Contraste: o painel de e-mail e a aba de mensagens, logo abaixo na mesma tela, **obrigam** a prévia.

Fora do prontuário, dois casos de impacto alto justificam entrar na mesma leva:

7. **`app/admin/notifications/page.tsx:284` — "Send to all"** dispara um broadcast para **todos os pacientes** com um clique, sem prévia e sem confirmação. É o maior alcance de qualquer botão do painel.
8. **`app/admin/cancellations/page.tsx:343` — "Process Refund via Stripe"** executa o reembolso real no clique, sem confirmar nem revisar o valor que foi digitado no campo ao lado.

### O que está bom e merece ser copiado

- `patient-email-panel.tsx` — escrever → prévia em iframe → enviar, com o servidor recusando qualquer coisa diferente da prévia (hash).
- `patient-messages-tab.tsx:121` — Enter e botão levam ambos para a prévia; não existe caminho de envio direto.
- `page.tsx:463` (`sendProtocol`) — valida o agendamento e mostra data, dias e horário no `confirm()` antes de enviar.
- `alerts-centre.tsx` e `inbox/page.tsx` — separam "está vazio" de "a consulta falhou", e explicam a recusa do servidor em vez de deixar o botão parecer quebrado.
- `clinic-measurement-button.tsx` — contagem regressiva real, nome do aparelho, os números na tela quando a leitura chega, caminho para a caixa de entrada quando expira.
