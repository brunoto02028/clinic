# Atividade 37 — Notificações por email pro admin em todos os eventos de paciente

## Objetivo
O Bruno quer ser avisado por email de todo evento de paciente que possa exigir uma atitude dele. Hoje ele só recebe alerta dedicado (assunto claro, link pra ficha, destaque) em 4 eventos (agendamento, triagem, mensagem, pergunta) — o resto só chega como BCC passivo (email endereçado à paciente, sem destaque). O gap mais sério é **pressão arterial alta**: hoje é só um BCC perdido no meio de outros emails, apesar de ser o único evento com risco clínico direto.

## Decisões de design
- **Endereço centralizado:** novo campo `SiteSettings.notificationEmail` (String?, opcional), editável em `/admin/settings` — mesmo padrão do campo `phone` que já existe lá. Uma função central `getAdminNotificationEmail(clinicId?)` resolve, nessa ordem: `settings.notificationEmail` → `settings.email` (contato público já configurado) → `process.env.ADMIN_EMAIL` → fallback hardcoded (`brunotoaz@gmail.com`, só como último recurso, nunca falha silenciosamente). Substitui as 9 duplicações hardcoded encontradas na auditoria.
- **Por que `SiteSettings` e não só variável de ambiente:** trocar variável de ambiente hoje depende do Coolify, que está sem acesso funcional pro Bruno (token expirado). Um campo editável direto em `/admin/settings` ele consegue mudar sozinho, sem depender de mim ou de deploy.
- **"Alerta dedicado" = um `sendEmail()` próprio**, adicional ao BCC que já existe (não substitui, não mexe no email do paciente) — mesmo padrão já usado em agendamento/triagem: assunto específico, corpo HTML simples com os dados relevantes, link direto pra ficha da paciente em `/admin/patients/[id]`.
- **Pressão alta primeiro** (T-4), por ser o único gap com risco clínico direto — se o Bruno quiser parar a atividade aí e revisar antes de eu continuar pros outros eventos, tudo bem.
- **Cancelamento de consulta:** só dispara o alerta novo quando quem cancelou foi a **paciente** (não quando o próprio Bruno cancela pelo admin) — a rota já sabe quem fez a request, só falta usar essa informação pra decidir se avisa.
- **Fora do escopo:** não mexo no conteúdo/redação dos 4 emails que já têm alerta dedicado (agendamento, triagem, mensagem, pergunta) — só fecho os gaps e centralizo a config.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Campo `notificationEmail` no schema + função central `getAdminNotificationEmail` | concluído |
| T-2 | Substituir as 9 duplicações hardcoded pela função central (incl. o outlier do webhook Vapi, sem fallback de env hoje) | concluído |
| T-3 | Campo editável em `/admin/settings` pro Bruno trocar o email sozinho | concluído |
| T-4 | Alerta dedicado de pressão alta (BP_HIGH_ALERT) — prioridade, é o gap de segurança | concluído |
| T-5 | Alerta dedicado de novo cadastro (signup) | concluído |
| T-6 | Alertas dedicados restantes: cancelamento pela paciente, avaliação corporal, escaneamento de pé, pagamento confirmado, pagamento de pacote, consentimento aceito | concluído |
| T-7 | QA consolidada (todos os eventos, incl. confirmar que o BCC antigo continua funcionando sem duplicar/quebrar nada) | concluído |

## Suposições
1. **`SiteSettings.notificationEmail` como novo campo, editável em `/admin/settings`** — é a opção que recomendo (ver "Por que SiteSettings" acima) em vez de só variável de ambiente. Confirma?
2. **Ordem de fallback:** `notificationEmail` configurado → `email` de contato já existente → `ADMIN_EMAIL` (env) → `brunotoaz@gmail.com` hardcoded como último recurso. Se preferir que o fallback pro email de contato público NÃO aconteça (ex.: prefere deixar em branco até configurar de propósito), me avisa.
3. **`SiteSettings` é por-clínica** (`clinicId` opcional/único) — então cada tenant (incluindo personal trainers, se algum dia tiverem essa tela) pode configurar o próprio email de notificação; não é um valor único global fixo pra plataforma inteira.
