# T-4: UI — aba "Pending Approval" em /admin/email

**Status:** concluído
**Depende de:** T-2, T-3

## Objetivo
Dar ao admin uma tela pra ver, revisar e aprovar/descartar os itens pendentes.

## Contexto
Ver plan.md, decisão 6. Reaproveita a tela existente `app/admin/email/page.tsx` (ou onde
estiver o componente que lista `folderCounts`/pastas), adicionando "Pending Approval" como
mais uma pasta ao lado de Inbox/Sent/Draft/Spam/Trash.

## Passos
1. Adicionar contagem de `PENDING_APPROVAL` no `GET` de `/api/admin/email` (já calcula
   `folderCounts` pras outras pastas).
2. Na UI, adicionar a aba/filtro "Pending Approval".
3. Ao abrir um item pendente: mostrar preview (renderizar o HTML do anexo, não só o corpo da
   mensagem) e dois botões: "Approve & Send" (chama `action: "approveSend"`) e "Discard"
   (chama `action: "discard"`), com confirmação antes de aprovar (é uma ação que manda email
   de verdade pro paciente).
4. Depois de aprovar/descartar, remover o item da lista de pendentes (recarregar a lista).

## Arquivos afetados
- `app/admin/email/page.tsx` (ou equivalente — confirmar path exato ao implementar)
- `app/api/admin/email/route.ts` (folderCounts)

## Critérios de aceite
- [ ] Item pendente aparece na aba com destinatário/assunto corretos
- [ ] Preview mostra o invoice exatamente como foi montado (mesmo layout do GET de preview)
- [ ] "Approve & Send" realmente envia e o item some da fila de pendentes
- [ ] "Discard" remove sem enviar
