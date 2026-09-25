# T-8: Entrar com Google e com Apple (opcional)

**Status:** pendente — **só se o Bruno pedir** · **Depende de:** T-1

## Objetivo
Entrar sem digitar senha, para quem prefere.

## Contexto
A **web já tem Google** e está ligado em produção (`/api/auth/providers` lista `google`), com o
callback resolvendo tenant e criando o paciente sem consentimento — igual ao cadastro por
e-mail. O app não aproveita nada disso: ele usa bearer próprio, não sessão do NextAuth.

E a diretriz **4.8**: app que oferece login de terceiro tem que oferecer **Sign in with Apple**
também. Google sozinho é rejeição.

## Passos
1. `expo-auth-session` no app (dependência nova — precisa do seu ok) e Sign in with Apple.
2. `POST /api/mobile/oauth/google` e `/apple`: validar o ID token com o provedor e **reusar** a
   lógica do callback da web (tenant, `moduleOverrides` padrão, sem consentimento), devolvendo
   os tokens do app. Sem duplicar a regra.
3. OAuth client iOS no Google Cloud para `com.bpr.clinic`; capability de Sign in with Apple.
4. E-mail privado da Apple: a conta nasce com um endereço de relay — decidir como a clínica
   fala com essa pessoa.

## Critérios de aceite
- [ ] Entrar com Google cria/reconhece a conta na clínica certa
- [ ] Sign in with Apple presente e funcionando
- [ ] Nenhuma conta duplicada quando o e-mail já existe
- [ ] Conta criada por provedor também passa pelo aceite dos Termos
