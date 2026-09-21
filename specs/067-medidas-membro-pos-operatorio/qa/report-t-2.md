# QA report — T-2 (Aba "Measurements") — atividade 067

**Veredito: APROVADO** (cenários 8–13 e 15). Ambiente e método como em report-t-1.md. Console do navegador sem erro de JS; só os "Failed to load resource" das respostas 400/403 provocadas de propósito. Log do dev server sem erro `[measurements]`.

| # | Cenário | Resultado | Evidência |
|---|---|---|---|
| 8 | Abrir a aba com histórico vazio | APROVADO | `screenshots/t-2-aba-vazia-en.png` |
| 9 | Lançar medida completa | APROVADO | Linha "21/09/2026 / 4 / Left / 42.5 / 45 @10 / -2.5 / 48 / 50.5 @20 / -2.5 / 120° / -3° (Active)"; Δ operada − outra correto; vírgula decimal ("50,5") aceita (`t-2-form-preenchido.png`, `t-2-primeira-medida-en.png`). |
| 10 | 2ª medida e gráficos | APROVADO | 4 gráficos com 2 pontos (deltas +2.5 cm, +2.5 cm, +30°, +5°) — `t-2-graficos-2-pontos-en.png`. |
| 11 | Editar e excluir | APROVADO | Edição pré-preenche e recalcula Δ; data anterior ao início mostra semana "—"; `window.confirm` testado com cancelar (mantém) e aceitar (remove; API confirma) — `t-2-editando.png`, `t-2-apos-exclusao.png`. |
| 12 | Formulário vazio/inválido | APROVADO | Sem lado: validação nativa bloqueia; só o lado: "Enter at least one thigh measurement or knee angle"; flexão 250: "flexionDeg must be between 0 and 180"; nada gravado (`t-2-form-vazio-bloqueado.png`, `t-2-erro-sem-valores.png`, `t-2-erro-flexao-250(-pt).png`). |
| 13 | Personal / paciente | APROVADO | Ficha do aluno no estúdio sem aba Measurements e sem aba Protocol (`t-2-personal-sem-aba.png`). Sessão de paciente: `/admin/patients/<id>` redireciona a `/dashboard`, sem menção a medidas; GET/POST/PATCH/DELETE da API dão 403 (`t-2-paciente-dashboard.png`). |
| 15 | EN/PT | APROVADO | Troca ao vivo por `localStorage clinic-locale` + evento; "Medidas do pós-operatório", "Nova medida", "Perna operada", "Histórico", "(Ativa)/(Passiva)" (`t-2-aba-pt.png`). |

## Achados cosméticos e tratamento
- Mensagens de erro da API aparecem em inglês na UI em PT; rótulo da aba "Measurements" e cabeçalhos "VMO L / R"/"Flex / Ext" não traduzem (a página inteira usa abas em inglês) — **mantido**.
- "—°" quando falta valor; notas só visíveis ao editar — **corrigido** (mostra "—"; notas aparecem na linha da tabela). *Não reexecutado no navegador.*
- Mensagem "Escolha a perna operada" inalcançável (o `required` nativo barra antes) — inofensivo.
- Decimais com ponto em PT — mantido.

## Reteste das correções (mesmo setup, banco local) — APROVADO
- Flexão preenchida e extensão vazia mostra `120° / —` (sem "—°"), em EN e PT; o atalho da aba Protocol usa o mesmo formato (`… · 120° / —`).
- Notas aparecem sob Flex/Ext na linha do histórico; nota longa (~130 caracteres) quebra sem estourar a tabela.
- Editar pela UI: esvaziar a única flexão mostra a mensagem do servidor e a lista não muda; editar flexão e nota salva e reflete ("Medida salva."). Screenshots: `screenshots/retest-historico-en.png`, `retest-atalho-en.png`, `retest-historico-pt-nota-longa.png`.

## Reteste 2 (após code review) — APROVADO
- "38cm" → "Use numbers only (e.g. 38.5)." / "Use apenas números (ex.: 38,5)." e nada gravado; "38,5" salva; edição normal e edição com "abc" (linha intacta) OK. Screenshot: `screenshots/retest2-numeros-en.png`.
- Cosmético achado no reteste: Δ de −1,75 aparecia como −1,7 (`Math.round` em metades negativas) → **corrigido** com arredondamento simétrico em `thighGap`.
