# T-4: Fila de vídeos no admin

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Uma tela que lista os vídeos esperando revisão, de todos os pacientes, com quem mandou e quando.

## Contexto
> "Preciso saber onde vai ser notificado e aonde vai chegar esse vídeo." — Bruno

O backend **já sabe responder isso**: `GET /api/admin/exercise-submissions?pending=1`. Nenhuma tela
do front usa esse parâmetro — o único consumidor filtra por paciente. O badge vermelho diz "3
esperando" e não existe lugar que diga quais.

Foi por isso que o vídeo dele "não chegou em lugar nenhum": chegou, e o caminho até ele era abrir o
prontuário e clicar numa aba que ninguém sabia que existia.

## Passos
1. Rota `/admin/exercise-submissions` com a lista de pendentes.
2. Cada linha: paciente, exercício, quando chegou, duração, e miniatura ou ícone.
3. A linha leva ao painel que já existe, no prontuário daquele paciente (precisa da T-6).
4. Vazio é um estado, não uma tela branca: "nenhum vídeo esperando".
5. O badge do menu e o link do e-mail diário passam a apontar para cá, em vez de `/admin/patients`.
6. Entrada no menu lateral do admin, com o próprio contador.

## Arquivos afetados
- `app/admin/exercise-submissions/page.tsx` (novo)
- `components/admin/admin-mini-sidebar.tsx`
- `lib/admin-sections.ts`
- `lib/clinic-waiting.ts` (o link do e-mail)
- `__tests__/exercises/fila-de-videos.test.ts` (novo)

## Critérios de aceite
- [ ] A fila lista só os pendentes (`reviewedAt: null`)
- [ ] Só os da clínica do ator — nenhum vazamento entre tenants
- [ ] Cada linha leva ao painel do paciente certo, já na aba certa
- [ ] Estado vazio com texto, não tela branca
- [ ] O badge leva à fila
- [ ] O e-mail diário leva à fila
