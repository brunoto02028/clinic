# QA — Atividade 109

Regras da casa: paciente de teste, nunca real; confirmar qual checkout serve a
porta; afirmar o status exato; nenhum token no relatório.

**Esta atividade mexe na agenda de produção.** O QA online roda com a clínica de
teste, nunca com a BPR — um intervalo configurado por engano na clínica real
apaga horários que alguém pode estar prestes a marcar.

## T-1 — O intervalo entre um e outro

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | intervalo 0 | a agenda é idêntica à de antes da atividade |
| 1.2 | API | intervalo 15, consulta de 60 às 10:00, grade de 60 | **somem** as 09:00 e as 11:00 |
| 1.3 | API | o mesmo, grade de 30 | some 09:30 e 11:00; ficam 09:00 e 11:30 |
| 1.4 | API | último horário do dia | **não** some por causa do intervalo |
| 1.5 | API | pedir 90 minutos numa grade de 60 | só oferece onde couberem 90 |
| 1.6 | API | pedir 120 numa janela que fecha às 13:00 | as 12:00 **não** aparecem |
| 1.7 | UI | marcar pelo painel num horário que o intervalo fechou | recusa com `slot_unavailable` |
| 1.8 | UI | o mesmo com `forceTime` | aceita, e fica registrado |
| 1.9 | UI | o app do paciente | vê a mesma lista que o painel |

O 1.2 é o que importa medir com olhos: é a consequência que custa densidade de
agenda, e é onde a clínica vai reclamar se ninguém a avisou.

## T-3 — O domicílio ocupa a ida e a volta

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | escolher "domicílio" no diálogo | o campo de deslocamento aparece |
| 3.2 | UI | paciente com postcode | a sugestão chega e preenche o campo vazio |
| 3.3 | UI | número escrito à mão, depois trocar de paciente | **não** é sobrescrito pela estimativa |
| 3.4 | API | marcar visita de 60 min às 13:00 com 120 de viagem | 11:00–16:00 somem da agenda |
| 3.5 | API | a mesma consulta sem viagem | só as 13:00 somem |
| 3.6 | UI | trocar para "na clínica" depois de pôr viagem | nada é bloqueado em volta |
| 3.7 | API | paciente sem postcode | `minutes: null`, motivo `patient_postcode_missing`, e **dá para marcar** |
| 3.8 | API | `postcodes.io` fora do ar | `lookup_failed`, e **dá para marcar** |
| 3.9 | API | pedir estimativa de paciente de outra clínica | **404** |
| 3.10 | API | terapeuta pedindo estimativa | permitido (é leitura) |
| 3.11 | API | sem sessão | 401 |

O 3.7 e o 3.8 são os que provam o desenho: **uma estimativa que falha não pode
impedir ninguém de marcar.**

## O caso real, para conferir por último

A viagem que originou a tarefa: clínica em `IP1`, paciente em `KT20 5BF`.
A sugestão tem de dar **120 minutos** — é o número que o Bruno mede dirigindo, e
foi contra ele que os parâmetros foram calibrados.

Se der outra coisa, **não conserte o número**: relate. Ou o `postcodes.io`
mudou, ou a calibração está errada, e as duas merecem ser ditas em voz alta.
