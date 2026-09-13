# T-4: Marca do tenant nos emails

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Um paciente/aluno de um tenant que não é a BPR recebe emails com o logo/cor do PRÓPRIO tenant, não da BPR.

## Contexto
`lib/email-templates.ts`'s `getClinicSettings()` faz `prisma.siteSettings.findFirst()` — sempre a linha global única, independente de qual tenant o destinatário pertence. Mesmo problema de singleton que a atividade 37 já achou e corrigiu pro email de notificação do admin (`lib/admin-notify-email.ts`) — mesma solução aqui: resolver pela `Clinic` do destinatário primeiro, só cair pro `SiteSettings` global quando for de fato o tenant padrão.

## Passos
1. `getClinicSettings()` passa a aceitar um `clinicId?` opcional. Cascata: `Clinic.logoUrl`/`primaryColor` (do tenant, se `clinicId` dado e não for o tenant padrão) → `SiteSettings` global (se for o tenant padrão, ou sem `clinicId`) → os fallbacks estáticos já existentes (`EMAIL_LOGO_URL`, `BRAND_PRIMARY`, etc.) — mesma lógica de "só o tenant padrão vê o SiteSettings global" já validada em `lib/admin-notify-email.ts`.
2. `wrapInLayout(content, preheader, locale, clinicId?)`: repassa o `clinicId` pra `getClinicSettings`.
3. Atualizar as chamadas de `wrapInLayout`/`sendTemplatedEmail` que já têm o `clinicId` do destinatário à mão (a maioria dos call sites tocados na atividade 37 já resolve isso) pra passar adiante.
4. `Clinic` não tem campo de telefone de contato pro email — usar `Clinic.email`/`Clinic.phone` já existentes (mesmos campos usados na atividade 37) em vez de inventar novos.

## Arquivos afetados
- `lib/email-templates.ts`
- Call sites de `sendTemplatedEmail`/`wrapInLayout` que precisarem passar o `clinicId`

## Critérios de aceite
- [x] Email pra um paciente do tenant padrão (BPR) continua idêntico a hoje.
- [x] Email pra um aluno de um tenant diferente (ex. QA Studio PT) usa o logo/cor DAQUELE tenant, se configurado — ou o fallback estático genérico, nunca a marca da BPR.
- [x] Tenant sem logo/cor configurados: cai no fallback estático, sem quebrar o layout do email.

## Resultado
`getClinicSettings(clinicId?)` cascata pela `Clinic` do destinatário (exceto o tenant padrão, que mantém o `SiteSettings` global inalterado). `wrapInLayout` ganhou um 4º parâmetro `clinicId?`, propagado por `renderTemplate`/`sendTemplatedEmail` — a maioria dos call sites (ex. `lib/notify-patient.ts`, que cobre a maior parte dos emails transacionais) já se beneficiou automaticamente por já passar `clinicId` desde a atividade 37; corrigidos 3 call sites que tinham o dado à mão mas não passavam (`lib/auth-options.ts`, `forgot-password`, `change-email/request`). Code review fechou uma injeção de HTML real (campos de marca sem escapar) e 3 achados menores. **Dependência operacional pendente, decidida com o usuário:** produção precisa de `DEFAULT_CLINIC_SLUG` configurado pra essa lógica funcionar de forma correta e inequívoca — sem isso, o tenant padrão pode ser tratado como "estrangeiro" quando há ambiguidade (achado do QA, documentado em memória: `default-clinic-slug-pendente.md`). QA e code review (2 rodadas cada) aprovados — ver `qa/report-t-4.md`.
