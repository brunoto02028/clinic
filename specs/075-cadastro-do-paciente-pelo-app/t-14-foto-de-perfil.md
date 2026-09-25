# T-14: Foto de perfil

**Status:** em andamento
**Depende de:** nenhuma

## Objetivo
O paciente troca a própria foto, no app e na web, e ela aparece nos dois.

## Contexto
Pedido do Bruno no teste no iPhone (achado 6). O avatar era as iniciais do nome,
desenhadas — não havia foto em lugar nenhum do app. As colunas `profileImageUrl` e
`profileImagePath` já existiam no `User`, preenchidas só pelo cadastro via Google.

Reusa o pipeline do R2 e os limites das miniaturas de exercício (`lib/exercise-media.ts`):
JPEG/PNG/WebP, até 5 MB. Um segundo jeito de guardar arquivo seria um segundo jeito de vazar.

## Passos
1. `POST` e `DELETE` em `/api/patient/profile/photo`, com o gate de paciente.
2. `profileImageUrl` no `GET /api/patient/profile`.
3. App: avatar vira botão → câmera ou galeria, recorte quadrado.
4. Web: card de foto em `/dashboard/profile`.

## Arquivos afetados
- `app/api/patient/profile/photo/route.ts` (novo)
- `app/api/patient/profile/route.ts`
- `app/dashboard/profile/page.tsx`
- `mobile/src/components/ui/Avatar.tsx`
- `mobile/src/api/profile-photo.ts` (novo)
- `mobile/src/components/ModuleProfile.tsx`

## Critérios de aceite
- [ ] Enviar JPEG/PNG/WebP até 5 MB grava e devolve a URL
- [ ] Tipo não suportado → 400 `unsupported_type`
- [ ] Acima de 5 MB → 400 `too_large`
- [ ] Trocar a foto apaga a anterior do R2 (sem órfão)
- [ ] `DELETE` zera as duas colunas
- [ ] Sem sessão → 401; conta não-paciente → recusada pelo gate
- [ ] A foto enviada num canal aparece no outro
