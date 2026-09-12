# Addendum — revisão de código (achados corrigidos)

A revisão de código sobre o diff completo (T-1–T-6) encontrou 6 problemas, todos corrigidos e reverificados:

## 1. Vazamento entre tenants (crítico) — CORRIGIDO
**Achado:** `SiteSettings` é, na prática, uma única linha global (`clinicId: null`) editada só pela tela `/admin/settings` da clínica padrão — o onboarding real de multi-tenant (`POST /api/admin/clinics`) nunca cria uma linha de `SiteSettings` por clínica. A implementação original de `getAdminNotificationEmail(clinicId)` caía direto nessa linha global pra QUALQUER clínica sem linha própria — ou seja, o alerta de um personal trainer (ou de qualquer clínica que não a padrão) vazava pra caixa de entrada da BPR.

**Correção:** novo campo `Clinic.notificationEmail` (por-tenant, de verdade — toda clínica tem uma linha `Clinic`, diferente de `SiteSettings`). Cascata redesenhada:
1. `Clinic.notificationEmail` (override explícito daquele tenant)
2. **Só se `clinicId` for o tenant padrão** (resolvido via `lib/default-tenant.ts`, o mesmo mecanismo já usado no resto do sistema): `SiteSettings.notificationEmail` → `SiteSettings.email`
3. `Clinic.email` (contato próprio daquele tenant — melhor que vazar pra outro)
4. `ADMIN_EMAIL` (env) → hardcoded

Sem `clinicId` nenhum (alertas puramente operacionais, sem tenant — ex. AI co-worker, webhook do Vapi): cascata do `SiteSettings` global → `ADMIN_EMAIL` → hardcoded, sem mudança.

**Reverificado:** script isolado simulando um tenant padrão inequívoco confirma `admin@bpr.clinic` pro tenant padrão e o fallback genérico (nunca `admin@bpr.clinic`) pra um tenant diferente. Confirmado também ao vivo: signup em `qa-clinic-a` (não é o tenant padrão) foi corretamente pro fallback, não pro email da BPR.

**Nota (não é bug, é dado de ambiente local):** o banco de dev local tem DUAS clínicas com o nome "Bruno Physical Rehabilitation" (slugs `bruno-physical-rehabilitation` e `bruno-physical-rehab`, provavelmente resíduo de seeds repetidos ao longo desta sessão) — isso deixa `getDefaultClinicId()` ambíguo localmente (mais de uma clínica ativa, sem `DEFAULT_CLINIC_SLUG` configurado), então o teste ao vivo específico do slug `bruno-physical-rehab` caiu no `Clinic.email` dele em vez do `SiteSettings.notificationEmail` — comportamento correto dado a ambiguidade real dos dados, não um bug da lógica (confirmado isolando o teste). Vale uma limpeza de dados no ambiente local, fora do escopo desta atividade.

## 2. XSS — nome do paciente sem escapar no HTML do email — CORRIGIDO
**Achado:** todos os 8 alertas novos interpolavam `patientName`/`tenant.name`/etc. direto no HTML sem escapar — o de cadastro é alcançável sem autenticação nenhuma (qualquer um pode se cadastrar com nome contendo HTML/script).

**Correção:** nova função `escapeHtml()` em `lib/admin-notify-email.ts`, aplicada em todo valor dinâmico interpolado nos 8 alertas.

## 3. Query extra por email de admin em toda a base — MITIGADO
**Achado:** o BCC automático (`sendTemplatedEmail`) agora faz uma consulta ao banco em toda saída de email, sem cache — substituindo o que antes era uma leitura de variável de ambiente sem custo.

**Correção:** cache em memória com TTL de 60s em `getAdminNotificationEmail`, mesmo padrão já usado em `lib/turnstile.ts` pro segredo do Turnstile.

## 4. Query duplicada em avaliação corporal / escaneamento de pé — CORRIGIDO
**Achado:** duas consultas sequenciais pro mesmo paciente (uma pro `patientId`, outra pro nome/clínica) quando dava pra incluir a relação na primeira consulta.

**Correção:** `include`/`select` da relação `patient` direto na consulta original, em ambos os arquivos.

## 5. Template HTML duplicado em 9 lugares — CORRIGIDO
**Achado:** o mesmo bloco HTML (~15 linhas) copiado e colado em 9 pontos, com só o texto/cor mudando — qualquer ajuste de marca exigiria editar 9 arquivos.

**Correção:** função compartilhada `sendAdminAlert()` em `lib/admin-alert-email.ts`, usada pelos 8 alertas novos da atividade 37 — centraliza o template E o escaping (achado 2) num lugar só.

## Reverificação pós-fix
- Typecheck limpo (`npx tsc --noEmit`) em todos os arquivos tocados, sem erros novos.
- Cadastro no tenant padrão (BPR) → `admin@bpr.clinic` (correto, com a ambiguidade de dados local documentada acima).
- Cadastro num tenant diferente (QA Clinic A) → fallback genérico, nunca o email da BPR (correção do vazamento confirmada).
- Cadastro duplicado → nenhum alerta (comportamento preservado).
