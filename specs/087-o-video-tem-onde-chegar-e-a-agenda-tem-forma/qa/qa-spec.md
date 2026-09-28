# QA — Atividade 087

**Ambiente:** dev local (web do admin) + Expo web para o app. Paciente de teste **identificado**,
nunca paciente real. Zero DDL no banco compartilhado.

**Regra que vale para todos os cenários de tenant:** provar o vazamento é olhar da clínica B e ver
zero, não olhar da clínica A e ver o que se espera.

---

## T-1 — Puxar para atualizar

| # | tipo | passos | esperado |
|---|---|---|---|
| 1.1 | UI | Abrir uma tela que rola (ex.: Início da clínica) e puxar para baixo | A roda aparece e some; os dados são buscados de novo |
| 1.2 | UI | Abrir uma lista própria (Exercícios) e puxar para baixo | Mesma coisa — `FlatList` tem controle próprio |
| 1.3 | UI | Derrubar a rede e puxar | A roda **para de girar**; a tela não fica travada |
| 1.4 | UI | Repetir 1.1 no tom escuro | A roda é visível contra o fundo escuro |
| 1.5 | UI | Numa tela com dois dados (contador + lista), mudar os dois no servidor e puxar | **Os dois** mudam juntos, não um só |
| 1.6 | código | Varredura das telas | Toda tela com `FlatList` tem `refreshControl` |

## T-2 — Disponibilidade por intervalo

| # | tipo | passos | esperado |
|---|---|---|---|
| 2.1 | API | `GET /api/availability?date=YYYY-MM-DD` antes e depois da extração | Resposta **idêntica**, campo a campo |
| 2.2 | API | `?from=X&to=X+6` | Sete itens, um por dia |
| 2.3 | API | Intervalo que inclui um dia bloqueado | Aquele dia vem `fechado` com motivo `blocked` |
| 2.4 | API | Intervalo que inclui feriado/exceção fechada | Motivo `closed` |
| 2.5 | API | Intervalo que inclui dia sem expediente | Motivo `not_working` |
| 2.6 | API | Intervalo de 43 dias | 400 com mensagem, não 500 |
| 2.7 | API | `from` depois de `to` | 400 |
| 2.8 | API | `from=banana` | 400, não 500 |
| 2.9 | API | Sem autenticação | 401 |
| 2.10 | API | Como paciente da clínica B, pedir terapeuta da clínica A | Não responde com a agenda de A |
| 2.11 | API | Dia de hoje, depois do expediente começar | Horários já passados não contam como livres |

## T-3 — Calendário do paciente

| # | tipo | passos | esperado |
|---|---|---|---|
| 3.1 | UI | Abrir "Agendar" | Abre na **semana**, não na tira antiga |
| 3.2 | UI | Arrastar para o lado | Troca de semana, e a marca de cada dia acompanha |
| 3.3 | UI | Trocar para mês | Grade do mês, cada dia com sua marca |
| 3.4 | UI | Trocar para dia | Os horários daquele dia |
| 3.5 | UI | Tocar num dia fechado | Não seleciona, e diz por que está fechado |
| 3.6 | UI | Escolher dia e horário e confirmar | A consulta cai **no dia escolhido** (o defeito do fuso não voltou) |
| 3.7 | UI | Abrir entre 00:00 e 01:00 (BST) | O dia da marcação continua certo |
| 3.8 | UI | Clínica sem agenda configurada | Diz isso, em vez de calendário vazio sem explicação |
| 3.9 | UI | Rede fora ao abrir | Estado de erro, com como tentar de novo |
| 3.10 | UI | Nos dois tons | Marcas e grade legíveis nos dois |

## T-4 — Fila de vídeos

| # | tipo | passos | esperado |
|---|---|---|---|
| 4.1 | UI | Paciente de teste envia vídeo; abrir a fila | O vídeo aparece, com nome, exercício e quando chegou |
| 4.2 | UI | Revisar esse vídeo; recarregar a fila | Ele sai da fila |
| 4.3 | UI | Clicar na linha | Abre o prontuário daquele paciente, **já na aba de exercícios** |
| 4.4 | UI | Fila sem nada | Texto de vazio, não tela branca |
| 4.5 | API | `?pending=1` logado na clínica B, com vídeo só na A | Zero itens |
| 4.6 | API | Sem sessão de staff | 401 |
| 4.7 | UI | Badge do menu | Leva à fila |
| 4.8 | e-mail | Prévia do e-mail diário | O link leva à fila, e **nenhum dado clínico** aparece |

## T-5 — Marca na lista de pacientes

| # | tipo | passos | esperado |
|---|---|---|---|
| 5.1 | UI | Lista de pacientes com um que tem vídeo esperando | Só a linha dele está marcada |
| 5.2 | UI | Revisar o vídeo e recarregar | A marca some |
| 5.3 | API | Lista com 30 pacientes | A contagem é **uma** consulta agregada, não 30 |
| 5.4 | API | Logado na clínica B | Nenhuma marca vinda de vídeo da clínica A |

## T-6 — Link direto para a aba

| # | tipo | passos | esperado |
|---|---|---|---|
| 6.1 | UI | Abrir `/admin/patients/<id>?tab=exercicios` | Abre já na aba de exercícios |
| 6.2 | UI | Abrir sem `?tab=` | Abre em `resumo`, como hoje |
| 6.3 | UI | Abrir com `?tab=naoexiste` | Cai em `resumo`, não em tela vazia |
| 6.4 | UI | Clicar entre abas | A URL acompanha, sem recarregar a página |
| 6.5 | UI | Copiar a URL e abrir em outra janela | Cai na mesma aba |

## T-7 — Vídeo em tenant de estúdio

| # | tipo | passos | esperado |
|---|---|---|---|
| 7.1 | UI | Aluno de estúdio envia vídeo | Existe caminho na interface até ele |
| 7.2 | UI | Abrir a fila logado no estúdio | O vídeo aparece |
| 7.3 | API | Conferir que nenhuma regra de tenant afrouxou | Clínica não vê vídeo de estúdio e vice-versa |

---

## Evidências obrigatórias

- Screenshots em `qa/screenshots/`, nos **dois tons** para tudo o que é tela do app
- `npx jest` — suíte inteira
- `npm run build` — antes de qualquer push
- `cd mobile && npx tsc --noEmit`
- Para a T-2, o **antes e depois** da resposta de um dia, lado a lado
