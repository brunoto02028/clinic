# T-17: Marca por tenant

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-12, T-13

## Objetivo
O aluno e o profissional de outro tenant não veem "BPR" (achado A7).

## Passos
1. `lib/tenant-brand.ts` monta a marca a partir da `Clinic`: nome, logo e cores.
2. Aplicar a marca em:
   - cabeçalho e rodapé da área logada (`/admin`, `/dashboard`);
   - título da página;
   - `/join/[slug]` e o login do tenant;
   - remetente e assinatura dos e-mails transacionais.
3. Termos e consentimento por tenant: texto do tenant, ou um modelo neutro com o nome dele. O tenant padrão mantém os textos atuais.
4. O site público `bpr.clinic` não muda.

## Critérios de aceite
- [ ] Cenários da T-17 passando.
- [ ] Regressão: a área logada da BPR fica visualmente idêntica.
