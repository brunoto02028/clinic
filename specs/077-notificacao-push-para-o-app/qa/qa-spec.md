# QA - atividade 077

Em producao, **paciente de teste identificado**; nunca um paciente real. Push nao tem desfazer:
nenhum cenario manda notificacao para aparelho que nao seja o do teste.

## T-1 / T-2 - registro do aparelho

| tipo | cenario | esperado |
|---|---|---|
| UI | primeiro login depois do build | permissao pedida **depois** do login, nao antes |
| UI | permissao negada | nenhuma insistencia; caminho para os Ajustes |
| API | registrar com bearer de paciente | 200, token no banco ligado a ele |
| API | registrar sem credencial | recusado |
| API | token malformado | 400, **sem 500** |
| API | paciente A registrando em nome de B | recusado |
| API | `OPTIONS` | anuncia `POST` e `DELETE` |
| UI | logout | token daquele aparelho desativado |
| UI | simulador (sem push) | app nao quebra |

## T-3 - envio

| tipo | cenario | esperado |
|---|---|---|
| API | 250 destinatarios | 3 chamadas ao servico, nao 250 |
| API | token morto (`DeviceNotRegistered`) | desativado, nao tentado de novo |
| API | servico fora do ar | falha registrada, rota nao quebra |
| API | `OUTBOUND_MODE=sink` | nada sai |
| API | corpo da notificacao | nenhum dado clinico |

## T-4 - aviso geral pelo painel

| tipo | cenario | esperado |
|---|---|---|
| UI | enviar sem passar pela previa | impossivel |
| UI | previa | texto exato + "N aparelhos de M pacientes" |
| UI | nenhum aparelho registrado | diz isso, nao finge que enviou |
| API | terapeuta da clinica X mirando paciente da Y | recusado |
| API | `?clinicId=` de outra clinica | ignorado |
| UI | depois de enviar | registro com enviados e falhos |

## T-5 - aviso individual

| tipo | cenario | esperado |
|---|---|---|
| API | clinica manda mensagem | push so para aquele paciente |
| API | terapeuta responde ao video | push so para o dono do video |
| API | consulta remarcada pela clinica | push para o paciente da consulta |
| API | documento compartilhado | push para o destinatario |
| API | cron de lembrete de exercicio | **nenhum push** |
| API | cron de adesao / pressao | **nenhum push** |
| API | paciente sem aparelho | acao conclui normalmente |
| API | texto de cada notificacao | nenhum dado clinico |

## T-6 - deep link

| tipo | cenario | esperado |
|---|---|---|
| UI | app fechado, abre pela notificacao | tela certa |
| UI | app em segundo plano | tela certa |
| UI | rota desconhecida | home, sem travar |

## T-7 - desligar

| tipo | cenario | esperado |
|---|---|---|
| UI | desligar no perfil | para de receber na hora |
| UI | reabrir o app | estado preservado |
| UI | permissao negada no sistema | tela explica, oferece Ajustes |
| API | envio geral | quem desligou nao entra na contagem nem no envio |

## Fora de alcance sem aparelho
Permissao, recebimento, toque na notificacao e deep link exigem iPhone com o build instalado.
Marcar como pendente de teste no aparelho, **nao** como aprovado.
