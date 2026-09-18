# T-3: Marca do estúdio editável pelo próprio personal

**Status:** pendente
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

## Arquivos afetados
- `app/api/admin/studio-branding/route.ts` (novo)
- `app/admin/settings/...` (aba nova) ou página nova em Settings + `lib/admin-sections.ts`
- `components/admin/studio-getting-started.tsx`
- possivelmente o callback de sessão (`lib/auth-options.ts`) para refletir a marca nova

## Critérios de aceite
- [ ] Personal troca nome, logo e cor → `/studio/qa-studio-pt` e `/join/qa-studio-pt` mostram a marca nova.
- [ ] Admin e portal do aluno também mostram a marca nova.
- [ ] `PATCH` com `clinicId`/`slug`/`type` no corpo → campos ignorados (não mudam).
- [ ] Personal de tenant A não consegue alterar o tenant B (não há parâmetro de tenant; teste com SUPERADMIN confirma que só o tenant ativo muda).
- [ ] Cor inválida → 400 com mensagem clara.
- [ ] Aluno → 403 (T-1).
- [ ] `SiteSettings` da BPR inalterado.
- [ ] Passo do getting-started marcado como feito depois de salvar.
