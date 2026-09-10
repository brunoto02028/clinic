# T-6: Triagem e correção das demais rotas de staff

**Status:** em andamento
**Trilha:** PLATAFORMA
**Depende de:** T-3, T-4, T-5

## Objetivo
Cobrir o restante da varredura da atividade 19 (A3): as rotas de staff que não referenciam tenant.

## Triagem
Feita em `qa/triagem-rotas.md` (2026-09-10). Cada rota ficou classificada como **tenant**, **plataforma**, **usuário** ou **público**, com prioridade.

A triagem mudou a ordem da tarefa. O primeiro item é um bypass completo do isolamento que a auditoria original não tinha visto:

## Execução em duas passadas de QA
- **Parte 1 (crítica, explorável hoje):** passos 1 a 4 — impersonação entre tenants, rotas de admin que o paciente alcançava, chaves de agente, foot-scan e checkout.
- **Parte 2 (endurecimento p/ 2º tenant):** passos 5 a 7 — escopo por tenant da prioridade 2, restrição de plataforma a SUPERADMIN, e `withClinicFilter`/`resolveClinicId` falhando fechado.

## Passos (em ordem)
1. **Impersonação entre tenants.** Validar no `lib/get-effective-user.ts`, que é o ponto por onde toda impersonação passa, que o paciente impersonado pertence ao tenant do admin real. Validar também ao iniciar, em `admin/impersonate`. Hoje o middleware aceita o cookie de qualquer ADMIN, então corrigir só a rota não basta.
2. **Rotas de admin só com sessão** (paciente consegue escrever): `admin/education/content/[id]`, `admin/social/posts/[id]` e `admin/social/templates/[id]`.
3. **Chaves de agente:** a gestão fica só para SUPERADMIN (hoje é só ADMIN).
4. **Registros por ID sem dono:** `foot-scans/[id]/progress`, `payments/create-checkout` e `payments/verify`.
5. **Prioridade 2 da triagem:** escopo por tenant em artigos, clinical-scribe, broadcasts, `SiteSettings` (consentimento, triagem, portal, páginas de serviço, Stripe), e-mail, pacotes, vendas, biblioteca de imagens e upload.
6. **Plataforma:** restringir a SUPERADMIN o que é ferramenta da plataforma (logs, marketing, coworker, CPD, callback do Companies House).
7. `withClinicFilter` e `resolveClinicId` passam a falhar fechado, delegando ao `tenant-access`.

## Critérios de aceite
- [ ] Toda rota da varredura aparece classificada em `qa/triagem-rotas.md`.
- [ ] Admin de outro tenant não consegue impersonar paciente, nem forjando o cookie.
- [ ] Paciente recebe 403 nas rotas de admin que hoje só conferem sessão.
- [ ] Cenários da T-6 passando.
- [ ] Regressão: as telas do admin da BPR abrem sem erro, e a impersonação de paciente da própria clínica continua funcionando.

## Achado fora do escopo (avisado, não corrigido)
- `app/api/admin/agent-keys/route.ts` acessa `session.user.role` sem cast, o que gera 10 erros de tipo no `tsc` — **preexistentes no HEAD** (o build de prod os tolera). Meu patch só trocou o papel exigido de ADMIN para SUPERADMIN; não introduzi os erros nem os corrigi (débito de tipo, fora do escopo da T-6).
