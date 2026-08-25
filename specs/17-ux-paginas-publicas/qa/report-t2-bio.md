# QA — T2 (bio/credenciais, versão genérica)

**Data:** 2026-08-25
**Ambiente:** dev local (`next dev`), Playwright.
**Resultado:** ✅ Aprovado.

## Escopo
Versão genérica (sem dados pessoais / nº de registro, por decisão do Bruno; futuro multi-profissional):
- Selos de credencial da seção About passam a ser **bilíngues** (antes: só inglês no modo PT — bug real).
- Nova linha de confiança **nível-prática**: "Registered, insured & evidence-based" / "Registrado, segurado e baseado em evidências".

## Verificação (home `#about`)
| Item | EN | PT |
|------|----|----|
| Eyebrow de confiança | "REGISTERED, INSURED & EVIDENCE-BASED" ✓ | "REGISTRADO, SEGURADO E BASEADO EM EVIDÊNCIAS" ✓ |
| STO | "STO Registered" ✓ | "Registrado na STO" ✓ |
| IPHM | "IPHM Biohacking Practitioner" ✓ | "Praticante de Biohacking IPHM" ✓ |
| Experiência | "15+ Years of Clinical Experience" ✓ | "15+ Anos de Experiência Clínica" ✓ |
| Histórico | "Ex-Professional Footballer" ✓ | "Ex-Jogador Profissional de Futebol" ✓ |
| Sem inglês residual no PT | — | ✓ (asserção de DOM) |

- Typecheck: 0 erros em `components/landing-page.tsx`.
- Sem nº de registro pessoal exibido (conforme decisão).

## Parqueado
Bio pessoal detalhada + nº de registro real + qualificações (model `Qualification`, campo `hcpcRegistrationNumber`) → evoluir para "Nossa equipe" quando os profissionais forem definidos.
