# QA — Atividade 9

Tudo executado em **produção** (`bpr.clinic`) com paciente de teste
descartável, criado no início e removido ao final — mesmo procedimento das
atividades 7 e 8. Evidência em `qa/screenshots/`.

Onde diz "paciente de teste", usar um endereço `admin+qaN@bpr.clinic`, que
entrega na caixa do Bruno e não vaza dado clínico para terceiro.

---

## T-1 — Profissional agendável

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 1.1 | UI | Paciente abre a tela de agendar consulta | Só o Bruno na lista; Kaio ausente |
| 1.2 | API | `GET /api/therapists` autenticado | Só profissionais marcados; resposta sem `email` |
| 1.3 | API | `GET /api/therapists` sem sessão | 401 |
| 1.4 | UI | Criar staff novo e abrir a agenda sem marcá-lo | Não aparece |
| 1.5 | UI | Marcar esse staff como agendável | Passa a aparecer |
| 1.6 | API | Agendamentos existentes antes da mudança | Continuam íntegros, com o profissional correto |

## T-2 — Estado real da triagem

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 2.1 | UI | Ficha de paciente sem triagem | "Não preenchida" |
| 2.2 | UI | Registro com `isSubmitted: false` | "Em preenchimento" — nunca "Completed" |
| 2.3 | UI | Paciente responde a triagem no portal | Ficha mostra "Respondida pelo paciente" |
| 2.4 | UI | Bruno preenche a triagem pelo admin | Ficha mostra "Preenchida pela clínica" |
| 2.5 | UI | Comparar ficha e tela de Permissões do mesmo paciente | Estados concordam |
| 2.6 | UI | Ligar Acesso Total num paciente sem triagem | Triagem continua "Não preenchida" |
| 2.7 | API | Os 3 registros de produção | Íntegros, agora rotulados |

## T-3 — Origem do registro de triagem

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 3.1 | API | Paciente sem triagem registra nota de dor | Nenhum `MedicalScreening` é criado |
| 3.2 | UI | A nota de dor registrada | Continua visível onde já aparecia |
| 3.3 | UI | Ficha do paciente depois disso | Segue "Não preenchida" |
| 3.4 | API | Paciente **com** triagem registra dor | Registro existente é atualizado, não duplicado |

## T-4 — Fonte única de acesso

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 4.1 | UI | Liberar um módulo no admin, abrir o portal | Módulo aparece |
| 4.2 | UI | Esconder um módulo no admin, abrir o portal | Módulo some |
| 4.3 | UI | Acesso Total ligado | Tudo liberado nas duas telas |
| 4.4 | API | Paciente sem plano nenhum | Só os sempre-visíveis |
| 4.5 | API | Paciente com plano ativo | Módulos do plano, mais os sempre-visíveis |
| 4.6 | API | Comparar acesso de cada paciente real antes e depois | Idêntico, salvo diferenças listadas no relatório |
| 4.7 | UI | Tela de permissões | Mostra a origem de cada liberação |

---

## Encerramento

- [ ] Contas de teste removidas, com contagem confirmando zero
- [ ] Nenhum paciente real teve acesso alterado sem estar no relatório
- [ ] Produção saudável e no build esperado
