# T-6: Termos e Condições bilíngue

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
O documento de Termos e Condições (`/dashboard/consent`) aparece em português quando o site
está em português.

## Contexto
`app/api/admin/consent-texts/route.ts`: `GET` não recebe `locale`, sempre devolve
`DEFAULT_CONSENT_TEXTS` (inglês) a menos que `SiteSettings.consentTextsJson` tenha algo
diferente (também sem versão PT). `prisma/schema.prisma:1430`:
`consentTextsJson String? @db.Text` — sem campo `Pt` irmão, diferente de
`Article.contentPt`/`ConditionPage.contentPt`/`BookChapter.contentPt` já existentes no mesmo
schema. `app/dashboard/consent/page.tsx:43` já usa `useLocale` pros rótulos da própria página,
mas não passa `locale` pro fetch dos textos.

**Importante (ver Suposição 3 do plan.md)**: o texto em português que vou escrever nesta tarefa
é um rascunho de tradução do conteúdo jurídico existente (GDPR/lei do Reino Unido), não uma
revisão legal — precisa da sua validação (ou de alguém com conhecimento jurídico) antes de
considerar definitivo.

## Passos
1. `prisma/schema.prisma`: adicionar `consentTextsJsonPt String? @db.Text` ao `model
   SiteSettings` (linha ~1430, ao lado do campo existente). Rodar `npx prisma db push` (local e,
   depois de aprovado, produção).
2. Em `app/api/admin/consent-texts/route.ts`: adicionar `DEFAULT_CONSENT_TEXTS_PT` — a tradução
   completa da estrutura `DEFAULT_CONSENT_TEXTS` (mesmos 18 itens: `termsTitle`, `privacyTitle`,
   `liabilityTitle`, `consentCheckboxText`, `termsSections`[5], `privacySections`[8],
   `liabilitySections`[5]).
3. `GET` passa a ler `?locale=` da query string (`req.nextUrl.searchParams.get("locale")`):
   - `locale === "pt-BR"` → tenta `settings.consentTextsJsonPt` (parseado), senão
     `DEFAULT_CONSENT_TEXTS_PT`.
   - qualquer outro valor/ausente → comportamento atual (inglês), sem mudança.
4. `app/dashboard/consent/page.tsx:43`: passar `?locale=${locale}` no fetch.
5. Conferir se existe alguma tela de **admin** pra editar `consentTextsJson` (edição do texto
   jurídico) — se existir, avaliar se precisa de um campo espelho pra editar a versão PT também
   (só avaliar, não é obrigatório implementar editor nesta tarefa se não houver um já pronto pra
   estender facilmente).

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/admin/consent-texts/route.ts`
- `app/dashboard/consent/page.tsx`

## Critérios de aceite
- [ ] Com o site em português, `/dashboard/consent` mostra o documento inteiro (títulos e corpo
      de todas as seções) em português.
- [ ] Com o site em inglês, continua exatamente como está hoje.
- [ ] `SiteSettings.consentTextsJsonPt` vazio → cai no fallback `DEFAULT_CONSENT_TEXTS_PT`
      (não quebra, não mostra inglês misturado).
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
- [ ] Aviso explícito no commit/PR: tradução do texto jurídico é rascunho, pendente de revisão.
