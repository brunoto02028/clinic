# T-2: Registrar "assistiu vídeo"

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Toda vez que o paciente abre um vídeo de exercício na página de tratamento, gravar um `AuditLog`
para aparecer na timeline (T-1).

## Contexto
Ver decisão 2 do plano. É a única escrita nova desta atividade — usa o `AuditLog` genérico que já
existe, mesmo padrão do `LOGIN_SUCCESS`.

## Passos
1. Criar `app/api/patient/activity/video-watched/route.ts`, `POST`.
2. Autenticar como o próprio paciente (`session.user.id`); corpo `{ exerciseId: string }`.
3. Buscar o exercício (nome) para a descrição; se não achar, 404.
4. `logAudit({ userId: session.user.id, userEmail, userRole, userName, action: "VIDEO_WATCHED", entity: "Exercise", entityId: exerciseId, description: "<nome> watched the video for <exercicio>" })`.
5. Responder 204.
6. Em `app/dashboard/treatment/page.tsx`, no ponto único onde `videoModal` é setado com uma URL (ou
   em cada um dos 3 callbacks `onPlayVideo`, se não houver um ponto único), disparar
   `fetch("/api/patient/activity/video-watched", { method: "POST", body: JSON.stringify({ exerciseId }) })`
   sem `await` bloqueando a abertura do modal — precisa do `exerciseId`, que hoje não é passado para
   `onPlayVideo` (só `url`, `muted`, `poster`); adicionar como 4º argumento.

## Arquivos afetados
- `app/api/patient/activity/video-watched/route.ts` (novo)
- `app/dashboard/treatment/page.tsx` (passar `exerciseId` para `onPlayVideo` e disparar o POST)

## Critérios de aceite
- [ ] Abrir um vídeo de exercício cria uma linha em `AuditLog` com `action: "VIDEO_WATCHED"`.
- [ ] O modal do vídeo abre imediatamente, sem esperar a resposta do POST.
- [ ] Sem sessão de paciente → 401, nada é escrito.
- [ ] `npx tsc --noEmit` limpo.
