# Atividade 57 — Superadmin enxerga o estúdio como o personal vê

## Objetivo
Quando o Bruno (SUPERADMIN) escolhe um estúdio de personal pelo seletor de clínica ou por "Manage this Clinic", o painel inteiro passa a ser o do estúdio. Isso vale para menu, vocabulário (Student/Trainer/Workout), ícones, título da aba, seção "Studio" e links do estúdio: o que o personal vê, com os dados daquele estúdio. Voltar para a BPR é um clique.

## Por que (diagnóstico de 18/09)
Hoje a troca de contexto do superadmin é **só de dados**:
- o cookie `selected-clinic-id` vira o cabeçalho `x-clinic-id` no middleware;
- o `getActor` usa esse cookie, e as APIs filtram pelo estúdio escolhido.

A **aparência** vem da sessão (JWT), que guarda `clinicType`/`clinicName`/`clinicSlug`/logo **da conta do superadmin**, que é CLINIC:
- `useVocab()`, o menu (`visibleAdminSections`), os ícones e o título leem `session.user.clinicType`/`clinicName`;
- as páginas de servidor `/admin/training-programs`, `/admin/nutrition` e `/admin/challenges` redirecionam quem não é estúdio, pela sessão.

Resultado: "Manu Training" aparece com "Clinic", "Clinical Notes", "Patients" e o menu da clínica (print do Bruno em 18/09). Pelo mesmo motivo, o "View as Student" feito pelo superadmin mostra ao aluno de estúdio o menu de paciente de clínica.

## Decisões de design
- **Os campos de exibição da sessão seguem o tenant selecionado.** No callback `jwt` (`lib/auth-options.ts`), para SUPERADMIN, `clinicName`, `clinicSlug`, `clinicType`, `clinicLogoUrl` e `clinicPrimaryColor` passam a vir do tenant do cookie `selected-clinic-id`. Sem cookie, vêm do próprio tenant.
  - Isso é recalculado em toda leitura de sessão, só para SUPERADMIN. Assim a troca vale depois do reload que o seletor já faz, e também num login novo com o cookie antigo.
  - Um id guardado no token evita reconsultar o banco quando o tenant não mudou.
- **`token.clinicId` não muda.** O escopo de dados continua pelo cookie e pelo `x-clinic-id`, como hoje. Só a aparência passa a acompanhar.
- **Rotas bloqueadas:** o superadmin continua isento do bloqueio por URL do personal (visão de plataforma). O menu já esconde o que o estúdio não tem.
- **Faixa de contexto:** no topo do admin, quando o superadmin está vendo outro tenant, aparece "Você está vendo o estúdio <nome> como admin da plataforma · Voltar para a BPR". O botão limpa a seleção e recarrega. O seletor de clínica no rodapé do menu continua funcionando.
- **Conta de personal, aluno e clínica:** nada muda. O código novo só roda para SUPERADMIN.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Sessão do superadmin reflete o tenant selecionado (campos de exibição) | concluído |
| T-2 | Faixa "vendo o estúdio X · Voltar para a BPR" no admin | concluído |
| T-3 | Regressão: contexto BPR igual a hoje; contexto estúdio = visão do personal; "View as Student" dentro do estúdio | concluído |

## Fora de escopo
- Migrar rotas legadas que usam `session.user.clinicId` para o `getActor` (alerta antigo; ver memória "vazamento-lista-pacientes-clinicid").
- Personificar a conta do personal (entrar "como" ele). Aqui o superadmin vê o painel do estúdio com a própria identidade.

## Decisões do Bruno (18/09/2026)
1. Vendo um estúdio, o superadmin **continua** podendo abrir rotas clínicas pela URL. Só o menu muda.
2. A faixa aparece para qualquer tenant selecionado que não seja o próprio.
3. Plano aprovado.

## Code review (18/09)
- **Achado (média), corrigido:** a sessão aceitava um tenant selecionado **inativo** e as rotas de dados do `getActor` não, então a tela mostraria um tenant sobre os dados de outro. A sessão agora resolve a seleção com o mesmo `resolveActorTenant` das rotas de dados.
  - **Teste local:** estúdio ativo → visão do estúdio; inativo → sem visão do estúdio; id inexistente → próprio tenant; voltar → como hoje.

## Alertas (fora do escopo, não mexido)
- **`x-clinic-id` aceita tenant inativo:** as rotas legadas que leem esse cabeçalho (`getClinicContext`, ex.: `/api/admin/stats`) aceitam o cookie `selected-clinic-id` sem checar `isActive`, e o `getActor` checa. Com um tenant inativo selecionado, essas rotas mostram os dados dele. Caso raro (superadmin selecionando tenant desativado).
