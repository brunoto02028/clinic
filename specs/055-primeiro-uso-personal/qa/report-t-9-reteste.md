# QA — Atividade 55: reteste da T-9, do F-1 e das ressalvas do aluno

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`, com hot reload
- **Ambiente:** Next dev em :4002, com fixtures. Um contexto novo de Playwright por rodada, cache desligado. Idioma trocado via `localStorage["clinic-locale"]` (`en-GB` / `pt-BR`).
- **Scripts:** `scratchpad/qa055-r/retest.cjs` (crawl de 22 rotas do trainer e 16 do aluno, EN e PT), `extra.cjs`, `comm.cjs`

## Rodada 2 (agente qa-tester)

| Item | Veredito |
|---|---|
| **F-1** paywall falso em "Sessions" | **APROVADO** |
| R-1, R-2, R-5, R-6 (ressalvas do lado do aluno) | **APROVADOS** |
| **T-9** vocabulário | **REPROVADO**: V-1 a V-3 em EN e PT; V-4 sistêmico em PT; V-5 baixa |

### F-1 ✅
```
qa.aluno     GET /api/patient/status → {"CONSULTATION":true,…}   (overrides {} e null)
qa.pacientea GET /api/patient/status → {"CONSULTATION":false,…}  (clínica não mudou)
PATCH …/permissions overrides {"mod_appointments":false} → aluno CONSULTATION:false
… {"mod_appointments":"hidden"} → false ; … true → true ; … {} → true
```
- **UI liberada:** lista as sessões, mostra "Book Appointment" e o calendário em `/book`, sem erros (`t-9r-f1-aluno-sessions.png`, `t-9r-f1-aluno-book.png`).
- **UI travada:** aparece "Your trainer hasn't opened this area for you yet…", sem botão de planos (`t-9r-f1-aluno-sessions-travado.png`).

### Ressalvas do aluno ✅
- **R-1:** módulo travado. EN mostra "Your trainer hasn't opened this area for you yet. Just ask them if you need it." e PT mostra "Esta área ainda não foi liberada pelo seu personal…", sem botão de planos. A clínica continua com "View Membership Plans · From £0.90/month".
- **R-2:** para o aluno, `/dashboard/recordings` e `/dashboard/guide` redirecionam para `/dashboard`, e `GET /api/patient/consultation-recording` dá 404. Na clínica a API dá 200 e `/dashboard/guide` dá 200.
- **R-5:** "QA Studio PT", "My Workouts · QA Studio PT", "Nutrition · …", "Payments · …", "Challenges · …". A clínica mantém o título da BPR.
- **R-6:** verificado só no código. O estúdio vê "Profile and consent all done."
- **Confirmação de reserva:** não executada, para não criar dados. Verificada no código: o estúdio vê "Your session is already confirmed."

### T-9: o que ainda vazava
Todas as 76 visitas (38 rotas × 2 idiomas) deram 200, sem pageerror nem resposta ≥400, e 0 erros de gênero ("da/pela sua estúdio").

**Checagens pontuais em EN:** todas ok.
- Menu do aluno com Journey, sem Learn e com Community.
- Percentil com "students".
- Badges "Dedicated Student" e "Ambassador"; missão "…Workout Plan".
- "Arena".
- "Your trainer will assign…".
- "Studio Messages" / "Write a message to the studio…".
- "…your studio".
- "student engagement".
- "Select student...".
- Banner com "…o que o aluno vê".

**Vazamentos:**
| ID | Idioma | Onde | Texto | Correção (rodada 3) |
|---|---|---|---|---|
| V-1 | EN+PT | `/dashboard/appointments` (aluno) | banner clínico "Start with an Initial Assessment… treatment… therapist", que ficou visível depois do F-1 | `appointments-list.tsx`: o banner não aparece para estúdio |
| V-2 | EN+PT | `/admin/journey` | cabeçalho de tabela "Patient" (3 tabelas) | `relabel` |
| V-3 | EN+PT | diálogo de vídeo | rótulo "Patient *" | `relabel` |
| V-4 | PT | 12 rotas do trainer, badges da jornada, botão da ficha | "Add Patient", "View as Patient", "Therapists", "Dedicated Patient", "BPR Ambassador"… | **Causa:** `personalizeLabel` só aplicava as regras PT no idioma PT, e texto que só existe em inglês passava intacto. Agora as regras EN rodam também em PT |
| V-5 | PT (baixa) | aluno: `/appointments`, `/book`, `/profile` | "Agendar Consulta", "Lembretes de consulta" | `relabel`, que vira "Agendar Sessão" |

**Achados esperados:**
- "QA Studio PT · Powered by BPR";
- o aviso do termo de treino;
- "Consultation" como `treatmentType` gravado numa sessão de teste (é dado, não texto de tela).

**Regressão da clínica ✅:**
- menu "Clínico", só com o acento corrigido;
- "View as Patient";
- "…o que o paciente vê";
- "BPR Journey" / "Jornada BPR" e "BPR Arena";
- "Clinic Messages" / "Mensagens da Clínica".

**Fora do escopo, cosmético:** "Notificacoes" sem acento no menu PT, nos dois tipos de tenant.

### Dados alterados e restaurados
- **`qa.aluno.moduleOverrides`:** voltou a `null` (confirmado no banco); `fullAccessOverride: false`.
- **Impersonação:** encerrada.
- **Reservas:** nenhuma criada.

## Rodada 3 (correções de V-1 a V-5)
Testes unitários do vocabulário: 25 de 25 ok (`scratchpad/vocab-test.ts`), incluindo "Add Patient" → "Add Student" em PT e a clínica inalterada. O resultado do crawl vem na seção abaixo.

### Resultado do crawl, rodada 3 (mesmo `retest.cjs`, 38 rotas × EN/PT)
| Crawl | Ocorrências na rodada 2 | Rodada 3 | O que sobrou |
|---|---|---|---|
| trainer PT | 23 | 1 | "QA Studio PT · Powered by BPR" (esperado) |
| aluno PT | 10 | 1 | aviso do termo de treino, "não tratamento médico…" (intencional) |
| trainer EN | 5 | 1 | "Powered by BPR" (esperado) |
| aluno EN | 3 | 1 | aviso do termo de treino (intencional) |

O único vazamento real que sobrou ("Podes continuar e agendar outra consulta…", em `/dashboard/appointments/book` no PT) foi corrigido com `relabel`. O novo crawl do aluno em PT ficou só com o aviso do termo. Nas 76 visitas: 0 respostas ≥400 e 0 pageerror.

**Veredito final: T-9 APROVADO. F-1 APROVADO. R-1, R-2, R-5 e R-6 APROVADOS.**
