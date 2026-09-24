# SPEC — Medição de pressão na clínica (dispositivo compartilhado) + área do terapeuta

## 1. Contexto

- O app BPR já tem integração com a Withings Public API (app "BPR Clinic", callback em `https://bpr.clinic/...`), com OAuth, webhook e sync de pressão, sono e atividade.
- Stack: Next.js + TypeScript, PostgreSQL com Prisma, hospedado em VPS própria via Coolify. **Não usamos Supabase.**
- Cada paciente tem uma conta no app BPR (ID próprio). A conta Withings é opcional e existe apenas para quem tem aparelho próprio.
- A clínica terá **um Withings BPM Connect próprio**, instalado numa **conta Withings da clínica**, usado em vários pacientes.

## 2. Objetivo

Quando o terapeuta medir a pressão de um paciente na clínica, o resultado deve **aparecer automaticamente na área daquele paciente**, sem digitação manual e sem o paciente precisar de conta Withings.

A Withings só conhece a conta da clínica. **O app BPR decide de quem é cada medição**, com base numa "janela de medição" aberta pelo terapeuta na ficha do paciente.

## 3. Papéis e acesso

- Papéis: `patient`, `therapist`, `admin`.
- `patient`: acessa apenas os próprios dados (app mobile).
- `therapist` / `admin`: acessam a área clínica (portal web no computador + opcionalmente no app).
- O controle de acesso é feito **na camada da API**: toda consulta de dados de paciente filtra pelo `patient_id` do usuário logado; rotas `/api/clinic/*` exigem papel `therapist` ou `admin`.

## 4. Modelo de dados (ajustar nomes ao schema.prisma existente)

### 4.1 Conexões Withings

Na tabela de conexões Withings já existente, adicionar:

- `is_clinic_device` (boolean, default `false`): `true` = conta Withings da clínica.
- `patient_id` (nullable): preenchido só para contas pessoais de pacientes; `null` para a conta da clínica.
- Restrição: **uma conta Withings (withings_user_id) só pode estar ligada a um único paciente.** Tentativa de conectar uma conta já vinculada a outro paciente deve ser bloqueada com mensagem clara.
- Apenas **uma** conexão ativa com `is_clinic_device = true` por enquanto.

### 4.2 `clinic_measurement_sessions` (nova)

| Campo | Tipo | Observação |
| --- | --- | --- |
| id | uuid | PK |
| patient_id | uuid | FK paciente |
| device_connection_id | uuid | FK conexão Withings da clínica |
| context | enum `pre_session` / `post_session` / `other` | |
| opened_by | uuid | FK usuário terapeuta |
| opened_at | timestamptz | |
| expires_at | timestamptz | `opened_at + 3 minutos` |
| status | enum `open` / `completed` / `expired` / `cancelled` | |
| measurement_id | uuid nullable | medição atribuída |

Regra: **no máximo 1 sessão `open` por dispositivo**. Abrir uma nova sessão enquanto outra está aberta deve ser bloqueado (ou exigir cancelar a anterior).

### 4.3 Medições

Na tabela de métricas/medições já existente, garantir os campos:

- `source`: `patient_device` | `clinic_device` | `manual`
- `context`: `pre_session` / `post_session` / `home` / `other`
- `clinic_session_id` (nullable)
- `withings_measure_id` (para deduplicação; único por conexão)

### 4.4 `unassigned_measurements` (nova)

Leituras vindas do dispositivo da clínica **sem sessão correspondente**. Campos: id, device_connection_id, systolic, diastolic, heart_rate, measured_at, raw (jsonb), received_at, assigned_patient_id (nullable), assigned_by, assigned_at.

### 4.5 Auditoria

Registrar em log: abertura/cancelamento de sessão, atribuição automática, atribuição manual (quem, quando, para qual paciente).

## 5. Fluxos

### 5.1 Configurar o dispositivo da clínica (uma vez)

1. Admin cria a conta Withings da BPR (e-mail da clínica) e instala o BPM Connect no Wi-Fi da clínica pelo app Withings (celular).
2. No portal, em **Configurações da clínica → Dispositivos**, botão "Conectar dispositivo da clínica" → OAuth Withings → conexão salva com `is_clinic_device = true`, `patient_id = null`.
3. Assinar notificações Withings (webhook) para essa conexão, igual às contas de pacientes.

### 5.2 Medir a pressão de um paciente na clínica

1. Terapeuta abre a ficha do paciente no portal.
2. Clica em **"Medir pressão"** e escolhe o contexto (antes / depois da sessão).
3. API cria `clinic_measurement_session` com status `open` e validade de 3 minutos.
4. A tela mostra: "Aguardando medição de <nome do paciente>…", contagem regressiva e botão "Cancelar".
5. Terapeuta mede com o BPM Connect.
6. Withings envia notificação ao webhook → o backend busca a medida → aplica a regra da seção 5.3.
7. A tela recebe o resultado (polling, seção 6) e mostra: sistólica / diastólica / FC, horário e contexto, com confirmação "Salvo no histórico de <paciente>".
8. Se a janela expirar sem leitura: mensagem "Nenhuma medição recebida. Se você mediu, ela estará na caixa de entrada."

### 5.3 Regra de atribuição no webhook

Ao receber uma medida de pressão:

- Conexão de **paciente** (`is_clinic_device = false`) → grava no `patient_id` da conexão com `source = patient_device`, `context = home`. (Comportamento atual.)
- Conexão da **clínica** (`is_clinic_device = true`):
  1. Procurar sessão `open` desse dispositivo cujo intervalo `[opened_at − 30s, expires_at]` contenha o `measured_at` da medida.
  2. Encontrou → gravar a medição no `patient_id` da sessão, com `source = clinic_device`, `context` da sessão e `clinic_session_id`; marcar a sessão como `completed` e preencher `measurement_id`.
  3. Não encontrou → gravar em `unassigned_measurements`.
- Deduplicar por `withings_measure_id`: a mesma medida nunca pode ser gravada duas vezes.
- Leituras da conta da clínica **nunca** entram no histórico de ninguém sem passar por essa regra ou por atribuição manual.

### 5.4 Caixa de entrada (medições sem paciente)

- Tela no portal listando `unassigned_measurements` pendentes (valores, horário).
- Ação "Atribuir a paciente" (busca por nome/ID + contexto) → move para as medições do paciente com `source = clinic_device`, registra auditoria.
- Ação "Descartar" (ex.: medição de teste), com auditoria.

### 5.5 Paciente com aparelho próprio (já existente, manter)

- Paciente conecta a própria conta Withings em Perfil → Dispositivos.
- Medições caem automaticamente no perfil dele (`source = patient_device`).
- No histórico do paciente, medições de casa e da clínica aparecem juntas, identificadas pela origem.

## 6. Atualização da tela (sem Supabase)

- **Fase 1 (implementar agora):** polling. Enquanto a sessão estiver aberta, o portal chama `GET /api/clinic/measurement-sessions/:id` a cada 3 segundos até `status = completed`, `expired` ou `cancelled`. Parar o polling ao sair da tela.
- **Fase 2 (opcional, depois):** PostgreSQL `LISTEN/NOTIFY` + Server-Sent Events para atualização instantânea.
- Um job (ou verificação na própria leitura) deve marcar como `expired` as sessões vencidas.

## 7. Endpoints (sugestão)

| Método | Rota | Papel | Função |
| --- | --- | --- | --- |
| POST | `/api/clinic/measurement-sessions` | therapist | Abre sessão `{ patientId, context }` |
| GET | `/api/clinic/measurement-sessions/:id` | therapist | Status + medição (polling) |
| POST | `/api/clinic/measurement-sessions/:id/cancel` | therapist | Cancela |
| GET | `/api/clinic/unassigned-measurements` | therapist | Lista a caixa de entrada |
| POST | `/api/clinic/unassigned-measurements/:id/assign` | therapist | Atribui `{ patientId, context }` |
| POST | `/api/clinic/unassigned-measurements/:id/discard` | therapist | Descarta |
| GET | `/api/clinic/devices` | admin | Lista dispositivos da clínica |

## 8. Segurança e infraestrutura

- Postgres **sem porta pública** (só rede interna do Coolify).
- Tokens Withings criptografados no banco.
- Backup automático do Postgres para fora do VPS, com teste de restauração.
- Webhook apenas em HTTPS; validar que a notificação corresponde a uma conexão conhecida antes de buscar dados.
- Paciente nunca acessa dados de outro paciente nem dados do dispositivo da clínica.

## 9. Critérios de aceite

- [ ] Terapeuta abre "Medir pressão" na ficha do paciente A, mede, e a leitura aparece na tela e no histórico de A em até ~30 segundos, sem digitação.
- [ ] Só existe 1 sessão aberta por dispositivo; tentar abrir outra é bloqueado.
- [ ] Leitura feita sem sessão aberta vai para a caixa de entrada e pode ser atribuída ou descartada.
- [ ] Sessão expira em 3 minutos e a tela informa o que fazer.
- [ ] A mesma medida Withings nunca é gravada duas vezes.
- [ ] Medições de casa (conta do paciente) continuam funcionando como hoje.
- [ ] No histórico do paciente, cada medição mostra origem (casa / clínica) e contexto (antes / depois da sessão).
- [ ] Paciente logado não consegue acessar rotas `/api/clinic/*` nem dados de outro paciente.
- [ ] Todas as atribuições (automáticas e manuais) ficam registradas em auditoria.

## 10. Fora do escopo desta spec

- Alertas clínicos de pressão (limites pré/durante exercício) — spec separada.
- Planos, assinaturas e pagamentos — spec separada.
- Dispositivos de outras marcas.
