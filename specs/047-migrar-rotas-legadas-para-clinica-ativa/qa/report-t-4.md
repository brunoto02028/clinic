# QA — T-4: Testes e varredura

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commits:** cd30d75, 77497f0

- `npx jest` → 33 suítes, **345 testes**, nenhuma falha (2 suítes e 13 testes novos nesta atividade).
- `npx tsc --noEmit` → nenhum erro nos arquivos tocados (os que restam são os pré-existentes de
  `FormData.get` e do `mobile/`).
- `npx next lint` nos arquivos migrados → nenhum aviso novo.
- `grep -r "resolve-clinic-id"` em `app`, `lib`, `components` e `scripts` → nenhuma importação; o
  arquivo foi apagado.
- Revisão de código independente sobre o commit cd30d75: 27 pontos de uso conferidos um a um,
  nenhum consulta mais sem clínica; achados corrigidos em 77497f0 (delete de bloqueio sem escopo,
  contrato do POST de posts, `clinicId!` sobrando, lista de agendados do Instagram Studio e as duas
  lacunas de teste).

## Pré-condição de deploy conferida
Os dois SUPERADMIN de produção (admin@bpr.clinic e Kaio) têm `clinicId` da BPR, então nenhuma tela
cai no 403 de "sem clínica". `DEFAULT_CLINIC_SLUG` continua indefinido — se um dia existir uma conta
SUPERADMIN sem clínica, definir essa variável passa a ser obrigatório.
