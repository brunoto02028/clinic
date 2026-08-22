# T-3: Seção "Meu progresso" — tendências de dor e função

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
Adicionar uma seção **"Meu progresso"** na página `app/dashboard/follow-up` que consome a
série histórica (T-1) e a renderiza com o `TrendChart` (T-2): **dor (VAS)**, **função
(FAAM ADL% e Sport%)** e **função geral**.

## Contexto
- `app/dashboard/follow-up/page.tsx` já mostra scores atuais + timeline + "Re-assess Now".
  A seção nova entra aí, sem página nova.
- Bilíngue EN/PT (default `en-GB`), seguindo o padrão do arquivo.

## Passos
1. Buscar `GET /api/patient/outcome-measures?history=true&range=<sel>` na página.
2. Renderizar um `TrendChart` por métrica:
   - **Dor (VAS 0–10)** → `higherIsBetter=false`.
   - **FAAM ADL %** e **FAAM Sport %** → `higherIsBetter=true`.
   - **Função geral %** → `higherIsBetter=true`.
3. Seletor de janela: 30d / 90d / tudo (default tudo), controlando o `range`.
4. Estado vazio da seção inteira quando não há histórico (`series` vazia) — mensagem
   convidando a registrar a primeira medida (link para `outcome-measures`).
5. Loading/erro tratados (spinner + fallback textual), sem quebrar o resto da página.

## Arquivos afetados
- `app/dashboard/follow-up/page.tsx` (nova seção + fetch)
- (possível) pequeno helper de formatação de data/label

## Critérios de aceite
- [ ] Com ≥2 medidas, mostra as linhas de dor e função com os valores corretos.
- [ ] Dor sinaliza melhora ao cair; função ao subir.
- [ ] Seletor de janela filtra a série exibida.
- [ ] Sem histórico → estado vazio com CTA para registrar medida.
- [ ] Textos em EN e PT conforme o locale; default inglês.
- [ ] Não quebra a timeline/《scores》já existentes na página.
