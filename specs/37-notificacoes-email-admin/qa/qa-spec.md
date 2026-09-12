# QA Spec — Atividade 37: Notificações por email pro admin

## T-1: Campo + função central
1. **API — resolução em cascata sem nada configurado**
   - Passos: `getAdminNotificationEmail()` numa clínica sem `notificationEmail` nem `email` em `SiteSettings`.
   - Esperado: retorna `process.env.ADMIN_EMAIL` (ou o hardcoded se a env var também não existir).
2. **API — `notificationEmail` configurado tem prioridade**
   - Passos: configurar `notificationEmail` numa clínica, chamar a função pra esse `clinicId`.
   - Esperado: retorna exatamente esse valor, ignorando `email`/env/hardcoded.
3. **API — fallback pro `email` de contato**
   - Passos: `notificationEmail` vazio, `email` de contato preenchido.
   - Esperado: retorna o `email` de contato.

## T-2: Substituição das duplicações
4. **Código — nenhuma duplicação sobrando**
   - Passos: `grep -rn "brunotoaz@gmail.com"` no repo.
   - Esperado: só aparece dentro de `lib/admin-notify-email.ts`.
5. **API — triagem continua indo pro destino certo**
   - Passos: enviar uma triagem de teste.
   - Esperado: alerta chega no email resolvido por `getAdminNotificationEmail`, sem mudança de comportamento pra quem não configurou nada.

## T-3: Campo em /admin/settings
6. **UI — campo aparece e salva**
   - Passos: abrir `/admin/settings`, editar "Notification email", salvar.
   - Esperado: persiste no banco, recarregar a página mostra o valor salvo.
7. **UI — deixar em branco não quebra**
   - Passos: apagar o campo, salvar.
   - Esperado: sem erro; próximos alertas caem no fallback.

## T-4: Pressão alta
8. **API — leitura alta dispara alerta dedicado**
   - Passos: `POST` de uma leitura de pressão em faixa alta.
   - Esperado: dois envios — template pro paciente (com BCC) e o alerta dedicado pro admin com assunto "🚨 High Blood Pressure...".
9. **API — leitura normal não dispara o alerta dedicado**
   - Passos: `POST` de leitura normal.
   - Esperado: sem o alerta dedicado (só o que já existia antes, se houver).

## T-5: Cadastro
10. **API — signup dispara o novo alerta**
    - Passos: criar uma conta nova via `/api/signup`.
    - Esperado: welcome pro paciente + alerta dedicado "👋 New Patient Signup" pro admin.
11. **API — signup que falha não dispara nada**
    - Passos: tentar cadastrar um email já existente.
    - Esperado: erro 409 esperado, nenhum alerta disparado.

## T-6: Alertas restantes
12. **API — cancelamento pela paciente dispara alerta**
    - Passos: paciente cancela a própria consulta.
    - Esperado: alerta dedicado disparado.
13. **API — cancelamento pelo admin NÃO dispara o alerta novo**
    - Passos: admin cancela a consulta de um paciente.
    - Esperado: sem o alerta novo (o admin já sabe, foi ele quem fez).
14. **API — avaliação corporal, escaneamento de pé, pagamento, pacote, consentimento**
    - Passos: disparar cada evento.
    - Esperado: alerta dedicado correspondente chega.

## T-7: Consolidada
15. Repetir os 8 eventos novos + os 4 já existentes numa rodada única, confirmando nenhuma regressão e a troca de `notificationEmail` refletindo em todos.
