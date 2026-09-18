# T-2: Retint do tema escuro do admin (`:root`) pro BA1

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Trocar o "Futuristic Neon Dark Theme" ad hoc do shell admin (`app/globals.css :root`) por uma versão escura dos tokens do BA1 — mantendo o admin escuro (decisão já registrada no próprio CSS: `.public-site ... Admin stays dark`).

## Contexto
Ver plan.md, decisão 1. Conversões hex→HSL abaixo calculadas a partir do mockup (`ink #20242D`, `health/moss #4F7361`, `greige #CDC7BE`, `bad #A85A4B`, `ok #55705F`, `warn #8A6D3B`) — batem com as conversões já usadas em `.public-site` (confirmado: moss já é `150 19% 38%` lá, greige já é `36 13% 77%`). Valores de fundo/borda/muted são derivados (não vêm do mockup, que não define um "modo escuro" explícito) — são ponto de partida, ajustar durante o QA visual (T-5) se o contraste não ficar bom.

## Passos
1. Em `app/globals.css`, dentro do bloco `:root` (linhas 9-56), substituir:
   - `--background`: `222 17% 8%` (mais escuro que ink puro, pra dar profundidade de "fundo de página")
   - `--foreground`: `222 15% 90%` (neutro claro na mesma família de matiz do ink, não o teal atual)
   - `--card` / `--popover`: `222 17% 15%` (ink — usado como superfície de card sobre o background mais escuro)
   - `--card-foreground` / `--popover-foreground`: mesmo valor de `--foreground`
   - `--primary` / `--accent` / `--ring`: `150 19% 38%` (moss)
   - `--primary-foreground` / `--accent-foreground`: `0 0% 100%`
   - `--secondary`: `36 13% 77%` (greige) — `--secondary-foreground`: `222 17% 15%` (ink, texto escuro sobre greige claro, igual ao `.public-site`)
   - `--muted`: `222 12% 20%` — `--muted-foreground`: `220 10% 65%`
   - `--border` / `--input`: `222 15% 20%`
   - `--destructive`: `10 38% 48%` (baseado em "bad" `#A85A4B`) — `--destructive-foreground`: `0 0% 100%`
   - `--success`: `142 14% 39%` (baseado em "ok" `#55705F`)
   - `--warning`: `38 40% 39%` (baseado em "warn" `#8A6D3B`)
2. Remover ou deixar como estão (avaliar visualmente) os tokens `--neon-*` (glow colors) — provavelmente não fazem mais sentido com a paleta nova; se algum componente os usa visivelmente, ajustar a cor base em vez de remover a variável.
3. Rodar visualmente pelas telas principais do admin (dashboard, lista de pacientes, ficha de paciente, configurações) conferindo contraste de texto e legibilidade — ajustar os valores derivados (background/border/muted) se algo ficar ilegível.

## Arquivos afetados
- `app/globals.css`

## Critérios de aceite
- [ ] Shell do admin usa tokens do BA1 (moss como cor primária, base ink), continua escuro.
- [ ] Nenhum texto/botão fica com contraste ruim nas telas principais (checagem visual, não só numérica).
- [ ] `.public-site`/`.brand-accent` inalterados.
