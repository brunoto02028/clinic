# Atividade 14 — Skill `clinical-evidence-report`

**Status geral:** implementada — QA aprovado (24/24) + code review aplicado (5 achados
corrigidos, incl. filtro multi-clínica); aguarda review do Bruno. Nada commitado.

## Objetivo
Empacotar, no repositório, uma **Claude Code skill** que — a partir da triagem de um
paciente de fisioterapia — busca literatura internacional (Europe PMC), classifica por
nível de evidência, cruza com o catálogo real da clínica e gera um **relatório de conduta
baseado em evidência, rastreável até a fonte**, para o **fisioterapeuta revisar**. Rodada
**sob demanda** (eu ou o Bruno invocamos após uma triagem); **não** é pipeline automático
nesta fase.

Fonte do desenho: documento compartilhado pelo Bruno (Google Doc, 2026-08-22).

## Decisões de design
1. **Formato = skill sob demanda** (escolha do Bruno). Humano sempre no meio; sem automação
   no fluxo de triagem por enquanto. Se validar, promover a pipeline no app vira atividade
   futura.
2. **Segurança primeiro.** `references/red-flags.md` é checado ANTES de qualquer busca. Com
   red flag → a skill **para** e emite só o alerta de "precisa de avaliação humana
   prioritária". Nunca gera sugestão nesse caso.
3. **Não diagnostica, não prescreve.** Todo relatório carrega o aviso clínico e passa por
   revisão do fisio antes de qualquer contato com paciente. O aviso do template é imutável.
4. **Rastreabilidade.** Cada sugestão do relatório aponta a fonte (estudo) de onde veio.
5. **Busca em inglês, resultado multi-idioma.** Query montada em inglês (cobertura), campo
   `language` de cada artigo dá o lastro internacional. 2–4 queries por caso, dedup por id.
6. **Reaproveita o gráfico da atividade 13.** Se o relatório for exibido no sistema, a
   evolução do paciente usa o `TrendChart` (small-multiples por entidade) já construído —
   **a spec 13 é pré-requisito visual desta.**
7. **GDPR/UK.** À Europe PMC vai só a *condição* (sem PII). A geração de texto do relatório
   usa o provider GDPR-safe (**Claude**), **nunca Minimax**. Sem PII em logs.

## Tarefas

| Tarefa | Nome | Status |
|--------|------|--------|
| T-1 | Scaffold da skill + `SKILL.md` (frontmatter + fluxo + limites) | implementada — QA ok |
| T-2 | `references/red-flags.md` — checklist de segurança (fisio) | implementada — QA ok |
| T-3 | `scripts/search_literature.js` — Europe PMC + classificação de evidência | implementada — QA ok (testado na API real) |
| T-4 | `templates/report-template.md` — estrutura fixa + aviso clínico | implementada — QA ok |
| T-5 | `templates/clinic-resources.example.json` + gerador + `clinic-resources.json` real | implementada — QA ok |
| T-6 | QA — script contra Europe PMC real + dry-run ponta a ponta + caso red-flag | concluída |

Ciclo por tarefa: implementar → **qa-tester** gera `qa/report-t-N.md` com evidências → code
review → só então concluir.

## Suposições (validar antes de implementar)
- **Local dos arquivos:** `Skills/clinical-evidence-report/` (ao lado do
  `Skills/skill-artigos-bpr-rehab.md` já existente). Se preferir `.claude/skills/`, avise.
- **Catálogo da clínica:** a clínica já tem exercícios/protocolos no **banco**
  (`ExercisePrescription`, `TreatmentProtocol`, vídeos). Nesta fase de skill uso o
  `clinic-resources.json` (arquivo, como o doc pede) preenchido a partir desses dados; numa
  fase de app, a fonte natural passa a ser o DB. Confirmar se quer que eu já **gere** o
  `clinic-resources.json` real a partir do banco local, ou só o `.example`.
- **`search_literature.js`:** Node 18+, sem dependências, sem chave (Europe PMC público).
  O doc avisa que não foi testado do sandbox por rede — o QA precisa rodar a **primeira
  execução real** aqui e validar os campos (o parsing pode precisar de ajuste).
- **Níveis de evidência:** ordem systematic review/meta-analysis > RCT > guideline >
  revisão narrativa/outros. Classificação determinística por tipo de publicação/《pubType》.
- **Provider de IA do relatório:** Claude (GDPR-safe). Não usar Minimax.

## Fora de escopo (fase futura, não agora)
- Automação: gerar o relatório automaticamente ao submeter a triagem no app.
- Exibir o relatório dentro do admin/portal (só markdown/《arquivo》nesta fase).
- Puxar o catálogo direto do DB (fica com JSON por enquanto).
