# T-5: Verificação em produção e limpeza

**Status:** pendente
**Depende de:** T-2, T-3

## Objetivo

Confirmar no ambiente real que o problema do iPhone acabou, e tirar do ar as
rotas temporárias.

## Contexto

O motivo número 2 da atividade só pode ser verificado em produção: é o
Cloudflare no caminho que produzia `application/octet-stream` e engolia o
`Range`. Servindo do R2 por `media.bpr.clinic`, isso precisa ser medido, não
assumido.

## Passos

1. Subir uma pasta de teste pelo Bulk Upload novo.
2. Medir na URL do R2, sem sessão:
   - `curl -I` → `Content-Type: video/mp4`
   - `curl -H "Range: bytes=0-99"` → **`206`** + `Content-Range` + `Accept-Ranges`
   - repetir várias vezes para confirmar que não alterna com `octet-stream`
     como acontecia antes
3. Tocar o vídeo no navegador e confirmar `readyState 4` e `currentTime`
   avançando; testar seek no meio.
4. **Pedir ao usuário que teste no iPhone** — é o aparelho do relato original e
   não tenho como emular Safari real aqui. Sem esse teste, o objetivo principal
   fica verificado só por indício.
5. Conferir que o disco do VPS não recebeu nada: `filesOnDisk` continua zero.
6. Remover as rotas temporárias, já cumpridas:
   - `app/api/admin/exercises/reset-library/route.ts`
   - `app/api/admin/exercises/normalize-videos/route.ts` (o dry-run provou que
     os 147 vídeos já eram H.264/yuv420p/mp4 com faststart; e a normalização
     agora acontece no upload)
   - o botão "Corrigir Vídeos" na tela, que passaria a apontar para rota
     inexistente
7. Depois disso, a regra de cache do Cloudflare para `/uploads/*` deixa de ser
   necessária para vídeo — registrar isso para o usuário não ficar esperando
   uma ação que não faz mais diferença.

## Arquivos afetados

- `app/api/admin/exercises/reset-library/route.ts` (removido)
- `app/api/admin/exercises/normalize-videos/route.ts` (removido)
- `app/admin/exercises/page.tsx` (remover o botão "Corrigir Vídeos")

## Critérios de aceite

- [ ] `Content-Type: video/mp4` estável em 5 requisições seguidas
- [ ] `Range` responde `206` com `Content-Range` correto
- [ ] Vídeo toca e aceita seek no navegador
- [ ] **Confirmado pelo usuário no iPhone**
- [ ] Nenhum arquivo novo no disco do VPS
- [ ] As duas rotas temporárias respondem `404`
- [ ] Nenhum botão da tela aponta para rota removida
- [ ] Build passa e o site continua no ar
