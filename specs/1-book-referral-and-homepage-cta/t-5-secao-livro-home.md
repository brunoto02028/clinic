# T-5: Seção de destaque do livro na home

**Status:** concluído (QA aprovado, desktop e mobile; review corrigiu isolamento de falha de getBookConfig() no Promise.all da home)
**Depende de:** nenhuma (independente das outras — pode ser feita em paralelo)

## Objetivo
Dar destaque real ao livro "Beyond Pain" na homepage, reforçando autoridade — hoje só existe um link discreto no rodapé (`components/landing-page.tsx:1125`).

## Contexto
Componentes visuais do livro já existem e devem ser reaproveitados: `components/book-3d-cover.tsx` (capa 3D), copy/tom já estabelecido em `app/beyond-pain/page.tsx`. Ver Suposições do `plan.md` sobre o placement escolhido.

## Passos
1. Nova seção em `components/landing-page.tsx`, inserida entre a faixa escura de CTA (`:815`) e a seção de Artigos (`:867`).
2. Conteúdo: capa do livro (`Book3DCover`), título + subtítulo curto (puxar de `BookConfig` se já tiver título/subtítulo cadastrado; senão, texto fixo de fallback), 1-2 frases de autoridade ("Escrito por Bruno, baseado em X anos de experiência clínica..."), botão CTA "Leia o Capítulo 1 Grátis →" linkando pra `/beyond-pain/chapter-one` (ou `/beyond-pain` se preferir a landing completa — decisão de implementação, mas o CTA principal deve ser um único botão claro, não múltiplos concorrendo).
3. Buscar `BookConfig` (se existir linha) no Server Component pai (`app/page.tsx`) e passar como prop pra `LandingPage`, com fallback gracioso se não houver config ainda.
4. Responsivo (mobile-first, consistente com o resto da home) e usando o tema dark-safe já estabelecido no admin não se aplica aqui — esta é a home pública, que já usa tema claro (`bg-white`/`bg-slate-50` como as seções vizinhas) — manter esse padrão, não o tema dark do admin.

## Arquivos afetados
- `components/landing-page.tsx`
- `app/page.tsx` (buscar `BookConfig` e repassar como prop)

## Critérios de aceite
- [ ] Seção aparece na home, entre a faixa de CTA escura e Artigos, visualmente destacada (não é só mais uma linha de texto).
- [ ] Capa do livro renderiza corretamente (reaproveitando `Book3DCover`).
- [ ] Botão CTA leva pra `/beyond-pain` ou `/beyond-pain/chapter-one` funcionando.
- [ ] Responsivo em mobile (sem quebrar layout).
- [ ] Se `BookConfig` não existir ainda, a seção não quebra a página (fallback).
