# T-2: "Add Clinic / Studio" envia o e-mail do estúdio, com o idioma escolhido

**Status:** concluído
**Depende de:** T-1

## Objetivo
Ao criar um estúdio com dono, o dono recebe o e-mail do estúdio no idioma escolhido no formulário. A equipe de clínica continua recebendo o e-mail de hoje.

## Passos
1. `app/admin/clinics/page.tsx`: acrescentar o campo "Owner language" (EN/PT, padrão EN) na seção do dono, visível só quando o tipo é Personal Studio, e enviar `locale` no `POST /api/admin/users`.
2. `app/api/admin/users/route.ts`: se o estúdio de destino é `PERSONAL_TRAINER` e o cargo é ADMIN, usar `studioWelcomeEmail` com o idioma recebido. Caso contrário, manter o e-mail de hoje.

## Arquivos afetados
- `app/admin/clinics/page.tsx`
- `app/api/admin/users/route.ts`

## Critérios de aceite
- [ ] Criar um estúdio com dono dispara um único e-mail, o do estúdio, no idioma escolhido. Localmente o envio é interceptado pelo outbound guard e fica no log.
- [ ] Criar um membro de equipe numa clínica dispara o e-mail de hoje, sem mudança.
- [ ] Criar a equipe de um estúdio pelo `/admin/users` do próprio personal, com cargo THERAPIST, não muda nada.
