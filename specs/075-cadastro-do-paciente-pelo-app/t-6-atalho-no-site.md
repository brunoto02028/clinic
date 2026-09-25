# T-6: O atalho no site

**Status:** pendente · **Depende de:** T-7

## Objetivo
Que quem visita o site encontre o app em um toque.

## Contexto
`app/get-the-app/page.tsx` já existe, com `APP_STORE_URL` e `PLAY_STORE_URL` **vazios**. Não
adianta divulgar antes de haver link de loja — daí a dependência da T-7.

## Passos
1. Preencher a URL da App Store quando o app for aprovado.
2. Chamada para o app no site: banner no topo do `/dashboard` do paciente e um ponto na home.
3. Em iPhone, detectar o app instalado e abrir direto em vez de mandar para a loja.
4. QR code na página, para quem está no computador.

## Arquivos afetados
- `app/get-the-app/page.tsx`, `components/dashboard/dashboard-layout.tsx`, `app/page.tsx`

## Critérios de aceite
- [ ] `/get-the-app` leva à App Store de verdade
- [ ] Em Android, a página não promete o que não existe
- [ ] Banner não aparece para quem já está no app
