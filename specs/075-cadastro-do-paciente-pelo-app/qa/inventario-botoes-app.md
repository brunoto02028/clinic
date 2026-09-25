# Inventário exaustivo de elementos interativos — app do paciente

**Escopo:** `mobile/app/**` + `mobile/src/components/**` (todo elemento que responde a toque)
**Método:** leitura de código, 100% dos arquivos de rota e de componente. Nenhum arquivo foi alterado.
**Data:** 24/09/2026
**Base:** branch `brunoto02028/app_clinic`, worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`

> **Nota de concorrência.** Durante esta auditoria, outro agente da sessão alterou `mobile/app/(app)/_layout.tsx`, `mobile/app/(app)/(ba)/_layout.tsx`, `mobile/app/(app)/(lab)/_layout.tsx` e `mobile/src/lib/app-focus.ts` (correção de header/voltar). **Nenhum arquivo:linha citado abaixo está nesses quatro arquivos**, então nenhuma referência ficou defasada. O efeito prático da mudança em `(app)/_layout.tsx` é positivo para este inventário: as telas `profile-edit`, `notifications` e `change-password` passam a herdar o `HeaderBack` do app em vez do botão nativo.

---

## Como ler os vereditos

| veredito | significado |
|---|---|
| `OK` | faz o que o rótulo promete |
| `MORTO` | sem handler, handler vazio, chama algo que não faz nada — **ou** o toque leva a algo que não é o que o rótulo promete (a ação prometida não existe no app) |
| `SEM RETORNO` | age, mas o usuário não vê nada acontecer |
| `DESTRUTIVO SEM CONFIRMAR` | ação irreversível ao primeiro toque |
| `ALVO PEQUENO` | área de toque < 44×44pt sem `hitSlop` que compense |
| `ROTA INEXISTENTE` | navega para um caminho que não existe em `app/` |
| `INCERTO` | não deu para decidir por leitura |

**Cada elemento recebe UM veredito — o mais grave.** Quando um elemento também é alvo pequeno, isso aparece na coluna "o que faz" em vez de virar uma segunda linha, para o resumo contado não inflar.

**Ordem dentro de cada tela:** `ROTA INEXISTENTE` → `MORTO` → `DESTRUTIVO SEM CONFIRMAR` → `SEM RETORNO` → `INCERTO` → `ALVO PEQUENO` → `OK`.

**Medidas:** altura = `paddingVertical × 2 + lineHeight`. Onde o botão ocupa a largura toda e só a altura fica abaixo de 44, está anotado — é risco menor que um ícone de 28×28 solto.

---

## Achados sistêmicos (valem para dezenas de telas)

| # | onde | o quê |
|---|---|---|
| S1 | `src/components/ui/Button.tsx:37` | `heights = { sm: 36, md: 46, lg: 54 }`. **Todo `<Button size="sm">` tem 36pt de altura** — abaixo do mínimo de 44 da Apple. Ocorre em ~20 lugares. Largura costuma ser grande, então o risco é moderado, mas a correção é de uma linha. |
| S2 | `src/components/ui/Chip.tsx:29-30` | `paddingVertical: 5` + fonte 10.5 → **chip de ~24pt de altura**, sem `hitSlop`. Usado em lab, BA community, BA new-post, BA onboarding. É o menor alvo recorrente do app. |
| S3 | `src/components/ui/ListItem.tsx:26` | `paddingVertical: 11` → linha de **~38pt sem subtítulo**, ~52pt com subtítulo. O menu do perfil (14 itens) cai no caso de 38pt. |
| S4 | `app/login.tsx:92-109`, `app/register.tsx:233-287`, `app/(app)/change-password.tsx:77-97`, `app/(app)/profile-edit.tsx:139-187` | **Nenhum campo de formulário do app tem `onSubmitEditing` nem `returnKeyType`.** A tecla de retorno do teclado nunca envia nem pula para o próximo campo — em nenhuma tela do app. |
| S5 | — | **Nenhum "Sair" pede confirmação** (`LockOverlay.tsx:138`, `ModuleProfile.tsx:132`, `module-select.tsx:195` e `:316`). Tratado como `OK` neste inventário: o rótulo é explícito e a ação é reversível (basta entrar de novo). Fica registrado como decisão, não como achado. |
| S6 | `app/dev/ui.tsx` | A vitrine do design system está **fora do grupo `(app)`**, ou seja, sem o guarda de autenticação, e vai no bundle de produção. Acessível em `/dev/ui` (e por deep link `bprclinic://dev/ui`). |

---

# 1. `(clinica)` — o módulo que o paciente usa

## 1.1 Início (aba Home) — `app/(app)/(clinica)/(tabs)/index.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Início | `(tabs)/index.tsx:172` | **Remarcar** / *Reschedule* | `router.push('/appointment/{id}')`. A rota existe, mas **a tela de detalhe da consulta não tem remarcar nem cancelar** — `appointment/[id].tsx` só desenha terapeuta, status, data, hora e duração (198 linhas, zero mutação). O paciente aperta "Remarcar", chega numa tela de leitura e não tem o que fazer. Nem o `guide.tsx:159` ajuda: ele manda avisar a clínica com 24h. | `MORTO` |
| Início | `(tabs)/index.tsx:120` | **Começar** / *Start* (cartão "Complete sua avaliação") | `router.push('/(app)/(clinica)/screening')`. Rota existe. Botão `size="sm"` → 36pt (S1). | `OK` |
| Início | `(tabs)/index.tsx:228` | **Agendar sessão** / *Book a session* | `router.push('/appointments')` → aba de consultas. Rota existe. `size="sm"` (S1). | `OK` |
| Início | `(tabs)/index.tsx:284` | **Começar os exercícios de hoje** | `router.push('/exercises')`. Só renderiza quando `exerciseCount !== null`. | `OK` |
| Início | `(tabs)/index.tsx:295` | **Evolução da dor** (ListItem) | `router.push('/outcome-measures')`. | `OK` |
| Início | `(tabs)/index.tsx:308` | **Agendar nova sessão** (ListItem) | `router.push('/appointments')` — **mesmo destino de `:228`**, rótulo diferente, na mesma tela. Não é bug; é redundância. | `OK` |
| Início | `(tabs)/index.tsx:321` | **Meu prontuário** (ListItem) | `router.push('/clinical-notes')`. | `OK` |
| Início | `(tabs)/index.tsx:338` | **Falar com a clínica** (ListItem) | `router.push('/messages')`, com badge de não lidas. | `OK` |

## 1.2 Consultas (aba) — `app/(app)/(clinica)/(tabs)/appointments.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Consultas | `appointments.tsx:30` | **Agendar** / *Book* | `router.push('/book-appointment')`. Alvo: `paddingVertical: 8` + caption ≈ **31pt**, sem `hitSlop`. | `ALVO PEQUENO` |
| Consultas | `appointments.tsx:64` | card da consulta | `router.push('/appointment/{id}')`. | `OK` |
| Consultas | `appointments.tsx:57` | puxar para atualizar | `onRefresh={refetch}` + `refreshing={isRefetching}`. | `OK` |

## 1.3 Detalhe da consulta — `app/(app)/(clinica)/appointment/[id].tsx`

**Nenhum elemento interativo além do `HeaderBack` do layout.** Esta é a tela de destino do botão "Remarcar" (1.1) — daí aquele veredito.

## 1.4 Agendar consulta — `app/(app)/(clinica)/book-appointment.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Agendar | `book-appointment.tsx:122` | 7 chips de tipo (*Initial Assessment*, *Follow-up*…) | `setType(t2)`. Alvo ≈ **32pt** de altura, sem `hitSlop`. Os rótulos ficam **só em inglês** mesmo no app em pt (array `TYPES` fixo, `:13`). | `ALVO PEQUENO` |
| Agendar | `book-appointment.tsx:167` | horários disponíveis | `setSelectedTime(time)`. Alvo ≈ **36pt**. | `ALVO PEQUENO` |
| Agendar | `book-appointment.tsx:145` | chips de data (até 14) | `setSelectedDate` + limpa a hora. ~54pt. | `OK` |
| Agendar | `book-appointment.tsx:179` | campo **Observações** | `setNotes`, multiline. | `OK` |
| Agendar | `book-appointment.tsx:183` | **Confirmar agendamento** | `mutation.mutate()` → `loading`, rótulo troca para "Agendando…", `disabled` até tipo+data+hora; sucesso → `replace` para `booking-confirmed`; erro → `Alert`. Caminho completo. | `OK` |

## 1.5 Consulta agendada — `app/(app)/(clinica)/booking-confirmed.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Confirmação | `booking-confirmed.tsx:114` | cartão **Falta a sua avaliação** | `router.push('/(app)/(clinica)/screening')`. | `OK` |
| Confirmação | `booking-confirmed.tsx:169` | **Voltar para Saúde** | `router.replace('/(app)/(clinica)/(tabs)')`. | `OK` |

## 1.6 Exercícios (aba) — `app/(app)/(clinica)/(tabs)/exercises.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Exercícios | `exercises.tsx:85` | card do exercício | `router.push('/exercise/{id}')`. | `OK` |
| Exercícios | `exercises.tsx:78` | puxar para atualizar | `onRefresh={refetch}`. | `OK` |

Quando a pressão do dia bloqueia o treino, `:56` renderiza o `ExerciseBlockCard` com o botão **Registrar nova medida** — contado uma vez só, na seção 6.

## 1.7 Exercício (detalhe) — `app/(app)/(clinica)/exercise/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Exercício | `exercise/[id].tsx:183` | **Assistir vídeo** | `Linking.openURL(videoUrl)` **sem `try/catch` e sem `.catch()`**. URL inválida ou app sem quem abra → nada acontece na tela e a promessa rejeita sem tratamento. `documents.tsx:185-195` já trata esse mesmo caso com `Alert`. | `SEM RETORNO` |
| Exercício | `exercise/[id].tsx:248` | **Marcar como concluído** / *Mark as done* | `completeMutation.mutate()` com `loading`, rótulo "Registrando…", `Alert` de sucesso e `Alert` de erro. Escondido quando `clearance.blocked`. | `OK` |

## 1.8 Avaliação / triagem — `app/(app)/(clinica)/screening.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Triagem | `screening.tsx:435` (ramo `else` de `:446`) | **Enviar avaliação** / *Submit assessment* | `submit.mutate()`. **O `loading` do botão está ligado a nada** — `loading` não é passado, e `submit.isPending` não é lido em lugar nenhum. Entre o toque e o `goBackOr()` a tela fica idêntica; com rede ruim a pessoa toca de novo e dispara um segundo `POST`. `submit.isError` (`:453`) só aparece depois. | `SEM RETORNO` |
| Triagem | `screening.tsx:232` | chips das 9 etapas (*Perfil*, *Dor & Queixa*…) | `autosave.mutate()` + `setStep(i)`. Alvo: `paddingVertical: 6` + fonte 11 ≈ **26pt**, sem `hitSlop`, numa faixa horizontal rolável — é fácil rolar quando se quis tocar. | `ALVO PEQUENO` |
| Triagem | `screening.tsx:39` (componente `YesNo`) | **Sim** / **Não** das red flags | `onChange(o.v)`. ~36pt de altura (largura `flex: 1`). São as perguntas de segurança. | `ALVO PEQUENO` |
| Triagem | `screening.tsx:71` (componente `ChipSelect`) | mão/pé dominante, nível de atividade, fumante, fisioterapia anterior | `onSelect(o.value)`. ~36pt. | `ALVO PEQUENO` |
| Triagem | `screening.tsx:309` | 3 caixas de **impacto funcional** (sono/trabalho/mobilidade) | `set(key, !form[key])`. 44pt. | `OK` |
| Triagem | `screening.tsx:388` | caixa de **consentimento** | `set('consentGiven', !…)`. Altura = a do texto do termo. | `OK` |
| Triagem | `screening.tsx:428` | **Anterior** / *Back* | `autosave.mutate()` + `setStep(s-1)`. 44pt. | `OK` |
| Triagem | `screening.tsx:435` (ramo `if` de `:445`) | **Próximo** / *Next* | `autosave.mutate()` + `setStep(s+1)`. Muda a tela na hora. | `OK` |
| Triagem | `screening.tsx:203` | **Tentar de novo** (falha ao carregar) | `refetch()`. | `OK` |
| Triagem | `screening.tsx:257-344` | 18 campos de texto | `set(campo, v)`. Sem `onSubmitEditing` (S4). | `OK` |

## 1.9 Medidas de evolução — `app/(app)/(clinica)/outcome-measures.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Medidas | `outcome-measures.tsx:182-188` | **0% / 25% / 50% / 75% / 100%** (funcionalidade geral) | `<View onTouchEnd={() => setOverallFunction(v)}>`. **É `View` com `onTouchEnd`, não `Pressable`**: dispara mesmo quando o gesto é cancelado (arrastar para rolar sai como toque), não tem `accessibilityRole`, não tem retorno de toque (sem `pressed`). Alvo: `paddingVertical: 6` + caption ≈ **26pt**, sem `hitSlop`. A trinta pixels dali, a escala VAS (`:136`) já usa `Pressable` + `hitSlop={10}` e tem um comentário explicando por que — este bloco ficou de fora da correção. | `ALVO PEQUENO` |
| Medidas | `outcome-measures.tsx:136` | escala VAS **0–10** | `setVasScore(v)`. 28×28 com `hitSlop={10}` → 48×48 efetivo. `accessibilityRole`/`State`/`Label` presentes. | `OK` |
| Medidas | `outcome-measures.tsx:193` | **Salvar medidas** | `mutation.mutate()` com `loading`, `Alert` de sucesso e de erro. | `OK` |
| Medidas | `outcome-measures.tsx:81` | **Tentar de novo** (estado de erro) | `refetch()`. O formulário fica escondido nesse estado de propósito. | `OK` |

## 1.10 Check-in diário — `app/(app)/(clinica)/daily-checkin.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Check-in | `daily-checkin.tsx:37` (componente `SliderRow`) | escalas **0–10** de Dor, Energia, Sono, Estresse | `onChange(i)`. 11 alvos numa linha: `flex: 1` num container de ~326pt com 10 `gap: 4` → **~26pt de largura × 32pt de altura**, sem `hitSlop`. São **44 alvos** na tela (4 escalas × 11). O mais provável de errar o toque em todo o módulo do paciente. | `ALVO PEQUENO` |
| Check-in | `daily-checkin.tsx:195` | 5 emojis de **Humor** | `setMood(m.v)`. ~46pt. | `OK` |
| Check-in | `daily-checkin.tsx:203` | **Exercícios do dia realizados** | `setExercises(v => !v)`. `padding: 16` → alvo grande. | `OK` |
| Check-in | `daily-checkin.tsx:213` | campo **Notas (opcional)** | `setNotes`. | `OK` |
| Check-in | `daily-checkin.tsx:217` | **Salvar** / **Atualizar** / **Salvando…** | `handleSave()`; `disabled={mutation.isPending}` com `opacity: 0.6` e rótulo trocando; `Alert` com XP e sequência no sucesso, `Alert` no erro. | `OK` |
| Check-in | `daily-checkin.tsx:151` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.11 Pendências / tarefas — `app/(app)/(clinica)/tasks.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Pendências | `tasks.tsx:75` | **o card inteiro da tarefa** (sem rótulo de ação) | `onPress={() => !isDone && completeMut.mutate(item.id)}` — **um toque em qualquer lugar do card marca a tarefa como concluída**, sem confirmação, sem desfazer (não há rota de "descompletar" no app) e sem nada no card dizendo que ele é um botão. Quem toca para ler o texto completo da tarefa conclui a tarefa. | `DESTRUTIVO SEM CONFIRMAR` |
| Pendências | `tasks.tsx:75` (ramo `isDone`) | card de tarefa já concluída | `!isDone && …` → o `Pressable` continua montado, continua dando retorno de toque e **não faz nada**. | `MORTO` |
| Pendências | `tasks.tsx:56` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.12 Plano de tratamento — `app/(app)/(clinica)/treatment-protocol.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Plano | `treatment-protocol.tsx:164` | **o card inteiro do item do plano** | `onPress={() => !item.isCompleted && completeMut.mutate(item.id)}` — mesmo padrão do `tasks.tsx`: conclui ao primeiro toque, sem confirmação, sem desfazer. Pior aqui: o `onSuccess` (`:67`) **só invalida a query**, sem `Alert` nenhum, então só o risco de rede separa "concluí sem querer" de "não aconteceu nada". | `DESTRUTIVO SEM CONFIRMAR` |
| Plano | `treatment-protocol.tsx:164` (ramo `isCompleted`) | item já concluído | `Pressable` montado, sem efeito. | `MORTO` |
| Plano | `treatment-protocol.tsx:84` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.13 Meu prontuário — `app/(app)/(clinica)/clinical-notes.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Prontuário | `clinical-notes.tsx:38` | campo **Buscar por data ou tratamento** | `setSearch` → filtra em memória. | `OK` |
| Prontuário | `clinical-notes.tsx:45` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

Os cards de nota (`:68`) **não são tocáveis de propósito** — não há tela de detalhe de nota.

## 1.14 Meus documentos — `app/(app)/(clinica)/documents.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Documentos | `documents.tsx:115` | **Foto** / *Photo* | `pickImage('camera')` → permissão → câmera → upload → `Alert` no erro. Alvo: `paddingVertical: 8` + caption ≈ **32pt**. | `ALVO PEQUENO` |
| Documentos | `documents.tsx:122` | **Upload** | `pickImage('gallery')`, mesmo caminho. Rótulo fica em inglês nas duas línguas (`:127`). ≈ **32pt**. | `ALVO PEQUENO` |
| Documentos | `documents.tsx:167` | card do documento | `Linking.openURL(item.openUrl)` com `Alert` quando falta a URL e `Alert` quando o telefone não abre. É o único `openURL` do app que trata os dois casos. | `OK` |

**Observação:** o estado de erro (`:143`) é um cartão de texto **sem botão de tentar de novo**, diferente das outras telas do módulo que usam `LoadFailure`.

## 1.15 Mensagens — `app/(app)/(clinica)/messages.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Mensagens | `messages.tsx:190` | ícone de **enviar** | `send.mutate()`; `disabled` sem rascunho e enquanto envia, com `opacity: 0.4`; a mensagem aparece pelo `invalidateQueries`; `send.isError` mostra "Sua mensagem não foi enviada" (`:208`). 46×46. | `OK` |
| Mensagens | `messages.tsx:183` | campo **Escreva uma mensagem…** | `setDraft`, multiline. | `OK` |
| Mensagens | `messages.tsx:120` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.16 Pressão arterial — `app/(app)/(clinica)/blood-pressure.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Pressão | `blood-pressure.tsx:227` | **Salvar leitura** | `save.mutate()` com `loading`, `disabled` na validação local, `Alert` no erro. Sucesso: limpa os campos, invalida `blood-pressure` e `exercise-clearance` — a leitura nova aparece no topo da lista, que é o retorno visível. | `OK` |
| Pressão | `blood-pressure.tsx:29` (×3, via `:205/:209/:213`) | **Sistólica / Diastólica / Pulso** | `onChangeText`, `number-pad`, `maxLength={3}`. Erro de coerência aparece em `:218`. | `OK` |
| Pressão | `blood-pressure.tsx:249` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.17 Meu progresso — `app/(app)/(clinica)/assessment-progress.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Progresso | `assessment-progress.tsx:84` | card de cada etapa | `onPress={() => path && router.push(path)}`, com `path = STEP_PATHS[step.id]`. O mapa (`:18-26`) só conhece `screening`, `outcome_measures` e `results`. **Para qualquer outro `step.id` que a API devolva, o card é um `Pressable` inerte** — sem retorno, indistinguível dos outros. `src/api/assessment-progress.ts:4` tipa `id` como `string`, sem união. **Para decidir:** ver quais `id` a rota `/api/patient/assessment-progress` devolve (repo web). Para os três conhecidos, funciona. | `INCERTO` |
| Progresso | `assessment-progress.tsx:55` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.18 Conteúdo (lista) — `app/(app)/(clinica)/education.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Conteúdo | `education.tsx:65` | card do conteúdo | `router.push('/education/{id}')`. | `OK` |

**Observação:** estado de erro (`:41`) sem botão de tentar de novo, como em `documents.tsx`.

## 1.19 Conteúdo (detalhe) — `app/(app)/(clinica)/education/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Conteúdo/detalhe | `education/[id].tsx:114` | **Marcar como concluído** | `completeMutation.mutate()`. Tem `loading`, mas a mutação **não tem `onError`** (`:29-37`): se a gravação falhar, o spinner some, o selo "Concluído" não aparece e **nada é dito**. Em `exercise/[id].tsx:52` a mesma ação tem `Alert` de erro. | `SEM RETORNO` |
| Conteúdo/detalhe | `education/[id].tsx:83` | **Assistir vídeo** | `Linking.openURL(item.videoUrl!)` sem `catch`. Mesmo caso de `exercise/[id].tsx:183`. | `SEM RETORNO` |
| Conteúdo/detalhe | `education/[id].tsx:105` | **estrelas 1–5** (avaliar o conteúdo) | `setRating(star)`. É um `<Ionicons size={28}>` dentro de um `Pressable` **sem padding e sem `hitSlop`** → alvo de **28×28**. | `ALVO PEQUENO` |

**Observação de gate:** `education.tsx` está dentro de `<PlanGate module="mod_education">`; **`education/[id].tsx` não está dentro de gate nenhum.** Um paciente sem o módulo no plano não vê a lista, mas abre um item por deep link.

## 1.20 Dispositivos — `app/(app)/(clinica)/wearables.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Dispositivos | `wearables.tsx:326` | **Conectar** / *Connect* | `connectMut.mutate(p.key)` → `onSuccess: (url) => Linking.openURL(url)` (`:96`) **sem `catch`**: se o telefone não abrir a URL do provedor, o botão volta ao normal e nada é dito. O `onError` (`:97`) só cobre a falha da API, não a abertura. Alvo ≈ **30pt**. | `SEM RETORNO` |
| Dispositivos | `wearables.tsx:267` | **Corrigir** / *Fix* (Withings mudo) | `resubMut.mutate()` com `disabled`, rótulo "…" e `Alert` nos dois desfechos. Alvo: `paddingVertical: 6` + fonte 12 ≈ **26pt**. | `ALVO PEQUENO` |
| Dispositivos | `wearables.tsx:284` | **Sincronizar** / *Sync* | `syncMut.mutate(p.key)` + `Alert`. Alvo ≈ **26pt**. Além disso `disabled={syncMut.isPending}` é **global**: sincronizar um aparelho desabilita e mostra "…" no botão de **todos** os outros. | `ALVO PEQUENO` |
| Dispositivos | `wearables.tsx:299` | **Remover** / *Remove* | `Alert.alert` com Cancelar + Desconectar (`style: 'destructive'`) antes de `disconnectMut.mutate`. **É o único destrutivo do app que confirma.** Alvo ≈ **26pt**. | `ALVO PEQUENO` |
| Dispositivos | `wearables.tsx:123` | **Li e entendi** / *I have read and understood* | `acceptMut.mutate()` com `loading` e `Alert` de erro. | `OK` |
| Dispositivos | `wearables.tsx:150` | **Ver meus dados** / *View my data* | `router.push('/(app)/(clinica)/wearable-data')`. Só aparece com algum aparelho conectado. | `OK` |
| Dispositivos | `wearables.tsx:175` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 1.21 Dados do wearable — `app/(app)/(clinica)/wearable-data.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Dados wearable | `wearable-data.tsx:73` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

Único elemento interativo da tela.

## 1.22 Termos & consentimento — `app/(app)/(clinica)/consent.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Termos | `consent.tsx:141` | **Tentar de novo** / *Try again* | `refetch()`. | `OK` |

Único elemento interativo. A tela é de leitura; o aceite acontece na triagem.

## 1.23 Como funciona — `app/(app)/(clinica)/guide.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Guia | `guide.tsx:134` | **Ir ao Perfil** / **Fazer Avaliação** / **Ver Agenda** (3 CTAs) | `router.push(s.path)` com `/(app)/(clinica)/(tabs)/profile`, `/(app)/(clinica)/screening` e `/(app)/(clinica)/(tabs)/appointments`. **As três rotas existem e são inequívocas.** Alvo: `paddingVertical: 6` + caption ≈ **26pt**. | `ALVO PEQUENO` |
| Guia | `guide.tsx:193` | **Começar agora** / *Start now* | `router.push('/(app)/(clinica)/screening')`. `size="lg"` → 54pt. | `OK` |

O passo 4 ("Chegue preparado") tem `path: null` e `cta: null` — **não renderiza botão nenhum**, que é o certo.

## 1.24 Quizzes — `app/(app)/(clinica)/quizzes.tsx`

**Zero elementos interativos.** Os cards (`:33`) não têm `onPress` e não existe tela de detalhe. Por isso a entrada está deliberadamente fora do menu do perfil (comentário em `(tabs)/profile.tsx:32-34`). A rota continua acessível por deep link `bprclinic://quizzes`.

## 1.25 Barra de abas — `app/(app)/(clinica)/(tabs)/_layout.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Abas | `(tabs)/_layout.tsx:32/41/50/59` | **Início · Consultas · Exercícios · Perfil** | Navegação de abas do expo-router. Altura 88 (iOS) / 64 (Android). | `OK` |

---

# 2. Fluxo de entrada — `app/*.tsx`

## 2.1 Boas-vindas — `app/index.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Boas-vindas | `index.tsx:50` | **Get started** | `router.push('/register')`. `size="lg"` → 54pt. | `OK` |
| Boas-vindas | `index.tsx:56` | **Already a member? Sign in** | `router.push('/login')`. `paddingVertical: 14` + 11.5 ≈ **43pt**, largura total — limítrofe, mas aceitável. | `OK` |

**Observação:** esta tela está **só em inglês** (`:44`, `:51`, `:61`) — é a única do fluxo de entrada sem tradução; login, cadastro e recuperação todos traduzem.

## 2.2 Entrar — `app/login.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Login | `login.tsx:128` | **Criar uma conta** / *Create an account* | `router.push('/register')`. `paddingVertical: 6` + caption ≈ **27pt**. | `ALVO PEQUENO` |
| Login | `login.tsx:138` | **Esqueceu sua senha?** | `router.push({ pathname: '/forgot-password', params: { email, lang } })`. ≈ **27pt**. | `ALVO PEQUENO` |
| Login | `login.tsx:170` | **🌐 English** / **Português** | `setLang(code)`. `paddingVertical: 5` + 10.5 ≈ **24pt**. Só muda o idioma desta tela (estado local). | `ALVO PEQUENO` |
| Login | `login.tsx:111` | **Entrar** / *Sign in* | `onSubmit()` com `loading`, `disabled` sem e-mail/senha, e três mensagens de erro distintas (conta da clínica 403, credencial inválida, genérico). | `OK` |
| Login | `login.tsx:92` e `:102` | **E-mail** e **Senha** | `onChangeText`. Sem `onSubmitEditing` (S4). | `OK` |

**Nota:** os botões "Continue with Apple/Google" foram removidos com comentário (`:155-163`) — não há elemento morto aqui.

## 2.3 Criar conta — `app/register.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Cadastro | `register.tsx:311` | **Termos de Uso** (sublinhado) | `legal('/terms')` → `Linking.openURL(API_URL + path).catch(() => {})` (`:148`). **O `catch` vazio engole a falha**: se não abrir, não há aviso. Alvo: `Pressable` em volta de um texto caption, **sem padding e sem `hitSlop`** → ~15pt de altura. | `ALVO PEQUENO` |
| Cadastro | `register.tsx:316` | **Política de Privacidade** (sublinhado) | Idem, `legal('/privacy')`. ~15pt. | `ALVO PEQUENO` |
| Cadastro | `register.tsx:323` | **Já tenho uma conta** | `router.push('/login')`. ≈ **27pt**. | `ALVO PEQUENO` |
| Cadastro | `register.tsx:338` | **🌐 English** / **Português** | `setLang(code)`. ≈ **24pt**. | `ALVO PEQUENO` |
| Cadastro | `register.tsx:290` | **Criar conta** / *Create account* | `onSubmit()` com validação local (formato de e-mail, 8 caracteres, senhas iguais), `loading`, `disabled` até completar, e quatro erros separados do servidor (409/403/404/503). Sucesso → `replace` para a triagem (ou seletor, se for aluno de personal). | `OK` |
| Cadastro | `register.tsx:191` | **Entrar** / *Sign in* (bloco do 409) | `router.push('/login')`. | `OK` |
| Cadastro | `register.tsx:198` | **Definir minha senha** (bloco do 409) | `router.push({ pathname: '/forgot-password', params: { email, lang } })`. | `OK` |
| Cadastro | `register.tsx:233-287` | 6 campos (Nome, Sobrenome, E-mail, Senha, Confirme, Código do profissional) | `onChangeText`. Sem `onSubmitEditing` (S4) — num formulário de 6 campos isso pesa. | `OK` |

## 2.4 Esqueci a senha — `app/forgot-password.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Recuperação | `forgot-password.tsx:171` | **Voltar para entrar** (link) | `router.replace('/login')`. ≈ **27pt**. | `ALVO PEQUENO` |
| Recuperação | `forgot-password.tsx:162` | **Enviar o link** / *Send the link* | `onSubmit()` com `loading`, `disabled` sem e-mail, erro em `:128`, e troca a tela para a confirmação. | `OK` |
| Recuperação | `forgot-password.tsx:118` | **Voltar para entrar** (botão, estado enviado) | `router.replace('/login')`. **Mesmo rótulo de `:171`, mesma ação** — estados mutuamente exclusivos, não há ambiguidade para o usuário. | `OK` |
| Recuperação | `forgot-password.tsx:151` | **E-mail** | `setEmail`, pré-preenchido pelo param. | `OK` |

---

# 3. `(app)/*.tsx` — telas de conta

## 3.1 Seletor de módulo — `app/(app)/module-select.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Seletor | `module-select.tsx:316` | **Sair** / *Sign out* | `logout()` → o guarda de `(app)` redireciona para `/login`. `paddingVertical: 10` + 13 ≈ **35pt**. | `ALVO PEQUENO` |
| Seletor | `module-select.tsx:254` | card do módulo (Saúde, Laboratory, BA…) | `setActiveModule` + `router.push(ROUTE_MAP[key])`. Os 6 destinos de `ROUTE_MAP` (`:32-40`) existem, e chaves desconhecidas são descartadas antes (`:63`). | `OK` |
| Seletor | `module-select.tsx:139` | **Tentar de novo** (falha ao listar áreas) | `refetch()`. | `OK` |
| Seletor | `module-select.tsx:195` | **Sair** (ramo "nenhuma área") | `logout()`. **Segundo elemento com o rótulo "Sair" no arquivo**, em ramo mutuamente exclusivo com `:316`, mesma ação. | `OK` |

**Nota de build:** com `CLINIC_ONLY` ligado (padrão, `feature-flags.ts:48`) e o usuário sendo paciente da clínica, esta tela nunca aparece — `skipTo` redireciona (`:86-90`).

## 3.2 Editar perfil — `app/(app)/profile-edit.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Editar perfil | `profile-edit.tsx:225` | **Salvar** / *Save* | `handleSave()` com `loading`, `disabled` com nome vazio + aviso em `:153`, `Alert` de erro em `:66`. Sucesso → `router.back()` **puro** (`:60`). Na prática sempre há histórico (a tela só é alcançada por `push` do perfil), mas é o mesmo `router.back()` que `src/lib/go-back.ts` existe para substituir. | `OK` |
| Editar perfil | `profile-edit.tsx:197` | **English** / **Português** | `setPreferredLocale(loc.value)` com os códigos `en-GB`/`pt-BR`. `paddingVertical: 12` + label ≈ **40pt**, largura `flex: 1`. | `OK` |
| Editar perfil | `profile-edit.tsx:135` | foto de perfil | `ProfilePhotoPicker` (ver 6.8). | `OK` |
| Editar perfil | `profile-edit.tsx:139-187` | Nome, Sobrenome, E-mail (bloqueado), Telefone, Data de nascimento | `onChangeText`; o e-mail tem `editable={false}` com explicação ao lado. | `OK` |

## 3.3 Notificações — `app/(app)/notifications.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Notificações | `notifications.tsx:73` | linha da notificação | `if (target) router.push(target)` com `target = appRouteFor(notif.link)`. `appRouteFor` (`src/lib/app-route.ts:37`) devolve **`null` para qualquer `link` fora das 18 entradas do mapa** — e aí a linha vira `disabled`, **com exatamente a mesma aparência das demais**: mesmo fundo, mesma seta, mesmo ícone. O paciente toca uma notificação urgente e nada acontece, sem explicação. Os 18 destinos mapeados foram conferidos um a um contra a árvore de `app/` — **todos existem**. | `MORTO` |
| Notificações | `notifications.tsx:52` | **Tentar de novo** (`LoadFailure`) | `refetch()`. | `OK` |

## 3.4 Alterar senha — `app/(app)/change-password.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Alterar senha | `change-password.tsx:104` | **Salvar nova senha** | `onSubmit()` com validação local (6 caracteres, senhas iguais), `loading`, `disabled` sem os dois campos, cartão verde de sucesso (`:65`) e erro em `:98`. | `OK` |
| Alterar senha | `change-password.tsx:77/84/91` | Senha atual (opcional), Nova senha, Confirmar | `onChangeText`; os dois últimos limpam o estado de sucesso ao digitar. | `OK` |

---

# 4. `(lab)` — próximo a liberar

## 4.1 Catálogo — `app/(app)/(lab)/(tabs)/index.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/catálogo | `(lab)/(tabs)/index.tsx:60` | 8 chips de categoria (*All*, *Hormones*…) | `setSelectedCategory(cat)`. `Chip` = **~24pt** (S2). | `ALVO PEQUENO` |
| Lab/catálogo | `(lab)/(tabs)/index.tsx:94` | card do exame | `router.push('/(app)/(lab)/{id}')`. | `OK` |
| Lab/catálogo | `(lab)/(tabs)/index.tsx:47` | **Search tests…** | `setSearchText` → filtra em memória. | `OK` |

**Observação:** toda a área `(lab)` está **só em inglês**, inclusive para paciente em pt-BR.

## 4.2 Exame (detalhe) — `app/(app)/(lab)/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/exame | `(lab)/[id].tsx:100` | **Continue · £X** | `router.push({ pathname: '/(app)/(lab)/collection-method', params })`. Rota existe. `size="lg"`. | `OK` |

## 4.3 Forma de coleta — `app/(app)/(lab)/collection-method.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/coleta | `collection-method.tsx:42` | 3 cartões (*Collect at the clinic*, *Home kit*, *Phlebotomist at home*) | `setSelected(m.key)`. `padding: 14` → alvo grande. | `OK` |
| Lab/coleta | `collection-method.tsx:63` | **Continue · £X** | `router.push({ pathname: '/(app)/(lab)/checkout', params })`. | `OK` |

## 4.4 Checkout — `app/(app)/(lab)/checkout.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/checkout | `checkout.tsx:76` | **Pay £X** / *Placing order…* | `mutation.mutate()` → `createLabOrder` (`src/api/labs.ts:99`), que só faz `POST /api/mobile/labs/orders` com `items` + endereço. **Não há nenhum passo de pagamento do lado do app** — sem Stripe, sem checkout externo, sem `Linking`. Ou a rota do servidor devolve um pedido já cobrado (e o app não usa nada disso), ou o rótulo "Pay" promete uma cobrança que não acontece. **Para decidir:** ler `app/api/mobile/labs/orders/route.ts` no repo web. Mecanicamente o botão funciona: `loading`, `disabled` sem endereço válido, `Alert` de erro, `replace` para o pedido no sucesso. | `INCERTO` |
| Lab/checkout | `checkout.tsx:64-71` | Address line 1/2, City, Postcode | `setAddress`. Só aparecem para POSTAL e HOME_VISIT. | `OK` |

## 4.5 Meus pedidos — `app/(app)/(lab)/(tabs)/orders.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/pedidos | `(lab)/(tabs)/orders.tsx:75` | card do pedido | `router.push('/(app)/(lab)/order/{id}')`. | `OK` |

## 4.6 Acompanhar pedido — `app/(app)/(lab)/order/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/pedido | `order/[id].tsx:112` | **Talk to clinic** | É um **`<Pill>`**, não um botão: `src/components/ui/Pill.tsx:28` renderiza uma `View` sem `onPress` e sem `Pressable`. Está posicionado à direita de "Questions about the test?", no formato exato de um botão de ação, e **não responde a toque nenhum**. | `MORTO` |
| Lab/pedido | `order/[id].tsx:103` | **View result** | `router.push({ pathname: '/(app)/(lab)/result/[id]', params })`. Só aparece com `status === 'RESULTS_READY'`. | `OK` |

## 4.7 Resultado — `app/(app)/(lab)/result/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Lab/resultado | `result/[id].tsx:89` | **View full report** | `openReport()` → `Linking.openURL` **com `try/catch` e `Alert`** (`:34-41`). Só renderiza com `reportUrl`; sem ele mostra um cartão explicativo em vez de um botão morto. | `OK` |
| Lab/resultado | `result/[id].tsx:103` | **Discuss with your therapist** | `router.push('/(app)/(clinica)/messages')`. Rota existe. **Atenção:** é uma rota do módulo `(clinica)`, protegida por `ModuleGuard module="clinica"`; para quem tiver lab sem clínica, o toque joga para `/module-select`. Na prática o lab só é oferecido a quem já é paciente da clínica (`feature-flags.ts:28`, `ModuleGuard.tsx:59-61`), então o caminho fecha. | `OK` |

## 4.8 Perfil do lab — `app/(app)/(lab)/(tabs)/profile.tsx`

`<ModuleProfile />` **sem seções** — só foto, editar perfil, notificações, alterar senha, biometria e sair. Ver seção 6.

---

# 5. Prioridade baixa — `(ba)`, `(treino)`, `(avaliacoes)`, `(nutricao)`, `dev/`

## 5.1 `(treino)` — treinos do aluno

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Sessão de treino | `(treino)/[id].tsx:114` | **← Back** (estado "Workout not found") | `router.back()` **puro**. Sem histórico (deep link, ou entrada por `replace`), **não faz nada e não há erro**. É exatamente o caso que `src/lib/go-back.ts` foi escrito para eliminar — e este arquivo não usa `goBackOr`. Pior aqui: é a única saída de uma tela que já é um beco. | `SEM RETORNO` |
| Sessão de treino | `(treino)/[id].tsx:124` | **All workouts** | `router.back()` puro. Mesmo caso. | `SEM RETORNO` |
| Sessão de treino | `(treino)/[id].tsx:147` | **Watch video** | `Linking.openURL(videoUrl)` sem `catch`. Alvo: `paddingVertical: 4` + caption ≈ **23pt**. | `SEM RETORNO` |
| Sessão de treino | `(treino)/[id].tsx:171` | caixa ✓ de cada série | `updateSet(…, { completed: !… })`. `width: 28`, altura do ícone 22, **sem `hitSlop`** → ~28×22. Numa linha junto de 3 campos numéricos. | `ALVO PEQUENO` |
| Sessão de treino | `(treino)/[id].tsx:187` | **Finish session** / **Saved ✓** | `finish()` com `loading`, erro em `:188`. `disabled={saving \|\| saved}`: depois de salvar fica desabilitado até a pessoa mexer em algum campo (`updateSet`/`setSessionRpe` fazem `setSaved(false)`) — **volta a ser falso**, não é o caso de `disabled` travado. | `OK` |
| Sessão de treino | `(treino)/[id].tsx:168-170`, `:185` | reps / load / RPE / Session RPE | `onChangeText` numérico. | `OK` |
| Lista de treinos | `(treino)/index.tsx:70` | card do treino | `router.push('/(app)/(treino)/{id}')`. | `OK` |

## 5.2 `(avaliacoes)` — avaliações físicas do aluno

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Avaliação (detalhe) | `(avaliacoes)/[id].tsx:64` | **‹ Assessments** | `router.back()` puro. Mesmo caso de 5.1. | `SEM RETORNO` |
| Avaliações (lista) | `(avaliacoes)/index.tsx:112` | card da avaliação | `router.push('/(app)/(avaliacoes)/{id}')`. | `OK` |

## 5.3 `(nutricao)` — plano alimentar

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Nutrição | `(nutricao)/index.tsx:124` | **Mark done** / **Done** | `toggle(m.id)` — marca **e desmarca**, com `ActivityIndicator` no lugar do ✓ enquanto grava, `disabled` durante, e mensagem de erro em `:51`. É o melhor botão de "concluir" do app inteiro: reversível, com estado de carga e com erro. | `OK` |

## 5.4 `(ba)` Home — `app/(app)/(ba)/(tabs)/index.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Home | `(ba)/(tabs)/index.tsx:111` | sino de **notificações** | `router.push('/notifications')`. **30×30 sem `hitSlop`.** | `ALVO PEQUENO` |
| BA/Home | `(ba)/(tabs)/index.tsx:195` | **View appointment** / **Book now** | `push('/appointment/{id}')` ou `push('/appointments')`. Rotas de `(clinica)` — para uma conta BA sem clínica o `ModuleGuard` joga para `/module-select` (ver Observação 4). | `OK` |
| BA/Home | `(ba)/(tabs)/index.tsx:242` | **View progress** / **Check in now** | Os dois rótulos vão para `/daily-checkin`. "View progress" abre o formulário de check-in — que mostra sequência e histórico, então não chega a ser falso. | `OK` |
| BA/Home | `(ba)/(tabs)/index.tsx:276` | **Explore** | `router.push('/education')` — conteúdo educativo da clínica. | `OK` |

## 5.5 `(ba)` Work — `app/(app)/(ba)/(tabs)/work.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Work | `work.tsx:156` | ícone de **busca** | `<Pressable>` **sem `onPress`**. 40×40, fundo próprio, parece um botão. | `MORTO` |
| BA/Work | `work.tsx:284` | `SegmentedControl` **Quotes · Invoices · Receipts** | `setSegment`. `paddingVertical: 7` + fonte 11 ≈ **29pt** (`SegmentedControl.tsx:36`). | `ALVO PEQUENO` |
| BA/Work | `work.tsx:237` | alerta de prazo de compliance | `router.push('/work/compliance')`. Rota existe. | `OK` |
| BA/Work | `work.tsx:313` | ListItem de orçamento | `router.push('/work/quote/{id}')`. | `OK` |
| BA/Work | `work.tsx:359` | ListItem de fatura | `router.push('/work/invoice/{id}')`. | `OK` |
| BA/Work | `work.tsx:412` | FAB **+** | `router.push('/work/quote-new')`. 56×56. | `OK` |

**Observação:** `quotesQ`/`invoicesQ` não têm tratamento de `isError` — uma falha de rede mostra "No quotes yet" / "No invoices yet".

## 5.6 `(ba)` Community — `app/(app)/(ba)/(tabs)/community.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Community | `community.tsx:115` | **🎉 47 · 💪 23 · 💬 23** (reações) | `<Pressable>` **sem `onPress`**, mas **com `opacity` no `pressed`** — dá retorno de toque e não faz nada. São até 3 por post × 4 posts = **12 alvos mortos com feedback visual**. | `MORTO` |
| BA/Community | `community.tsx:151` | ícone de **busca** | `<Pressable>` **sem `onPress`**, com `opacity` no `pressed`. 30×30. | `MORTO` |
| BA/Community | `community.tsx:165` | ícone de **grupos** | `router.push('/(app)/(ba)/community/groups')`. **30×30 sem `hitSlop`.** | `ALVO PEQUENO` |
| BA/Community | `community.tsx:189` | 4 chips de filtro (*For you*, *Plumbers UK*…) | `setSelectedFilter(idx)` — muda o destaque, **mas `POSTS` é um array fixo (`:26`) e a lista não filtra nada**. | `ALVO PEQUENO` |
| BA/Community | `community.tsx:208` | FAB **+** | `router.push('/(app)/(ba)/community/new-post')`. 52×52. | `OK` |

**Observação:** os 4 posts são dados fixos no arquivo (`:26-86`); nenhum leva ao perfil do autor, e a rota `(ba)/community/[id].tsx` **não é alcançável por nenhum toque do app**.

## 5.7 `(ba)` Grupos — `app/(app)/(ba)/community/groups.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Grupos | `groups.tsx:67` | **busca** (headerRight) | `<Pressable hitSlop={8}>` **sem `onPress`**. | `MORTO` |
| BA/Grupos | `groups.tsx:107` | ListItem de grupo (*Plumbers UK*, *First year in business*) | `onPress={() => {}}`. | `MORTO` |
| BA/Grupos | `groups.tsx:146` | **Join** (3 grupos sugeridos) | `onPress={() => {}}`. Além disso `minHeight: 30` explícito. | `MORTO` |

## 5.8 `(ba)` Perfil de membro — `app/(app)/(ba)/community/[id].tsx`

Rota órfã (ver 5.6). Todos os elementos são mortos.

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Perfil membro | `community/[id].tsx:93` | **compartilhar** (headerRight) | `<Pressable hitSlop={8}>` sem `onPress`. | `MORTO` |
| BA/Perfil membro | `community/[id].tsx:145` | **Message** | `onPress={() => {}}`. | `MORTO` |
| BA/Perfil membro | `community/[id].tsx:148` | **Recommend** | `onPress={() => {}}`. | `MORTO` |
| BA/Perfil membro | `community/[id].tsx:165` | 3 chips de badge (*🏅 Responsible Director*…) | `<Chip>` sem `onPress` → `Pressable` com handler `undefined`. Decorativos, mas montados como botões. | `MORTO` |

## 5.9 `(ba)` Novo post — `app/(app)/(ba)/community/new-post.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Novo post | `new-post.tsx:52` | **Post** | `handlePost()` (`:27`) mostra `Alert("Posted!", "Your post has been shared with the community.")` e volta. **Nada é enviado a lugar nenhum** — não há mutação, não há chamada de API, o texto é descartado. É a mentira mais direta do app: afirma ao usuário que o post foi publicado. | `MORTO` |
| BA/Novo post | `new-post.tsx:122` | **Attach from Work** | `onPress={() => {}}`, com `opacity` no `pressed` e seta `chevron-forward`. | `MORTO` |
| BA/Novo post | `new-post.tsx:145` | **House rules** (sublinhado, cor de link) | É um `<Text>` dentro de outro `<Text>`, **sem `Pressable` e sem `onPress`**. Parece link, não é. | `MORTO` |
| BA/Novo post | `new-post.tsx:76` | 4 chips de tipo (*🎉 Win*…) | `setSelectedType`. ~24pt (S2). | `ALVO PEQUENO` |
| BA/Novo post | `new-post.tsx:98` | 3 chips de destino (*Everyone*…) | `setSelectedTarget`. ~24pt (S2). | `ALVO PEQUENO` |
| BA/Novo post | `new-post.tsx:43` | **×** (fechar) | `router.back()` com `hitSlop={8}`. A tela só chega por `push`, então há histórico. | `OK` |
| BA/Novo post | `new-post.tsx:110` | corpo do post | `setBody`, multiline. | `OK` |

## 5.10 `(ba)` Learn — `app/(app)/(ba)/work/learn.tsx`

Tela **sem entrada** — nenhum `router.push` no app aponta para `/work/learn`.

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Learn | `learn.tsx:138` | **Resume — 8 min left** | `onPress={() => {}}`. | `MORTO` |
| BA/Learn | `learn.tsx:158` | 3 ListItems de curso (*Responsible Director*, *Bookkeeping in Practice*, *Pricing your trade*) | `onPress={() => {}}`. | `MORTO` |

## 5.11 `(ba)` Compliance — `app/(app)/(ba)/work/compliance.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Compliance | `compliance.tsx:101` | **+** (headerRight) | `<Pressable>` de 36×36 com fundo próprio, **sem `onPress`**. | `MORTO` |
| BA/Compliance | `compliance.tsx:237` | **Not sure what a CS01 is? / Learn about your compliance obligations** | `router.push('/education')` — a rota existe, mas é o **conteúdo educativo clínico do paciente**, não a formação de compliance. A tela que o rótulo descreve é `work/learn.tsx`, que existe e nunca é chamada. Para uma conta só-BA, o `ModuleGuard` de `(clinica)` ainda joga para `/module-select`. | `MORTO` |

## 5.12 `(ba)` Fatura — `app/(app)/(ba)/work/invoice/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Fatura | `invoice/[id].tsx:272` | **Send Invoice** | `onPress={() => {}}`, com ícone de avião de papel. Só aparece em fatura `draft`. | `MORTO` |

## 5.13 `(ba)` Orçamento — `app/(app)/(ba)/work/quote/[id].tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Orçamento | `quote/[id].tsx:325` | **Convert to Invoice** | `router.push({ pathname: '/(app)/(ba)/work/invoice-new', params: { quoteId } })`. **`app/(app)/(ba)/work/invoice-new.tsx` não existe.** A árvore de `app/` só tem `work/invoice/[id].tsx`. O toque cai na tela "Unmatched Route" do expo-router. Único caso do app. Aparece quando o orçamento está `accepted`. | `ROTA INEXISTENTE` |
| BA/Orçamento | `quote/[id].tsx:315` | **Send Quote** | `onPress={() => { /* TODO: implement send quote mutation */ }}`. Só em orçamento `draft`. | `MORTO` |
| BA/Orçamento | `quote/[id].tsx:303` | **Preview PDF** | `router.push('/(app)/(ba)/work/quote-preview')`. Rota existe; o destino desenha o orçamento em cartão na tela, **não gera PDF** e não oferece salvar/imprimir. Rótulo otimista, mas a tela entregue é uma prévia de verdade. | `OK` |

## 5.14 `(ba)` Novo orçamento — `app/(app)/(ba)/work/quote-new.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Novo orçamento | `quote-new.tsx:282` | **Send Quote** | `handleSubmit('send')` → chama **exatamente a mesma mutação com a mesma carga** que "Save Draft" (`:50-60`): `createQuote({clientName, clientEmail, clientAddress, items, vatRate})`. `src/api/work.ts:117-129` não aceita status nem flag de envio. **O `actionType` só escolhe em qual dos dois botões o spinner aparece.** Nada é enviado ao cliente. Dois botões lado a lado, rótulos diferentes, comportamento idêntico. | `MORTO` |
| BA/Novo orçamento | `quote-new.tsx:148` | 🗑 remover item | `removeItem(idx)` **sem confirmação** — mas é uma linha de formulário ainda não salva, então não é destrutivo de verdade. `padding: 4` + ícone 18 + `hitSlop={8}` → **~42pt**. | `ALVO PEQUENO` |
| BA/Novo orçamento | `quote-new.tsx:273` | **Save Draft** | `handleSubmit('draft')` com `loading` próprio, `disabled` na validação, e `router.back()` no sucesso. Faz o que diz. | `OK` |
| BA/Novo orçamento | `quote-new.tsx:202` | **Add item** | `addItem()`. | `OK` |
| BA/Novo orçamento | `quote-new.tsx:103-121`, `:161-185` | Name, Email, Address, Description, Qty, Unit Price | `onChangeText`. | `OK` |

**Observação:** `mutation` não tem `onError` — se `createQuote` falhar, o spinner some e não se diz nada.

## 5.15 `(ba)` Prévia do orçamento — `app/(app)/(ba)/work/quote-preview.tsx`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Prévia | `quote-preview.tsx:339` | **Share link** | `onPress={() => { /* TODO: implement share link */ }}`. | `MORTO` |
| BA/Prévia | `quote-preview.tsx:354` | **Send to {Nome}** | `onPress={() => { /* TODO: implement send quote */ }}`. Logo abaixo, `:370` diz "Nothing is sent without your approval" — o que é literalmente verdade e completamente enganoso. | `MORTO` |
| BA/Prévia | `quote-preview.tsx:71` | ✎ editar (headerRight) | `router.push('/(app)/(ba)/work/quote/{id}')`. **36×36 sem `hitSlop`.** | `ALVO PEQUENO` |

## 5.16 `(ba)` Assinatura — `app/(app)/(ba)/membership.tsx`

Tela **sem entrada** — nenhum `router.push` aponta para `/(app)/(ba)/membership`.

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Assinatura | `membership.tsx:137` | **Cancelar plano** | `handleCancel()` → `Alert` com "Não" / "Sim, cancelar" (`destructive`) antes de `cancelMutation.mutate()`. **Confirma corretamente.** | `OK` |
| BA/Assinatura | `membership.tsx:187` | **Assinar** / **Ativar** | `subscribeMutation.mutate(item.id)` com `loading` por item (`variables === item.id`), abre o checkout via `Linking` com `.catch` que avisa, e mostra `notice` em todos os desfechos. | `OK` |

## 5.17 `(ba)` Onboarding — `app/(app)/(ba)/onboarding.tsx`

Tela **sem entrada** — nenhum `router.push`/`replace` aponta para ela.

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| BA/Onboarding | `onboarding.tsx:192` | **Create my account** | `handleCreate()` (`:76`) faz **só** `router.replace('/(app)/(ba)/(tabs)')`. Nome, profissão, local de trabalho e tipo de empresa — quatro campos que a tela pediu — **são descartados**; nenhuma conta é criada, nada é salvo. E `:187` diz "We use this to set up your compliance calendar". | `MORTO` |
| BA/Onboarding | `onboarding.tsx:177` | 3 chips de tipo de empresa | `setCompanyType`. ~24pt (S2). | `ALVO PEQUENO` |
| BA/Onboarding | `onboarding.tsx:101` | 3 cartões de pilar (*Grow my business*, *Fix pain…*, *Meet people…*) | `togglePillar(key)`. Cartão inteiro. | `OK` |
| BA/Onboarding | `onboarding.tsx:133` | **Continue** | `setStep(2)`, `disabled` sem nenhum pilar. | `OK` |
| BA/Onboarding | `onboarding.tsx:151-169` | Full name, What do you do?, Where do you work? | `onChangeText` — valores descartados (ver `:192`). | `OK` |

## 5.18 `(ba)` Conquistas — `app/(app)/(ba)/achievements.tsx`

**Zero elementos interativos.** Tela sem entrada. Textos em português cru (`"Conquistas"`, `"desbloqueadas"`), fora do `i18n` do resto do app.

## 5.19 Barras de abas de `(lab)` e `(ba)`

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Abas lab | `(lab)/(tabs)/_layout.tsx:30/39/48` | **Tests · My Orders · Profile** | Navegação de abas. | `OK` |
| Abas BA | `(ba)/(tabs)/_layout.tsx:30/37/48/59` | **Home · Work · Community · Profile** | Navegação de abas. | `OK` |

## 5.20 Vitrine do design system — `app/dev/ui.tsx`

Fora do guarda de autenticação (S6).

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| dev/ui | `dev/ui.tsx:34-40`, `:46` | **Primary · Greige · Ghost · Danger · Work · Health · Community · Disabled** | 8 `<Button>` **sem `onPress`**. É uma vitrine, mas são 8 botões montados que não respondem. | `MORTO` |
| dev/ui | `dev/ui.tsx:81-83` | **All · Work · Health** (chips) | `onPress={() => {}}`. | `MORTO` |
| dev/ui | `dev/ui.tsx:41` | **Loading toggle** | `setLoading(v => !v)`. | `OK` |
| dev/ui | `dev/ui.tsx:89` | `SegmentedControl` **Tab A/B/C** | `setSeg`. | `OK` |
| dev/ui | `dev/ui.tsx:106`, `:113` | **Email**, **With error** | `setValue` / estático. | `OK` |

---

# 6. Componentes compartilhados — `src/components/**`

Aparecem em várias telas; contados uma vez cada.

| tela | elemento (arquivo:linha) | rótulo visível | o que faz | veredito |
|---|---|---|---|---|
| Menu do perfil (todos os módulos) | `ModuleProfile.tsx:93` | 14 seções da clínica (*Mensagens*, *Meu prontuário*, *Meus documentos*, *Plano de tratamento*, *Pendências*, *Avaliação*, *Meu progresso*, *Medidas de evolução*, *Check-in diário*, *Pressão arterial*, *Conteúdo*, *Dispositivos*, *Como funciona*, *Termos & consentimento*) | `router.push(s.href)`. **Os 14 `href` foram conferidos um a um contra a árvore de `app/` — todos existem.** Alvo: `ListItem` sem subtítulo ≈ **38pt** (S3). | `ALVO PEQUENO` |
| Menu do perfil | `ModuleProfile.tsx:105` | **Editar perfil** | `router.push('/profile-edit')`. ~38pt (S3). | `ALVO PEQUENO` |
| Menu do perfil | `ModuleProfile.tsx:110` | **Notificações** | `router.push('/notifications')`. ~38pt (S3). | `ALVO PEQUENO` |
| Menu do perfil | `ModuleProfile.tsx:115` | **Alterar senha** | `router.push('/change-password')`. ~38pt (S3). | `ALVO PEQUENO` |
| Menu do perfil | `ModuleProfile.tsx:132` | **Sair** / *Sign out* | `clearModule()` + `logout()` + `replace('/login')`. Sem confirmação (S5). | `OK` |
| Menu do perfil | `ModuleProfile.tsx:129` | **Trocar de módulo** | `clearModule()` + `replace('/module-select')`. **Só renderiza com `CLINIC_ONLY` desligado** — no build padrão nunca aparece. Não é morto, é oculto. | `OK` |
| Perfil / Editar perfil | `ProfilePhotoPicker.tsx:114` | avatar + **Trocar foto** / **Adicionar foto** | `openMenu()` → `Alert` com Tirar foto / Escolher da galeria / Remover foto (`destructive`) / Cancelar. `disabled={busy}` com `ActivityIndicator`. Pede permissão antes e avisa quando falha. Remover a foto acontece dentro do próprio menu, que já é a confirmação. | `OK` |
| Perfil | `BiometricLockRow.tsx:102` | `Switch` **Destravar com Face ID / Touch ID / digital** | `toggle(v)`: ao ligar pede a biometria na hora e só grava se confirmar; `disabled` sem cadastro e durante a operação. Rótulo vem do aparelho. | `OK` |
| Tranca (cortina sobre o app) | `LockOverlay.tsx:122` | **Destravar com {biometria}** / **Tentar de novo** | `attempt()` com guarda de reentrância por `useRef`, `loading`, e três mensagens distintas (offline / recusado / inicial). | `OK` |
| Tranca | `LockOverlay.tsx:138` | **Sair e entrar com a senha** | `logout()`. Sem confirmação (S5), mas o rótulo diz exatamente o que acontece. `paddingVertical: 14` + 11.5 ≈ **43pt**, largura total. | `OK` |
| Header de `(clinica)`, `(lab)`, `(ba)`, `(treino)`, `(avaliacoes)`, `(nutricao)` | `HeaderBack.tsx:25` | ‹ (voltar) | `goBackOr()` — volta quando há histórico, vai para a casa do paciente quando não há. 40×40 **com `hitSlop={12}` → 64×64 efetivo**. O toque sempre faz alguma coisa. | `OK` |
| Falha de carga (12 telas) | `LoadFailure.tsx:91` | **Tentar de novo** / *Try again* | `onRetry()`. Não renderiza quando o erro é de plano (403) — pressionar de novo não mudaria um plano. | `OK` |
| Falha de carga | `LoadFailure.tsx:49` | **Abrir a avaliação** / *Open the assessment* | `router.push('/(app)/(clinica)/screening')`, no caso de recusa por falta de aceite. | `OK` |
| Tela bloqueada pelo plano (19 telas) | `PlanGate.tsx:80` | **Voltar** / *Go back* | `goBackOr()`. Deliberadamente **fora** de `canGoBack()`: aparece sempre. | `OK` |
| Exercícios bloqueados pela pressão | `ExerciseBlockCard.tsx:54` | **Registrar nova medida** | `router.push('/blood-pressure')`. | `OK` |

---

# Resumo contado

| veredito | quantidade |
|---|---|
| `OK` | **122** |
| `ALVO PEQUENO` | **39** |
| `MORTO` | **30** |
| `SEM RETORNO` | **9** |
| `DESTRUTIVO SEM CONFIRMAR` | **2** |
| `INCERTO` | **2** |
| `ROTA INEXISTENTE` | **1** |
| **total de elementos inventariados** | **205** |

Varredura: **74 arquivos de rota** em `app/**` (63 telas + 11 `_layout.tsx`) e **12 componentes com elementos interativos** em `src/components/**`. Todos lidos por inteiro; nenhum foi alterado.

## Distribuição por área

| área | MORTO | ALVO PEQ. | SEM RETORNO | DESTR. | ROTA INEX. | INCERTO | OK | total |
|---|---|---|---|---|---|---|---|---|
| `(clinica)` — prioridade máxima | 3 | 15 | 5 | 2 | 0 | 1 | 51 | 77 |
| raiz (index/login/cadastro/recuperação) | 0 | 8 | 0 | 0 | 0 | 0 | 11 | 19 |
| `(app)/*` (seletor, perfil, notificações, senha) | 1 | 1 | 0 | 0 | 0 | 0 | 10 | 12 |
| `(lab)` | 1 | 1 | 0 | 0 | 0 | 1 | 10 | 13 |
| `(ba)` + `(treino)` + `(avaliacoes)` + `(nutricao)` + `dev/` | 25 | 10 | 4 | 0 | 1 | 0 | 29 | 69 |
| componentes compartilhados (`src/components`) | 0 | 4 | 0 | 0 | 0 | 0 | 11 | 15 |

### Os 39 `ALVO PEQUENO`, por gravidade

| faixa | quantos | quais |
|---|---|---|
| **crítico** — ícone/número isolado abaixo de 32pt, sem `hitSlop` | 15 | `daily-checkin.tsx:37` (44 alvos de ~26×32), `outcome-measures.tsx:182`, `education/[id].tsx:105` (28×28), `screening.tsx:232`, `guide.tsx:134`, `wearables.tsx:267/:284/:299`, `register.tsx:311/:316` (texto puro, ~15pt), `login.tsx:170`, `register.tsx:338`, `(ba)/(tabs)/index.tsx:111` (30×30), `(treino)/[id].tsx:171` |
| **moderado** — 24–32pt, mas com largura confortável | 13 | chips em geral (S2): `(lab)/(tabs)/index.tsx:60`, `new-post.tsx:76/:98`, `onboarding.tsx:177`, `community.tsx:189`, `community.tsx:165`, `appointments.tsx:30`, `documents.tsx:115/:122`, `book-appointment.tsx:122`, `login.tsx:128/:138`, `register.tsx:323` |
| **limítrofe** — 32–43pt, largura total ou `flex: 1` | 11 | `screening.tsx:39` (YesNo) e `:71` (ChipSelect), `book-appointment.tsx:167`, `forgot-password.tsx:171`, `module-select.tsx:316`, `work.tsx:284`, `quote-new.tsx:148`, `quote-preview.tsx:71`, `ModuleProfile.tsx:93/:105/:110/:115` (S3, contados como 4) |

**O módulo que o paciente usa está em ordem.** Os 30 `MORTO` se concentram em `(ba)`, que é protótipo com dados fixos: **25 dos 30**. Na clínica sobram três, e dois deles (`tasks.tsx:75` e `treatment-protocol.tsx:164` no ramo "já concluído") são efeito colateral do mesmo card que já aparece como destrutivo. O único `MORTO` que um paciente encontra no fluxo normal é o **"Remarcar" da tela inicial**.

## Os 8 achados que importam, em ordem

1. **`(tabs)/index.tsx:172` — "Remarcar" não remarca.** É a tela inicial do paciente, é o primeiro botão do cartão da próxima sessão, e o destino não tem nenhuma ação. Ou implementar remarcar/cancelar em `appointment/[id].tsx`, ou trocar o rótulo para "Ver consulta".
2. **`tasks.tsx:75` e `treatment-protocol.tsx:164` — concluir ao primeiro toque, no card inteiro, sem desfazer.** Não há nada indicando que o card é um botão; quem toca para ler conclui. O `(nutricao)/index.tsx:124` já mostra o padrão certo no mesmo app: botão próprio, rotulado, reversível, com estado de carga.
3. **`screening.tsx:435` — "Enviar avaliação" sem `loading`.** Nove etapas de dados clínicos e o toque final não tem retorno nenhum. `submit.isPending` existe e não é lido. Correção de uma linha.
4. **`outcome-measures.tsx:184` — `View` com `onTouchEnd`.** Único do app. Dispara em gesto cancelado, sem `accessibilityRole` e sem retorno de toque, a vinte pixels de um bloco idêntico que já foi corrigido para `Pressable` + `hitSlop`.
5. **`daily-checkin.tsx:37` — 44 alvos de ~26×32pt.** Quatro escalas de 0 a 10 numa tela que o paciente usa todo dia. `hitSlop={{ top: 6, bottom: 6 }}` resolve sem mudar o desenho.
6. **`notifications.tsx:73` — notificação com link desconhecido é indistinguível de uma que abre.** O `disabled` não muda a aparência. Ou esconder a seta e apagar a linha, ou mapear os links que faltam.
7. **`quote/[id].tsx:325` — `ROTA INEXISTENTE`.** `work/invoice-new` não existe; cai em "Unmatched Route". É `(ba)`, mas é o único do app.
8. **`new-post.tsx:52` e `onboarding.tsx:192` — dizem ao usuário que fizeram algo que não fizeram.** "Your post has been shared with the community" sem nenhuma chamada de API; "Create my account" que só navega e descarta quatro campos. Mesmo em protótipo, um `Alert` que afirma sucesso é diferente de um botão que não faz nada.

## Observações que não cabem na tabela

1. **`Linking.openURL` sem tratamento** em 5 lugares: `exercise/[id].tsx:184`, `education/[id].tsx:83`, `wearables.tsx:96`, `(treino)/[id].tsx:148`, `register.tsx:148` (este com `.catch(() => {})` explícito). `documents.tsx:185-195` e `result/[id].tsx:34-41` mostram o padrão correto — `try/catch` + `Alert`.

2. **`router.back()` puro** em 4 lugares — `(treino)/[id].tsx:114`, `(treino)/[id].tsx:124`, `(avaliacoes)/[id].tsx:65`, `profile-edit.tsx:60` — apesar de `src/lib/go-back.ts` existir exatamente para isso e o `HeaderBack` já usar. Nos três primeiros é a única saída da tela.

3. **`education/[id].tsx` não está dentro de `PlanGate`**, enquanto `education.tsx` está (`mod_education`). Mesma coisa com `booking-confirmed.tsx` e `blood-pressure.tsx`, que não têm gate — os dois lêem dados do paciente.

4. **Rotas de `(clinica)` chamadas de dentro de `(ba)`** — `(ba)/(tabs)/index.tsx:201/202/246/280` e `(ba)/work/compliance.tsx:239`. Para uma conta com BA e sem `clinica`, o `ModuleGuard` (`ModuleGuard.tsx:65-67`) faz `Redirect` para `/module-select`: o toque **tira a pessoa do módulo em que ela estava**, sem aviso.

5. **Rotas órfãs** (existem, nenhum toque no app leva até elas): `(ba)/community/[id].tsx`, `(ba)/work/learn.tsx`, `(ba)/membership.tsx`, `(ba)/onboarding.tsx`, `(ba)/achievements.tsx`, `(clinica)/quizzes.tsx`, `dev/ui.tsx`. Todas continuam acessíveis por deep link `bprclinic://`.

6. **Estados de erro sem "tentar de novo":** `documents.tsx:143`, `education.tsx:41`, `appointment/[id].tsx:57`, `exercise/[id].tsx:73`, `(tabs)/appointments.tsx:41`, `(tabs)/exercises.tsx:62`, `(lab)/(tabs)/index.tsx:72`, `(lab)/(tabs)/orders.tsx:53`, `invoice/[id].tsx:58`, `quote/[id].tsx:48`, `compliance.tsx:120`. São cartões de texto sem saída; o `LoadFailure` que 12 outras telas usam já resolve isso.

7. **Mutações sem `onError`:** `education/[id].tsx:29`, `quote-new.tsx:42`, `messages.tsx:80` (esta compensa com `send.isError` na tela).

8. **`disabled` compartilhado entre instâncias:** `wearables.tsx:287` — `syncMut.isPending` desabilita e escreve "…" no botão **Sincronizar de todos os aparelhos**, não só no que foi tocado. Nenhum `disabled` do app ficou travado permanentemente: todos voltam a falso (conferido em `(treino)/[id].tsx:187`, que é o único com `disabled` dependente de estado próprio, e ele é limpo por `updateSet`/`setSessionRpe`).

9. **Nenhum campo do app tem `onSubmitEditing`** (S4) — a tecla de retorno nunca envia nem avança.

10. **Rótulos só em inglês em telas que traduzem o resto:** `app/index.tsx` inteira, `book-appointment.tsx:13` (os 7 tipos de consulta), `documents.tsx:127` ("Upload"), todo o módulo `(lab)`, todo o `(ba)`, `(treino)`, `(avaliacoes)` e `(nutricao)`. E `achievements.tsx`, que é o inverso: português cru fora do `i18n`.
