# T-5: Código do profissional e link por clínica

**Status:** pendente · **Depende de:** T-1

## Objetivo
Que alguém convidado por uma clínica ou estúdio caia no tenant certo, e não na clínica padrão.

## Contexto
`resolveJoinTenant` já aceita um slug e **recusa** slug inválido em vez de cair em outro tenant
(a "ISO-10 leak" citada no próprio arquivo). `app/join/[slug]` faz isso na web via cookie
`join_tenant`. O app não tem equivalente.

## Passos
1. Campo opcional "Código do profissional" no cadastro, enviado como `tenantSlug`.
2. Deep link `bpr://join/<slug>` e universal link de `/join/<slug>`, preenchendo o campo.
3. Quando o código resolve, mostrar o nome da clínica antes de confirmar — para a pessoa ver
   onde está entrando.
4. Código inválido: erro próprio ("código não encontrado"), nunca cadastro silencioso na padrão.

## Arquivos afetados
- `mobile/app/register.tsx`, `mobile/app.json` (scheme/universal links), `app/join/[slug]/page.tsx`

## Critérios de aceite
- [ ] Sem código → clínica padrão; com código válido → aquela clínica
- [ ] Código inválido recusa, e o paciente não é criado
- [ ] O nome da clínica aparece antes de confirmar
- [ ] Abrir `/join/<slug>` no iPhone com o app instalado abre o app com o código preenchido
