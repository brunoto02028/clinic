# QA online (produção) — atividade 067 — commit b0859f30

**Veredito: APROVADO** (14 de 15 cenários; cenário 13 parcial; nenhum bug). Executado em https://bpr.clinic após o deploy (container novo) pelo agente qa-tester; relatório consolidado pela sessão principal.

**Ambiente/método:** tabela `patient_limb_measurements` existia em produção (criada pelo `prisma db push`) e estava vazia. Banco acessado via `pg` (URL do Coolify só em memória). Sessões por cookie fabricado (`__Secure-next-auth.session-token`); chamadas de API e UI dentro de Chromium real (Cloudflare bloqueia fetch cru), context novo, cache desabilitado. Fixtures na clínica BPR, todas `qa067-online-*@example.invalid`, criadas direto no banco (sem convite/e-mail): 1 ADMIN, paciente A (protocolo `SENT_TO_PATIENT` com `startDate` há 21 dias + protocolo B `DRAFT` mais novo com início futuro), paciente B sem protocolo.

| # | Cenário | Resultado |
|---|---|---|
| 1 | POST válido → 201, LEFT, semana 4, `protocolId` = protocolo enviado (não o rascunho); paciente sem protocolo → null/null; medida anterior ao início → semana null com protocolo vinculado | APROVADO |
| 2 | 400 sem valor numérico (só lado; lado+notas+distância) | APROVADO |
| 3 | 400: flexão 250, circunferência 500, data futura, lado `BOTH`, `"0x10"`, `"38cm"`, corpo não-JSON; nada gravado | APROVADO |
| 4 | Sem cookie → redirect `/login` (GET e POST); sessão de paciente → 403 em GET/POST/PATCH/DELETE | APROVADO |
| 5 | PATCH: só `notes` mantém protocolo/semana; mesmo dia mantém; outro dia recalcula (semana 2 e volta a 4); flexão 300 e "esvaziar tudo" → 400; id inexistente → 404 | APROVADO |
| 6 | Isolamento de tenant: staff de estúdio personal (só sessão, sem escrita) → 404 em GET/POST/PATCH/DELETE no paciente da BPR | APROVADO |
| 7 | Registro cruzado A↔B → 404 em PATCH/DELETE; DELETE próprio 200, repetido 404 | APROVADO |
| 8 | Aba Measurements vazia | APROVADO |
| 9 | Medida completa (vírgula decimal aceita); linha com semana 4, Δ −2.5/−2.5, "120° / -3° (Active)" | APROVADO |
| 10 | 2ª medida na semana 3; 4 gráficos com deltas (+2.5 cm, +1.5 cm, +20°, +5°) | APROVADO |
| 11 | Editar (125°) e excluir com `window.confirm` (cancelar mantém; aceitar remove) | APROVADO |
| 12 | Formulário sem lado bloqueado; flexão 250 → mensagem do servidor; "38cm" → "Use numbers only (e.g. 38.5)."; nada gravado | APROVADO |
| 13 | Área do paciente sem aba/links de medidas; `/admin/patients/<id>` como paciente → `/dashboard`. Login de personal **não executado** (exigiria fixture/dado real no tenant do estúdio; aba tem `!isPersonal` e o QA local cobriu) | PARCIAL |
| 14 | Atalho na aba Protocol ("Latest … Wk 4 … 125° / -3°"; PT "Última … Sem 4"); clique abre a aba | APROVADO |
| 15 | EN/PT via `clinic-locale` (rótulos, "(Ativa)", "Use apenas números (ex.: 38,5).") | APROVADO |

**Regressão:** ficha do paciente fixture carrega (HTTP 200) com Summary, Documents e Protocol sem erro; sessão de SUPERADMIN real (identidade apenas, leitura) também vê a aba e as medidas. **Console:** sem erros de JS além dos 400/403 provocados.

**Cosméticos (não bloqueiam):** "Measurement saved." não retraduz ao trocar EN→PT na hora (mesma classe das mensagens de servidor em inglês já anotadas); o desafio "Just a moment" do Cloudflare no redirect para `/login` é do Cloudflare.

**Limpeza:** 3 usuários, 2 protocolos e todas as medidas de teste apagados; SELECT final: 0 usuários `qa067-online-%`, 0 protocolos `QA067 Online%`, `patient_limb_measurements` com 0 linhas; varredura de 1684 colunas texto sem referência aos ids fixture. Nenhum usuário/paciente real alterado; nenhum e-mail, SMS ou notificação enviado.

**Screenshots:** `qa/screenshots/online-*.png` (23 arquivos: aba vazia, formulário, erros, medidas, gráficos, edição/exclusão, PT, atalho no protocolo, regressão, superadmin, área do paciente).
