# QA online — atividade 072 em produção

**Data:** 23/09/2026 · **Deploy:** `A5q8w03xNrmFTSeBVw20u` (subiu ~460s após o merge da PR #94)
**Commit na `main`:** `f157f501`

## O que estava em risco

O deploy roda `npx prisma@6.7.0 db push --skip-generate --accept-data-loss` (`start.sh:41`). A
atividade paralela de **faturas de paciente** foi mergeada na `main` enquanto esta branch estava
5 commits atrás. Sem o merge da `main` para dentro desta branch, o `db push` teria executado:

```
DROP TABLE "PatientInvoice"
DROP TABLE "PatientInvoiceItem"
ALTER TABLE "Clinic" DROP COLUMN "nextInvoiceSeq"
ALTER TABLE "EmailMessage" DROP COLUMN "patientInvoiceId"
... 22 DROPs no total
```

Em produção, com as faturas dentro.

## Evidência de que não aconteceu

1. **A guarda pegou antes do merge.** `prisma migrate diff` da `main` para esta branch acusou os
   22 `DROP`. A `main` foi mergeada para dentro da branch, o conflito resolvido, e o mesmo diff
   passou a dar **0 `DROP`** — só `CREATE` de quatro tabelas, quatro enums e as constraints.
2. **O schema da `main` tem as duas frentes.** Depois do merge:
   `grep -c "^model PatientInvoice " → 1` e `grep -c "^model AutomationRule " → 1`.
3. **O log de produção não reporta perda de dado:**
   ```
   [start.sh] Syncing database schema...
   Datasource "db": PostgreSQL database "bpr_clinic" at 86.48.18.88:5490
   🚀  Your database is now in sync with your Prisma schema. Done in 2.23s
   ```
   Se o schema declara `PatientInvoice` e o banco está "em sincronia com o schema", a tabela
   existe. E 2,23s é o tempo de quem **criou** quatro tabelas, não de quem derrubou e recriou.

## Smoke sem sessão

```
https://bpr.clinic            -> 200
/api/version                  -> 200   A5q8w03xNrmFTSeBVw20u (novo)
/api/admin/invoices           -> 307   (middleware manda para o login)
/api/alerts                   -> 307
/api/outbox                   -> 307
/api/automation/rules         -> 307
/login                        -> 403   Cf-Mitigated: challenge
```

O `403` no `/login` é **Cloudflare desafiando um cliente sem navegador**, não a aplicação — o
cabeçalho `Cf-Mitigated: challenge` e `Server: cloudflare` confirmam. Navegador real passa.

## O que este QA NÃO conseguiu verificar

Os `307` são o middleware redirecionando antes de resolver a rota, então **não distinguem "a rota
existe" de "a rota não existe"**. E o desafio do Cloudflare impede login por script.

Falta, e precisa de sessão real:

- Abrir `/admin/invoices` e confirmar que **as faturas existentes aparecem com o dado**
- Abrir `/admin/alerts`, `/admin/outbox` e `/admin/automation` e confirmar que renderizam
- Confirmar que a aba **Automation** aparece na ficha de um paciente

**Nenhum paciente real foi tocado neste QA.** Nada foi criado, alterado ou enviado em produção.
