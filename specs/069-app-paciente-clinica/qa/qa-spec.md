# QA — Atividade 069: App do paciente da clínica

Tipos: **API** (curl contra `/api/mobile/**` e `/api/patient/**`) e **UI** (app no Expo Go / emulador, via Playwright MCP quando aplicável ao web equivalente).

Todo cenário roda **local e, após deploy, em produção**.

## Perfis de teste
| Perfil | Descrição |
|---|---|
| P1 | Paciente de clínica **sem** `ClinicModuleAccess` configurada |
| P2 | Paciente de clínica **com** acesso configurado |
| P3 | Admin de clínica |
| P4 | Aluno de tenant PERSONAL |

---

## Fase 1 — separação (T-2, T-3)

### C1 — API · T-2 · paciente sem acesso configurado
**Passos:** `GET /api/mobile/modules` com o Bearer de P1.
**Esperado:** 200 com **apenas** `clinica`. Sem `ba`, sem `lab`, sem treino/avaliações/nutrição.

### C2 — API · T-2 · paciente com acesso configurado
**Passos:** mesmo GET com P2.
**Esperado:** 200 respeitando a `ClinicModuleAccess` da clínica; BA/Lab só se explicitamente habilitados.

### C3 — API · T-2 · admin continua vendo tudo
**Passos:** mesmo GET com P3.
**Esperado:** 200 com lab + clinica + ba (e treino/avaliações/nutrição se TRAINING ligado).

### C4 — API · T-2 · tenant personal não recebe rota inexistente
**Passos:** mesmo GET com P4 (aluno de tenant PERSONAL).
**Esperado:** o retorno **não** manda o app para `treino`/`avaliacoes`/`nutricao`, que foram removidos. Em nenhuma hipótese lab/clinica/ba.

### C4b — UI · T-2 · aluno de estúdio não vê tela quebrada
**Passos:** login no app como P4.
**Esperado:** aviso explícito de que o estúdio terá app próprio. Sem tela branca, sem crash, sem rota inexistente. Este é o cenário que protege o aluno do Manu Training, que já está em produção.

### C5 — API · T-2 · override manual ainda funciona
**Passos:** setar `moduleOverrides.mod_ba = true` para P1 e repetir o GET.
**Esperado:** 200 incluindo `ba` — o override continua soberano.

### C5b — API+UI · T-2 · o Lab liga por dado, sem release
**Passos:** com P1 recebendo só `clinica`, habilitar `DIAGNOSTICS` em `ClinicModuleAccess` da clínica. Repetir o GET e reabrir o app **sem novo build**.
**Esperado:** o Lab passa a aparecer para o paciente e a área abre. Este é o cenário que garante que a liberação futura do Lab seja um interruptor, não uma nova versão na loja.
**Depois:** desabilitar de novo e confirmar que o Lab some.

### C6 — API · T-2 · sem token e token inválido
**Passos:** GET sem header `Authorization`; depois com Bearer inválido.
**Esperado:** 401 nos dois casos, sem vazar lista de módulos.

### C7 — UI · T-2 · paciente cai direto na clínica
**Passos:** login no app como P1.
**Esperado:** vai direto para a área clínica, **sem** passar pelo seletor de módulo.

### C8 — UI · T-2 · deep link para BA/Lab bloqueado
**Passos:** logado como P1, abrir `/(app)/(ba)/(tabs)` e `/(app)/(lab)/(tabs)` por deep link.
**Esperado:** não abre a área; volta para a clínica ou para o seletor. Nenhum dado de BA/Lab renderizado.

### C9 — UI · T-2 · seletor ainda aparece para quem tem 2+ módulos
**Passos:** login como P3.
**Esperado:** seletor de módulo listando todos.

### C10 — UI · T-3 · identidade
**Passos:** abrir o app e conferir nome, ícone e splash.
**Esperado:** conforme a decisão registrada no plan.md. Deep link pelo `scheme` continua abrindo o app.

---

## Fases 2 e 3 — porte (T-4 a T-9)

Para **cada** tela portada, os cinco cenários abaixo.

### CP1 — UI · paridade de dados
**Passos:** abrir a tela no app e a página equivalente na web, logado como o mesmo paciente de teste.
**Esperado:** mesma informação nos dois. Divergência de layout é aceitável; de dado, não.

### CP2 — UI · estado vazio
**Passos:** abrir a tela com um paciente que não tem esse dado.
**Esperado:** estado vazio explícito. Sem tela em branco, sem spinner infinito, sem crash.

### CP3 — UI · erro de rede
**Passos:** abrir a tela com o backend inacessível.
**Esperado:** mensagem de erro e caminho de recuperação. Sem tela branca.

### CP4 — API · isolamento
**Passos:** chamar o endpoint da tela com o Bearer de um paciente e o id de outro paciente/tenant.
**Esperado:** 403 ou 404 — nunca 200 com dado alheio.

### CP5 — UI · PT e EN
**Passos:** abrir a tela nos dois idiomas, onde a web é bilíngue.
**Esperado:** conteúdo traduzido nos dois, sem chave crua nem texto em inglês no PT.

---

## Limpeza
Ao final de cada tarefa de QA, remover pacientes, respostas, registros e uploads criados nos testes. O report lista o que foi criado e a confirmação da remoção.
