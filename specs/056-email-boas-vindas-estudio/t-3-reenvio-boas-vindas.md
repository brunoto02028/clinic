# T-3: Ação "Send welcome e-mail to owner" para estúdio existente

**Status:** concluído
**Depende de:** T-1

## Objetivo
O SUPERADMIN consegue mandar o e-mail de boas-vindas ao dono de um estúdio que já existe, com uma nova senha temporária.

## Passos
1. `POST /api/admin/clinics/[id]/welcome-email`, body `{ locale: "en" | "pt" }`:
   - só SUPERADMIN, com o papel relido do banco (`getSuperadminActor`);
   - o tenant precisa ser `PERSONAL_TRAINER` e ativo;
   - o dono é o primeiro ADMIN ativo do estúdio;
   - gera uma senha temporária (CSPRNG, mesmo formato "St-…"), grava o hash (bcrypt 12) e envia `studioWelcomeEmail`;
   - responde `{ sent: true, to }`. Se o Resend falhar, responde 502 e **não troca a senha**: a troca só é gravada depois do envio aceito, ou é desfeita.
2. `app/admin/clinics/page.tsx`: item "Send welcome e-mail to owner" no menu do estúdio. Abre um diálogo de confirmação ("a senha atual do dono deixa de valer") com a escolha EN/PT e mostra um toast com o resultado.

## Arquivos afetados
- `app/api/admin/clinics/[id]/welcome-email/route.ts` (novo)
- `app/admin/clinics/page.tsx`

## Critérios de aceite
- [ ] ADMIN, THERAPIST, PATIENT e anônimo recebem 401/403. Um personal não consegue reenviar nem para o próprio estúdio.
- [ ] Clínica (`CLINIC`) → 400. Estúdio sem dono ativo → 404.
- [ ] Depois do envio, a senha antiga falha e a nova entra (login 200).
- [ ] Se o envio falhar, a senha antiga continua valendo.
- [ ] O item de menu só aparece em estúdios.
