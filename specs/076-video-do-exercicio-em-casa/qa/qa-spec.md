# QA — atividade 076

Cenários por tarefa. Em produção, **paciente de teste identificado**; nunca um paciente real.

## T-1 — modelo e armazenamento

| tipo | cenário | esperado |
|---|---|---|
| API | gravar envio válido | registro criado, objeto no R2 sob `exercise-submissions/<patientId>/` |
| API | falha no banco depois do upload | objeto removido do R2, sem órfão |
| API | tipo não suportado (ex.: `.exe` renomeado) | recusado pelo tipo real, não pela extensão |
| API | `prisma migrate diff` contra o `main` | **zero DROP** |
| API | resposta de qualquer rota | nenhuma contém URL pública do R2 |

## T-2 — API

| tipo | cenário | esperado |
|---|---|---|
| API | paciente envia para o próprio exercício | 200, envio listado para ele |
| API | paciente A pede envio de B | 404 ou 403 — nunca o conteúdo |
| API | paciente A apaga envio de B | recusado |
| API | apagar já revisado | recusado com motivo |
| API | conta THERAPIST na rota de paciente | 403 `patient_only` |
| API | impersonação tentando enviar | 403 somente leitura |
| API | vídeo acima do teto | 400 com motivo, **sem 500** |
| API | corpo malformado (sem multipart) | 400, **sem 500** |
| API | terapeuta da clínica X pede fila da Y | vazio ou 403 |
| API | arquivo sem sessão | recusado |
| API | muitos envios seguidos | limitado, com mensagem |

## T-3 — app (aparelho)

| tipo | cenário | esperado |
|---|---|---|
| UI | abrir o envio | a duração máxima aparece **antes** da câmera |
| UI | gravar passando de 1 min | o gravador para sozinho em 60s |
| UI | escolher da galeria vídeo de 3 min | recusado com explicação, não cortado |
| UI | enviar | progresso visível do começo ao fim |
| UI | enviar sem rede | erro explicado, opção de tentar de novo, vídeo preservado |
| UI | permissão de câmera negada antes | botão "Abrir Ajustes" |
| UI | retorno do terapeuta | aparece junto do envio |
| UI | apagar o próprio envio antes de revisado | some da lista |

## T-4 — anexo na conversa

| tipo | cenário | esperado |
|---|---|---|
| UI | anexar foto | sobe e aparece na conversa |
| UI | anexar PDF | sobe e aparece com o nome |
| UI | tentar anexar vídeo | recusado, indicando a tela do exercício |
| UI | arquivo acima de 25 MB | barrado **antes** do upload |
| UI | mensagem só com anexo | aceita |
| UI | anexo da clínica | abre no app |
| API | o anexo aparece em "Meus documentos" | sim, com origem CHAT_UPLOAD |

## T-5 — fila de revisão

| tipo | cenário | esperado |
|---|---|---|
| UI | envio novo | badge do menu aumenta |
| UI | "Waiting for you" | mostra paciente, exercício, horário |
| UI | tocar o vídeo | toca sem sair da tela |
| UI | enviar correção | **exige prévia antes de sair** |
| UI | depois de revisado | some da fila e do badge |
| API | terapeuta de outra clínica | não vê o envio |

## T-6 — resumo

| tipo | cenário | esperado |
|---|---|---|
| API | nada pendente | **nenhum e-mail** |
| API | com pendências | um e-mail, contagens e links |
| API | conteúdo do e-mail | nenhum dado clínico |
| API | rodar duas vezes no mesmo dia | um e-mail só |
| API | duas clínicas | cada uma só o que é dela |
| API | item já revisado | não aparece no resumo seguinte |
| API | provedor de e-mail fora do ar | cron não quebra, registra a falha |

## Fora de alcance sem aparelho
Gravação, limite de duração no gravador e permissão de câmera exigem iPhone — QA de código não
cobre. Marcar como pendente de teste no aparelho, não como aprovado.
