# QA — Atividade 34: Unificação da identidade visual (BA One)

## T-1: Logo clara no sidebar

**UI**
1. Abrir qualquer tela `/admin/**` logado — sidebar deve mostrar a logo (clara/branca) legível contra o fundo escuro, não a versão colorida original ilegível.
2. Se `darkLogoUrl` não estiver cadastrado — cai no fallback de texto "BPR", sem quebrar layout.

## T-2: Retint do tema escuro do admin

**UI**
1. Dashboard admin, lista de pacientes, ficha de paciente, configurações — cor primária/destaque deve ser moss (`#4F7361`), fundo continua escuro (não virou claro).
2. Texto em todos os cards/botões principais permanece legível (contraste visual, não só cálculo).
3. Nenhuma referência residual ao azul-teal antigo (`hsl(195,...)`) nas telas principais.

## T-3: `bruno.*`/`clinic.*`

**UI**
1. Cada um dos 7 componentes que usa `bruno.slate`/`bruno.turquoise` (patient detail, scans, evidence report, foot-scan viewer/camera, admin-login-form) — visualmente coerente com moss, sem contraste quebrado.
2. `app/clinics/[slug]/client.tsx` — tenant sem `primaryColor` customizado mostra moss; tenant COM `primaryColor` customizado (criar um de teste com uma cor diferente) continua mostrando a cor customizada, não moss.

## T-4: Defaults de Clinic/Stripe

**API/dados**
1. Criar uma `Clinic` nova via fluxo normal (sem passar cor) → `primaryColor`/`secondaryColor` no banco vêm em moss/variante.
2. Uma `Clinic` já existente com `primaryColor` customizado (diferente do default antigo) — antes e depois da migração do schema, mesma cor.
3. `app/api/admin/stripe-branding/route.ts` sem config prévia no Stripe → sugestão de cor no fallback é moss.

## T-5: QA visual + regressão

**UI**
1. Screenshots antes/depois de: dashboard admin, pacientes, ficha de paciente, configurações, um dos componentes `bruno.*`.
2. `.public-site` (home pública) e uma tela de email marketing (`.brand-accent`) — visualmente idênticas ao antes.
3. Clínica de QA com cor customizada — página branded (`/clinics/[slug]` ou equivalente) mostra a cor dela, não moss.
