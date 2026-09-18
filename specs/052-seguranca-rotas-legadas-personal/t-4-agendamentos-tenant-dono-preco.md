# T-4: Agendamentos — tenant + dono no `[id]`, preço no servidor

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Ninguém lê, altera ou apaga um agendamento fora do próprio tenant. O aluno/paciente só **cancela** o que é dele. O preço de uma sessão é sempre decidido pelo servidor.

## Contexto
Confirmado ao vivo (18/09): `qa.aluno` fez `PATCH /api/appointments/<id da própria sessão> {"price":0.3}` → 200, e o preço foi de £60 para £0,30. Restaurei depois.

`app/api/appointments/[id]/route.ts`:
- **GET (:63):** só impede paciente de ler sessão de outro. Staff de qualquer tenant lê qualquer sessão, com `soapNote` completo (:51).
- **PATCH/PUT (:99-118):** sem dono nem tenant. Para PATIENT só o `status` é restrito.
- **DELETE (:283-294):** só bloqueia PATIENT.

Outros pontos:
- `app/api/appointments/route.ts:189`: o POST confia no `price` do cliente (vem de `booking-form.tsx:184`). Vazio/0 vira £60.
- `app/api/admin/appointments/route.ts:59-86`: o POST não valida se o `patientId` é do tenant. Resultado: sessão para paciente de outro tenant, com e-mail de confirmação e de "Medical Screening Required" para ele.
- `/api/appointments/[id]/reschedule` já é correto (auditoria) e continua sendo o caminho para remarcar.

## Passos
1. `GET /api/appointments/[id]`:
   - PATIENT só lê a própria sessão (como hoje);
   - staff só lê sessões do próprio `clinicId` (`getActor`);
   - SUPERADMIN lê tudo;
   - staff de tenant personal não recebe `soapNote`.
2. `PATCH`/`PUT`:
   - PATIENT: só na própria sessão, e só `status: "CANCELLED"`. Qualquer outro campo → 400/403 (não é ignorado em silêncio);
   - staff: só sessões do próprio tenant.
3. `DELETE`: staff do mesmo tenant (ou SUPERADMIN).
4. `POST /api/appointments` (aluno/paciente agendando):
   - ignorar `price` do corpo;
   - resolver o preço no servidor pela mesma fonte que a tela de agendamento mostra (preço do serviço/tipo da clínica do paciente);
   - documentar a fonte no código.
5. `POST /api/admin/appointments`: o `patientId` precisa ser do tenant do actor (`staffPatientAccess`). Senão, 404.

## Arquivos afetados
- `app/api/appointments/[id]/route.ts`
- `app/api/appointments/route.ts`
- `app/api/admin/appointments/route.ts`
- possivelmente `components/.../booking-form.tsx` (parar de mandar `price`, opcional)

## Critérios de aceite
- [ ] Aluno: `PATCH {"price":0.3}` na própria sessão → recusado; preço no banco inalterado.
- [ ] Aluno: `PATCH {"status":"CANCELLED"}` na própria sessão → 200 (regressão do cancelamento).
- [ ] Aluno: `PATCH`/`GET` na sessão de outro aluno do mesmo tenant → 403/404.
- [ ] Personal (tenant B): `GET`/`PATCH`/`DELETE` numa sessão do tenant A → 404; nenhum dado do A na resposta.
- [ ] Aluno agenda com `price: 0.3` no corpo → sessão criada com o preço do servidor.
- [ ] Personal: `POST /api/admin/appointments` com `patientId` do tenant A → 404; nenhum e-mail disparado.
- [ ] Clínica BPR: criar, remarcar e cancelar sessão pelo admin e pelo paciente continuam funcionando (regressão).
