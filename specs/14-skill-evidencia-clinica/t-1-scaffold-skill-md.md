# T-1: Scaffold da skill + SKILL.md

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Criar a estrutura da skill e o `SKILL.md` (a partir do documento do Bruno), no formato
correto de Claude Code skill: frontmatter `name`/`description`, fluxo de trabalho, e a
seção de **limites** intacta.

## Contexto
- Já existe `Skills/skill-artigos-bpr-rehab.md`; esta skill vira uma pasta própria.
- O `description` do frontmatter é o que dispara a skill — manter o texto de gatilho do doc.

## Passos
1. Criar `Skills/clinical-evidence-report/SKILL.md` com o conteúdo do doc, revisado:
   frontmatter + "O que faz" + checagem de red flags + fluxo (1–6) + limites + lista de
   arquivos.
2. Garantir que o passo de red flags aponte para `references/red-flags.md` e que o passo 6
   referencie o `TrendChart` da atividade 13.
3. Não inventar seções novas além das do doc.

## Arquivos afetados
- `Skills/clinical-evidence-report/SKILL.md` (novo)

## Critérios de aceite
- [ ] Frontmatter válido (`name: clinical-evidence-report`, `description` com gatilhos).
- [ ] Seções do doc preservadas; seção de limites presente e íntegra.
- [ ] Referencia red-flags.md, os templates e o script pelos caminhos corretos.
