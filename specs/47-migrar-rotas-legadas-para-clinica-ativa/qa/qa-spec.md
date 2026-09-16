# QA — Atividade 47: rotas legadas na clínica ativa

Ambientes: local (fixture de tenants) e produção após o deploy (SUPERADMIN admin@bpr.clinic).
A clínica "Bruno" faz o papel de "outra clínica" via "Active Clinic", restaurada ao final.
Nada de dados reais alterados; nenhuma publicação real em redes sociais (só leitura nas rotas de
social — as de publicar não são disparadas).

## T-1: Helper
- **Unit** — ADMIN/THERAPIST ignora cookie; SUPERADMIN segue a clínica ativa; sem clínica → null.

## T-2: Social/marketing
- **API (prod, BPR)** — `GET /api/admin/social/accounts`, `/posts`, `/campaigns`, `/templates`,
  `/instagram-overview`, `/api/admin/marketing/content-calendar`: mesmas respostas de antes do
  deploy (contagens registradas).
- **API (prod, Active Clinic = "Bruno")** — as mesmas listas passam a ser dessa clínica; conta
  social da BPR pelo id → 404.
- **UI** — Marketing → Social/Calendar abre sem erro no console.

## T-3: Equipamentos, agenda, Atlas, artigos
- **API (prod, BPR)** — equipamentos: mesma lista de antes; `GET /api/admin/calendar/blocks` ok.
- **API (prod, Active Clinic = "Bruno")** — equipamentos da outra clínica; editar equipamento da
  BPR → 404/403.
- **UI** — Settings → Equipment e a agenda abrem sem erro.

## T-4: Varredura
- **Unit** — suíte completa verde; nenhuma referência a `resolve-clinic-id`.
