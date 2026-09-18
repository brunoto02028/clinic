# QA — T-4: Janela de atribuição reaproveitável + botão na aba Protocol

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 725c840

## Produção (contexto novo do navegador, cache desabilitado)
| Cenário | Obtido |
|---|---|
| Ficha do paciente PT → aba Protocol → "Assign template" | janela "Assign a template to QA45pt Ativ45", seletor com os 4 templates da BPR; padrão **Português** (idioma do paciente) e **Weeks 1–2**; prévia "3 of 5 item(s) visible at first" (Achilles) — `prod-t4-01-ficha-janela.png` |
| Assign & Notify | protocolo "Tendinopatia do Aquiles (Porção Média)", pt-BR, 3/5 visíveis (semanas 3 e 8 escondidas); a aba recarregou e mostra o protocolo sem recarregar a página — `prod-t4-02-ficha-atribuido.png` |
| Repetir com o mesmo template | aviso "QA45pt already has this protocol: Tendinopatia do Aquiles (Porção Média) — Sent, created 16/09/2026" com "Archive the old one and assign" e "Assign anyway (keep both)" — `prod-t4-03-ficha-conflito.png` |
| Página de templates, 390px → ACL → Assign → busca "qa.ativ45.en" | padrão **English** (idioma do paciente), prévia "8 of 58 item(s) visible at first"; aviso de conflito; sem rolagem horizontal (−6px) — `prod-t4-04-templates-390-conflito.png` |
| "Archive the old one and assign" | toast "Protocol assigned to QA45en — The patient has been notified. Previous copy archived.", janela fechada — `prod-t4-05-templates-390-arquivado.png` |
| Console | sem erros além do 409 esperado (o navegador registra a resposta de conflito) |

## Local
- Ficha: estado vazio com "Assign template"; depois de atribuir, botão no topo — `local-t4-01…07`.
- "Assign anyway (keep both)" pela página de templates em 390px → toast de sucesso, dois ativos — `local-t4-08/09`.
- Fechar a janela na página de templates não troca mais o conteúdo durante a animação (achado 6 da revisão), conferido em contexto novo.
- Prévia: Week 1 / Weeks 1–2 / Everything → 8 / 8 / 58 itens no ACL.

## Observação
O banner de cookies do site cobre a parte de baixo da janela num navegador que ainda não respondeu
ao consentimento — comportamento do banner, não da janela (some depois de aceitar ou recusar).
