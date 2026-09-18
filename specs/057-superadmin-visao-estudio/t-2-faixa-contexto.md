# T-2: Faixa "vendo o estúdio X · Voltar para a BPR"

**Status:** concluído
**Depende de:** T-1

## Objetivo
Deixar claro para o superadmin que ele está vendo outro tenant, e dar a volta em um clique.

## Passos
1. `app/admin/layout.tsx`: para SUPERADMIN com `session.user.clinicId` diferente do tenant efetivo, renderizar uma faixa fina no topo do conteúdo com o texto EN/PT "Viewing <nome> as platform admin" / "Você está vendo <nome> como admin da plataforma" e um botão "Back to BPR" / "Voltar para a BPR".
2. O botão faz `POST /api/admin/switch-clinic` com `{ clinicId: null }` e recarrega em `/admin`.

## Arquivos afetados
- `app/admin/layout.tsx`
- `components/admin/tenant-view-banner.tsx` (novo, client)

## Critérios de aceite
- [ ] A faixa aparece com o nome do estúdio selecionado e some ao voltar.
- [ ] Não aparece para personal, admin nem fisio de clínica, nem para o superadmin no próprio tenant.
- [ ] Largura de celular (390 px) sem rolagem horizontal.
