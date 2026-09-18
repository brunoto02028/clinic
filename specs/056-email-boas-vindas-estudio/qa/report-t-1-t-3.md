# QA — Atividade 56, T-1 a T-3 (e-mail de boas-vindas do estúdio)

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`, já com os dois ajustes do code review:
  - o e-mail do estúdio só sai com `locale` "pt"/"en";
  - o 502 só desfaz a troca de senha se o hash gravado ainda for o dele.
- **Ambiente:** Next dev em :4002 com `RESEND_API_KEY=re_dummy_local_sink OUTBOUND_MODE=sink`. Todo e-mail foi interceptado e registrado como `[OUTBOUND-SINK]` no `dev.log`; **nada saiu de verdade**. Banco local com as fixtures. Os fluxos de UI rodaram em contexto novo de Playwright, com o cache desligado.
- **Executado por:** agente qa-tester, mais a sessão principal (testes unitários do template e o caminho 3.4).

| Tarefa | Veredito |
|---|---|
| T-1 Template EN/PT | **APROVADO** (O-6 cosmética) |
| T-2 "Add Clinic / Studio" envia o e-mail do estúdio | **APROVADO** (O-5 fora do escopo) |
| T-3 "Send welcome e-mail to owner" | **APROVADO COM RESSALVA** (R-1: o login com a senha nova fica para o 4.2 em produção) |

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1.1 | Render EN/PT "Manu Training" | lib+UI | ✅ assunto, remetente "Manu Training via BPR", login, senha, botão `/staff-login`, `/join/manu-training`, 4 passos, "Powered by BPR"; nada de "Bruno Physical Rehabilitation" nem "Welcome to the Team" |
| 1.2 | Nome `Ana "Fit" <b>Studio</b>` | lib | ✅ escapado no HTML; remetente sem aspas nem `<>`; 15/15 testes unitários (`scratchpad/welcome-test.ts`) |
| 1.3 | 800 px e 390 px | UI | ✅ sem rolagem horizontal nas 4 combinações |
| 2.1 | SUPERADMIN cria um Personal Studio com dono em PT pela UI | UI+log+DB | ✅ um único sink "Seu estúdio QA056 UI Studio está pronto"; dono ADMIN com `bookable: true`; login do dono com a senha temporária 200 |
| 2.2 | Tipo Clinic | UI | ✅ sem o campo de idioma |
| 2.3 | THERAPIST em `qa-clinic-a` | API+log | ✅ "Your Therapist Account - Bruno Physical Rehabilitation" (sem mudança) |
| 2.3b | O trainer cria um THERAPIST no próprio estúdio | API+log | ✅ e-mail de equipe, sem mudança (O-5) |
| 2.4a/b | ADMIN no estúdio sem `locale` / com `locale: "fr"` | API+log | ✅ e-mail de equipe "Your Admin Account…" |
| 2.4c | ADMIN no estúdio com `locale: "en"` | API+log | ✅ "Your studio QA056 API Studio is ready" |
| 3.1 | Menu do `qa-studio-pt` → Send welcome e-mail → PT | UI+log+DB | ✅ toast; sink "Seu estúdio QA Studio PT está pronto"; hash trocado; senha antiga 401. ⚠️ login com a senha nova não testado (R-1) |
| 3.1b | O mesmo via API em EN | API+log | ✅ 200 `{"sent":true}`; "Your studio QA Studio PT is ready" |
| 3.2 | trainer / admina / aluno / anônimo | API+DB | ✅ 403 / 403 / 403 / 307→login; hash sem mudança |
| 3.3 | Id de clínica / estúdio sem dono / id inexistente | API | ✅ 400 / 404 / 404, sem troca de senha |
| 3.4 | Falha no envio | API+DB | ✅ (sessão principal, servidor sem chave do Resend) 502 "…password was not changed"; hash sem mudança; log "Studio welcome email not accepted". Feito antes do ajuste `updateMany`, que só estreita a condição da restauração |
| 3.5 | Menu de uma clínica | UI | ✅ sem o item |

## Evidências principais
```
2.1  POST /api/admin/users → 201 {..."role":"ADMIN","locale":"pt"}
     [OUTBOUND-SINK] email → qa056.uiowner@example.test: Seu estúdio QA056 UI Studio está pronto   (1 linha)
     DB: {"role":"ADMIN","bookable":true,"clinic":{"type":"PERSONAL_TRAINER"}} ; login do dono 200
2.4a [OUTBOUND-SINK] email → qa056.nolocale@example.test: Your Admin Account - Bruno Physical Rehabilitation
2.4c [OUTBOUND-SINK] email → qa056.owneren@example.test: Your studio QA056 API Studio is ready
3.1  POST …/welcome-email {"locale":"pt"} → 200 ; toast "Welcome e-mail sent to qa.trainer@example.test"
     [OUTBOUND-SINK] email → qa.trainer@example.test: Seu estúdio QA Studio PT está pronto
     hash $2a$12$vjfQ… → $2a$12$lTJC… ; login com QaTenant#2026 → 401
3.2  trainer/admina/aluno → 403 {"error":"Forbidden"} ; anônimo → 307 /login ; hash inalterado
3.3  qa-clinic-a → 400 ; estúdio sem dono → 404 ; id inexistente → 404
3.4  → 502 {"error":"The e-mail could not be sent; the owner's password was not changed"} ; hash inalterado
```
Screenshots em `qa/screenshots/`:
- T-1: `t-1-welcome-{en,pt}-{800,390}.png`
- T-2: `t-2-add-clinic-sem-idioma.png`, `t-2-add-studio-idioma-pt.png`, `t-2-studio-criado-toast.png`
- T-3: `t-3-menu-clinica.png`, `t-3-menu-estudio.png`, `t-3-dialogo-confirmacao-pt.png`, `t-3-reenvio-toast.png`

## Ressalvas e observações
- **R-1 (T-3):** o login com a senha nova não foi testado localmente, porque o sink guarda só o assunto e a senha vai no corpo do e-mail. A troca está comprovada pelo hash diferente e pelo 401 da senha antiga. O mesmo formato "St-…" funcionou no 2.1. O login com a senha nova fica para o **4.2** em produção.
- **O-3 (fora do escopo):** uma sessão já aberta continua válida depois da troca de senha, que é o comportamento de hoje do NextAuth/JWT. O reenvio não derruba sessões.
- **O-4 (preexistente):** o SUPERADMIN recebe 403 em `/api/admin/notifications` na tela de Clinics.
- **O-5 (fora do escopo, alerta):** a equipe THERAPIST que o personal cria no próprio estúdio ainda recebe o e-mail de equipe com a marca BPR. Candidato a uma atividade de e-mails do estúdio.
- **O-6 (cosmético):** a 390 px o link `/join/manu-training` quebra no meio da palavra, mas continua legível e clicável.

## Limpeza
Apagados os usuários `qa056.*@example.test` e os estúdios `qa056-*`: conferência com 0 restantes. As fixtures rodaram de novo, e `qa.trainer` voltou a entrar com `QaTenant#2026` (login 200).
