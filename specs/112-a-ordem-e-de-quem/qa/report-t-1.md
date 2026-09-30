# QA — 112 T-1: Os grupos chegam ao app

**Data:** 30/09/2026 · **Commit medido:** `fe1b905b2` (árvore limpa)
**Veredito:** ✅ **aprovado** — 11 cenários, 11 passaram. Duas ressalvas de leitura, nenhuma bloqueia.
**Ambiente:** local. Web `:4112` (`NEXT_DIST_DIR=.next-qa112t1`, `OUTBOUND_MODE=sink`), app do
paciente **rodando de verdade** em Expo web `:8112`. Produção não tocada; a porta de cada processo
foi confirmada pelo *command line* antes de medir.
**Paciente:** `qa-t6-patient@example.com` (clínica `qa-report-t6`), que já existia. Nenhum paciente
novo, nenhum paciente real.
**Evidências:** 9 capturas em `qa/screenshots/`, prefixo `t1-`.

## Resumo

| # | Cenário | Res. |
|---|---|---|
| 1 | Os quatro cabeçalhos, EN e PT | ✅ |
| 2 | Nenhuma das vinte linhas sumiu (antes × depois) | ✅ |
| 3 | Ordem alfabética **na língua exibida** | ✅ |
| 4 | Pressão e check-in em *Seu dia a dia* | ✅ |
| 5 | Grupo sem linha não aparece | ✅ |
| 6 | Módulo desligado: a linha some, sem cabeçalho órfão | ✅ |
| 7 | **Resposta sem `grupos`** → lista única, sem perder linha | ✅ |
| 8 | O menu do laboratório intacto | ✅ |
| 9–10 | Permissões em português, com `App areas` | ✅ |
| 1.3 | Suítes verdes (200 suítes, 2954 testes) | ✅ |

## O que foi medido, e não suposto

**As vinte linhas.** Contadas nos dois lados e cruzadas com a origem: o arquivo do menu declara 20,
a tela mostra 20. `declaradas e não vistas: []`, `vistas e não declaradas: []`. Nenhuma duplicada —
as abas (`mod_appointments`, `mod_exercises`) **não** viraram linha de menu, que era o risco que o
teste tinha apanhado antes de a tela existir.

**A ordem muda entre as línguas**, e é isso que prova que ela segue o texto exibido: *Medidas de
evolução* é *Outcome measures* em inglês e cai no meio do bloco; em português sobe para o segundo
lugar.

**A pressão e o check-in chegam ao mesmo grupo por caminhos diferentes** — a pressão declara
`grupo: "wellness"` no arquivo (não tem módulo), o check-in herda do servidor, onde `mod_journey`
foi recolocado. Os dois em *Seu dia a dia*.

**O caso que mais interessava — a resposta sem `grupos`.** Simulado interceptando o `fetch` do app
e apagando **só** aquele campo do corpo real. Resultado: **20 linhas, 0 cabeçalhos**, a lista única
em ordem alfabética. Nada se perdeu. O QA ainda fez uma variante que eu não tinha pedido — **um
servidor que conhece só parte dos grupos** — e as 8 linhas órfãs caíram no bloco final sem
cabeçalho, visíveis. É exatamente o desenho.

**Dois cabeçalhos órfãos possíveis, os dois ausentes:** o laboratório (4 linhas, 0 cabeçalhos) e um
grupo esvaziado por permissão (*Aprender* desaparece inteiro, e a palavra não existe no texto da
tela).

**A tela de permissões em português** deixou de dizer `CLINICAL`: sai *Base (Sempre Visível) ·
Clínico · Bem-Estar · Conteúdo & Educação · Áreas do app*.

## Erros de console

App: **nenhum erro de JavaScript**. Dois avisos pré-existentes do alvo web do Expo (push token e
`props.pointerEvents`), que não existem no telefone. Painel: **zero**.

---

# As duas ressalvas

## R1 — O agrupamento custa pouco e ajuda; o primeiro bloco continua grande

Medido em vez de opinado. O custo vertical é **+116px numa tela de 1436px — cerca de 9%** de
rolagem. E o ganho é real onde foi prometido: *Plano de tratamento* saía em 19.º na lista
alfabética pura e agora abre o primeiro bloco.

**O que continua por resolver é o tamanho de *Seu tratamento*: 9 das 20 linhas.** Quase metade do
menu num cartão só, e lá dentro a busca volta a ser alfabética pelo nome — que é o problema que
esta tarefa existe para atacar. Os outros três têm 3, 2 e 6. A divisão arrumou as bordas e deixou
o centro como estava.

Não é defeito da entrega: é a taxonomia da clínica, herdada de propósito. Se a tela ainda parecer
pesada, as saídas são partir `clinical` em dois (*o que eu faço* × *o que a clínica escreveu sobre
mim*) ou tirar de lá o que é leitura de arquivo (documentos, relatórios, prontuário). **É decisão
de produto, e fica para o Bruno.**

## R2 — Cabeçalho em português sobre conteúdo meio em inglês

O passo 5 foi cumprido — os cabeçalhos traduzem. Mas a tela de permissões continua mista: o título
(*Patient Permissions*), os nomes dos cartões (*Module Access*, *Full Access*), as descrições dos
módulos e os selos (*Unlocked*, *Blocked*) seguem em inglês. O mais visível é o `confirm()` do
navegador, que já usa o nome do módulo em português **dentro** de uma frase em inglês.

É o mesmo caso de `service-pricing`, invertido: lá a tela é inglês inteiro e traduzir só o
cabeçalho destoaria. **Fica para a revisão de EN+PT daquela tela.**

---

# Três observações de ambiente

1. **O menu só relê as permissões numa carga nova da página.** Trocar de aba na sessão web não
   trouxe a permissão recém-mudada. No telefone quem dispara a releitura é a volta ao primeiro
   plano, que a web não tem — limitação do alvo de QA, não da entrega. **Quem medir a 112 T-2 vai
   bater nisto**, e custou duas medições enganosas aqui.
2. **A aba nova do Expo web abriu já autenticada** com a sessão de outro QA, via `localStorage` de
   uma porta recém-subida. Limpa antes de medir. Vale ao lado de *dois QA em paralelo colidem*: não
   é só porta, `.next` e cookie — o `localStorage` do browser do MCP também chega atravessado.
3. `next dev` escreveu no `tsconfig.json`; revertido.

## O que ficou mexido

`qa-t6-patient@`: senha de teste definida, `preferredLocale` de volta em `en-GB`,
`fullAccessOverride: false`, `moduleOverrides: {}` — restaurado. Clínica `qa-report-t6` com
`labVisibleInApp: true`, ligado para o cenário 8 e mantido. `.next-qa112t1/` apagado, servidores
encerrados.
