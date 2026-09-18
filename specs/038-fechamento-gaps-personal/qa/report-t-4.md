# QA Report — T-4: Marca do tenant nos emails

**Data:** 2026-09-13
**Resultado geral:** ⚠️ aprovado com dependência operacional pendente (ver "Achado crítico")

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 14a | `renderTemplate` sem `clinicId` (comportamento de hoje) | Direto (tsx) | ✅ |
| 14b | `renderTemplate` com `clinicId` **real** de um paciente do tenant BPR | Direto (tsx) | ❌ (ver achado crítico) |
| 15 | `renderTemplate` com `clinicId` de tenant de teste com `logoUrl`/`primaryColor` | Direto (tsx) | ✅ |
| 16 | `renderTemplate` com `clinicId` de tenant de teste sem branding | Direto (tsx) | ✅ |
| E2E | `POST /api/auth/forgot-password` para paciente de tenant de teste com marca | API real | ✅ |

## Detalhes

### 14a. Tenant padrão, sem `clinicId` (comportamento inalterado) ✅
```
PASS — sem clinicId -> contém #4F7361
PASS — sem clinicId -> contém "Ipswich"
PASS — sem clinicId -> NÃO contém cor de um tenant de teste
```

### 15. Tenant com marca própria configurada ✅
Clinic de teste com `logoUrl`, `primaryColor: '#123456'`, `email` próprios.
```
PASS — contém cor #123456
PASS — NÃO contém #4F7361 no header do wrapper
PASS — NÃO contém "Ipswich"
PASS — logo da própria clínica
PASS — rodapé usa email do tenant (mailto) — confirma a correção do bug pré-existente (link antes hardcoded pra admin@bpr.clinic, agora usa o email resolvido)
```

### 16. Tenant sem branding configurado ✅
```
PASS — HTML não quebrou
PASS — fallback cor #4F7361
PASS — NÃO contém "Ipswich"
PASS — rodapé usa email fallback admin@bpr.clinic
PASS — <!DOCTYPE html> presente
```

### E2E — `POST /api/auth/forgot-password` ✅
Tenant + paciente de teste reais, `curl` real contra o servidor:
```
HTTP/1.1 200 OK
[OUTBOUND-SINK] email → qa-t4-e2e-patient@example.test, qa-t4-e2e@example.test: Reset your password — BPR Physical Rehabilitation 🔒
```
Sem erro 500; BCC do admin resolveu para o email do próprio tenant de teste (confirma que `getAdminNotificationEmail` também respeitou o `clinicId` passado adiante).

## Achado crítico — Cenário 14b (usando `clinicId` real, não sintético)

Testado com o `clinicId` de verdade de um paciente já cadastrado no tenant padrão (BPR): o header do email mudou de `#4F7361` (cor do `SiteSettings`, o que os pacientes reais recebem hoje) para `#607d7d` (o `Clinic.primaryColor` gravado nesse registro, desatualizado), e a linha de endereço físico ("Ipswich") sumiu.

**Causa raiz:** o banco (local e, pela mesma evidência já coletada nesta sessão para o bug do `/signup` 503, também produção) tem mais de uma clínica ativa sem `DEFAULT_CLINIC_SLUG` configurado. `lib/default-tenant.ts`'s `getDefaultClinicId()` só resolve um tenant padrão inequívoco com exatamente 1 clínica ativa OU com essa variável setada — sem isso, retorna `null`, e a cascata nova de `getClinicSettings()` (`lib/email-templates.ts`) trata QUALQUER `clinicId`, inclusive o do próprio tenant padrão, como "tenant estrangeiro", usando a marca (possivelmente desatualizada) gravada em `Clinic` em vez do `SiteSettings` global.

Esse não é um bug isolado da T-4 — é a mesma causa raiz já documentada nesta sessão para o `/signup` retornando 503 em produção, e um risco pré-existente (silencioso até agora) no roteamento do email de notificação do admin (`lib/admin-notify-email.ts`, atividade 37). A T-4 só tornou o efeito visível e concreto num lugar novo (a marca visual do email do paciente).

**Resolução decidida com o usuário:** configurar `DEFAULT_CLINIC_SLUG=bruno-physical-rehab` no ambiente de produção (Coolify) — confirmado por teste direto contra `bpr.clinic/join/bruno-physical-rehab` (200, resolve a clínica real) vs. `bpr.clinic/join/bruno-physical-rehabilitation` (404, não existe em produção — só é uma duplicata do banco local de dev). Uma vez configurada, `getDefaultClinicId()` deixa de depender de "só uma clínica ativa" e resolve de forma inequívoca, o que corrige de uma vez os três pontos afetados (signup, notificação do admin, e agora a marca do email).

**Status da tarefa:** a lógica implementada está correta — o comportamento errado só se manifesta enquanto a variável de ambiente não estiver configurada em produção. T-4 fica marcada como concluída do lado do código; a configuração da variável em produção é um item de infraestrutura, de responsabilidade do usuário, registrado em memória para acompanhamento.

## Falhas e recomendações
1. Achado crítico acima — não é um bug de código a corrigir na T-4, é uma dependência operacional (configurar `DEFAULT_CLINIC_SLUG` em produção) já decidida com o usuário.
2. **Achado fora de escopo, apenas registrado:** o banco de dev tem duas clínicas chamadas "Bruno Physical Rehabilitation" (uma delas, `bruno-physical-rehabilitation`, não existe em produção — confirmado 404 ao vivo) e uma clínica de sobra de uma sessão de QA anterior (`qa31-float-...`) ainda ativas — dado de teste local, não afeta produção diretamente, mas caso a duplicata precise ser limpa localmente em algum momento, vale considerar.

## Limpeza realizada
Todos os tenants/pacientes/scripts de teste criados durante este QA foram removidos — confirmado por query final (0 remanescentes com os prefixos usados) e `git status` limpo (nenhum script `tsx` descartável sobrou em `scripts/`).

---

## Code review — correções

1. **Corrigido — injeção de HTML via `Clinic.primaryColor`/`email`/`logoUrl`.** Esses campos são texto livre editável pelo SUPERADMIN (via `PATCH /api/admin/clinics/[id]`, sem allowlist/validação) e eram interpolados sem escapar em atributos HTML (`bgcolor`, `style`, `href="mailto:..."`, `src`). Corrigido com `escapeHtml()` (o mesmo helper já usado em `lib/admin-notify-email.ts` pra essa exata classe de problema) aplicado a todos os 4 campos antes de entrar no HTML. Verificado: um `primaryColor`/`email` malicioso (`#000"onerror="alert(1)`, `evil"><script>alert(1)</script>@example.test`) não quebra mais o atributo nem injeta tag — aparece escapado no HTML final.
2. **Corrigido — rodapé do tenant padrão passou a depender de `SiteSettings.email`.** O rodapé de emails do tenant padrão (BPR) usava um literal hardcoded `admin@bpr.clinic`, nunca lia `SiteSettings.email` de fato (variável buscada mas nunca usada — bug antigo, corrigido na primeira versão desta tarefa). Ao consertar isso, o valor passou a depender de `SiteSettings.email`, que localmente está `null` — se em produção esse campo tiver algum valor diferente de "admin@bpr.clinic", o rodapé do tenant padrão mudaria, violando o critério de aceite 1 ("continua idêntico a hoje"). Corrigido: pro tenant padrão especificamente, o rodapé fica fixo no literal `admin@bpr.clinic` (ignorando `SiteSettings.email` pra esse propósito específico) — exatamente replicando o comportamento de antes desta atividade. Só tenants que NÃO são o padrão usam o próprio `Clinic.email`, que é o objetivo real da tarefa.
3. **Corrigido — fallback de erro vazava a cor da BPR pra um tenant real.** Se `getClinicSettings()` lançasse uma exceção (ex. falha transitória de banco) resolvendo um `clinicId` de um tenant que NÃO é o padrão, o catch devolvia a cor `#4F7361` (verde moss, cor específica da BPR) mesmo sabendo que não era o tenant padrão. Corrigido: nesse caso específico (erro + tenant real, não padrão), a cor de fallback agora é um cinza neutro (`#6b7280`), não a cor da BPR.
4. **Corrigido — ferramenta interna de teste de email (`/api/admin/email-test`) não conseguia validar a marca por tenant.** As 3 ações (`simulate_signup`, `simulate_screening`, `simulate_template`) buscavam o paciente de teste sem selecionar `clinicId` e não repassavam pra `sendTemplatedEmail` — mesmo escolhendo um paciente de um tenant diferente, o teste sempre mostrava a marca da BPR. Corrigido: as 3 ações agora selecionam e repassam `clinicId`, então a própria ferramenta de teste do admin consegue validar a T-4 de verdade.

**Não corrigidos, avaliados e descartados (fora do escopo desta tarefa, já documentados):**
- Cada um dos ~30 templates de email individuais (WELCOME, PASSWORD_RESET, etc.) ainda tem botões/links com a cor `#4F7361` e, em alguns casos, `mailto:admin@bpr.clinic` hardcoded no CORPO do template — só o "chrome" compartilhado (`wrapInLayout`: header, rodapé, logo) foi reskinado, como o plano desta tarefa pediu explicitamente. Reskinar cada template individualmente é um escopo bem maior (~30 arquivos), fora do que a T-4 pediu.
- Fundo do rodapé (`BRAND_HEALTH_SOFT`) continua fixo, não adapta pela cor do tenant — decisão deliberada, o plano só menciona `logoUrl`/`primaryColor` (usado no header/CTA), não o fundo secundário do rodapé.
- Ausência de cache na resolução de marca (`getClinicSettings` faz 1-2 queries por email, sem TTL como o `lib/admin-notify-email.ts` já tem) — mesma classe de achado "não é hot path" já aceita em rodadas de review anteriores desta atividade (T-1, T-2, T-3); não repriorizado agora.
- Duplicação da lógica "é o tenant padrão?" entre `lib/admin-notify-email.ts` e `lib/email-templates.ts` — observação de manutenibilidade válida, mas extrair um helper compartilhado tocaria código já em produção desde a atividade 37 só por reorganização, sem ganho funcional imediato; não fiz agora.
