# T-3: Marca do estúdio editável pelo próprio personal

**Status:** concluído (QA aprovado na rodada 3 — `qa/report-t-2-t-3.md` — + code review aplicado)
**Depende de:** nenhuma (vai para prod junto com a T-2)

## Objetivo
O personal (ADMIN do tenant) edita **a marca do próprio estúdio**: nome, logo e cores. A mudança vale para o login `/studio/<slug>`, o convite `/join/<slug>`, o admin e o portal do aluno. Ele nunca toca no site da BPR.

## Contexto
- Hoje o passo "Personalise your studio" (`components/admin/studio-getting-started.tsx:41`) aponta para `/admin/settings`, que é o site global (T-2 fecha isso).
- `Clinic` já tem `name`, `logoUrl`, `logoPath`, `primaryColor` (default `#4F7361`), `secondaryColor`. A sessão já carrega `clinicName`, `clinicLogoUrl` e `clinicPrimaryColor` (`lib/auth-credentials.ts`), e as telas branded (ativ. 22) já leem esses campos.
- Hoje só `PATCH /api/admin/clinics/[id]` (SUPERADMIN) grava esses campos.

## Passos
1. Rota nova `GET|PATCH /api/admin/studio-branding`:
   - opera **só** no `clinicId` do actor (`getActor`);
   - aceita só `name`, `logoUrl`/`logoPath`, `primaryColor`, `secondaryColor`;
   - cores validadas como hex (`#RRGGBB`), nome com 2–80 caracteres;
   - ADMIN do tenant e SUPERADMIN (no tenant ativo).
2. Upload do logo reusando o upload de imagem já usado no admin (mesma validação de tipo/tamanho da T-9: só imagem raster ou SVG servido com segurança).
3. Tela: aba "Studio" / "Estúdio" em Settings, visível para o tenant personal (e para ADMIN de clínica, que também é dono da própria marca). Pré-visualização simples: login do estúdio com logo e cor.
4. Getting-started: "Personalise your studio" aponta para a aba nova e fica marcado como feito quando `logoUrl` ou uma cor diferente do default estiver salva.
5. A sessão reflete a mudança sem novo login (refresh da sessão ou leitura do `Clinic` nas telas branded). Conferir o que as telas usam hoje.

## Decisões tomadas na implementação
- **Rota:** `/admin/studio-branding`, que vira a aba "Branding / Marca" do menu Settings. Para o personal ela é a primeira aba de Settings (General, Studios, AI, Security e Logs ficam só para SUPERADMIN, T-2).
- **Logo:** sobe pelo `/api/upload` existente (só staff, só imagem, 10 MB, convertido para WebP) e é servido em `/api/image-serve/<id>`. O filtro de logo da sessão (`sessionLogoUrl` em `lib/auth-credentials.ts`) passa a aceitar esse caminho interno além de `https://`. Antes, só URL absoluta era aceita e o logo enviado seria descartado.
- **Sessão:** depois de salvar, a tela chama `useSession().update()`, e o callback `jwt` (trigger `update`) relê nome/logo/cor do `Clinic`. O personal vê a marca nova na hora. **Alunos já logados** veem no próximo login.
- **Admin do personal:** a barra lateral mostra o logo do estúdio quando existe, em vez do logo da BPR.
- **Painel `/admin`:** o atalho "Site Settings" vira "Marca do estúdio" para o personal, e "View Website" (site da BPR) some.
- **Getting started / Studio guide:** apontam para a tela nova. O passo "Personalise" fica feito quando há logo ou cor diferente do default `#4F7361`.
- **Papel:** só ADMIN e SUPERADMIN editam (THERAPIST → 403 na API e redirect na página).
- **Ajustes do code review:**
  - Logo por `/api/image-serve/<id>` só é aceito se a imagem foi enviada por alguém do mesmo tenant (ou pelo SUPERADMIN).
  - O app mobile recebe o logo como URL **absoluta** (`absoluteLogoUrl`, `lib/mobile-user.ts`) em login/me/refresh.
  - O formulário carrega uma vez só (trocar o idioma não descarta edições) e os campos de cor aceitam ficar vazios enquanto se digita.
  - Um SUPERADMIN que edita outro tenant pelo seletor de clínica mantém a própria marca na sessão (comportamento esperado, documentado no callback `jwt`).

## Arquivos afetados
- `app/api/admin/studio-branding/route.ts` (novo)
- `app/admin/settings/...` (aba nova) ou página nova em Settings + `lib/admin-sections.ts`
- `components/admin/studio-getting-started.tsx`
- possivelmente o callback de sessão (`lib/auth-options.ts`) para refletir a marca nova

## Critérios de aceite
- [x] Personal troca nome, logo e cor → `/studio/qa-studio-pt` e `/join/qa-studio-pt` mostram a marca nova.
- [x] Admin e portal do aluno também mostram a marca nova.
- [x] `PATCH` com `clinicId`/`slug`/`type` no corpo → campos ignorados (não mudam).
- [x] Personal de tenant A não consegue alterar o tenant B (não há parâmetro de tenant; teste com SUPERADMIN confirma que só o tenant ativo muda).
- [x] Cor inválida → 400 com mensagem clara.
- [x] Aluno → 403 (T-1).
- [x] `SiteSettings` da BPR inalterado.
- [x] Passo do getting-started marcado como feito depois de salvar.
