# T-1: `expo-notifications` no app e registro do token

**Status:** pendente
**Depende de:** nenhuma (mas só é testável depois do primeiro build EAS)

## Objetivo
O app pede permissão de notificação, obtém o token do aparelho e o registra no backend.

## Contexto
Push não existe hoje: `expo-notifications` não está no `mobile/package.json`. É pré-requisito de
T-4 e T-5. Decisão D5: o token é por **aparelho**, não por paciente — uma pessoa pode ter celular
e tablet, e token zumbi é a causa clássica de "não recebi".

## Passos
1. Instalar `expo-notifications` e `expo-device` (avisar o Bruno antes — dependência nova).
2. Declarar o plugin em `mobile/app.json`, com ícone e cor da notificação na identidade.
3. Criar `mobile/src/lib/push.ts`: pedir permissão, obter o Expo push token, e não pedir de novo
   se já foi negado (iOS mostra o diálogo uma vez só).
4. Registrar em `POST /api/patient/push-tokens` após o login; desregistrar no logout.
5. Modelo `PushToken` (userId, token único, platform, lastSeenAt) — DDL direcionado, sem `db push`.

## Arquivos afetados
- `mobile/package.json`, `mobile/app.json`
- `mobile/src/lib/push.ts` (novo)
- `mobile/app/(app)/_layout.tsx` (registrar depois de autenticar)
- `mobile/src/store/auth.ts` (desregistrar no logout)
- `app/api/patient/push-tokens/route.ts` (novo)
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] A permissão é pedida uma vez, e a recusa é lembrada
- [ ] O token registrado aparece no banco com `platform` correto
- [ ] Logout remove o token daquele aparelho, não os dos outros
- [ ] Registrar o mesmo token duas vezes não duplica linha
- [ ] Nada quebra no Expo Go nem na web, onde push não existe — degrada em silêncio
